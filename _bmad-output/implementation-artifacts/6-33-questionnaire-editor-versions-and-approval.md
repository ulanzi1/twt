---
baseline_commit: 26901c92
---

<!--
PINNED: `26901c92` = `origin/main` (2026-10-30; the 11b.5 landing). Created on branch `story/6-33-questionnaire-editor-versions-and-approval`
in the MAIN checkout (`ListAgents`: ⛔ peer session live — [[feedback_shared_tree_branch_switch]]). Two facts, stated separately: (1) the pin is
an ancestor of this branch (durable); (2) every `apps/` / `packages/` claim below was traced at `26901c92` on 2026-10-30 by four read-only
research passes (governance; engine code; the 6.27a / 6.32 story records; planning docs + ADRs) and the load-bearing ones re-read by hand
(`rbac/roles.ts` state_trustee + the RANK-ORDER note in `rbac/scope.ts`, `0189`'s answer-table CHECKs, `answerCodeIndexInputs`, the 6.32
save contracts, Niyamavali §5 / Part 8 / Part 9) — perishable, re-check at Task 0.1. Re-locate by FUNCTION, ⛔ by line number.

STATUS: review (v1.4 — implemented by `bmad-dev-story 6.33`, 2026-10-30; AC11 was un-attested at v1.4; ATTESTED 2026-10-30 by the post-commit browser pass — see the Dev Agent Record, *Browser pass (AC11)*). Was: ready-for-dev (v1.3 — three fresh-context validations folded in, the last a FINAL pass after Task 0 with three read-only
verifiers). QE1–QE17 ANSWERED 2026-10-30 — all as recommended (Task 0.2) and recorded by author-commit `2026-10-30-421` (`283e25f4`,
alone — Task 0.3). The QE14 confirm was SENT by BigDev and the Panel RULED 2026-10-30 — `2026-10-30-422` (Trustee-ratified, DR + KB):
*"by DR and KB / Q1 A, Q2(a) A, Q2(b) A, Q3 A"* — every edge confirmed as built, ⛔ change. Task 0.4's records DONE 2026-10-30 (Row 45 minted with
leg (a) MET; `epics.md` `### Story 6.33`; the `deferred-work.md` QE13 annotation). The QE4 fallback word's Hindi was
REVIEWED by BigDev the same day (*"सदस्य is fine"* — `6-33-hindi-review-member-fallback-word.md`) ⇒ Task 0 is COMPLETE. Committed (v1.0 / v1.1 at
`4c622d7f`, v1.2 at `f5083018`, v1.3 at this commit); ⛔ pushed.

GLYPH REGISTER: `⛔` NEGATES the word or phrase it precedes (before an already-negative word it is emphasis: "⛔ never") · ⭐ = action /
emphasis · ⚠ = hazard.

ADDRESSING RULE: ⛔ file:NNN into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite decision id +
clause, item heading, row key). Line numbers into other files are perishable hints; re-locate by function.

NUMBERS (`-366` decision 6: *"the number belongs to the first COMMIT that takes it on any branch"*), re-checked 2026-10-30 AFTER Task 0,
every branch and worktree: decisions — `-421` / `-422` TAKEN here; `-423` TAKEN on `governance/erasure-after-death-note` ⇒ any further
decision takes ≥ `-424`. Migrations — highest `0191_announcement-post-recovery` (journal `when` 1796096400036) everywhere ⇒ this story's
migration takes ≥ `0192`, journal `when` GREATER than every sibling's ([[project_sibling_migration_when_order_shared_db]]). Roster — Row
`45` MINTED by this story (`577a4ca2`) ⇒ any further row is `46`. Ledger — `2026-10-30a`–`i` taken (a–e and i here, f–h on the governance
branch) ⇒ next free `2026-10-30j` (or a new day's bare date). RBAC — `PERMISSION_CATALOG_VERSION = 55` (71 keys) everywhere ⇒ this story
takes `56` (74). ⚠ Row `6-38-death-locks-erasure-and-non-member-claims-refused` may also mint a migration or a catalog bump: whichever
COMMITS first takes `0192` / `56`. ⭐ Re-grep ALL FIVE at Task 0.1 and again at the commit that takes each.

LETTERS: G = found facts (traced at the pin) · QE = build decisions (ANSWERED — `-421`; §0 edges 2 / 3 / 3a / 3b ratified by `-422`) · R =
QE12's resolver rules · C = QE8's checklist · TR = traps · I = invariants.
-->

# Story 6.33: Staff Write New Versions of the Neighbours' and the Inspector's Questionnaires — the Pariwar Admin Proposes, an Approver Approves, the Super Admin Makes a Version Live for One Pariwar or All — Every Version Kept, Every Answer Tied to Its Version `[SURFACE]` `[PRIMITIVE]` `[GOVERNANCE]`

Status: review

## ⭐⭐ WHAT THIS STORY IS, IN ONE PARAGRAPH

Today every questionnaire version is reviewed CODE: `peer_mesh.v1`–`v4` (the neighbours') and `ground_inspection.v1` (the inspector's, with
the family), each minted from a Panel decision id because the staff chain the Panel ruled did not exist. The Panel's own words
(`2026-10-10-304` Q7 / Q8, Trustee-ratified): *"Pariwar Admin proposes, State Trustee proposes/approves  with/without modification. Super Admin
make it live for one pariwar/all pariwar with/without modification. Superadmin can add question directly and make it live. No additional
Permission required for Superadmin."* `-304` Consequence 2 hands that chain to THIS row, *"for both questionnaires"*. This story builds it:
versions stored in the database beside the code ones, an append-only record of every step (who proposed, approved, returned, made it live,
for which Pariwar or all, when), the ONE validator the code versions already pass (so a chain version inherits every Panel limit —
`-310` CF3 (a)–(d)), the ONE live-version resolver made database-aware (so the neighbours' app, the helpline, the inspector's panel, the
staff views and the sending jobs serve the new version to NEW replies and visits only), staff-written words in English AND Hindi, three
permission keys, and an admin page to propose, approve, return, withdraw, make live and revert. **It gates nothing**: no chain question can
be a warning, a flag, a required answer or a condition of completion or approval — the validator refuses it (I1). ⚠ The ruled "State
Trustee" step cannot be granted to the `state_trustee` role (its `state` ceiling can ⛔ never pass a Pariwar-wide check — `scope.ts`
§RANK-ORDER); QE6 builds the established Trustee-Lite posture — RATIFIED by `-422` Q1 A.

## Story

As **a Pariwar Admin, an approver acting for the State Trustee, or the Super Admin**,
I want **to propose a new version of the neighbours' questionnaire or the inspector's questionnaire for the family, to approve or return
it, and to make an approved version live for one Pariwar or for all — or, as the Super Admin, to add a question directly and make it live —
with every version and every step kept**,
so that **the questions can evolve the way the Panel ruled (`-304` Q7 / Q8) without a code release, while every limit the Panel set stays
enforced by the same validator, a version in progress is ⛔ never shown, and every answer stays tied to the version and the words it was given
under.**

## 📜 Policy meaning (AI-10-1)

**This story introduces NO predicate that gates a member's or a family's access to a benefit, and changes none — but it builds the
mechanism through which staff could try, so the sentence below is an invariant this story must PROVE, not boilerplate**
([[feedback_gate_scope_semantic_coverage]]; the 10.10 shape was a "harmless" conjunct). The existing gates this story sits beside are
untouched: 6.26a's ONE definition of "complete" (`groundInspectionApprovalState`), 6.27b's WAIT and ONE rule (`assertLateWarningsCovered`,
whose peer-mesh leg reads ONLY the two warning keys `has_died` / `death_date` — `question_key IN PEER_MESH_WARNING_QUESTION_KEYS`; its
other legs — certificate, ground-inspection, other-claim, the nominee-version kinds, `register_check_mismatch` — are warnings a
questionnaire never produces), and `APPROVAL_WARNING_KINDS`. A chain version can ⛔ add a warning
(`warningKeysFor` — `peer_mesh` admits only the two ruled keys, `ground_inspection` none), ⛔ make any question required (every chain
question is `optional` — QE8; every `ground_inspection` question already is), ⛔ make an answer comparable (the comparable keys are the four
ruled ones; the DB admits code indexes only on `death_cause` / `death_illness`), and ⛔ reach a reader that decides, flags, routes or delays a
claim (I1). ⭐ The proof is AC12's validator legs PLUS a fence leg that a DB-loaded version reaches the same validator (TR11 of 6.32: *"a rule
only in a test is a rule 6-33 drops"*).

**In a member's and a family's terms:** *"Staff may later ask your neighbours or your family different questions. Whatever is asked, and
however anyone answers, your claim is never held, flagged, refused or reduced because of it — the answers are background for the Trust's
staff, and any question may be left unanswered."* (⚠ ⛔ "'I don't know' is always fine": a chain `yes_no` is exactly `['yes','no']` and
QE8 does ⛔ require an `unknown` option — a chain `single` / `multi` MAY offer one; every chain question is OPTIONAL instead.)

**The one adjacency, stated (the cost row 6-33 must state — 6.27a PM23 (a), roster Row 27 note (4), Row 42 discharge path):** a `peer_mesh`
version with a HEALTH question whose counsel basis is pending HOLDS that Pariwar's texts and WhatsApp reminders to the neighbours (6.27c R11,
`config:counsel_basis_pending`). That holds a SIGNAL, ⛔ a claim: the peer mesh is a signal, ⛔ a `pass` gate (`-263`; PRD FR-40 annotation);
an un-sent text produces ⛔ answer, so ⛔ warning, so ⛔ wait (6.27b's wait is entered only by a late WARNING answer). In a member's terms:
*"If staff add a health question your neighbours cannot yet be asked, the Trust stops texting your neighbours until it can — your claim
carries on through the ground inspection."* Today v4 already holds the texts for `death_cause` / `death_illness` (Row 27 (f)), so a new
pending question changes nothing until (f) closes; after it closes, a new one re-holds. QE10 makes the make-live screen say this in words.
The Panel ratified this cost with it in front of them: the CF3 (d) text as put (`trustee-panel-routing-note-2026-10-10-6-27-confirms.md`)
— *"A health question added later through the chain likewise holds that Pariwar's texts until counsel covers it"*. For `ground_inspection`
there are ⛔ texts: a pending chain health question is simply ⛔ shown at the visit (Row 42's discharge path).

**Checked against the Niyamavali** (the main checkout's gitignored `docs/legal/niyamavali.md`, mtime 2026-08-16; a rulebook, ⛔ ratified —
[[feedback_niyamavali_rulebook_not_spec]]): §5.1 (*"Eligibility is governed by the actual cause of death"*), §5.5 (suicide; murder where a
nominee is accused — *"subject to State-Trustee review"*), §5.6 (an undeclared IMA-listed illness — *"the engine flags the claim for
State-Trustee review — it is never auto-denied"*). A chain question about cause or illness is ⛔ read by §5.5's review or §5.6's flag — they run
on their own evidence (`-304` Q4 A: *"⛔ never compared automatically with the member's medical declaration"*; the fence
`nominee-name-no-comparison-fence.test.ts` — this story EXTENDS it to the new modules, AC12). §1.3 (Definitions, naming Part 9's tiers)
names *"District Admin / State Trustee / Trustee Panel (Core Team)"* as tiers of decision authority over claims; approving a questionnaire is ⛔ a Part 9 act, so the Trustee-Lite
mapping (QE6 — ratified by `-422` Q1 A) contradicts ⛔ clause. **Result: ⛔ conflict — and a standing hazard, recorded:** the day any reader uses a chain question's
answer to gate, delay or flag a claim, that changes who is paid and is the Panel's (`-304` "Our reading — ⛔ NOT RATIFIED": *"making any
other answer gate, delay or flag a claim changes who is paid — that stays the Panel's"*; CF3 (b) later RATIFIED only *"never a warning or a
flag"*; [[feedback_mechanization_split_commitment]]).

## The rulings and decisions this story builds on (quoted, never paraphrased)

| Source | Key text (verbatim) | Status |
|---|---|---|
| `2026-10-10-304` Q7 / Q8 | *"Pariwar Admin proposes, State Trustee proposes/approves  with/without modification. Super Admin make it live for one pariwar/all pariwar with/without modification. Superadmin can add question directly and make it live. No additional Permission required for Superadmin."* (Q8 verbatim; Q7 identical but for a missing space — *"make it live.No additional"*; Q7 the neighbours', Q8 the inspector's; double spaces are the original's) | ⭐ Trustee-ratified — the Panel's OWN chain, ⛔ our reading (Q7 B / Q8 A were ⛔ taken) |
| `-304` "What this supersedes" (recorder's text in a Trustee-ratified entry) | *"⚠ **Q7 / Q8 decline our proposed limit** (*"a NEW question, or any question about health, cause of death or habits, comes to you"*) — under the chain, those reach members **without** a Panel ruling. The Panel chose this with the limit in front of it."* | ⭐ Trustee-ratified entry (the recorder's words, ⛔ the Panel's) |
| `-304` Consequence 2 (recorder's text in a Trustee-ratified entry) | *"Row `6-33-questionnaire-editor-versions-and-approval` builds the Q7 / Q8 chain (propose → approve / modify → make live per Pariwar or for all; the Super Admin's direct addition), for both questionnaires."* | ⭐ Trustee-ratified |
| `-304` "Our reading — ⛔ NOT RATIFIED" | *"'Live' = shown to members (or inspectors) from that moment; a version in progress is ⛔ never shown. Every version is kept with who proposed, who approved, who made it live, for which Pariwar(s), and when; every answer stays tied to its version."* · *"A State Trustee 'approves' a Pariwar Admin's proposal or their own; the Super Admin makes it live — so routine changes pass through at least two people … EXCEPT the Super Admin's direct addition, which the Panel allowed alone."* · *"The fixed checks the Panel ruled (the original certificate seen and photographed — FQ11; the date and time of death — FQ8 C) are ⛔ never editable through the chain."* | ⚠ reading, ⛔ ratified — still unratified at the pin; built as written (it MATCHES the ruled text), incl. *"or their own"*: the approver MAY be the author, and the second person is the Super Admin at make-live (QE6 — ⛔ a distinct-approver rule: that is Q8 A, which the Panel did ⛔ take) — ✅ the approval line RATIFIED AS PUT by `-422` Q1 A; the reading's other lines stay readings |
| `-304` "does ⛔ NOT cover" | *"The Hindi of staff-added questions — our reading: the chain supplies both languages and a person reviews the Hindi before it goes live."* | ⚠ reading, ⛔ ratified — QE9 builds it |
| `2026-10-10-310` CF3 | *"(a) Every question the Panel ruled is in every version from now on (the first two-question draft kept on record, ⛔ never used); (b) a question added through the chain is ⛔ never a warning or a flag; (c) an alcohol question needs Q5 changed first; (d) every health question is asked only once counsel has confirmed the basis — the texts wait for it."* | ⭐ Trustee-ratified. ⚠ CF3 (a) as PUT (confirms note) listed the NEIGHBOURS' questions only; its reach to `ground_inspection` is 6.32's application (I4 there), already in the validator |
| `2026-10-10-305` §1 (c) | *"the final vote (`cycle.freeze`…) and the R9 vote (`claim.r9_vote`…) — both keys held by `pariwar_admin` … — are cast by **Pariwar Admins acting as Trustee-Lite**; the `state_trustee` role holds neither key"* | author-commit (a FOUND fact told to the Panel) |
| `2026-10-10-310` CF2 | *"whoever approves the claim at a later step — in practice the Pariwar Admin at the final vote or an R9 vote, or the Super Admin"* | ⭐ Trustee-ratified (the Trustee-Lite reality acknowledged for VOTES — ⛔ for questionnaire approval) |
| `2026-10-28-413` IQ2 (A) | *"the "Has the family filed any other claim for this death?" question … is ⛔ built in 6.32: it waits for row 6-33's chain, where the Super Admin "can add question directly and make it live" (`-304` Q8)"* · IQ12: *"row 6-33's database-backed versions replace the source without a screen change"* · "Not covered: a question added through the chain (row 6-33)" | author-commit. ⚠ This story's author-commit SUPERSEDES IQ12 IN PART ([[feedback_supersede_never_reinterpret]]): the inspector's panel gains a version id on save and a RELOAD path (QE12 R7), and the seam moves off the sync `resolveLiveVersion` |
| `2026-10-13-329` item 3 / `-328` / `-331` | v3 and v4 minted from Panel ids *"`-304` Q7's chain is ⛔ not yet built (row 6-33)"*; new words under a NEW copy key, ⛔ an in-place edit; the old version `historical`, ⛔ removed | author-commit / Trustee-ratified |
| 6.27a PM23 (a)–(d) (story file `6-27-peer-mesh-sending-replies-and-date-of-death.md`) | *"Because the rules live in the VALIDATOR, row 6-33's database-backed versions inherit them."* · `approvedBy` = *"a Trustee-ratified decision id — or, once row 6-33 lands, a chain record"* · `counselBasis` = *"`'pending'` or a recorded basis id (… a later one recorded through row 6-33)"* · *"a later health question (v3+, from the Panel or row 6-33) likewise HOLDS that Pariwar's texts until its basis is recorded — ⚠ a cost row 6-33 must state"* · (c) *"a reply pins `resolveLiveVersion('peer_mesh', pariwarId)` at its first save … a newer version applies to new replies only"* | the engine record (PM23 (d) today is what `-304` Consequence 1 calls "PM23 (e)" — correct when written: at `-304`'s commit `bc1ec53c` PM23 ran (a)–(f) and (e) was "Who approves a version"; 6.27 was re-lettered later) |
| 6.32 deferred D5 (`deferred-work.md`, 6-32 second code review) | *"a handler/writer version mismatch under a concurrent first pin is a bare `Error` (500) … ⭐ Trigger: row 6-33 adds a chain-authored question to a `ground_inspection` version."* | deferral — THIS story fires its trigger ⇒ fixed here (QE12) |
| 6.27b Task 3c.2 (recorded hazard) | *"a reply pins whatever is LIVE at its first save …; a client that loaded before a version flip shows the old words but pins the new — unreachable at 6.27b's deploy …, accepted for later flips."* | recorded hazard — THIS story makes flips routine ⇒ fixed here (QE12) |

### §0 — whose decision is this (template `trustee-panel-routing-note-TEMPLATE.md` §0)

| # | Edge | Ratified text | Verdict |
|---|---|---|---|
| 1 | Pariwar Admin proposes; the Super Admin makes live for one Pariwar or all; the Super Admin adds directly, alone; the approver MAY approve their own proposal | `-304` Q7 / Q8; the `-304` reading *"approves a Pariwar Admin's proposal or their own … at least two people (proposer / approver, and the Super Admin)"* | MATCH — built as ruled; ⛔ distinct-approver rule (that would revive Q8 A — *"a DIFFERENT person must approve"* — which the Panel did ⛔ take) |
| 2 | Who performs "State Trustee proposes/approves" | `-304` names the State Trustee; the role can ⛔ pass a Pariwar-wide check (G6) | **NARROWS / RE-HOMES a named actor ⇒ the Panel's** — built on the established Trustee-Lite posture (QE6), NON-BLOCKING confirm (QE14) — ✅ **RATIFIED `-422` Q1 A** |
| 3 | The ruled questions' WORDS through the chain — and the ruled closing note and thank-you (`-304` ruling item 4: *"the closing note before Submit, as put"*) | CF3 (a) keeps the questions; *"with/without modification"* is silent on their words; `-328` re-routed a word change to the Panel | **NARROWS the delegation if locked ⇒ the Panel's** — QE5 (A) locks, NON-BLOCKING confirm (QE14) — ✅ **RATIFIED `-422` Q2 (a) A** |
| 3a | A new reviewed CODE version (a Panel word change, or a counsel basis minted as a new version) makes every DB version on the older ruled base stale — it stops being served until rebased (QE12 R2) | `-304` Q7 / Q8 *"make it live"* vs QE5's "ruled words stay the Panel's" | **NARROWS what staff made live, for the Panel's own later ruling ⇒ disclosed** — QE14 (2) — ✅ **RATIFIED `-422` Q2 (b) A** |
| 3b | "Make live for … all pariwar" = the DEFAULT level: a Pariwar with its own version in force keeps it (QE7 (a)) | `-304` Q7 / Q8 *"for one pariwar/all pariwar"* | **NARROWS "all" if read literally ⇒ the Panel's** — QE14 (3), NON-BLOCKING — ✅ **RATIFIED `-422` Q3 A** |
| 4 | Health / alcohol / warning / flag limits on chain questions | CF3 (b)–(d) | MATCH — the validator already enforces; DB versions inherit (QE8, QE10) |
| 5 | Hindi supplied by the chain, a person reviews it | `-304` unratified reading | author's (building the reading as written; ⛔ a change to what anyone is told) — QE9 |
| 6 | Storage, numbering, resolver, RLS, UI, audit | — | author's (engineering) — QE1–QE4, QE7, QE11, QE12, QE15–QE17 |
| 7 | The "any other claim?" question | `-413` IQ2 (A) — it waits for the chain | author's: ⛔ authored in code (QE13) |
| 8 | What a chain question may BE — ⛔ `date`, ⛔ free text, ≤ 20 questions (QE8) — incl. on the Super Admin's direct addition | `-304` Q8 *"Superadmin can add question directly"* | author's: a CAPABILITY deferral of this build (wire and storage limits), ⛔ a policy limit on who may add; stated as a cost |
| 9 | The direct path's reason, step-up and two ticks | *"No additional Permission required for Superadmin"* | author's: ⛔ permissions — record-keeping and re-authentication on a key the Super Admin already holds (MATCH) |
| 10 | Who READS a chain question's answers | CF2 (the neighbours' answers: whoever approves the claim); `-413` IQ7 (the family's — its confirm note DRAFTED, ⛔ sent, Row 42 (d)) | MATCH — a chain answer goes to exactly the audience its questionnaire's ruled answers go to; ⛔ new audience. IQ7's open confirm covers chain answers on the family side too |

## FOUND FACTS (G) — traced at `26901c92`

- **G1 — every version is CODE.** `packages/domain/src/questionnaires/registry.ts` `QUESTIONNAIRE_REGISTRY` = `PEER_MESH_QUESTIONNAIRE_V1..V4`
  (`peer-mesh.ts`) + `GROUND_INSPECTION_QUESTIONNAIRE_V1` (`ground-inspection.ts`); validated at module load; duplicate `versionId` throws.
  LIVE today: `peer_mesh.v4` and `ground_inspection.v1`, both `scope: { kind: 'all' }`. ⛔ Versions table, ⛔ live pointer, ⛔ chain code
  anywhere (`git grep -n "questionnaire_versions\|questionnaire.propose"` → empty).
- **G2 — the definition shape** (`questionnaires/types.ts`): `QuestionnaireDefinition { kind, versionId (= `${kind}.v${version}`), version,
  scope ({kind:'all'} | {kind:'pariwar', pariwarId}), status ('live' | 'historical' — ⛔ draft), approvedBy[], pages[], closingNoteCopyKey,
  thankYouCopyKey }`; `QuestionDefinition { key, kind ('single'|'multi'|'date'|'yes_no'), copyKey, options[{code, copyKey, exclusive?}],
  optional, showIf, sensitive, warning, approvedBy, health, counselBasis, callbackAudience? }`. Words are COPY KEYS only — ⛔ stored strings.
- **G3 — the resolver** (`registry.ts`): `resolveLiveVersion(kind, pariwarId, registry?)` = the Pariwar's own live version, else the
  all-Pariwar one, else `null`; two live at one level THROWS. `getQuestionnaireVersion(versionId)`, `servedDefinition(def)` (skips every
  `'pending'` question and its `showIf` dependants; drops empty pages), `pendingCounselBasisKeys(def)`. ALL SYNCHRONOUS.
- **G4 — the validator** (`validator.ts`, `questionnaireDefinitionProblems` / `assertValidQuestionnaireDefinition`, error
  `questionnaire.definition_invalid`). Its header: *"the rules live HERE … row 6-33's database-backed versions inherit them"*. ⚠ `checkApprovedBy`
  admits ONLY ids in `PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS` (`keys.ts`: `-262, -263, -303, -304, -310, -328, -331`) ⇒ it REFUSES every
  chain version until widened (QE4/QE8). Other rules: key / code / copy-key regexes; unique codes; `exclusive` only on `multi`; ≥ 2 options on
  single/multi; `yes_no` = `['yes','no']`; `date` → only option `unknown`, and sensitive; `FORBIDDEN_TOPIC_RE` (alcohol); `warning` only on
  `warningKeysFor(kind)`; health ⇒ sensitive + `counselBasis` ('pending' | `DECISION_ID_RE`), non-health ⇒ ⛔ basis; `callbackAudience` only on
  `callback_consent`; `showIf` → an EARLIER key's real codes; pages hold 1–3 questions; `peer_mesh`: first question `has_died` (required,
  single, `HAS_DIED_CODES`), all others optional, v2+ all seven ruled keys with their flags (`!== true` form); `ground_inspection`: the three
  ruled keys, every question optional, the shared cause / illness codes, `head_letter` neither sensitive nor health. Also: unique question
  keys; `death_date` is a `date` question; the Tier-1 keys are sensitive in EVERY version (v1 included); `version` a positive integer; the
  VERSION-level `approvedBy` is checked by the same `checkApprovedBy`. ⚠ The validator is ⛔ type-safe: `RegExp.test(undefined)` tests the
  string `"undefined"`, which MATCHES `KEY_RE` / `COPY_KEY_RE` (a missing key or copy key passes), and ⛔ flag is checked to be a boolean
  (`answers.ts` encrypts on a TRUTHY `q.sensitive`) — fine for typed code, ⛔ for a JSONB row (QE12 R1). ⚠ `keys.ts`'s comment
  still reads *"⛔ No v4 before row 6-33 except from a Panel decision id"* although v4 exists (`-331`) — stale; AC1 rewrites it.
- **G5 — the pins.** `claim_peer_mesh_replies.questionnaire_version_id` (0156; CHECK `^[a-z_]+\.v[0-9]+$`; pinned at the first save in
  `claim/peer-mesh-reply.ts` via `pinnedVersionFor` — ⛔ injectable registry) and `claim_ground_inspection_questionnaires.questionnaire_version_id`
  (0189; the NARROWER CHECK `^ground_inspection\.v[0-9]+$`; `groundInspectionVersionFor(pinned, pariwarId, registry=…)` in
  `claim/ground-inspection-questionnaire.ts` HAS a seam). ⛔ FK anywhere. ⇒ the id carries ⛔ Pariwar: per-Pariwar and all-Pariwar versions
  share ONE `<kind>.v<N>` sequence (QE3).
- **G6 — the "State Trustee" cannot be granted a Pariwar-wide step.** `rbac/roles.ts`: `state_trustee` = `[CLAIM_APPROVE, MEMBER_SUSPEND,
  MEMBER_VIEW_VALIDITY, NIYAMAVALI_REVIEW, TC_APPROVE]`, `scopeCeiling: 'state'`. `rbac/scope.ts` §RANK-ORDER: *"A grant whose ceiling is
  `state` / `district` / `block` can NEVER satisfy a `pariwar`-dimension check, and NO organizational tree — however complete — changes
  that"*. The precedent for every "State Trustee" Pariwar-wide act: `CYCLE_FREEZE` (6.13) and `CLAIM_R9_VOTE` (6.14) — *"gated on
  pariwar_admin-as-Trustee-Lite; direct state_trustee gating is RANK-ORDER BLOCKED"* (`roles.ts`, the `CYCLE_FREEZE` comment; `CLAIM_R9_VOTE`:
  *"Same Trustee-Lite posture as cycle.freeze"*). `trustee_panel` (pariwar ceiling,
  PROVISIONAL, `-096` cl. 4) is the trust-wide Panel itself — Niyamavali Part 8: *"The Trustee Panel is not the "State Trustee panel" of
  Part 9."* `super_admin` = `PERMISSION_CATALOG.keys` (every key, `global`) — *"No additional Permission required for Superadmin"* is
  automatic.
- **G7 — the word path.** `toWireQuestionnaire(def, memberName)` (`apps/api/src/modules/claims/peer-request-core.ts`) resolves every copy key
  with `t(copyKey, {member}, {locale, namespace:'claim'})` in BOTH `en` and `hi` into `PeerRequestWords {en, hi}`; the inspection GET reuses
  it; the staff view (`peer-answers-assembler.ts`) uses `enWords`. `t()` THROWS on a missing key or missing interpolation param
  (`packages/i18n/src/resolver.ts`); the catalog is a static JSON import ⇒ a staff-written question can ⛔ be a copy key (QE4). ⭐ `t()`'s
  interpolation, exactly: `TOKEN = /\{(\w+)\}/g`, `String(value)`, ⛔ escaping, SINGLE pass (a name containing `{x}` is ⛔ re-scanned); for INTERPOLATION
  it throws ONLY when a param is `undefined` (it ALSO throws on a missing key or namespace — `resolver.ts`) (`''` substitutes cleanly — D11's empty member); `\w` is ASCII ⇒ `{सदस्य}` passes through as literal text. Clients render
  the SERVER's words: mobile `apps/mobile/components/peer-request/PeerQuestionnaire.tsx`, admin `HelplinePeerRequests.tsx` and
  `ground-inspection/QuestionnairePanel.tsx` ⇒ ⛔ app release for a new version. Exactly THREE word sites exist (the local `words` in
  `toWireQuestionnaire`, `enWords` in the assembler and in `claims.ground-inspection.handlers.ts`) — a `copyKey` grep finds ⛔ other.
- **G8 — the synchronous consumers** (each moves to the async reader, QE12): `claim/peer-mesh-reply.ts` (`pinnedVersionFor` + the save
  path), `claim/ground-inspection-questionnaire.ts` (`groundInspectionVersionFor`), `apps/api/src/modules/claims/peer-request-core.ts` (the
  served definition + save pre-check), `peer-answers-assembler.ts` (staff view, two sites), `claims.ground-inspection.handlers.ts` (GET,
  save, completion's discrepancy path), `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts` and `claim-peer-mesh-wa-reminders.ts` (already
  take an injected `deps.questionnaireRegistry` — the hold on `resolveLiveVersion(...) === null` ⇒ `config:questionnaire_unavailable` and on
  `pendingCounselBasisKeys(live)` ⇒ `config:counsel_basis_pending` — ⚠ resolved OUTSIDE any transaction today). ⚠ The jobs' `deps.pool` is
  the **BYPASSRLS service pool** (`claim-peer-mesh-wa-reminders.ts`: *"The BYPASSRLS service pool — the cross-tenant scans and the
  `withPariwarScope` pool"*; `apps/jobs/src/boot.ts` builds it from `SERVICE_DATABASE_URL`, `max: 2`) ⇒ RLS hides ⛔ row from a job: a
  resolver that leans on RLS would see EVERY Pariwar's `made_live` steps (QE12 R4). ⚠ Two consumers have ⛔ transaction today: the
  ground-inspection SAVE resolves AFTER `closeScopeTx(pre)` (`claims.ground-inspection.handlers.ts`), and `familyAccountViews`
  (`peer-answers-assembler.ts`) takes ⛔ database handle (its caller `assemblePeerSection` has `ctx.db` via `run(...)`). Every other site
  already holds one. ⭐ Re-derive the list at
  Task 0.1: `git grep -nE "resolveLiveVersion|getQuestionnaireVersion|QUESTIONNAIRE_REGISTRY|servedDefinition|pendingCounselBasisKeys|pinnedVersionFor|groundInspectionVersionFor|enWords|toWireQuestionnaire" -- apps packages ':!**/tests/**'`
  (the narrow form misses `peer-request-core.ts`'s second pair of sites and three in `claims.ground-inspection.handlers.ts`).
- **G9 — the answer tables admit any key.** `claim_peer_mesh_reply_answers` (0156) and `claim_ground_inspection_answers` (0189):
  `question_key ~ '^[a-z][a-z0-9_]*$'`; the ciphertext CHECKs name ONLY the ruled sensitive keys (0158: `death_date`, `death_cause`,
  `death_illness`; 0189: `death_cause`, `death_illness`) ⇒ for a chain question the ONLY guard that its answer is encrypted is the
  definition's `sensitive` flag (QE8). `value_code_indexes` are admitted ONLY on `death_cause` / `death_illness` (both tables);
  `death_date_window_indexes` ONLY on `death_date`. `answerCodeIndexInputs` keys on the fixed `PEER_MESH_HEALTH_QUESTION_KEYS`, ⛔ the
  `health` flag ⇒ a chain health question gets ⛔ indexes (correct — it is ⛔ compared).
- **G10 — the save contracts.** `GroundInspectionSaveAnswerRequest = { codes }.strict()` and `PeerRequestSaveAnswerRequest = { value }.strict()`
  carry ⛔ the version the client rendered; `GROUND_INSPECTION_QUESTIONNAIRE_STALE_CODE = 'ground_inspection.questionnaire_stale'` exists.
  `PeerRequestQuestionnaire` (`{ versionId, pages, closingNote, thankYou }`) is ⛔ `.strict()`.
- **G11 — maker-checker precedents.** (a) Niyamavali drafts (2.4, ADR-0021): `draft → in_review → signed_off → published`, any edit clears the
  sign-off, `DraftSelfReviewError` (app code), one open draft (partial unique). (b) Nominee corrections (6.20, 0119): DB CHECK
  `nominee_corrections_distinct_approvers_check` + app `refuse('same_approver')`. (c) Approval-warning reasons (6.23a, 0142): code constant +
  per-Pariwar rows, replaced ⛔ edited, append-only trigger. (d) Helpdesk routing policy versions (10.1, 0084 / ADR-0038 posture): append a
  version, ⛔ mutate, ⛔ retroactive. (e) Feature flags (10.8, 0087): `pariwar_id NULL` = global row, SELECT `OR pariwar_id IS NULL`, INSERT ⛔
  NULL leg, global writes via `deps.serviceDb.transaction` under `requireGlobalPermission` (`feature-flags/handlers.ts`). ⚠ The tone-review
  gate (ADR-0019, `tone-review/gate.ts`) is non-author, default-deny — a single-admin Pariwar cannot publish (PO-ratified for 10.5 / 10.9 /
  10.15).
- **G12 — config surfaces do ⛔ use `events_log`** (it holds the domain event prefixes only — `alert`, `claim`, `contribution`, `cycle`,
  `helpdesk`, `member`, `pool`, `reconciliation` — `packages/events/src/registry.ts`); they use their own table + audit
  (`audit.withCompensatingAudit`, ADR-0030 — its actions are FREE strings checked against `/^[a-z0-9_]+(\.[a-z0-9_]+)+$/`
  (`audit/write.ts`); on the global path `auditIntent.pariwarId` is `ADMIN_GLOBAL_NAMESPACE` (`feature-flags/handlers.ts`) — or post-commit
  `emitAuthAudit` with a closed `AuthAuditEventType` union in `apps/api/src/audit/audit-sink.ts`, needed ONLY for read lines). Attribution = `getDisplayName(deps.pool, actorId)`; missing ⇒ `AdminDisplayNameMissingError` (409);
  ⛔ email-derived ([[project_admin_display_name_attribution]]).
- **G13 — the pure engine is fenced.** `packages/domain/tests/questionnaires/questionnaires.test.ts` proves `questionnaires/index.ts` reaches ⛔
  PACKAGE at all (the reachable-package set is asserted EMPTY — so ⛔ zod either) and ⛔ `db.ts`; ⚠ the scan starts at `index.ts`, so a new
  file there (e.g. `derive.ts`) is fenced ONLY if `index.ts` re-exports it (Task 1); `claim/approval-warnings.ts` and `claim/inspection-discrepancy.ts` import `keys.ts` as a leaf ⇒ a DB reader
  can ⛔ live in `questionnaires/`.
- **G14 — the admin app.** Vite + React 19, TanStack Router (code-based, `apps/admin/src/router.tsx`, pages `/p/$pariwarId/<feature>`),
  TanStack Query 5 (`src/api/hooks.ts`), react-hook-form + zod, `apiFetch(path, schema, init)` + `ApiError` in `src/api/client.ts`,
  module-local English `i18n-en.ts` (admin chrome stays OUT of `@twt/i18n`). Nav in `src/routes/RootLayout.tsx` — a Pariwar-grant link is
  ungated (the server's 403 is the boundary). Closest editors: `src/modules/surveys/` (`SurveyEditor.tsx`), `src/modules/niyamavali-admin/`
  (`DraftForm.tsx`, `DiffPanel.tsx`), `src/modules/approval-warning-reasons/`.
- **G15 — Epic and records.** `### Story 6.33` in `epics.md` — ⛔ at the pin; ADDED at Task 0.4 (`577a4ca2`). `deferred-work.md` names this row in THREE items: the
  *"Has the family filed any other claim for this death?"* item (trigger: this row `done`), D5, and *"An optional multi-select answer, once
  given, can never be CLEARED"* (trigger: *"row 6-33's questionnaire versions revisiting the answer model"* — this story does ⛔ revisit the
  answer model ⇒ disposition: stays open, trigger re-pointed). Two more triggers this story FIRES or may fire: 6.32 D11 (*"any change to
  `toWireQuestionnaire`"* — QE4 changes it and FIXES D11) and D8 (*"any change to `peer-mesh-reply.ts`'s pre-read"* — QE12 R7 fires and FIXES it) ⇒ each gets a recorded
  disposition (AC13). Further triggers this story FIRES (it changes `peer-answer-editor.ts`'s queue and drain — QE12 R7): **D10** (*"any
  change to the editor's queue, or a report of a stuck "retrying" after a discard"*), the 6.27a item *"The operator's Retry can still send a
  dependant ahead…"* (*"the next change to the editor's drain loop"*), and — if the mobile slot / `classifyFailure` is touched — **W3** and
  **W9** (*"the next touch of the slot"*). Roster Row 27 note (4) and Row 42's `cross_story_discharge_path` name this row's cost.
- **G16 — the answer read caps were sized for SEVEN questions.** `claim/peer-mesh-reply.ts`: `PEER_CONSOLE_ANSWERS_CAP = 100` (*"≤ 5 replies
  × ≤ 7 questions today"*; `readPeerAnswersForClaim` does `LIMIT n` with ⛔ "more rows" signal ⇒ the staff view silently LOSES answers past
  it), `PEER_LIVE_ANSWERS_CAP = 50` (the writer's live read — truncation makes `showIf` and dependant-superseding run on partial data),
  and `claim/ground-inspection-questionnaire.ts`: `CLAIM_FAMILY_ACCOUNT_ROWS_CAP = 200`, `GROUND_INSPECTION_LIVE_ANSWERS_CAP = 50` (*"A visit
  holds at most three ruled answers"*). ⇒ QE8's per-version question cap (≤ 20 incl. the ruled ones: 5 replies × 20 = 100).
- **G17 — the clients' editor.** `packages/api-client/src/peer-answer-editor.ts`: `shouldRetry` is an INJECTED boolean option (⛔ a shared
  function) and the catch can only RETRY or record a FAILURE; each client passes its own predicate (mobile `PeerQuestionnaire.tsx`
  `classifyFailure(err) === 'retry'`, admin `QuestionnairePanel.tsx`, `HelplinePeerRequests.tsx`); each client builds the editor ONCE (in
  `useState`) with a fixed `questions` list ⇒ a refetch never reaches it. Mobile: `PeerRequestFailure` (`lib/peer-request.ts`) has ⛔
  `'reload'`; `classifyFailure` has FIVE call sites in `PeerQuestionnaire.tsx` (two on the load path — `retainLoaded` keys on `=== 'retry'` — the
  `shouldRetry` predicate, the save line, and submit). The mobile DETAIL query
  (`usePeerRequestQuery`) uses `PEER_REQUEST_CACHE_OPTIONS` = `{ gcTime: 0, staleTime: 0 }`, `retry: false`, and saves `cancelQueries` it;
  `staleTime: Infinity` is the BY-LINK query (`usePeerRequestQueries.ts`). Step-up: `requireStepUp(deps, actionContext: string)`
  (`step-up/gate.ts`) — a FREE string (⛔ closed union), 403 `StepUpRequiredError(actionContext)`; the admin precedent for handling it is
  `ApprovalWarningReasonsPage.tsx`. `apiFetch` is module-private to `apps/admin/src/api/client.ts` ⇒ new client functions live in that file.

## ⚖️ Build decisions QE1–QE17 (ANSWERED 2026-10-30 — ALL AS RECOMMENDED; recorded by `2026-10-30-421`)

> ⭐ The FOUR real asks are **QE5, QE6, QE10, QE14**. The rest are the author's calls with a stated default; answering "as recommended"
> takes every (A). ⛔ Silently pick: an option not taken is recorded in the author-commit as not taken.

**QE1 — one story, phased (recommended) or a split.** (A) One story; Tasks are phased so the substrate (Tasks 1–4) lands and is green before
the chain and the editor (Tasks 5–8). *Cost:* one large diff and one review. (B) Split 6.33a (versions in the DB + async resolver + words)
and 6.33b (the chain + the editor). *Cost:* 6.33a ships a source nothing writes (a substrate without a producer); two governance rounds.

**QE2 — storage: code versions stay code; two append-only tables (recommended).** (A) `questionnaire_versions` — one IMMUTABLE row per
version: `id uuid`, `kind`, `version int`, `version_id text UNIQUE` (`<kind>.v<N>`), `base_version_id text` (what it was started from — a
code or DB version), `ruled_base_code_version_id text` (the CODE version whose ruled questions this one carries — QE5 / TR11),
`origin_pariwar_id uuid NULL` (NULL = written at all-Pariwar scope by the Super Admin), `definition jsonb` (the
`QuestionnaireDefinition` minus `scope` / `status` — a version may be live for P1 AND for all, so neither has one value; the reader serves a
DB definition with the constant `scope: { kind: 'all' }`, `status: 'live'` and ⛔ consumer outside `registry.ts` may read either — QE12 R1),
`authored_by_actor`, `authored_by_display`, `authored_at` (DB time),
`direct boolean` (the Super Admin's direct path), `reason text NULL`. And `questionnaire_version_steps` — the chain's log, one row per step:
`id`, `version_id`, `step` ∈ `proposed | approved | returned | withdrawn | made_live | pariwar_reverted`, `target_pariwar_id uuid NULL`
(RESOLUTION only — for `made_live`: NULL = all Pariwars; for `pariwar_reverted`: the Pariwar; NULL on the other four steps),
`scope_pariwar_id uuid NULL` (TENANCY only — for `proposed / approved / returned / withdrawn`: the version's `origin_pariwar_id`; for
`made_live / pariwar_reverted`: the target; NULL ⇔ written through the global path — QE11), `actor`, `actor_display`, `note text NULL`,
`hindi_reviewed boolean` and `classification_attested boolean` (both required true on every `approved` step — QE9 / QE10; NULL on every
other step), `seq bigint GENERATED ALWAYS AS IDENTITY` (THE order), `at timestamptz DEFAULT clock_timestamp()` (display only). ⭐ "Newest"
and "followed by" mean by `seq`, ⛔ by `at`: QE7 (b)/(c) write three steps in ONE transaction (`now()` ties — [[project_db_clock_ordering_tests_tie]]),
and across transactions `now()` is the transaction START, so a step that waited on the lock could sort before the one it follows. Every
step is inserted AFTER its advisory locks are held: ⭐ EVERY step write — incl. `approved` / `returned` / `withdrawn`, which take neither
QE3's nor QE7's lock — first takes `pg_advisory_xact_lock(hashtext('questionnaire_step:' || version_id))` and only THEN reads the state
machine (⛔ `SELECT … FOR UPDATE` — the tables have ⛔ UPDATE grant); ONE fixed order everywhere: QE3 numbering → QE7 live (the `:all` key
before a Pariwar's) → the step lock ⇒ `seq` order = commit order per version and per (kind, target), and a withdraw racing a make-live
(or an approve racing a return) serializes — one of them sees the other's step and refuses (AC8 state machine). A `pariwar_reverted` step
carries the `version_id` of the Pariwar-own version it ENDS. Current state is DERIVED from the steps; ⛔ status
column. Both tables: append-only trigger, ⛔ UPDATE / DELETE grants. *Cost:* state is a query, ⛔ a column. (B) One table with a status
column + a column-scoped guard. *Cost:* a mutable status on a governance record (the CHECK-vs-UPDATE trap class). (C) Move the five code
versions into seeded rows. *Cost:* re-homes reviewed versions and their pins; a fresh database needs a seed to serve anything.

**QE3 — numbering: two disjoint ranges, taken at creation (recommended).** (A) DB versions number from a FLOOR of **1000**
(`version >= 1000`, a CHECK): a new DB version takes `max(999, DB max) + 1` for its kind under
`pg_advisory_xact_lock(hashtext('questionnaire_version:' || kind))` — the SAME key on the tenant and the global path (⚠ ⛔ the repo's bare
`hashtext(pariwarId)` form: it would collide with the degraded-mode and nominee-masking locks); a `23505` on `UNIQUE(kind, version)` is the
backstop, retried inside a SAVEPOINT ([[project_domain_limit_clamp_and_savepoint_retry]]); the validator REFUSES a CODE version `>= 1000`; a
BOOT-time assertion — wired into `apps/api` `src/index.ts` `main()` (after `createDeps` — ⛔ `server.ts`'s `buildServer`, which every integration spec builds) AND
`apps/jobs` `src/boot.ts` `main()` — fails if any code `versionId` exists in
`questionnaire_versions` (⛔ a migration-time check: a migration cannot see the code registry). ⚠ Why a floor and ⛔ "max(code, DB)
+ 1": the repo cannot know production's DB max, so the next reviewed code version (e.g. a counsel-basis `peer_mesh.v5`) could take an id
the DB already holds and every reply pinned to it would be read under the wrong questions — the code registry's duplicate check sees only
code, `UNIQUE(version_id)` sees only DB rows. A returned or withdrawn version leaves a GAP (allowed, shown in history). The pin columns,
both CHECKs and the validator's `versionId === ${kind}.v${version}` rule stay unchanged. *Cost:* ids like `peer_mesh.v1000`; visible
gaps. (B) Number at make-live. *Cost:* an unpublished proposal has no id; approvals and the editor need a second identifier.

**QE4 — words: chain text is STORED, in both languages; ruled questions keep their copy keys (recommended).** (A) `QuestionDefinition` /
`QuestionOption` gain `text?: { en: string; hi: string }`; the validator requires EXACTLY ONE of `copyKey` / `text` — by `typeof … ===
'string'` / `typeof … === 'object'`, ⛔ truthiness (G4) — (both strings non-empty, trimmed, ≤ 500 chars; EVERY `{…}` in `text.en` /
`text.hi` must be exactly `{member}` — `/\{[^}]*\}/g` matches only `{member}`, so `{name}`, `{सदस्य}` and a stray `{` pair are refused,
since `t()`'s ASCII `\w` would leave `{सदस्य}` as literal text — G7); `closingNoteCopyKey` / `thankYouCopyKey` stay copy keys (inherited —
QE5). ONE word function serves every reader — extend the existing resolution in `toWireQuestionnaire`, the assembler's `enWords`
(`peer-answers-assembler.ts`) AND the ground-inspection handler's own `enWords` (`claims.ground-inspection.handlers.ts` — the discrepancy
result's family words) — three sites, one function (6.32 IQ9: ⛔ a second resolver); `{member}` in stored text is substituted with the SAME semantics `t()` applies (single pass, ⛔ escaping — G7).
⭐ **D11 is FIXED here, ⛔ inherited:** an empty member name would otherwise reach every staff-written `{member}` question too. The ONE word
function substitutes a fallback word when the name is empty — a NEW copy key in `@twt/i18n`'s `claim` namespace (en *"the member"*, hi *"सदस्य"* —
HUMAN-REVIEWED by BigDev 2026-10-30, `6-33-hindi-review-member-fallback-word.md`) resolved through the REAL `t()` with a real-`t()` test leg ([[feedback_stub_must_call_not_transcribe]]),
for copy-key and stored text alike ⇒ D11 Closed by 6.33 (AC13). The fallback is applied IN the ONE word function — ⛔ by changing
`resolvePeerRequestMemberName`'s `''` contract (a state — ⛔ KYC row, the erasure sentinel — and a fault — a failed decrypt — stay
distinguishable; touching that function fires the governance branch's "failed decrypt shown as a BLANK" deferred item, AC13). Each
substitution logs `questionnaire.member_name_fallback` (ids only) — BigDev: *"this better be rarest of rare"* — so how often it happens is
OBSERVABLE.
`approvedBy` admits a chain record: the literal form `chain:<questionnaire_versions.id>` (validator regex), alongside the Panel ids. The
VERSION-level `approvedBy` of a DB version (also checked by `checkApprovedBy` — G4) = the ruled base code version's Panel ids + the
server-stamped `chain:<this version's id>`.
⭐ **What a "chain question" IS is decided by ORIGIN, ⛔ by `approvedBy`:** the validator takes the origin as input (`{ origin: 'code' | 'db' }`);
in a DB-stored version EVERY question whose key ∉ the kind's ruled set is a chain question — it carries `text` (⛔ `copyKey`) on itself and
every option, and its `approvedBy` is exactly `['chain:<this version's id>']`, STAMPED BY THE SERVER, ⛔ accepted from the client — the writer generates `questionnaire_versions.id` APP-side (`randomUUID()`) BEFORE
stamping and validating (⛔ a DB default); a `{ origin: 'code' }` version citing `chain:` is REFUSED. (Otherwise
a staff question citing `2026-10-10-304` escapes QE8's `sensitive: true` and is stored in clear, and a staff-chosen `copyKey` needing an
unknown interpolation param makes `t()` throw on every GET of that Pariwar's questionnaire.) *Cost:* two word sources behind one function. (B) Mint copy keys into a DB catalog read by `t()`. *Cost:* changes `@twt/i18n`'s static
contract and its parity gate for every surface.

**QE5 — what the chain may change (⭐ REAL ASK).** (A, recommended) **The Panel's ruled questions are LOCKED**: every ruled question
(`peer_mesh`'s seven; `ground_inspection`'s three) appears in every chain version EXACTLY as in its recorded
`ruled_base_code_version_id` — key, kind, codes, copy keys, flags, `approvedBy` (the validator compares field by field; `counselBasis` of
the two ruled health questions is EXCLUDED and overlaid at read — QE12 R3).
⭐ **ONE definition, used everywhere (Task 1, TR11, QE12):** `ruled_base_code_version_id` := the NEWEST code version of the kind AT WRITE
TIME (= the highest-`version` code definition of the kind with `scope.kind === 'all'`; ⛔ code per-Pariwar version exists — a story that
adds one must state its place in R2); the server REPLACES the submitted ruled questions (and the closing note / thank-you copy keys) with that version's before validating —
⛔ "the code version the `base` chain traces to", ⛔ accepted from the client. The editor therefore always shows the CURRENT ruled questions
locked, and a "with modification" (QE7 (b)) of an approved version on an older ruled base is re-based by that same replacement.
Changing a ruled question's WORDS stays a Panel decision id + a reviewed code version (the v3 / `-328`, v4 / `-331` route) — and when that
new code version ships, every DB version on the OLDER ruled base is STALE: ⛔ resolvable as live (QE12 R2), so each Pariwar falls through
to the next level (ultimately the Panel's new code version) until a rebased version is made live; approve and make-live of a stale version
REFUSE 409 `questionnaire.ruled_base_moved`, which ⛔ acknowledgement overrides (unlike QE7 (e)'s `base_moved`). *Cost of the staleness rule:*
after any new code version of a kind, staff-added questions stop being asked in every Pariwar until the Super Admin (direct) or the chain
re-bases them — disclosed to the Panel (QE14 (2)); the alternative (keep serving the old ruled words until rebased) would let staff-made-live
text outrank the Panel's newer ruling. The chain may ADD, CHANGE, REORDER and
REMOVE its OWN questions (subject to `showIf` order and the page rule); the closing note and thank-you are inherited, ⛔ editable here
(Panel-ruled words — `-304` ruling item 4 — so they are part of the lock, and of QE14 (2)). The
ruled FIXED checks (FQ11 certificate, FQ8 C date and time) are 6.26a / 6.7 code, ⛔ questionnaire questions — ⛔ reachable by the chain
(`-304` reading, already true). *Cost:* NARROWS *"with/without modification"* for the ruled questions — the Panel's ⇒ NON-BLOCKING confirm
(QE14). (B) The chain may reword a ruled question (key, codes, flags still locked). *Cost:* what neighbours and families are asked in words
the Panel ruled changes without the Panel; `-328` sent exactly such a change to the Panel.

**QE6 — who holds which step (⭐ REAL ASK).** (A, recommended) Three new keys (catalog 55 → 56):
`questionnaire.propose` (pariwar dimension) — `pariwar_admin`; `questionnaire.approve` (pariwar dimension) — `pariwar_admin` **acting as
Trustee-Lite for the State Trustee** (the 6.13 `cycle.freeze` / 6.14 `claim.r9_vote` posture, `-305` §1 (c)); `questionnaire.publish`
(GLOBAL — `requireGlobalPermission`) — `super_admin` only (make live, modify at make-live, direct addition, revert). `super_admin` holds all
three automatically. ⛔ granted to `state_trustee` (an INERT grant — G6). **The approver MAY be the author** — ⛔ distinct-approver rule,
⛔ `same_actor` refusal, ⛔ trigger: the `-304` reading says a State Trustee approves *"a Pariwar Admin's proposal or their own"* and counts
*"at least two people (proposer / approver, and the Super Admin)"* — the second person is the Super Admin at make-live; a
"DIFFERENT person must approve" rule is Q8 A, which the Panel did ⛔ take (the `sprint-status.yaml` 6-33 row note says the same). A
single-admin Pariwar can therefore propose and approve alone; ⛔ Pariwar can make anything live alone. *Cost:* the ruled "State Trustee" is
a Pariwar Admin in practice, and one Pariwar Admin can be the whole of the proposer / approver half ⇒ disclosed to the Panel (QE14 (1)). (B) `questionnaire.approve` held by `trustee_panel`. *Cost:* the trust-wide Panel becomes the per-version approver — the very
"every version comes to you" option (Q8 B) the Panel did ⛔ take; the role is PROVISIONAL. (C) Approve held by `super_admin` only. *Cost:*
the chain's middle step disappears into the Super Admin; the State Trustee has ⛔ role at all.

**QE7 — the Super Admin's powers, exactly (recommended).** Every act below runs on the GLOBAL path (QE11, AC8) with a body
`targetPariwarId: uuid | null`, and serializes on `pg_advisory_xact_lock(hashtext('questionnaire_live:' || kind || ':' ||
coalesce(target::text, 'all')))`, taken BEFORE any step is inserted (in (b)/(c) the QE3 numbering lock is taken FIRST, then this one —
one fixed order, ⛔ deadlock). An act for ONE Pariwar ALSO takes the `…:all` key FIRST (its `base_moved` check and the
in-force read see the ALL level), then the Pariwar's; then the per-version step lock (QE2). A version originated in Pariwar A MAY be made
live for Pariwar B — the Super Admin picks any target from the global list / detail. "The version in force" in (d) and (e) means the
R2-RESOLVED version (after R2's skips); revert checks the raw newest own `made_live` (a skipped own version is still revertable).
(a) Make an APPROVED version live for ONE Pariwar or ALL Pariwars (`made_live`, `target_pariwar_id` = the Pariwar | NULL). ⚠ "ALL" sets the
DEFAULT level: a Pariwar with its OWN version in force keeps it (resolution is Pariwar-first — QE12 R2). The make-live-for-ALL screen lists
*"N Pariwars keep their own version: [names]"* before the confirm. Whether "for all pariwar" should also end those own versions was
put to the Panel (QE14 (3)) — ✅ RATIFIED by `-422` Q3 A: it does ⛔ (the default level, as built).
(b) "With modification": a NEW version authored by the Super Admin, `base` = the approved one, made live in the SAME transaction (its own
`proposed` + `approved` + `made_live` steps by the Super Admin, `direct: true`, `hindi_reviewed` AND `classification_attested` recorded on
its `approved` step — AC2's CHECK requires both — a REQUIRED `reason`). > ⭐ **2026-10-30 annotation (code review round 3, RTQ2 (A) — BigDev *"1, 1"*; patch RT7, RF7):** "the approved one" is ENFORCED by the
> writer: a direct version's base is a CODE version or a database version whose stage is `approved` or `published` — ⛔ `proposed` /
> `returned` / `withdrawn` (422 `questionnaire.base_invalid`), read under the base's step lock; and the page offers the Super Admin
> "New version" only from such a base (RF1). *Cost:* reworking a returned proposal means copying its words into an edit of an approved base.
(c) "Add question directly and make it live": author + make live
alone — the SAME three steps as (b), `direct: true`, a REQUIRED `reason` (≤ 500 chars) shown in history, both ticks on its `approved` step
(so the state machine's "`made_live` only from `approved`" holds on every path). A plain make-live (a) records NEITHER tick (both NULL —
the approval already attested; the make-live screen still shows every badge and the QE10 counsel warning).
(d) Revert a Pariwar to the all-Pariwar level (`pariwar_reverted`, carrying the `version_id` of the Pariwar's own version in force that
it ends — QE2). REFUSES 409 `questionnaire.nothing_to_revert` when the Pariwar has ⛔ own version in force. A version MAY be made live again
for a target it was reverted from (a new `made_live` step). ⚠ There is ⛔ "revert ALL to code" step: a bad all-Pariwar version is replaced
by a NEW direct version based on the code version in force (the remedy, stated as the cost).
(e) Make-live REFUSES 409 `questionnaire.base_moved` when the version's `base_version_id` ≠ the target's version in force, unless
`acknowledgeBaseMoved: true` — otherwise a stale proposal silently drops the other version's changes. ⚠ ⛔ to be confused with
`questionnaire.ruled_base_moved` (QE5), which ⛔ acknowledgement overrides.
(f) Make-live and revert require step-up (`requireStepUp(deps, 'questionnaire_publish')`) — they change what families are asked from that
moment. ⚠ `actionContext` is a free string (G17); one context for both means ONE elevation covers make-live AND revert for its window
(~5 min) — accepted and stated; ⛔ a second context.

**QE8 — what a chain question may be (recommended; enforced IN THE VALIDATOR for code and DB versions alike).** THE checklist — C1–C8 and C10 are VALIDATOR rules
(an AC1 leg + an AC12 mutant each); C9 is the separate warnings function; C11 is the API's audit counts (an AC4 leg); C12 is editor
guidance (an AC9 render assertion, ⛔ mutant — it is ⛔ mechanizable). A CHAIN question (QE4: decided by ORIGIN — a non-ruled-key question
in an `{ origin: 'db' }` version):
- **C1 key** ∉ every ruled / warning / comparable / health key set of BOTH kinds, ∉ `callback_consent`; ≤ 64 chars (the neighbours' wire
  limit `PeerRequestAnswerPathParams .max(64)`; the ground-inspection path param has ⛔ max — 64 is applied to both kinds for one rule).
- **C2 kind** ∈ `single | multi | yes_no` — ⛔ `date`. (Why: `GroundInspectionSaveAnswerRequest` takes ONLY `{ codes }`, so a
  ground-inspection date cannot be saved; a neighbours' non-`death_date` date WOULD store — encrypted, ⛔ indexes (`answers.ts`) — but one
  rule for both kinds is kept. ⛔ "the DB admits date indexes only on `death_date`" — that is ⛔ the block.)
- **C3 options** ≤ 20 (`PeerRequestAnswerValue .max(20)`) and, for `ground_inspection`, ≤ `GROUND_INSPECTION_ANSWER_MAX_CODES` (= 10) —
  else a version is served but cannot be saved.
- **C4** `optional: true`; `warning: false`; ⛔ `callbackAudience`; its key is ⛔ comparable (never in discrepancy — I1).
- **C5 `sensitive: true` ALWAYS**, checked as `=== true` (⛔ truthy — G4). G9: the flag is the ONLY guard that the answer is encrypted —
  `answers.ts` decides `q.sensitive ? encrypted : codes`; both writers encrypt on that `storage.form`; every reader (staff view, helpline,
  inspector read-back) and the erasure scrub (`anonymize.ts`, `isNotNull(valueCiphertext)`) decide by ciphertext PRESENCE — traced, all
  correct for a chain answer. `sensitive` drives ⛔ else (⛔ on the wire, ⛔ permissions); `health` is validator-only.
- **C6 alcohol** — `FORBIDDEN_TOPIC_RE` is applied to `text.en` and `text.hi` of every question and option, and gains Devanagari terms
  (शराब, दारू, मदिरा, नशा, ठर्रा) (today it reads only keys, codes and copy keys, Latin only — a stored "Did they drink alcohol?" under key
  `habits` would pass). ⚠ Known FALSE POSITIVE, accepted: the substring form (`/alcohol|drink|liquor|sharab/i`) refuses innocent text
  such as "drinking water" — ⛔ regex separates that from "do they drink?", so the rule stays strict (CF3 (c) is a prohibition) and the
  editor shows the matched term so staff reword ("water source"). ⛔ `\b` for the Devanagari terms (JS `\b` is ASCII-only).
- **C7 health** — QE10.
- **C8 total size** — a version holds ≤ **20 questions IN TOTAL**, the ruled ones included (G16: 5 replies × 20 = the 100-answer console
  cap; the live caps of 50 hold). Also covers architecture §1.7's JSONB limits for this table, with the per-string ≤ 500-char cap (QE4) and
  ≤ 20 options: the definition's size is bounded by construction (⛔ a separate byte cap).
- **C9 hidden dependant** — a chain question whose `showIf` parent is a pending health question is a WARNING, ⛔ a refusal
  (`servedDefinition` drops dependants, so it is silently never shown). The validator returns `string[]` problems only ⇒ a SEPARATE pure
  `questionnaireDefinitionWarnings(def): string[]`, carried as `warnings: string[]` on the propose / approve / make-live responses and shown
  by the editor.
- **C10 placeholders** — QE4 (only `{member}`).
- **C11 counts** — every chain answer is decrypted to be shown. The decrypt counts live on TWO audit lines — `admin_claim.peer_answers_read`
  (`claims.peer-answers.handlers.ts`) AND `admin_verifier_console.read` (`claims.verifier-console.handlers.ts`), both spreading
  `familyAccountAuditCounts`, which counts by the FIXED `GROUND_INSPECTION_SENSITIVE_QUESTION_KEYS`. Keep `family_health_answer_count` as
  is (its name means health); ADD `family_sensitive_answer_count` (family side) and `sensitive_answer_count` (neighbours' side) on BOTH lines,
  counted by "stored as ciphertext" — counted INTERNALLY (from the `claim.ClaimFamilyAccountVisit` rows,
  `valueCiphertext !== null`, or an internal type) — ⛔ a new field on `GroundInspectionFamilyAnswerView` (`.strict()` wire contract in
  `contracts/claims/verifier-console.ts`; two responses and their fixtures — TR3).
- **C12 subject** — editor guidance (QE16): a chain question asks about the DECEASED member, ⛔ about the person answering. ⚠ HAZARD,
  recorded, ⛔ mechanizable: a question about the RESPONDER (a neighbour, the family) stores that person's data, which the erasure scrub
  (deceased member's claims only) does ⛔ reach — the responder-erasure question is already OPEN in `deferred-work.md`.
*Cost:* staff cannot ask a free-text or date question through the chain in this story. Forcing `sensitive` costs a Tier-1 encrypt per save
and a decrypt per staff read; a sensitive `showIf` parent needs a decrypt before the lock; and ONE undecryptable live answer makes EVERY
save on that REPLY a 409-stale (`peer-mesh-reply.ts` `if (v === undefined) throw new PeerRequestStaleError()`); the
ground-inspection save TOLERATES it (the handler passes an unreadable answer as `null` — *"review R2: the letter, or a replacement of that
very answer, still saves"*; only a `showIf` child of it is refused) — more ciphertext, more exposure to that failure. Every chain `multi` question is optional, so the
open item *"An optional multi-select answer, once given, can never be CLEARED"* (and 6.32 D2) now applies to EVERY one of them — stated
where its trigger is re-pointed (AC13).

**QE9 — Hindi (recommended).** Both languages are REQUIRED on every stored string (QE4). The `approved` step — and the Super Admin's direct
path — records `hindi_reviewed = true` with the actor: the screen shows every Hindi line and the approver ticks *"I have read every Hindi
line"*; ⛔ tick ⇒ 422 `questionnaire.hindi_review_required`. This builds `-304`'s unratified reading as written. *Cost:* the approver is the
Hindi reviewer (⛔ a separate translator role). (B) A separate Hindi-review step and role. *Cost:* a fourth step and a role nobody holds.

**QE10 — health questions through the chain (⭐ REAL ASK).** (A, recommended) Allowed — the Panel declined our limit. An author-declared
`health: true` forces `counselBasis: 'pending'`; a chain version may carry a basis ONLY if it is an id in a NEW code-resident
`COUNSEL_BASIS_DECISIONS` list (EMPTY today — adding counsel's recorded basis stays a reviewed code edit, exactly as Row 27 (f) / Row 42 (a)
already require). A pending question is SKIPPED in the served form (`servedDefinition`, unchanged). For `peer_mesh`, a version in force with
ANY pending question HOLDS that Pariwar's texts and WhatsApp reminders (6.27c R11, unchanged) — ⭐ the make-live screen says, before the
confirm, for `peer_mesh`: *"This version has a health question that counsel has not yet cleared. Until counsel's basis is recorded, the
neighbours in [this Pariwar / every Pariwar] will not be texted and the question will not be shown."*; for `ground_inspection` (⛔ texts —
the question is simply skipped): *"This version has a health question that counsel has not yet cleared. Until counsel's basis is recorded,
the question will not be shown at the visit in [this Pariwar / every Pariwar]."* (the stated cost; both verbatim — AC9). ⚠ HAZARD, recorded, ⛔ mechanizable:
`health` is author-declared — a health question labelled non-health bypasses counsel; mitigation: the approve and make-live screens list
every question with its classification badge, and every `approved` step (incl. the direct path's — QE7 (b)/(c)) records
`classification_attested = true` (a second tick, *"I have checked which questions are about health"*; ⛔ tick ⇒ 422
`questionnaire.classification_attestation_required`); a plain make-live records ⛔ tick (QE7 (a)). *Cost:* a mislabel is a human control. (B) Refuse chain
health questions in this story. *Cost:* narrows the Panel's chain (it declined that limit with the limit in front of it) ⇒ the Panel's.

**QE11 — tenancy (recommended).** (A) `questionnaire_versions`: SELECT open to `twt_app` in every tenant transaction (`USING (true)`) — a
Pariwar's pinned version can originate in ANOTHER Pariwar (made live for all) and must resolve under the reading Pariwar's RLS; question
text is reference data every tenant already reads from the code registry; INSERT `WITH CHECK (origin_pariwar_id = <current> AND NOT
direct)` — EVERY direct version (QE7 (b)/(c), for one Pariwar or all) is inserted through the global path (`deps.serviceDb` under
`requireGlobalPermission` — the feature-flags precedent) with an explicit `origin_pariwar_id` (the target Pariwar, or NULL for all), so
`twt_app` can ⛔ write `direct: true` (a live-DB leg proves the refusal as `twt_app`).
`questionnaire_version_steps`: SELECT `USING (scope_pariwar_id IS NULL OR scope_pariwar_id = <current>)`; INSERT
`WITH CHECK (scope_pariwar_id = <current> AND step IN ('proposed','approved','returned','withdrawn'))` — `made_live` /
`pariwar_reverted` and a NULL scope ONLY via the global path; `<current>` is the house form
`nullif(current_setting('app.pariwar_id', true), '')::uuid` (as in `0004` and `policies/feature-flag-versions-rls.ts`; the policy file is
`packages/domain/src/policies/questionnaire-versions-rls.ts`). ⚠ The policies key on
`scope_pariwar_id`, ⛔ `target_pariwar_id` (which is NULL on propose / approve / return / withdraw — keying on it would refuse every Pariwar
Admin's own step). The API ⛔ lists another Pariwar's open proposal to anyone but
the Super Admin. *Cost:* drafts are readable cross-tenant at the DB layer (an API filter, ⛔ RLS, hides them). ⚠ ACCEPTED: in Pariwar B, the
history of a version proposed and approved in Pariwar A and made live for ALL shows only the steps B can see (`made_live` for all); the
page renders the missing part as *"Proposed and approved in another Pariwar"* — ⛔ a serviceDb read to fill it (the Super Admin sees the
full history through the global list route). (B) Every read through
`serviceDb`. *Cost:* a tenant read path bypasses RLS (architecture §1.2 names cross-tenant reads as a named surface).

> ⭐ **ANNOTATION 2026-10-30 (code review RV2 / RP20) — QE11 (A)'s steps SELECT is now THREE legs, ⛔ two.** `USING (scope_pariwar_id IS NULL OR scope_pariwar_id = <current> OR "questionnaire_version_steps"."version_id" IN (SELECT v."version_id" FROM
> "questionnaire_versions" v WHERE v."origin_pariwar_id" = <current>))` — the ORIGIN Pariwar reads EVERY step of a version it originated. Why: QE7 lets a Super Admin make P's version live for Q; that step is scoped to Q, so P's handle could not see it, `stageOf`
> read `approved`, and P's author could WITHDRAW a live version. **What it exposes at the DB layer:** the origin can read, for a `made_live` / `pariwar_reverted` aimed at ANOTHER Pariwar, the target's uuid, the Super Admin's actor id and display name, and the time. **What still withholds it:**
> the API — `shownSteps()` filters every step list (`summaryOf`, `detail`'s 404 rule, `historyElsewhere`) to scope-null or the viewer's own; the one derived fact the origin now learns is `stage = published` (the version is live somewhere), not where or by whom.
> **Re-examine when** any new consumer returns step rows from a TENANT handle — it must filter them the same way. (Migration 0192 was amended in place: unmerged, applied only in this story's container.)

**QE12 — the async resolver, the call sites, the flip, D5 (recommended).** (A) A new db-touching module
`packages/domain/src/questionnaire-versions/` exports `resolveLiveQuestionnaire(db, kind, pariwarId)` and
`getQuestionnaireDefinition(db, versionId)`. The rules, numbered — AC3 / AC4 / AC5 cite them:
- **R1 — parse.** A DB row's `definition` is parsed by a STRICT Zod schema in `questionnaire-versions/` (`.strict()` at every level, typed
  booleans, unknown fields refused — ⛔ in `questionnaires/`, whose fence forbids every package, G13), then run through the SAME
  `assertValidQuestionnaireDefinition` with `{ origin: 'db' }`, validated against ITS OWN recorded `ruled_base_code_version_id` (⛔ later
  code — TR11). The served object carries `scope: { kind: 'all' }`, `status: 'live'` (constants — QE2). A code `versionId` resolves from
  the code registry.
- **R2 — live resolution.** P's OWN version = the `version_id` of the newest (by `seq`) `made_live` step with `target_pariwar_id = P`,
  PROVIDED no `pariwar_reverted` step with `target_pariwar_id = P` has a greater `seq` → else the newest `made_live` with `target_pariwar_id
  IS NULL` → else the code registry's live version. A candidate is SKIPPED (the next level is used) when it fails R1 OR its
  `ruled_base_code_version_id` ≠ the newest code version of its kind (STALE — QE5). Two live at one level is impossible by construction
  (newest wins).
- **R3 — counsel's basis overlay.** At read, the ruled health questions' `counselBasis` (`death_cause`, `death_illness`) is overlaid from
  the NEWEST code version of the kind — so recording counsel's basis by an IN-PLACE reviewed code edit (Row 27 (f) / Row 42 (a)) reaches
  every DB version in force exactly as it reaches `peer_mesh.v4` / `ground_inspection.v1` today; the ruled-question lock therefore EXCLUDES
  those two fields' `counselBasis`. ⚠ ⛔ "6.32 D3's disposition applies equally": D3's remedy is that the basis edit MINTS
  `ground_inspection.v2` (new visits only). Under R2 a minted version makes every DB version stale (they fall through to it — new visits
  only, as D3 wants); an IN-PLACE edit, by contrast, reaches visits ALREADY PINNED to a DB version mid-visit through this overlay — exactly
  as it would reach visits pinned to v1. State whichever route counsel's edit takes in its own story.
- **R4 — explicit Pariwar predicate.** Every resolver query names the Pariwar in SQL (`target_pariwar_id = $pid OR target_pariwar_id IS
  NULL`, `scope_pariwar_id` likewise) — ⛔ leaning on RLS. The jobs' pool is BYPASSRLS (G8): RLS hides ⛔ row there, so an RLS-reliant
  resolver would see EVERY Pariwar's own versions.
- **R5 — every consumer, in a transaction.** Every G8 consumer moves to the reader inside its existing transaction; the two without one
  (G8) gain one: the ground-inspection SAVE resolves INSIDE `pre` (before `closeScopeTx(pre)`), and `assemblePeerSection` pre-reads the
  visits' definitions through `run(...)` and hands them to `familyAccountViews` before decrypting. **The jobs:** the questionnaire is resolved in `pariwarConfig` (`claim-peer-mesh-requests.ts`) and
  `peerMeshWaReminderConfig` (`claim-peer-mesh-wa-reminders.ts`) — both called by the sweep's gap check AND the child's race guard, OUTSIDE
  any handle today; the begin callback (`(_db, client) => claimDomain.beginPeerMeshRequest(client, …)`) resolves ⛔ questionnaire. ⇒ move
  the versions read INTO the existing `withPariwarScope(deps.pool, pid, db => resolvePariwarDefaultLocale…)` callback inside those two
  functions (ONE connection; ⛔ a nested second `withPariwarScope` — two connections on the `max: 2` pool —
  [[project_jobs_pool_two_connection_starvation]]; ⛔ the begin path); `withPariwarScope` is kept because the read needs a transaction,
  ⛔ for visibility. A failed versions read is classified LIKE the locale read's fault — ⚠ TWO classes: `PeerRequestLocaleReadError`
  (requests) and `PeerMeshWaReminderLocaleReadError` (WA reminders); the requests sweep rethrows anything else (failing the run) while the
  WA sweep catches all, and in BOTH children a locale fault becomes `ClaimCorrectionTransientError` (a pg-boss RETRY) — ⇒ the versions
  fault joins the SAME class per job (sweep: that Pariwar's gap recorded, the run continues; child: retried), ⛔ a new rethrow. The jobs'
  `deps.questionnaireRegistry` seam becomes this reader. A Pariwar-only version with a pending health question must hold THAT Pariwar's
  texts (CF3 (d)) and ⛔ another's.
- **R6 — the sync fence (I6).** ⛔ non-test code outside `questionnaire-versions/` and the code registry's own module calls the sync
  `resolveLiveVersion` / `getQuestionnaireVersion`.
- **R7 — the flip.** Both save requests gain an OPTIONAL `questionnaireVersionId` (what the client rendered).
  (i) Both domain writers take the handler's PRE-READ `versionId`; UNDER THE LOCK they resolve the ONE definition that will be pinned (the
  existing pin, else the version in force read in the locked transaction) and compare it with the pre-read id AND, if sent, the client's
  id ⭐ IMMEDIATELY after resolving it — BEFORE the live-answers read, `checkAnswer` and the three `prepared …` checks (form, codes, date /
  code indexes) in EACH writer (`peer-mesh-reply.ts`, `ground-inspection-questionnaire.ts`): after a flip that removes or reorders a chain
  question those would otherwise fire first (a 422, or a bare `Error`). Plumbing: `prepareSave` (`peer-request-core.ts`) returns the
  pre-read `def.versionId`; the ground-inspection writer's input gains a version field (its pre-read is the separate `pre` transaction; the
  peer pre-read and write share `onMemberTx`). (ii) Mismatch with the client's id ⇒ 409 with NEW codes `peer_request.questionnaire_version_stale` /
  `ground_inspection.questionnaire_version_stale` (⛔ reuse of `peer_request.stale` / `ground_inspection.questionnaire_stale`, which every
  client RETRIES). (iii) Field ABSENT (installed apps) and the pre-read ≠ the pinned definition ⇒ the EXISTING retryable stale code
  (today's behaviour — 6.27b 3c.2's accepted hazard for old clients; a version-stale code would make an old mobile app retry forever).
  (iv) This makes all SIX bare `Error`s (three `prepared …` checks per writer, e.g. `'[peer-request] prepared form does not match the
  answer'`) unreachable on a flip — a 500 today, reachable on every routine flip ⇒ **D8 fired and fixed here**, and **D5** (the concurrent first pin) returns the same 409, ⛔ a 500.
  (v) A pinned version that FAILS R1 at read is served READ-ONLY (staff view, read-back) — saves to it REFUSE 409 with NEW codes
  `peer_request.questionnaire_version_unreadable` / `ground_inspection.questionnaire_version_unreadable` (⚠ ⛔
  `ground_inspection.questionnaire_unavailable` — that code ALREADY exists as a 404 meaning "⛔ panel", and `QuestionnairePanel.tsx` renders
  nothing on it; it is UNCHANGED), which clients map to their existing terminal
  (closed / not-openable) state, ⛔ reload (a reload returns the same pin — a loop), ⛔ retry; logged + the R8 alarm.
  **The clients (G17):** ⭐ each client — mobile, `QuestionnairePanel.tsx`, `HelplinePeerRequests.tsx` — SENDS `questionnaireVersionId` = the
  rendered `questionnaire.versionId` on EVERY save (without it (ii) never fires and the reload path is dead code). `PeerAnswerEditor` gains a THIRD outcome — an injected `isReload(err)` option and a `'reload'` snapshot state (the
  catch today can only retry or fail); each client REBUILDS the editor keyed on `questionnaire.versionId` after refetching, carrying over
  drafts whose key is still in the new version and dropping the rest. Mobile: `'reload'` joins `PeerRequestFailure`; `classifyFailure`
  maps the version-stale codes to it at all FIVE call sites (incl. both load-path sites); the reload explicitly refetches `peerRequestDetailKey`
  (the detail query is `staleTime: 0`, `retry: false`, and saves `cancelQueries` it — ⛔ the by-link query's `staleTime: Infinity`). Admin
  `QuestionnairePanel.tsx` and `HelplinePeerRequests.tsx`: refetch their questionnaire query, rebuild. Deploy order: the server BEFORE a
  mobile build that sends the field (an old `.strict()` server 400s it) — a Row 45 leg (QE15).
- **R8 — the alarm.** A DB version skipped by R2 (invalid or stale) or refused by R7 (v) raises an ops alarm (ids only — ⛔ question text)
  in addition to the log, and the admin page shows *"In force: X — failed validation / out of date, serving Y"* (QE16).
*Cost:* ~10 call sites change from sync to async; three clients gain a reload path and the shared editor a third outcome. (B) Keep the
sync registry and refresh it from the DB on a timer. *Cost:* a window where two processes serve different versions; a cache the code base
does ⛔ have.

**QE13 — the "any other claim?" question (recommended).** (A) ⛔ authored by this story's code or migration (that is the bypass 6.32 IQ2 (C)
rejected). The `deferred-work.md` item's trigger fires at `done` ⇒ annotated *"HOMED: the chain is built; adding it is a Super Admin act
through the editor (direct addition) — ⛔ code. Closes when a live `ground_inspection` version carries it."* (B) Seed it as
`ground_inspection.v2` in the migration. *Cost:* the author adds a question outside the chain the Panel ruled.

**QE14 — the Panel (⭐ REAL ASK).** (A, recommended) A NON-BLOCKING confirm note, from `trustee-panel-routing-note-TEMPLATE.md` (§0 first,
the deciding fact first, an honest cost on every option), drafted at Task 0.4 — ⛔ sent by the agent; BigDev sends. Three questions:
(1) the "State Trustee" step is performed by a Pariwar Admin acting as Trustee-Lite — the system can ⛔ give the State Trustee role a
Pariwar-wide act (G6) — and, as the `-304` reading allows (*"or their own"*), that Pariwar Admin may approve their own proposal, so the
second person is the Super Admin at make-live; disclosed with it, a Pariwar Admin of ONE Pariwar can approve a version the Super Admin then
makes live for ALL Pariwars (§0 edges 1, 2). (2) The words of the questions the Panel ruled — and the closing note and thank-you (`-304`
ruling item 4) — stay with the Panel; the chain adds and changes only its own questions (QE5); and when a new Panel-ruled code version
ships, every staff-made-live version on the older wording stops being served until it is re-based, so staff-added questions pause in every
Pariwar meanwhile (QE5's staleness rule — §0 edge 3a). (3) "Make it live for … all pariwar" sets the DEFAULT: a Pariwar with its own
version in force keeps it (QE7 (a) — §0 edge 3b); option (B): "all" also ends every own version. Build proceeds on the recommendations; a
different answer changes a grant, a validator rule or the resolver and is roster Row 45 (a) — ⛔ go-live before it is answered. *Cost:* the
build may need a follow-up. (B) BLOCKING — ⛔ code before the Panel rules. *Cost:* the row waits for a sitting.
✅ **ANSWERED 2026-10-30 — `2026-10-30-422` (Trustee-ratified, DR + KB), verbatim: *"by DR and KB / Q1 A, Q2(a) A, Q2(b) A, Q3 A"*** — the note's Q1 = (1),
Q2 (a) / (b) = (2), Q3 = (3); every one as built ⇒ ⛔ code change; Row 45 (a) is MET when the row is minted.

**QE15 — go-live: roster Row 45 `questionnaire-editor-live` (recommended).** (a) The QE14 confirm answered and, if it differs, reflected in
code; (b) the real-browser pass (AC11) on the admin surface — propose → approve → make live → a NEW visit / reply is served the new version,
an OLD one keeps its pin; (c) a named Super Admin and at least one approver per launching Pariwar hold the keys (an ops fact, observable by
query); (d) the API server that accepts `questionnaireVersionId` is deployed BEFORE any mobile build that sends it (QE12 R7 — observable:
the deployed API's contract version precedes the store build's); (e) ⛔ chain version made live in production before (a)–(d) are met. Each
leg observable BEFORE the row closes. Merge ≠ go-live ([[project_not_in_production_merge_is_not_golive]]).

**QE16 — the admin page (recommended).** ONE page `/p/$pariwarId/questionnaires`, both kinds: the version IN FORCE for this Pariwar (own or
all-Pariwar — and which; and, when R2 skipped one, *"In force: X — failed validation / out of date, serving Y"* — QE12 R8); every version's
history (each step: who, when, for which Pariwar or all, the note, the reason on a direct one; steps outside this Pariwar's scope shown as
*"Proposed and approved in another Pariwar"* — QE11); open proposals; a read-only render (the English line, the Hindi line beneath — the
6.32 panel's look) with badges — *Ruled (locked)*, *Added by staff*, *Health — counsel pending*, *Answers encrypted*, *Out of date —
rebase*; a per-question change marker against the base (*New*, *Changed*, *Removed*, *Unchanged* — derived by key); the editor (start from
the version in force; the CURRENT ruled questions shown locked — QE5; guidance that a question asks about the deceased member — QE8 C12;
the validator's `warnings` shown — QE8 C9); actions by key — propose, approve (with the QE9 and QE10 ticks), return (note required),
withdraw (author only), make live (scope: *This Pariwar* / *All Pariwars*; for All, the list of Pariwars keeping their own version — QE7
(a); the base-moved acknowledgement; the QE10 counsel warning for the kind; step-up), revert. Step-up: a 403 `StepUpRequiredError`
(`actionContext: 'questionnaire_publish'`) opens the step-up flow and retries the action — the `ApprovalWarningReasonsPage.tsx` precedent
(G17). Nav link ungated (the server's 403 is the boundary). Admin chrome English, module-local `i18n-en.ts`. Per-row actions use per-call
`mutateAsync` ([[project_tanstack_mutate_callbacks_latest_only]]).

**QE17 — audit (recommended).** Every step is written through `audit.withCompensatingAudit` (ADR-0030 — ⛔ step row without its audit line;
it writes the audit INTENT first, then the mutation, then compensates on failure). The composed order, copied from
`claims.peer-request.handlers.ts` `helplineSave` (an admin `/p/` route; the helpdesk member handlers follow the same shape):
`releaseHookTx` → `idempotencyStore.claim` → open the scope tx → `withCompensatingAudit(mutate on that tx)` → COMMIT (`closeScopeTx`) →
`recordResult` → `release` if anything failed. The global routes do the same on `deps.serviceDb.transaction` (feature-flags' GLOBAL flip
commits first). ⚠ ⛔ copy the feature-flags TENANT flip: it mutates on the request's own `scopeTx.tx` and records the result BEFORE that
transaction commits (a window `feature-flags/handlers.ts` itself admits). ⚠ A commit failure AFTER `mutate` returns is ⛔ compensated —
the house's known gap, stated. Actions `admin_questionnaire.{proposed,approved,returned,withdrawn,made_live,pariwar_reverted}` (free strings
matching the audit action regex — G12; `auditIntent.pariwarId` = `ADMIN_GLOBAL_NAMESPACE` on the global path); ⛔ `events_log` (G12). The
steps table IS the durable, attributed record (`-304` reading: *"who proposed, who approved, who made it live, for which Pariwar(s), and
when"*). Attribution = `getDisplayName` snapshot. ⚠ REPLAY differs from `helplineSave` (which records `{ done: true }` and replays by a
fresh live read): propose / direct create a version whose id a replay cannot re-derive ⇒ `recordResult(idemKey, result)` stores the
RESPONSE and a replay returns it (the feature-flags shape).

### The step table (QE2 × QE7 × QE11 × AC2 × AC8 — derived once, here)

> ⭐ 2026-10-30 (RV2 / RP20): the table's tenancy column describes who WRITES a step. The steps SELECT policy also lets the version's ORIGIN Pariwar READ a step scoped to another (a `made_live` elsewhere) — QE11 (A)'s annotation.

| Step | Who / key | Path (DB role) | `scope_pariwar_id` | `target_pariwar_id` | Required columns | Admitted by |
|---|---|---|---|---|---|---|
| `proposed` (version row written with it) | `questionnaire.propose` | tenant (`twt_app`) | origin P | NULL | — | versions INSERT `origin = <current> AND NOT direct`; steps INSERT `scope = <current> AND step IN (the four)` |
| `approved` | `questionnaire.approve` (author MAY approve — QE6) | tenant | origin P | NULL | `hindi_reviewed = true`, `classification_attested = true` | steps INSERT `scope = <current> AND step IN (the four)` |
| `returned` | `questionnaire.approve` | tenant | origin P | NULL | `note` | same |
| `withdrawn` | the author (propose key) | tenant | origin P | NULL | — | same |
| `made_live` for P | `questionnaire.publish` + step-up | global, body `targetPariwarId: P` | P | P | — (ticks NULL) | `serviceDb`, under the live lock (QE7) |
| `made_live` for ALL | `questionnaire.publish` + step-up | global, `targetPariwarId: null` | NULL | NULL | — | same |
| QE7 (b)/(c) direct: version (`direct = true`, `reason`) + `proposed` + `approved` + `made_live` in ONE tx | `questionnaire.publish` + step-up | global | target P or NULL | NULL, NULL, target | `reason`; both ticks on `approved` | numbering lock, then live lock; `seq` orders the three |
| `pariwar_reverted` | `questionnaire.publish` + step-up | global, `targetPariwarId: P` | P | P | `version_id` = P's own version it ends | same; 409 `nothing_to_revert` if none |

Every row also takes the per-version step lock (QE2) before its state check. A NULL-origin version is ALWAYS a direct one (QE7 (b)/(c)) —
⛔ global propose / approve / return / withdraw route exists. The tenant steps policy admits ONLY the four tenant steps; `made_live` /
`pariwar_reverted` are written ONLY through `serviceDb`.

## Invariants (I)

- **I1 — nothing gates.** ⛔ chain version can make any answer a warning, a flag, required, comparable, or a condition of completion,
  approval, refusal, routing or payment. The validator refuses it, and a DB version reaches the SAME validator (AC1, AC12).
- **I2 — every version kept; nothing edited.** ⛔ UPDATE / DELETE on either table; a change is a NEW version; an answer stays tied to its
  pinned version and that version's words.
- **I3 — the ruled questions are in every version, locked** (CF3 (a); QE5 (A)).
- **I4 — a version in progress is ⛔ never served.** Only a `made_live` step makes a version resolvable as live; `proposed` / `approved` /
  `returned` / `withdrawn` versions are readable ONLY by the editor routes.
- **I5 — a health question is ⛔ shown before counsel's basis** (CF3 (d)); ⛔ alcohol (CF3 (c)).
- **I6 — one validator, one live resolver, one word function.** ⛔ parallel copy for DB versions.
- **I7 — a newer version applies to NEW replies and visits only** (PM23 (c); 6.32 IQ12).

## Acceptance Criteria

0. **AC0 — governance first.** ⛔ code before Task 0.3's author-commit (≥ `-421`, committed ALONE, `governance:` prefix) records QE1–QE17
   as answered. Roster Row 45, the `epics.md` `### Story 6.33` entry, the `deferred-work.md` annotations and (if QE14 (A)) the drafted
   confirm note follow it (Task 0.4).
1. **AC1 — the validator admits chain versions and nothing else new.** The validator takes the ORIGIN (`code` | `db`) as input (QE4);
   `approvedBy` admits `chain:<uuid>` alongside the Panel ids; in a DB version every non-ruled-key question is a chain question (`text` ⛔
   `copyKey` on it and every option, `approvedBy` exactly the server-stamped `['chain:<id>']`) and the VERSION-level `approvedBy` = the
   ruled base's Panel ids + `chain:<id>` (QE4); exactly one of `copyKey` / `text` everywhere, by `typeof` (`text` both languages non-empty;
   every `{…}` exactly `{member}`); QE5 (A)'s field-by-field lock of every ruled question AND the closing note / thank-you copy keys against
   the version's recorded `ruled_base_code_version_id` (ruled health `counselBasis` excluded); QE8's VALIDATOR lines **C1–C8 and C10**, each a test
   leg (C5 as `=== true`; C6 incl. the Devanagari terms and the stated false positive; C8 ≤ 20 questions in total); the C9 warnings through
   the separate `questionnaireDefinitionWarnings`; a `{ origin: 'code' }` version citing `chain:` refused; QE10's `counselBasis` rule (`'pending'` or an id in `COUNSEL_BASIS_DECISIONS`, empty);
   a CODE version `>= 1000` refused (QE3); every existing rule unchanged; `keys.ts`'s stale v4 comment rewritten. Every code version still
   validates.
2. **AC2 — the two tables** (migration `0192`, QE2 / QE3 / QE11): append-only triggers (⛔ UPDATE / DELETE), ⛔ UPDATE / DELETE grants, RLS
   ENABLE + FORCE with per-command policies — versions INSERT `origin_pariwar_id = <current> AND NOT direct`, steps keyed on
   `scope_pariwar_id` — in `policies/questionnaire-versions-rls.ts` (house `<current>` form); CHECKs
   (`version_id ~ '^(peer_mesh|ground_inspection)\.v[0-9]+$'`, `version_id = kind || '.v' || version`, `version >= 1000`,
   `definition->>'versionId' = version_id`, `(definition->>'version')::int = version`, the step enum, `reason` required when `direct`, `note`
   required on `returned`, `hindi_reviewed` and `classification_attested` true on every `approved`); steps `seq bigint GENERATED ALWAYS AS
   IDENTITY` and `at DEFAULT clock_timestamp()`; the steps tenant INSERT admitting ONLY `proposed` / `approved` / `returned` / `withdrawn`
   (QE11); cheap CHECKs — `target_pariwar_id IS NULL` unless the step is `made_live` / `pariwar_reverted`, `pariwar_reverted` ⇒ target NOT
   NULL, both ticks NULL off `approved`, `length(reason) <= 500`; a UNIQUE `(kind, version)`; ⛔ distinct-actor trigger (QE6). Journal `when` > every
   sibling's.
   > ⭐ **ANNOTATION 2026-10-30 (RV2 / RP20):** "steps keyed on `scope_pariwar_id`" is now ALSO "or any step of a version this Pariwar ORIGINATED" — see QE11 (A)'s annotation for the exposure and the API filter that withholds it.
3. **AC3 — the async resolver** (QE12 R1–R4, R8): the strict Zod parse (R1); resolution exactly as R2 — ordered by `seq`, the revert rule
   as written, a candidate that fails validation OR is on a stale ruled base SKIPPED (the next level used); a failing pinned version still
   READ for its pins; the counsel-basis overlay (R3); the explicit Pariwar predicate (R4); the R8 alarm and log; the boot-time code-vs-DB
   id-collision assertion wired into `apps/api` AND `apps/jobs` (QE3); two live at one level impossible by construction. Live-DB legs for
   every R2 branch incl. revert, re-make-live after revert, and same-transaction QE7 (b)/(c) steps.
4. **AC4 — every consumer moved** (G8 list re-derived at Task 0.1; QE12 R5 / R6): the neighbours' app and link routes, the helpline, the
   inspector's GET / save / completion, the staff view (incl. `familyAccountViews`), both jobs — each reads in a transaction (the
   ground-inspection save INSIDE `pre`; the jobs on the per-Pariwar handle they already hold, ⛔ nested `withPariwarScope`; a failed read
   classified per Pariwar, ⛔ failing the run); a live-DB leg: a Pariwar-only version with a pending health question holds THAT Pariwar's
   texts and ⛔ another's, run on the BYPASSRLS pool; an answer-cap leg at 20 questions × 5 replies (G16, the caps' comments updated); the
   C11 counts on BOTH audit lines, counted internally (⛔ a wire field); the jobs' versions read inside `pariwarConfig` /
   `peerMeshWaReminderConfig`'s existing locale `withPariwarScope`, its fault in the SAME class as the locale fault (R5); the code-only behaviour is byte-identical when ⛔ DB version exists (every existing test green unchanged
   except where a sync signature became async); the sync-resolver fence (R6).
5. **AC5 — the flip, D5 and D8** (QE12 R7): the optional `questionnaireVersionId` on both save requests, SENT by all three clients on every
   save (a test asserts each request body); both writers compare UNDER THE LOCK the definition that will be pinned with the pre-read id
   and the client's id FIRST — before the live read, `checkAnswer` and the three `prepared …` checks; client-id mismatch ⇒ 409
   `peer_request.questionnaire_version_stale` / `ground_inspection.questionnaire_version_stale`; field absent ⇒ the existing retryable stale
   code; all six bare `prepared …` `Error`s (D8) and D5's concurrent first pin ⇒ 409, ⛔ 500; a pinned version failing R1 ⇒ read-only,
   saves 409 `*.questionnaire_version_unreadable` (NEW — the existing 404 `ground_inspection.questionnaire_unavailable` is UNCHANGED) mapped
   to the clients' terminal state, + the R8 alarm. Clients: `PeerAnswerEditor`'s third `'reload'` outcome
   (`isReload`), the editor rebuilt keyed on `versionId` with surviving drafts carried; mobile `'reload'` in `PeerRequestFailure` at all FIVE
   `classifyFailure` sites, refetching `peerRequestDetailKey`; the helpline and the inspector's panel likewise — each with a test, ⛔ retry.
6. **AC6 — words** (QE4): stored text served in both languages through the ONE word function; `{member}` substituted as `t()` does; an
   empty member name ⇒ the fallback-word copy key (en *"the member"*, hi *"सदस्य"*, HUMAN-REVIEWED) through the real `t()` (D11 fixed),
   each use logged `questionnaire.member_name_fallback` (ids only); the empty-name test fixture is built from a decrypt failure or a `''`
   input — ⛔ by erasing a claimed member or filing for a `pending-kyc` one (unreachable once row 6-38 lands — `-423`);
   `resolvePeerRequestMemberName`'s `''` contract unchanged; the staff view shows stored English words; ⛔ second
   resolver.
7. **AC7 — RBAC** (QE6): the three keys, catalog `56`; `pariwar_admin` holds propose + approve; `super_admin` all three (derived);
   `state_trustee` ⛔ any (a holder-set test pins it, with the RANK-ORDER reason); a "LIVE on its dimension, ⛔ inert" `hasPermission` test per
   key; `questionnaire.publish` checked with `requireGlobalPermission`.
8. **AC8 — the chain's routes** (`apps/api/src/modules/questionnaire-versions/`; the step table above): list + detail (both kinds; open
   proposals of other Pariwars only for the Super Admin; the list response carries `inForce` and `skipped[]` (R8) per kind; list / detail
   require `questionnaire.propose`; the Super Admin's page reads the GLOBAL list / detail — same response schema — since
   `scopeResolutionHook` 404s a Super Admin with ⛔ grant row in that Pariwar), propose (from the version in force or a named base; the server replaces the ruled
   questions — QE5), approve (QE9 + QE10 ticks), return (note), withdraw (author only), make live (QE7 (a)/(b)/(e)/(f)), direct (QE7 (c)),
   revert (QE7 (d)), a GLOBAL detail route (the Super Admin sees an approved version's badges before making it live) and a GLOBAL
   `pariwarsKeepingOwn` read (QE7 (a)'s list on make-live-for-ALL). Route table (write it out in the routes file): TENANT routes (list, detail, propose, approve, return, withdraw) under
   `/api/v1/p/:pariwarId/questionnaire-versions…` with `[requireAdminSession, scopeResolutionHook, requirePermissionHook(propose |
   approve)]`; EVERY publish act (make live for one Pariwar or all, direct, revert) and the Super Admin's full-history list under
   `/api/v1/global/questionnaire-versions…` with `[requireAdminSession, requireGlobalPermission(publish), requireStepUp]` (step-up on the
   make-live / direct / revert routes only) on `deps.serviceDb`, body `targetPariwarId: uuid | null` (the feature-flags routes' shape —
   ⛔ `/p/` for these: `scopeResolutionHook` 404s a Super Admin without a grant row in that Pariwar, and `requireGlobalPermission` adds
   nothing under `/p/`). Refusals: `questionnaire.not_approvable` / `not_publishable` 409 (wrong state — the state machine below),
   `questionnaire.base_moved` 409 (acknowledgeable), `questionnaire.ruled_base_moved` 409 (⛔ acknowledgeable), `questionnaire.nothing_to_revert`
   409, `questionnaire.hindi_review_required` / `questionnaire.classification_attestation_required` 422, `questionnaire.definition_invalid`
   422 with the validator's problems in `details`; `warnings` on success (QE8 C9); 403 by key; 403 `questionnaire.not_author` for a withdraw
   by anyone but the author; 404 ⇔ the version's origin ≠ this Pariwar AND ⛔ step of it exists with `scope_pariwar_id` = this Pariwar or
   NULL (so a version once made live here — even if later reverted — keeps its history; an all-Pariwar version originated elsewhere is a
   200). State machine (derived, by
   `seq`): `proposed` → `approved` | `returned` | `withdrawn`; `approved` → `made_live` | `withdrawn`; `returned` / `withdrawn` are terminal
   (a revision is a NEW version with this one as base); `made_live` may repeat for another target, and for the same target after a
   `pariwar_reverted`. Writes are idempotent (`Idempotency-Key`) in QE17's composed order, a replay returning the RECORDED response; every step
   audited (QE17); numbering, make-live / revert AND every step write serialized by the QE3 / QE7 / per-version step advisory locks (ONE
   fixed order — QE2).
9. **AC9 — the admin page** (QE16), incl. BOTH QE10 counsel warning texts verbatim (per kind), the QE9 Hindi tick and the QE10
   classification tick on approve / direct / make-live-with-modification (⛔ on a plain make-live), the QE8 C9 warnings, the QE7 (a) list of
   Pariwars keeping their own version, the QE7 (e) acknowledgement, the R8 *"failed validation / out of date"* line, the out-of-scope history
   line (QE11), the step-up flow on a 403 `StepUpRequiredError`, and the QE8 C12 guidance shown in the editor (a render assertion).
10. **AC10 — nothing gates, proven** (I1): a fence test that ⛔ new module imports `approval-warnings`, `ground-inspection-approval`,
    `inspection-discrepancy`'s rule table or `member_medical_disclosures`; `nominee-name-no-comparison-fence.test.ts` extended to the new
    modules; a live-DB leg — a chain question answered (any value) on a claim leaves `assertClaimApprovable`, the completion predicate and
    the warnings summary byte-identical.
11. **AC11 — the real-browser pass** of the admin page (propose → approve → make live for one Pariwar → the inspector's panel and the
    neighbours' questionnaire for a NEW claim show the new version; an OLD visit keeps its pin) — or, if the agent's Chrome cannot reach the
    local host after ONE probe ([[project_agent_chrome_cannot_reach_localhost]]), recorded UN-ATTESTED in `deferred-work.md` and Row 45 (b),
    ⛔ faked ([[feedback_record_unattested_no_backfill]]). Use the 6.32 launcher shape ([[project_admin_browser_pass_launcher]]).
12. **AC12 — proof.** Every new test leg seen RED against the pre-change code first; named mutants killed: one per QE8 VALIDATOR line C1–C8 and
    C10 (e.g. C5 `sensitive` checked truthy; C6 the text leg dropped; C8 the total cap dropped); R1's `assertValidQuestionnaireDefinition`
    call removed (a DB row with a `warning: true` chain question then resolves — the Policy meaning's fence leg); the tenant steps policy
    admitting `made_live`; a step written WITHOUT the per-version step lock (a live-DB race: withdraw vs make-live, approve vs return); a
    client NOT sending `questionnaireVersionId`; the version compare moved after `checkAnswer`; the `chain:` regex widened to any string; the
    ruled-question lock dropping one field (incl. the closing note); the server NOT replacing submitted ruled questions; a DB question citing
    a Panel id escaping the chain rules; the code-version `>= 1000` refusal dropped; the strict parse loosened (an unknown field or a
    string `"true"` admitted); steps ordered by `at` instead of `seq`; the revert rule keyed on the version instead of the Pariwar; the
    resolver preferring all-Pariwar over a Pariwar's own; a stale-ruled-base version resolving as live; a `proposed` version resolving as
    live; the counsel overlay dropped; the resolver dropping its explicit Pariwar predicate (run on a BYPASSRLS / superuser connection); the
    flip compared outside the lock; the version-stale code classified as retry on a client; the `NOT direct` insert leg dropped; the
    fallback word dropped. Live-DB legs for RLS (incl. a Pariwar Admin's own propose / approve / return / withdraw INSERTs as `twt_app`, and
    a `direct: true` insert REFUSED as `twt_app`) (positive and negative; cross-tenant assertions as a 404 + a separate schema-shape test,
    ⛔ `not.toHaveProperty` on a 404), the append-only triggers, concurrent make-live and make-live vs revert (separate transactions), and a
    fresh-database migrate; `ci:local` 36 / 36 on a FRESH container with `DATABASE_URL` set on the push
    ([[project_prepush_hook_inherits_5432]]).
13. **AC13 — records.** Row 45 (minted at Task 0.4 — ⛔ re-mint): evidence lines for legs (b) and (d); `epics.md` `### Story 6.33` and the
    "any other claim?" annotation (DONE at Task 0.4 — ⛔ redo); `deferred-work.md`: D5, D8 and D11 marked Closed by 6.33; the 6.27b flip
    hazard noted Closed by 6.33 FOR CLIENTS THAT SEND `questionnaireVersionId`, OPEN (re-triggered) for installed mobile builds until one
    that sends it ships (Row 45 (d)); if `resolvePeerRequestMemberName` is touched, the governance branch's "failed decrypt shown as a BLANK"
    item gets its disposition; the "multi-select can never be CLEARED" item's
    trigger re-pointed (⛔ closed — G15) WITH its widened cost (every chain `multi` question — QE8); D10, the 6.27a drain-loop item, and (if
    touched) W3 / W9 each given a recorded disposition (closed if fixed, else re-triggered — ⛔ silently passed); dated pointers on Row 27
    note (4) and Row 42's discharge path (*"the chain exists — the cost is stated on the make-live screen"*); the ledger lines; the story's
    Dev Agent Record and File List.

## Tasks / Subtasks

- [x] **Task 0 — governance first (AC0).** Nothing below starts before 0.3 is committed.
  - [x] 0.1 `git fetch origin`; rebase onto `origin/main` if it moved (backup branch first — [[project_rebase_ledger_conflict_separator]]);
    `git diff --name-only 26901c92..HEAD -- packages apps scripts infra docs` — re-read any cited file that moved; re-grep the five NUMBERS on
    every branch and worktree; re-derive G8's call-site list (the grep in G8) and paste it into the Debug Log.
  - [x] 0.2 Put QE1–QE17 to BigDev; the four real asks (QE5, QE6, QE10, QE14) first, each with its cost as written; plus the Hindi of
    QE4's `{member}` fallback word. Record the answers here verbatim.
    ⭐ **BigDev, 2026-10-30, verbatim:** *"QE1-QE17 as recommended, prepare routing note"* ⇒ every QE takes its recommended option (QE5 (A),
    QE6 (A), QE10 (A), QE14 (A) among them). ⚠ OPEN: the Hindi of QE4's fallback word was ⛔ given — put to BigDev for review on
    2026-10-30 in `_bmad-output/implementation-artifacts/6-33-hindi-review-member-fallback-word.md` (proposed: en *"the member"*, hi
    *"सदस्य"*, shown in all six sentences it can land in). ✅ **BigDev, 2026-10-30, verbatim:** *"A, सदस्य is fine but this better be
    rarest of rare."* ⇒ en *"the member"*, hi *"सदस्य"* — HUMAN-REVIEWED (mark the copy key's Hindi so in Task 4.3, ⛔ "agent-authored").
  - [x] 0.3 ONE author-commit decision entry (≥ `-421`), committed ALONE: QE1–QE17 as answered; its §0 table (edges 1–10, incl. 3a / 3b);
    the statement that it SUPERSEDES `-413` IQ12 IN PART (the inspector's panel gains a version id and a reload path — the rulings table);
    "How much to trust this entry" naming what was traced vs inferred; ⛔ an in-place edit of `-304` / `-310` / `-413`. If the classifier
    refuses the `.decision-log.md` write, stage the entry and ask BigDev once ([[project_decision_log_writes_user_inserted]]). Write its SHA
    here AFTER the commit. ⭐ **DONE: `2026-10-30-421`, commit `283e25f4`** (alone, `governance(6.33):`).
  - [x] 0.4 Records commit: roster Row 45 (QE15 (a)–(e), incl. the deploy-order leg (d)) in `docs/launch-gate-inventory/inventory-roster.md`;
    `epics.md` `### Story 6.33` (title, `[SURFACE] [PRIMITIVE] [GOVERNANCE]`, the minted-by-ruling banner citing `-304` Consequence 2, the
    ACs in brief — the 6.32 entry's shape); `deferred-work.md` (QE13 annotation); the ledger line (next free letter). If QE14 (A): draft
    `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-30-6-33-questionnaire-chain.md` FROM the template with QE14's THREE
    questions — ⛔ send it.
    ⭐ PARTLY DONE 2026-10-30: the confirm note is DRAFTED at
    `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-30-6-33-questionnaire-chain.md` (Q1 = QE6, Q2 (a) / (b) = QE5's lock
    and staleness rule — split into (a) / (b): two governance questions on one topic, so each gets its own options and cost, Q3 =
    QE7 (a)); E4's commands run, every one
    non-empty. SENT by BigDev; RULED 2026-10-30 as `2026-10-30-422` (all A) — transcribed into the note's ⏳ block, the rest of the note
    kept unedited. ⭐ DONE 2026-10-30: roster Row 45 `questionnaire-editor-live` minted (legs (a)–(e); (a) ✅ MET by `-422`);
    `epics.md` `### Story 6.33` (after 6.32, the minted-by-ruling banner citing `-304` Consequence 2, `-421`, `-422`); `deferred-work.md` —
    the "any other claim?" item annotated HOMED (⛔ closed; its trigger restated: a LIVE `ground_inspection` version carries it, ⛔ merely
    6-33 `done`); the ledger line.
- [x] **Task 1 — the engine (AC1).** `questionnaires/types.ts` (`text?`), `keys.ts` (`COUNSEL_BASIS_DECISIONS = []`, the chain-record regex,
  the reserved-key sets, the Devanagari forbidden terms, the stale comment), `validator.ts` (AC1: the origin input; QE8 C1–C12 one rule per
  line; `typeof` / `=== true` checks; the `{member}`-only placeholder rule; the version-level `approvedBy`; the ruled-question lock — incl.
  the closing note / thank-you — against the `ruled_base_code_version_id` PASSED IN, which is ALWAYS QE5's one definition: the newest code
  version of the kind at write time, ⛔ base-chain tracing (TR11)), the separate pure `questionnaireDefinitionWarnings` (C9), pure helpers
  `questionnaires/derive.ts` (state from steps ordered by `seq`; the per-question change marker) — RE-EXPORTED from `questionnaires/index.ts`
  so the G13 fence scans them. Keep `questionnaires/` package-free (G13 fence green — ⛔ zod here). Tests in
  `packages/domain/tests/questionnaires/` — RED first.
- [x] **Task 2 — the migration and schema (AC2).** `packages/domain/migrations/0192_questionnaire-versions.sql` (hand-written; ⛔
  `db:generate` over an applied migration — 42P07) incl. `seq` / `clock_timestamp()`, the `NOT direct` tenant insert leg, the steps tenant policy
  limited to the four tenant steps, AC2's cheap CHECKs, ⛔ distinct-actor trigger; `schema/questionnaire_versions.ts`; `policies/questionnaire-versions-rls.ts` (house `<current>` form); `meta/_journal.json`
  (`when` > 1796096400036 and > any sibling's at the commit). ⚠ Compare enums AS TEXT in any `LANGUAGE sql` body (the 6.32 55P04 trap — a
  fresh database applies every migration in ONE transaction). Live-DB policy regression spec (positive + negative, incl. `direct: true`
  refused as `twt_app`).
- [x] **Task 3 — the reader (AC3).** `packages/domain/src/questionnaire-versions/{read,parse,index}.ts`: `resolveLiveQuestionnaire`,
  `getQuestionnaireDefinition`; the STRICT Zod row parse (R1); R2's resolution by `seq` with the revert rule and the invalid / stale skips;
  the counsel-basis overlay (R3); the explicit Pariwar predicate (R4); the R8 alarm; the boot-time id-collision assertion, exported and
  WIRED into `apps/api/src/index.ts` `main()` (after `createDeps`; ⛔ `server.ts`) and `apps/jobs/src/boot.ts` `main()`. Live-DB spec covering every R2 branch incl. revert, re-make-live after
  revert, same-transaction direct steps, and a run on the BYPASSRLS pool.
- [x] **Task 4 — move every consumer (AC4, AC5, AC6).**
  - [x] 4.1 Before anything: TR10's grep, every hit judged in the Debug Log.
  - [x] 4.2 The G8 list onto the reader (R5): the ground-inspection save INSIDE `pre`; `familyAccountViews` fed pre-read definitions via
    `run(...)`; the jobs' read INSIDE `pariwarConfig` / `peerMeshWaReminderConfig`'s existing locale `withPariwarScope` (⛔ nested scope, ⛔ the
    begin path), its fault in the same class as the locale fault per job (R5); the
    sync-resolver fence (R6).
  - [x] 4.3 The ONE word function over the three word sites (QE4), incl. the `{member}` fallback copy key — en *"the member"*, hi
    *"सदस्य"*, its Hindi marked HUMAN-REVIEWED (BigDev 2026-10-30), ⛔ "agent-authored" — with a real-`t()` leg (D11); applied IN the word
    function, `resolvePeerRequestMemberName`'s `''` contract UNCHANGED; each use logged `questionnaire.member_name_fallback` (ids only).
  - [x] 4.4 R7: the optional `questionnaireVersionId` (contracts `packages/contracts/src/claims/{peer-request,ground-inspection-questionnaire}.ts`);
    both writers' under-lock comparison FIRST (before the live read, `checkAnswer`, the three `prepared …` checks), `prepareSave`
    returning `def.versionId`, the ground-inspection writer's new version input — making the six bare `Error`s (D8) and D5's 500
    unreachable; the absent-field leg; the NEW `*.questionnaire_version_unreadable` 409 refusal + its R8 alarm (the existing 404
    `ground_inspection.questionnaire_unavailable` UNCHANGED).
  - [x] 4.5 The clients: EACH SENDS `questionnaireVersionId` = the rendered `questionnaire.versionId` on every save (a test asserts each
    body); `packages/api-client/src/peer-answer-editor.ts` gains `isReload` + the `'reload'` state; mobile
    `apps/mobile/lib/peer-request.ts` (`'reload'` in `PeerRequestFailure`, `classifyFailure` at all FIVE call sites) + `PeerQuestionnaire.tsx`
    (rebuild the editor keyed on `versionId`, refetch `peerRequestDetailKey`); `apps/admin/src/modules/ground-inspection/QuestionnairePanel.tsx`
    and `apps/admin/src/modules/helpline-claims/HelplinePeerRequests.tsx` likewise — each with a test.
  - [x] 4.6 G16: the caps' comments updated; the 20 × 5 cap leg. QE8 C11: the two new counts on BOTH audit lines, counted INTERNALLY (⛔ a field on the
    `.strict()` `GroundInspectionFamilyAnswerView`) (`claims.peer-answers.handlers.ts`, `claims.verifier-console.handlers.ts`). Every existing suite green.
- [x] **Task 5 — RBAC (AC7).** `rbac/permissions.ts` (append three keys with REUSE CHECK comments; version 56 with its paragraph),
  `rbac/roles.ts` (`pariwar_admin` gains propose + approve with the Trustee-Lite comment citing G6 and the `-304` *"or their own"*
  reading; ⛔ state_trustee), contracts mirror if any, `tests/rbac/permissions.test.ts` (56 / 74), `tests/rbac/roles.test.ts` (holder sets;
  live-on-dimension).
- [x] **Task 6 — the chain (AC8).** Domain writer `questionnaire-versions/write.ts` (one function per step, per the step table; the QE3 /
  QE7 / per-version step locks in their ONE fixed order, every step inserted AFTER them; ids generated app-side (`randomUUID()`) before
  stamping `chain:<id>`; the state machine by `seq`; the server-side replacement of the ruled
  questions; the validator + warnings on every new definition), API module
  `apps/api/src/modules/questionnaire-versions/{routes,handlers,index}.ts` registered in `server.ts`, contracts
  `packages/contracts/src/questionnaire-versions/` (`.strict()` inputs incl. `targetPariwarId`; output schemas ⛔ tightened on reused
  fields), audit actions per QE17 (free strings; `ADMIN_GLOBAL_NAMESPACE` on the global path), error codes. QE17's composed order copied
  from `helplineSave`. The AC8 route table, each `preHandler` array inline PER ROUTE (a shared const was misread by a route gate in 6.27a).
  The human-actor AST gate's `COVERAGE_SET` (`scripts/claim-adjudication-human-actor-invariant`) forces classification only on
  `claims/*.routes.ts` ⇒ it does ⛔ cover these routes — leave it unless BigDev wants them in; if added, its classifier must recognise
  `requireGlobalPermission`. API integration specs (each refusal; idempotent replay; concurrent make-live; make-live vs revert; the global
  path; the 404 rule incl. an all-Pariwar version originated elsewhere = 200 and a reverted one keeping its history; the global detail and
  `pariwarsKeepingOwn` reads; `questionnaire.not_author`; a replay returning the RECORDED response — QE17).
- [x] **Task 7 — the admin page (AC9).** `apps/admin/src/modules/questionnaire-versions/` (page, editor, history, render, `i18n-en.ts`),
  route in `router.tsx` + `src/routes/QuestionnaireVersionsRoute.tsx`, nav in `RootLayout.tsx`; client functions IN `src/api/client.ts`
  (`apiFetch` is module-private — G17) + hooks in `src/api/hooks.ts`; the step-up flow on a 403 `StepUpRequiredError`
  (`'questionnaire_publish'`, the `ApprovalWarningReasonsPage.tsx` precedent: catch `auth.step_up_required`, keep the pending write, re-run
  it after verify); for `super_admin` the page reads the GLOBAL list / detail (AC8); the QE8 C12 guidance shown in the editor. Tests in `apps/admin/tests/` (RTL `cleanup`; generous
  timeouts — the 6.32 5 s timeout under `ci:local` load).
- [x] **Task 8 — nothing gates, proven (AC10)** + the mutants (AC12).
- [x] **Task 9 — the real-browser pass (AC11).** ✅ RUN 2026-10-30 AFTER the commit `0793112a` (HEAD `bab56103`; the Dev Agent Record's *Browser pass (AC11)*). ⚠ It was first recorded UN-ATTESTED, below: the Chrome extension was ⛔ connected (`tabs_context_mcp`), which is a DIFFERENT cause from AC11's alternative ("Chrome cannot reach the local host after ONE probe" — ⛔ local host was reached). Row 45 (b) stays OPEN; unticked by the 2026-10-30 code review (RV30), a ticked box read as done. ⚠ **Superseded 2026-10-30:** the pass was RUN afterwards and is ATTESTED — the box is ticked because the evidence exists, Row 45 (b) is MET; its limits are listed in the record.
- [x] **Task 10 — records (AC13)** incl. every deferred disposition AC13 names (Row 45's mint, the `epics.md` entry and the "any other
  claim?" annotation are DONE — Task 0.4; add only Row 45's (b) / (d) evidence lines); `ci:local` on a fresh container; the Dev Agent Record, File
  List, Change Log; the row → `review`.

### Review Findings

Full three-layer code review, 2026-10-30, of the UNCOMMITTED tree on `story/6-33-questionnaire-editor-versions-and-approval` (HEAD `bc88bd5e` = `origin/main`; 92 code
files, ~8,870 diff lines, reviewed as four chunks — 1a store, 1b engine + contracts, 2 API + jobs, 3 clients — each by a Blind Hunter, an Edge Case Hunter and an Acceptance
Auditor, 12 layers in parallel, strictly read-only; the working-tree content fingerprint was identical before and after). 147 raw findings (81 blind / 24 edge / 42 auditor).
After deduplication and a hand-trace of every load-bearing claim: **0 decision-needed, 32 patch, 9 defer; 14 dismissal groups**. **1 HIGH, 11 MEDIUM, 20 LOW.** The Panel-routing
§0 gate was applied to every candidate: none is about what the Trust discloses about a person, what it owes one, a legal basis, or two ratified clauses in conflict —
**no Trustee Panel decision is needed.** Product code was not changed by this review. IDs are `RV` / `RVD` (⛔ `R1`–`R8` are this story's resolver rules).

⚠ **What this review did NOT do:** run a test, a mutant or `ci:local`. The Dev Agent Record's counts ("84 files / 1,470 tests", "mutants killed", the 35/36 runs) are CLAIMS here,
⛔ re-proved. Each entry says whether I READ the code (**traced**) or took a layer's reading (**layer-reported**). AC11 (the real-browser pass) stays UN-ATTESTED and OPEN
(Row 45 (b)) — ⛔ closed by this review.

**Disposition (BigDev, 2026-10-30): option 1 — apply every patch.** All 32 were applied the same day; ⛔ committed, ⛔ pushed. The server side (domain,
migration 0192, API, jobs) and the fences/records by the reviewer; the admin web and the mobile app by two agents on disjoint files, each reporting its own mutation
checks. **Verified:** `typecheck` 20/20 and `lint` 20/20; the unit phase 37/37 tasks; the live-DB `integration-tests` job against the story's own container
(`twt-633-pg`, 24/24 tasks, EVERY file executed — domain 447 files / 6,784 tests, api 207 / 2,495, jobs 86 / 1,962, the rest green); the 31 other `ci:local` gates (build,
the structural invariants, the determinism replays) — `domain-invariants` caught RV20's hoisted `.limit(cap)` and it was fixed inline. Mutants run and KILLED for the
load-bearing legs: RV2 (policy leg; stage from displayed steps), RV3 (base visibility; detail), RV4 (raw record), RV6 (domain throw; the handler `catch`), RV12 (the numbering lock,
tightened to an ADVISORY wait after the first mutant survived), RV10, RV23 (three injected violations), RV32, and the admin / mobile hand-over mutants.
**⚠ NOT done:** one full `pnpm ci:local` run as a single command on a fresh container (the parts were run separately); a review of the PATCH DIFF itself (the standing
rule — [[feedback_review_the_fix_diff_before_commit]]); AC11's real-browser pass (still UN-ATTESTED, Row 45 (b) OPEN). ⇒ the story stays `review`.

**Deviations and additions (⛔ silent):**
- **RV2** — beyond the policy leg, `summaryOf` derives the STAGE from every readable step and DISPLAYS only the shown ones, so the origin sees `published` without the target's step; migration 0192 was amended IN PLACE (unmerged) and re-applied in the story DB only.
- **RV3** — also refuses an unreadable base on the global path; `versionVisibleTo` is exported and used by `detail`.
- **RV6** — the domain throw was ⛔ enough: the save's pre-block needed its own `catch` (without it the answer was a 500 — proven by a mutant).
- **RV7** — the design CHANGED during the build: a plain mirror lets a rebuilt instance's first publish overwrite the hand-over with `[]`, so the mirror MERGES (`mergeCarried`, now ONE function in `@twt/api-client`, re-exported by mobile and admin). The helpline also clears the hand-over when the caller changes.
- **RV5** — the page-level boolean became `baseMovedVia` ('make_live' | 'direct'), so a direct 409 does not lock an open make-live panel.
- **RV12** — the backstop now WORKS (a run with the numbering lock removed still produced the next number through the retry); the race legs therefore assert an ADVISORY-lock wait.
- **RV18** — if the newest code version's detail fails to load, the editor falls back to the base's ruled questions and says so.
- **RV21** — PARTIAL: history says "for this Pariwar" for the page's own Pariwar; another Pariwar still shows its raw uuid (the response carries no name).
- **RV23** — `nothing-gates` is split: the behavioural modules stay TRANSITIVE; the medical table is checked DIRECTLY (a transitive check on a table is meaningless — `db.ts` imports the whole schema barrel). The word fence is a TRIPWIRE by item name, ⛔ a proof.
- **RV24** — counted and batched (`getQuestionnaireDefinitions`); `VERIFIER_CONSOLE_MAX_READS` 31 → **33** (+2, conditional on a DATABASE pin; ledger entry + the four pinned assertions updated).
- **RV25** — both jobs live tests (requests and WhatsApp reminders) now sweep the chain rows.
- **RV30** — Task 9 is UNTICKED and the cause reworded in `deferred-work.md`.
- **RV32** — the unreadable request is omitted, alarmed, and counted on the audit line (`unreadable_requests`); a visible "could not be opened" stub would need a contract field and remains BigDev's call.

- [x] [Review][Patch] **RV1 — Mobile carry-over re-sends STALE answers after every acknowledged save (HIGH; blind + edge; traced).** `Questionnaire`'s carry effect depends on
  `[editor, allQuestions]`; `allQuestions` is `useMemo([detail])` and the save hook does `setQueryData(detailKey, d => ({ ...d, answers }))`, so EVERY acknowledged save gives
  `detail` a new identity and the effect re-runs. `toCarry` is the ORIGINAL array (the parent replaces `carried.current`, never mutates it) and is never emptied ⇒ after a version
  reload, a carried answer (Q1 = A) the member then changes to B is re-saved as A on the next acknowledgement. Claim data, silent. The admin panel and helpline use `[editor]` only
  (not affected); the mobile test mocks a stable `mock.detail`, so it cannot see this. Fix: apply once (an `applied` ref; deps `[editor]`) and empty `toCarry` after applying; a test
  whose mocked save rewrites `detail`. **AC5, QE12 R7; checklist 2.**
  [apps/mobile/components/peer-request/PeerQuestionnaire.tsx:215-223; apps/mobile/components/peer-request/usePeerRequestQueries.ts:76-80]
- [x] [Review][Patch] **RV2 — A tenant author can WITHDRAW a version already made live for ANOTHER Pariwar (MEDIUM; blind + edge + auditor; traced).** QE7: a version from Pariwar P
  MAY be made live for Q. That `made_live` step is scoped to Q (`questionnaire_version_steps_scope_check`); P's handle cannot see it (steps SELECT policy), so `stageOf` reads
  `approved`, `canTakeStep('approved','withdrawn')` is true, and the `withdrawn` step lands: the history says withdrawn while the resolver (reads only `made_live` /
  `pariwar_reverted`) still serves it in Q, and the Super Admin's next make-live is refused `not_publishable`. NOT reachable: `return` (needs stage `proposed`) and make-live for ALL
  (NULL scope is visible). The `stageOf` comment ("every step of that version's own path is visible") is false for this path; every test uses target == origin. Fix
  (recommended; migration 0192 is still unmerged, so amend in place): a second steps SELECT leg letting the ORIGIN Pariwar read the steps of versions it originated (the versions row
  is already SELECT-open), and compute `stage` from everything readable BEFORE `detail()` / `summaryOf` filter what is displayed; cross-Pariwar legs (domain + API). **AC8
  ("`made_live` is not withdrawable"); checklist 1, 3.** [packages/domain/src/questionnaire-versions/write.ts:122-124,332-338; packages/domain/migrations/0192_questionnaire-versions.sql
  (questionnaire_version_steps_read); apps/api/src/modules/questionnaire-versions/handlers.ts:357-363]
- [x] [Review][Patch] **RV3 — Another Pariwar's unapproved draft is readable through `baseVersionId` (MEDIUM; blind ×2 + edge ×2 + auditor ×2; traced).** `assertBase` accepts any
  version of the kind (exists + kind only — an unparseable or invalid one too); tenant `detail` then reads that base unfiltered and returns `change` markers and `removedKeys`
  against it, so a Pariwar Admin who names a guessable id (`peer_mesh.v1001`) learns the foreign draft's question KEYS (and, via markers, whether their questions match its), and
  success-vs-`base_invalid` is an existence oracle. This bypasses the API filter that `-421` QE11 names as the ratified confidentiality control ("an API filter hides them").
  Fix: validate a tenant's `baseVersionId` with the SAME visibility rule as `detail()` / `list()` (a code version, its own origin, or a step scoped to it / all) else `base_invalid`;
  compute `change` / `removedKeys` only against a base the viewer may see; refuse an unparseable base; a cross-Pariwar leg. **QE11; checklist 12 (a).**
  [packages/domain/src/questionnaire-versions/write.ts:195-200; apps/api/src/modules/questionnaire-versions/handlers.ts:365,393-401]
- [x] [Review][Patch] **RV4 — Replaying a completed `return` / `withdraw` answers 409 `idempotency_in_progress` until the 24 h TTL (MEDIUM; edge + auditor; traced).** Both writers return
  `void` ⇒ `recordResult(key, undefined)` ⇒ stored `null` (`JSON.stringify(result ?? null)`) ⇒ `getResult` is `null` ⇒ the claim is read as "in progress". The house shape this was
  "copied from" records `{ done: true }` (`helplineSave`). Only `direct` has a replay leg (the Dev Record says the replay is "asserted"). Fix: record `out ?? { done: true }`; replay legs
  for propose / approve / return / withdraw / make-live / revert. **AC8, QE17; checklist 2.**
  [apps/api/src/modules/questionnaire-versions/handlers.ts:237-252,415-430; packages/domain/src/idempotency/keyed-store.ts:211,254; apps/api/src/modules/claims/claims.peer-request.handlers.ts:165]
- [x] [Review][Patch] **RV5 — The Super Admin's "with modification" (direct) cannot acknowledge `base_moved` — the button silently does nothing (MEDIUM; auditor + blind + edge; traced).**
  `Editor` calls `directQuestionnaireVersion` WITHOUT `acknowledgeBaseMoved` (the request carries it). The domain throws 409 `base_moved` whenever the named base's own base is not what is
  in force — QE7 (b)'s case ("base = the approved one"). The page's `run` maps that to `setBaseMoved(true)` with no `setError`; the acknowledgement UI exists only in `VersionPanel`'s
  make-live block and its `ack` is local ⇒ nothing is rendered. Fix: an acknowledgement in `Editor`, sent as `acknowledgeBaseMoved`; a leg. **QE7 (b)/(e), AC9.**
  [apps/admin/src/modules/questionnaire-versions/QuestionnaireVersionsPage.tsx:152-156,614-623; packages/domain/src/questionnaire-versions/write.ts:399-401]
- [x] [Review][Patch] **RV6 — A ground-inspection pin that fails R1 is served 404 "no panel", not 409 `ground_inspection.questionnaire_version_unreadable` (MEDIUM; 6 layers; traced).**
  `groundInspectionVersionFor` returns `null` for `unparseable` / `missing`; the GET and the save pre-check then throw `GroundInspectionQuestionnaireUnavailableError`, and
  `QuestionnairePanel` renders NOTHING on it. R7 (v) requires 409 `…version_unreadable` and says the 404 "means ⛔ panel — UNCHANGED". The peer side is right
  (`pinnedVersionFor` throws `PeerRequestVersionUnreadableError`). Reach is narrow (a corrupted row, or a later parser tightening — what R1 is for); the R7 (v) legs use `warning: true`,
  which PARSES, so the unparseable case is untested on both consumers. Fix: throw the existing `GroundInspectionQuestionnaireVersionUnreadableError` for a non-`found` pinned read, map it
  on the GET, add a leg with an unparseable row. **AC5, QE12 R7 (v).**
  [packages/domain/src/claim/ground-inspection-questionnaire.ts:134-143; apps/api/src/modules/claims/claims.ground-inspection.handlers.ts:1219,1301]
- [x] [Review][Patch] **RV7 — The hand-over of unsent answers is fragile (MEDIUM; PLAUSIBLE — timing-dependent, the unit tests mock `refetch` synchronously; blind + edge).** (a) The admin panel and
  the helpline clear the hand-over on the rebuilt editor's FIRST mount while the key can change TWICE (the refetch changes the data ⇒ `v2:0`; then `setReloads` ⇒ `v2:1`); the second
  rebuild reads `[]`. (b) Only the `'reload'` path hands drafts over: any other key change — a background refetch (reconnect / focus) returning a new `versionId` — disposes the editor with
  its queued unsent drafts (mobile: answers queued while offline). Fix: empty the hand-over only when it has been APPLIED (inside the timer); hand drafts over on any key-driven unmount;
  a test with an async refetch that changes the data and then increments `reloads`. **AC5, R7.**
  [apps/admin/src/modules/ground-inspection/QuestionnairePanel.tsx:251-262; apps/admin/src/modules/helpline-claims/HelplinePeerRequests.tsx:273-283; apps/mobile/components/peer-request/PeerQuestionnaire.tsx:81-83,117]
- [x] [Review][Patch] **RV8 — The helpline card DEAD-ENDS when the reload refetch fails (MEDIUM; blind + edge + auditor; traced).** `onReload` has no `else` after `if (!r.isError)`;
  `reloadRequired` is permanent and `drain()` returns; the retained-list branch (5xx / 429 / network) shows an alert with NO retry button; the card sits at "Saving…" and its leave-guard
  stays on ⇒ the operator's answers are never sent. Mobile (`reloadFailed` + "Try again") and the inspector panel (the load-failure "Try again") both have an exit. Fix: a failed-refetch
  state with a Try again that re-calls `onReload`; a leg. **AC5; checklist 1 (a state with no exit).** [apps/admin/src/modules/helpline-claims/HelplinePeerRequests.tsx:110-117,140-153]
- [x] [Review][Patch] **RV9 — AC10's live "nothing gates" leg cannot reach the predicate it says is unchanged (MEDIUM; auditor; traced).** The only byte-identical leg answers a `peer_mesh`
  chain question and compares `assertClaimApprovable`, the warnings and `groundInspectionApprovalState`; nothing answers a `ground_inspection` chain question — the case that can reach the
  completion predicate and the discrepancy path. AC10 is met to the letter; its purpose (I1, the Policy-meaning sentence) is ⛔ proven on the ground-inspection side, which today rests on the
  validator key sets and the import fence alone. **Checklist 11; [[feedback_gate_scope_semantic_coverage]].** Fix: a leg answering a `ground_inspection` chain question and asserting
  completion / `assertClaimApprovable` / warnings unchanged. [packages/domain/tests/integration/claim/peer-mesh-reply.spec.ts:644; packages/domain/tests/integration/claim/ground-inspection-questionnaire.spec.ts]
- [x] [Review][Patch] **RV10 — The C11 audit counts are untested where they matter (MEDIUM; auditor; traced by grep).** Every `sensitive_answer_count` assertion is `0` (only
  `family_sensitive_answer_count` is `1`); the console line's new keys are never asserted; deleting `neighbourSensitive += 1` leaves every test green. Fix: seed a neighbour chain answer and
  assert the non-zero counts on BOTH audit lines. **AC4; checklist 8.** [apps/api/tests/integration/claims/peer-answers-approvers.spec.ts:397-401,697-698;
  apps/api/src/modules/claims/peer-answers-assembler.ts:282; apps/api/src/modules/claims/claims.verifier-console.handlers.ts:1385-1387]
- [x] [Review][Patch] **RV11 — No tampered / non-human-actor denial on any of the 7 new mutation routes; approve and return are never tried across Pariwars (MEDIUM; auditor; layer-reported,
  grep-consistent).** The API spec covers cross-Pariwar for GET detail and withdraw only; the house precedent is `approval-warning-reasons.spec.ts:160` (a TAMPERED-session leg with a positive
  control). Fix: a tampered-session leg per mutation route + cross-Pariwar approve / return. **Checklist 3.** [apps/api/tests/integration/questionnaire-versions/questionnaire-versions.spec.ts]
- [x] [Review][Patch] **RV12 — The QE3 `23505` backstop can never fire (MEDIUM, latent; auditor + traced).** `insertVersion` tests `(err as { code?: string }).code`, but drizzle-orm 0.45.2
  wraps every query failure in `DrizzleQueryError` (`pg-core/session.js:41,48`) — the SQLSTATE is on `.cause`; the sibling writers unwrap (`niyamavali/write.ts:50-54`,
  `memorial/submission.ts:179-184`). Latent today because the numbering lock serialises every writer — but there is no propose × propose or propose × direct race leg, so dropping
  `lockNumbering` leaves every test green. Fix: `err.code ?? err.cause?.code`; the two race legs. **QE3; checklist 2.** [packages/domain/src/questionnaire-versions/write.ts:239-242]
- [x] [Review][Patch] **RV13 — Make-live for "every Pariwar" is not gated on the keeping-own list having loaded (LOW; blind + edge + auditor; traced).** The list renders only when `keeping.data`
  exists; loading / error / paused render nothing and the button is `disabled={busy || (baseMoved && !ack)}`. QE7 (a): the screen "lists … before the confirm". Also the copy reads "1 Pariwar
  keep their own version". [apps/admin/src/modules/questionnaire-versions/QuestionnaireVersionsPage.tsx:386-407]
- [x] [Review][Patch] **RV14 — `ack` and `baseMoved` leak between acts (LOW; blind + edge + auditor; traced).** `ack` is never reset (not on success, not on a scope change); `baseMoved` is
  page-level and survives a version switch. A second make-live in the same panel sends `acknowledgeBaseMoved: true` without the warning having been shown for that target. Send
  `baseMoved && ack`; reset on scope change / success; scope `baseMoved` to the version. **QE7 (e).** [QuestionnaireVersionsPage.tsx:141,293,404-413]
- [x] [Review][Patch] **RV15 — Revert is not disabled while an act is pending, and `useQuestionnaireChainAct` is ONE shared `mutate` with per-call callbacks (LOW; blind + edge + auditor;
  traced).** TanStack fires per-call callbacks for the LATEST call only (the recorded TR15 / per-row `mutateAsync` rule); a second click drops the first call's step-up prompt or `onDone`.
  [QuestionnaireVersionsPage.tsx:213-221; apps/admin/src/api/hooks.ts (useQuestionnaireChainAct)]
- [x] [Review][Patch] **RV16 — Revert is not offered when the Pariwar's own version was SKIPPED (LOW; auditor; traced).** Shown only for `inForce.source === 'own'`; QE7 (d): "a skipped own
  version is still revertable" — and the page already renders the "out of date, serving Y" alert for exactly that case. Use `skipped.some((s) => s.level === 'own')`. [QuestionnaireVersionsPage.tsx:213]
- [x] [Review][Patch] **RV17 — The direct path's counsel warning ignores the RULED pending health questions (LOW; auditor; traced).** Make-live warns on `q.health && q.counselPending` over all
  questions; the direct section warns on `q.health` over the STAFF drafts only ⇒ a direct peer_mesh version whose ruled `death_cause` / `death_illness` are pending never shows the hold
  warning. **QE10, AC9.** [QuestionnaireVersionsPage.tsx:298 vs 595]
- [x] [Review][Patch] **RV18 — The editor shows the BASE's ruled questions as locked, not the CURRENT ones (LOW; auditor; traced).** QE5: "the editor always shows the CURRENT ruled questions
  locked". From an out-of-date base the staff see the old wording while the server silently substitutes the new. [QuestionnaireVersionsPage.tsx:494-498]
- [x] [Review][Patch] **RV19 — An offline / paused list query crashes the page (LOW; edge; traced).** `const data = list.data!` follows checks on `isLoading` / `isError` only; `createQueryClient`
  sets no `networkMode`, so a paused query has `data` undefined (the repo documents this cell at `DriveTargetPage.tsx:188`). Guard `!list.data`. [QuestionnaireVersionsPage.tsx:160-164]
- [x] [Review][Patch] **RV20 — `listVersionRows` truncates silently (LOW; blind + edge + auditor; traced).** `ORDER BY kind ASC, version DESC` under ONE `LIMIT 200` with no cursor or "more" signal:
  past 200 rows the later kind (`peer_mesh` sorts AFTER `ground_inspection`) drops out. (Edge 1a had the direction backwards.) AC8 asks for forced pagination of both kinds. Cap per kind or add
  a cursor. [packages/domain/src/questionnaire-versions/write.ts:469-482]
- [x] [Review][Patch] **RV21 — Editor details (LOW; blind + edge; traced).** Switching a question's kind away from `multi` keeps `exclusive` flags the checkbox no longer shows (the validator then
  refuses and the editor cannot clear them); the "codes" input drops a typed comma (`a,` → `a`) so a second code can only be pasted; a request-validation error names no field; history prints a
  raw Pariwar UUID (`t.forTarget`). [QuestionnaireVersionsPage.tsx:123,508,552-553]
- [x] [Review][Patch] **RV22 — A NUL (U+0000) or lone surrogate in stored text, a return `note` or a direct `reason` fails in Postgres (22P05) as a 500 (LOW; PLAUSIBLE; edge; layer-reported).**
  It passes the trim / length checks. Reject in the validator and the contracts. [packages/domain/src/questionnaires/validator.ts:111-125; packages/contracts/src/questionnaire-versions/index.ts:61,80]
- [x] [Review][Patch] **RV23 — The fences are narrow (LOW; blind + edge + auditor; layer-reported, AC10 text traced).** The nothing-gates forbidden list names the `medical/` directory but not
  `schema/member_medical_disclosures.ts` (AC10 names the TABLE) and its import scan ignores dynamic and side-effect imports; the sync-resolver word regex misses `t(def.copyKey)` /
  `i18n.t(…)`, has no positive control, and its roots omit `apps/mobile`. **AC10; [[feedback_gate_scope_semantic_coverage]].**
  [packages/domain/tests/questionnaire-versions/nothing-gates-fence.test.ts:35-41; packages/domain/tests/questionnaire-versions/sync-resolver-fence.test.ts:49-58]
- [x] [Review][Patch] **RV24 — The assembler's two new definition reads are not counted (LOW; auditor; traced).** They run through `run(...)` without `bump()`, and the console's
  `VERIFIER_CONSOLE_MAX_READS` ledger comment and its pinned `toBe(31)` tests are unchanged — the standing rule in `claims.verifier-console.handlers.ts` forbids silently excluding a
  newly-added read. They are also one query per distinct DB-pinned version (N+1). Count them (or explain) and batch. [apps/api/src/modules/claims/peer-answers-assembler.ts:201-203,219]
- [x] [Review][Patch] **RV25 — The jobs live test leaves permanent chain rows and asserts weakly (LOW; blind + auditor; traced).** `afterAll` sweeps only tables with a `pariwar_id` column (these have
  `origin_` / `scope_` / `target_pariwar_id`); the version is random 700000–799999 (on a persistent dev DB the next real version becomes 7xxxxx+1); the Pariwar-B check is
  `.not.toEqual(held…)` (passes for ANY other outcome); Pariwar A's alarm is not asserted. [apps/jobs/tests/claim-peer-mesh-requests-live.test.ts:93-106,598-615]
- [x] [Review][Patch] **RV26 — Small hygiene (LOW; auditor + blind).** `releaseHookTx` was copied without `helplineSave`'s W9 line (`request.scopeTx = undefined`; QE17 says "copied from"; safe today);
  the `CLAIM_FAMILY_ACCOUNT_ROWS_CAP` comment mentions superseded rows the query does not read; `propose` takes an unused `reply` and calls `void reply.status(200)`.
  [apps/api/src/modules/questionnaire-versions/handlers.ts:223-228,390-402; packages/domain/src/claim/ground-inspection-questionnaire.ts]
- [x] [Review][Patch] **RV27 — Widen the alcohol denylist's reach (LOW; blind + edge).** A lexical backstop beside the human classification tick: add the variant / romanised spellings (`daru`,
  `daaru`, `दारु`) and normalise zero-width characters before matching; the over-blocking ("drinking water") stays accepted by its own comment. **CF3 (c).**
  [packages/domain/src/questionnaires/keys.ts:123]
- [x] [Review][Patch] **RV28 — AC5's "a test asserts each request body" is not met for two admin clients and one mobile link (LOW; auditor; layer-reported).** The admin panel / helpline tests mock
  `api.save…` and assert the argument, never the JSON built in `client.ts`; mobile mocks `usePeerRequestQueries` wholesale, so `args.questionnaireVersionId` → `saveAnswer`
  (`usePeerRequestQueries.ts:75`) is untested; AC12's mutant "a client NOT sending `questionnaireVersionId`" survives there. [apps/admin/tests; apps/mobile/tests/unit/peer-questionnaire-render.test.ts:20]
- [x] [Review][Patch] **RV29 — Accessibility of the new page (LOW; auditor + blind; layer-reported).** **Checklist 13 (d), by web analogy:** the C9 warnings blocks, the keeping-own list and the act
  confirmations have no live-region semantics (`t.saved` is defined, never rendered); the scope fieldsets and the per-question fieldsets have no `<legend>`; every "View" button shares one
  accessible name; option inputs repeat identical `aria-label`s. [QuestionnaireVersionsPage.tsx]
- [x] [Review][Patch] **RV30 — Records wording on AC11 (LOW; auditor; traced).** `deferred-work.md` (the build section) says "the ONE probe of a local host failed"; the Debug Log shows the one probe
  was `tabs_context_mcp` answering *"Browser extension is not connected"* — no local host was reached. Task 9 calls that "AC11's own alternative"; AC11's alternative is "Chrome cannot reach
  the local host after ONE probe". The un-attested disclosure itself is complete and AC11 stays OPEN; only the cause is worded imprecisely, and Task 9 is ticked `[x]` while un-attested.
  **[[feedback_closure_language_precision]].** (My grep of the roster found ⛔ this wording in Row 45 (b).) [_bmad-output/implementation-artifacts/deferred-work.md:10; this story, Task 9 / Debug Log]
- [x] [Review][Patch] **RV31 — Chain test holes (LOW–MEDIUM; auditor ×3 + blind; mixed).** `directVersion` with a NAMED base and its `base_moved` / acknowledge; approving a stale-ruled-base version ⇒ 409
  `ruled_base_moved` (QE5 — only make-live is tested); make-live with target ≠ origin (→ RV2); `listVersionRows` / `readStepsFor`; the floor boundary (1000 is never inserted); a ruled-question
  lock leg on `ground_inspection` (only `peer_mesh` `how_known` is exercised); HTTP legs for `not_publishable` / `not_withdrawable` / `base_moved` / `*_version_unreadable`; the WhatsApp-reminder
  chain leg; and ONE test that serves a chain version through a consumer route — the API spec's header claims "the neighbours' questionnaire for a NEW request is the new version" but ⛔ member,
  helpline or inspector route is called (**closure honesty, checklist 10**). [packages/domain/tests/integration/questionnaire-versions/*; apps/api/tests/integration/questionnaire-versions/questionnaire-versions.spec.ts]
- [x] [Review][Patch] **RV32 — One unreadable pin fails the WHOLE helpline list (LOW; edge + auditor; traced).** `helplineList` loops `buildPeerRequestDetail` with no per-item guard and `pinnedVersionFor`
  throws `PeerRequestVersionUnreadableError` ⇒ 409 for ALL of that neighbour's open requests while an operator is on the phone. Suggested: catch per item, raise the R8 alarm, omit THAT item
  (BigDev may prefer a visible "could not be opened" stub — a contract field). **R7 (v).** [apps/api/src/modules/claims/claims.peer-request.handlers.ts:384-392; apps/api/src/modules/claims/peer-request-core.ts:184]
- [x] [Review][Defer] **RVD1 — A failed `recordResult` AFTER the commit releases the idempotency key, so a retry re-runs the write** [handlers.ts:244-252] — deferred: the SAME shape as `helplineSave` (copied
  faithfully), so a house-wide fix, not this diff's. ⚠ The cost differs here: a re-run `propose` / `direct` mints a second PERMANENT (append-only) version. Trigger: the next writer built on this shape, or a house pass.
- [x] [Review][Defer] **RVD2 — `questionnaireVersionId` is optional on the wire, with no sunset** [contracts peer-request / ground-inspection save requests] — deferred: designed (R7 (iii), roster Row 45 (d); an old app that
  sends none keeps the retryable stale). Trigger: the store build that sends the field has fully rolled out ⇒ make it required.
- [x] [Review][Defer] **RVD3 — The steps INSERT policy does not bind a step to a version the Pariwar owns** [0192 `questionnaire_version_steps_tenant_insert`] — deferred: defence in depth (QE11 specifies the policy as
  built; `ownTenantVersion` / `canTakeStep` guard every writer, and `versionStage` is last-step-wins). Trigger: any new `twt_app` code path that inserts steps.
- [x] [Review][Defer] **RVD4 — No FK or existence check on `origin_` / `target_` / `scope_pariwar_id`** [0192; `makeVersionLive`, `directVersion`] — deferred: hardening (QE2 does not require one; a mistyped uuid writes a dangling
  `made_live` for a Pariwar that does not exist; Super-Admin-only). Trigger: the first mistyped target, or the next migration touching these tables.
- [x] [Review][Defer] **RVD5 — Read cost and alarm noise** [`rawLiveCandidates` has no LIMIT and re-parses every live step on each resolve; `pariwarsKeepingOwn` is N+1 (TR12); the R8 alarm is an unthrottled `console.error`] — deferred:
  measured nothing; the alarm sink is roster Row 32 (h). Trigger: Row 32 (h) lands, or a measured resolve latency.
- [x] [Review][Defer] **RVD6 — `CHAIN_RESERVED_QUESTION_KEYS` is a snapshot of today's ruled keys** [keys.ts] — deferred: a later code version that rules a key a live chain question already uses would
  silently replace that question on re-base. Trigger: the next story that adds a ruled key.
- [x] [Review][Defer] **RVD7 — Audit granularity of the Super Admin's direct path** [handlers.ts `globalWrite`] — deferred: three step rows under ONE `admin_questionnaire.made_live` line; propose / direct locators name the
  kind, not the version; the hash omits the pages (QE17 as built, the feature-flags precedent). Trigger: an audit-trail requirement that names the direct path.
- [x] [Review][Defer] **RVD8 — Test hardening** [lockstep tests pin the step enum and the floor, ⛔ the kind list or the wire limits 500 / 64 / 20 / 3-per-page; specs hard-code `ground_inspection.v2` / `peer_mesh.v3` / `v4` and random version
  numbers; the `peer-mesh-reply.spec.ts` `save` helper's `.catch(() => null)` falls back to a version id] — deferred: nothing is wrong today. Trigger: the next version shipped in code.
- [x] [Review][Defer] **RVD9 — Counsel basis on a RULED health question is exempt from the lock and relies on every reader calling `overlayCounselBasis`** [validator.ts `lockedView`, derive.ts] — deferred: the API forces
  `counselBasis` for staff questions (`draftToPages`), so a forged value is ⛔ reachable over HTTP; the exemption exists for the day counsel's basis is recorded. Trigger: the first entry in `COUNSEL_BASIS_DECISIONS`.

Dismissed (14 groups, ~55 raw findings — listed so BigDev can audit the dismissals): (1) the tenant list shows other Pariwars' steps — REFUTED: the tenant handle + the steps SELECT policy hide them;
(2) drafts / `reason` readable cross-tenant at the DB layer — `-421` QE11 (A)'s recorded cost (the base bypass is RV3); (3) an unparseable row via the `toStoredDefinition` cast — it is an explicit
7-field pick, and approve parses what it wrote; (4) silent un-publish on a stale ruled base / validator change — QE5 / R2 ratified, with the R8 alarm; (5) the author may approve their own proposal,
the ticks are self-attested, read is bundled in `propose` — `-421` QE6 / QE9 / QE10 and `-422` Q1 A; (6) journal `when` "in the future" — the repo's +24 h-per-entry convention (190 / 191 / 192);
(7) `...body` spread last — the body schema is `.strict()` with two booleans; (8) the boot assertion's crash-loop, the jobs fault relabelling, a staff health question holding that Pariwar's texts, and
a `null` callback audience — designed (QE3, R5, QE10), and `callbackBasisFor` fails CLOSED; (9) the 422 `problems` echo staff text, word-function robustness, `typeof`-unsafe dereferences — intended
(the editor shows the matched term) / guarded by R1's strict parse; (10) ruled-question order not locked, `canonicalJson` undefined-vs-absent, `newestCodeVersion` nits — AC1 locks per question and JSON
transport has no `undefined`; (11) the deploy-order-is-a-comment point — Row 45 (d); (12) the `⛔` glyph readability complaint (4 layers) — the story's own glyph register; (13) AC12 "RED by construction",
the R4 SQL-predicate mutant recorded "equivalent", R7 (v) unreadable terminal on mobile only — all DISCLOSED in the Dev Agent Record (AC12 is ⛔ met to its letter, and says so); (14) the nav link
ungated (QE16), a tenant list fetched before the session resolves, the global detail without Pariwar context, the `$comment` in the locale bundle (13 already ship), the "In force: X — out of date,
serving Y" copy (the R8 line verbatim), `abandonQueued` resurrecting answers (it clears `drafts`), `toDraft`'s kind coercion, member-name fallback logged once per binding, revert's response naming.

### Review Findings — round 2 (the PATCH diff)

Second three-layer review, 2026-10-30, of the diff the round-1 patches made (52 files, +2,988 / −209; the pre-patch tree was rebuilt from HEAD + the round-1 chunk diffs and the patch diff taken against it): two chunks — A server (2,142 lines), B clients
(2,565) — each by a Blind Hunter, an Edge Case Hunter and an Acceptance Auditor, 6 layers in parallel, strictly read-only; the working-tree fingerprint was identical before and after. ~65 raw findings. After deduplication and a hand-trace of every
load-bearing claim: **0 decision-needed, 20 patch, 12 defer (15 after applying — `RPD13`–`RPD15` were found while doing it); 14 dismissals**. **0 HIGH, 3 MEDIUM, 17 LOW.** No Trustee Panel question (§0 applied to each). IDs `RP` / `RPD` (round 2 of the patch diff; ⛔ `RV`, which is round 1).
**Round 2 found defects the round-1 patches INTRODUCED or OVERSTATED:** RP1 (the denylist widening refuses "दारुण" — *grievous* — and "Daruka village", in a bereavement product), RP2 (the RV9 leg I called non-vacuous IS vacuous — its `approvable` is a constant
`DeathCertificateAcceptanceRequiredError`, traced by running it), RP11 (the mobile hand-over has no identity guard). The round-1 Disposition's "verified" list stands for what it names; ⛔ for RV9's meaning.

**Disposition (BigDev, 2026-10-30): option 1 — apply every patch.** All 20 applied; ⛔ committed, ⛔ pushed. Server side, fences, records and the shared helper by the reviewer; the admin web and the mobile app by two agents on disjoint files. **Verified on the FINAL tree:** `typecheck` 20/20,
`lint` 20/20, the unit phase 37/37; the 31 other `ci:local` gates (build, structural invariants, determinism) — all pass; the live-DB `integration-tests` job on a FRESH database from scratch (a throwaway `postgres:16-alpine` on :5461, `pnpm db:migrate` through the AMENDED 0192 — which also answers round 2's "fresh-DB apply unverified"):
24/24 tasks, every file executed — domain 447 files / 6,788 tests, api 208 / 2,499, jobs 86 / 1,962, the rest green; mobile 110 files / 2,162, admin 86 / 1,535. Mutants run and KILLED for every load-bearing leg (RP1 ×3, RP3, RP4, RP5, RP6 ×3, RP7, RP8, RP9 ×4, RP11 ×2, RP12, RP13, RP14, RP16, RP18).
**⚠ A first re-run of the integration job on the SAME database failed once** (`announcement-activity-read.spec.ts`, 3/3 alone) — ⛔ this review's code: the first full run had left 7 committed `cycle_freeze_commits` for the shared `PARIWAR_A` (the jobs / api specs commit them and do not sweep them), which push that spec's rolled-back cycle out of its top-2 window.
A fresh database cleared it (RPD15). **⚠ NOT done:** a single `pnpm ci:local` command on a fresh container (the phases were run separately); a THIRD review of this round's diff; AC11's real-browser pass (UN-ATTESTED, Row 45 (b) OPEN). ⇒ the story stays `review`.

**Deviations and additions (⛔ silent):**
- **RP1** — also folds full-width Latin (NFKC) and strips every Unicode FORMAT character, the variation selectors, U+034F and U+3164 (built without `\u` escapes); `दारु` takes a lookahead for `ण`, Latin `daru` / `daaru` are whole-word. Tested BOTH ways (the false positives not refused; the evasions caught).
- **RP2** — the leg was REWRITTEN around the real gate (a claim approvable in everything but the visit, so the ground-inspection completion is the one conjunct left): it waits while chain answers are saved, is APPROVABLE once the visit completes with a chain answer on it, and goes back to waiting when the completed visit is voided.
- **RP3** — `key={view.pingId}` on the slot's `PeerQuestionnaire`; the mobile agent found the same stale ref is also reached when B's detail is not yet cached.
- **RP6** — `definitionsFor` is exported for its API spec.
- **RP8** — the inspector panel got a `LoadFailed` screen that keeps `reportUnsaved` set, registers a discard and offers the existing "complete without the unsaved answers"; mobile got a `LoadError` with a leave guard (pressing "Leave without saving" GIVES UP the hand-over, like `abandonQueued`). Residual: RPD13.
- **RP9** — ONE shared `withTimeout` / `RELOAD_REFETCH_BOUND_MS` (15 s) in `@twt/api-client`, used by all three clients; a rejection and the bound are both a failure ⇒ the existing Try again. Residual: RPD14.
- **RP11** — the retry is restricted to the two NUMBERING constraints (`isNumberingCollision`), and a persisted two-connection leg proves the loop end to end.
- **RP13 / RP12 / RP14** — as specified; `qv-keeping-own-retry` is a new button + string.
- **RP19** — the mobile BACKGROUND leg now waits past the 1 s backoff; the admin panel legs run on a fake clock; the admin HELPLINE "ONCE" legs stay on real timers with their comments reworded (a fake clock there spammed `act` warnings) and gained a replaced-while-armed leg + a control.
- **RP20** — dated annotations under QE11 (A), AC2 and the step table; a re-examination trigger in the migration header and the policy file. (The migration's COMMENT changed after it was applied; no statement did.)

- [x] [Review][Patch] **RP1 — The RV27 denylist widening REFUSES innocent bereavement wording and still misses forms it was meant to catch (MEDIUM; blind + edge; traced by running it).** `forbiddenTopicMatch('दारुण दुःख')` ⇒ `दारु` and `('इस दारुण घटना')` ⇒ `दारु`
  (*दारुण* = grievous, the commonest word in condolence text); `('Daruka village')` and `('darumaa')` ⇒ `daru` (a bare Latin substring). Meanwhile full-width `ＡＬＣＯＨＯＬ` (NFC does not fold it — NFKC does) and `alco` + U+2061 + `hol` PASS (the invisible-character class is
  too short). Also: stored chain versions are re-validated on every read, so a term added to the list can make an approved version unreadable — nothing is live yet, but the list must not be widened carelessly. Fix: `दारु(?!ण)`; Latin `daru` / `daaru`
  with word boundaries; `normalize('NFKC')`; strip `\p{Cf}` + variation selectors + U+034F (built without `\u` escapes); tests for BOTH directions (the false positives refused-not, the evasions caught). **CF3 (c); `-304` Q5 A.**
  [packages/domain/src/questionnaires/keys.ts:123-137; packages/domain/tests/questionnaires/chain-versions.test.ts (the RV27 leg)]
- [x] [Review][Patch] **RP2 — The RV9 "nothing gates" leg for the ground-inspection side is VACUOUS in what it names (MEDIUM; auditor; traced by instrumenting it).** `gates()`'s `approvable` is `DeathCertificateAcceptanceRequiredError … 'not_reviewed'` in this fixture —
  a constant, thrown before any conjunct a chain answer could reach; `completion` reads only assignment status / stage / inherited source / compared-upload id (`ground-inspection-approval.ts`), and the visit is never completed. The "control" moves the CLAIM STATE, which
  moves everything — it proves the serialisation reacts to the claim, ⛔ to a gating answer. Round 1's Disposition called the leg non-vacuous; ⛔ it is. Fix: seed a claim that is APPROVABLE (accepted certificate, nominee accounts, a completed visit via
  `completeWithDate`) so `approvable` is `'ok'` BEFORE the answer, assert that before-state, then answer; and a control that varies the GATING input (complete / un-complete the visit) so `completion` is shown sensitive to the right thing. **AC10; checklist 11;
  [[feedback_gate_scope_semantic_coverage]].** [packages/domain/tests/integration/claim/ground-inspection-questionnaire.spec.ts (the NOTHING GATES describe)]
- [x] [Review][Patch] **RP3 — The mobile hand-over is not scoped to the ping it came from (MEDIUM; auditor + blind; traced).** `PeerRequestSlot` mounts `<PeerQuestionnaire pingId={view.pingId}>` with ⛔ `key`; the screen's `carried` ref lives as long as the screen. A
  link-to-link switch whose by-link result is cached goes `questionnaire(A)` → `questionnaire(B)` without passing through `loading`; B's first render takes `toCarry = carried.current` (A's unsent answers) and re-saves them INTO B. Both pings are the same member's, so the
  server accepts the write. Before round 1 this was unreachable (`carried` was set only on a version-stale reload); the always-on mirror made it reachable. The helpline and the inspector panel are guarded (`[memberId, ready]` clear; a per-visit card key). Fix: `key={view.pingId}`
  on the slot's `PeerQuestionnaire` (a remount per ping resets the ref), and a leg that switches ping with unsent drafts. **RV7; checklist 12 (a).** [apps/mobile/components/peer-request/PeerRequestSlot.tsx:69-70]
- [x] [Review][Patch] **RP4 — The mobile `onReload` still overwrites the merged hand-over (LOW–MEDIUM; blind + edge; traced).** `onReload` does `carried.current = drafts` (`PeerQuestionnaire.tsx:75`) with the editor's OWN drafts, from both call sites (211, 434) — bypassing
  `mergeCarried`, so answers carried in but not yet applied are dropped when a reload fires before the instance applied them. The admin versions already ignore the argument. Fix: `onReload` takes no drafts and leaves the mirror as the only writer. **RV7.**
  [apps/mobile/components/peer-request/PeerQuestionnaire.tsx:75,105,211,434]
- [x] [Review][Patch] **RP5 — The RV10 count is still unasserted on the CONSOLE audit line (LOW–MEDIUM; auditor; layer-reported, grep-consistent).** Only `admin_claim.peer_answers_read` gets a non-zero `sensitive_answer_count` (`peer-answers-approvers.spec.ts`); deleting the spread at
  `claims.verifier-console.handlers.ts:1396` leaves the suite green. Round 1's "BOTH audit lines" was overstated. Fix: read the console as a district admin in the same spec and assert `admin_verifier_console.read`'s context carries `sensitive_answer_count: 1` and
  `family_sensitive_answer_count`. **AC4; checklist 8.** [apps/api/tests/integration/claims/peer-answers-approvers.spec.ts; apps/api/src/modules/claims/claims.verifier-console.handlers.ts:1396]
- [x] [Review][Patch] **RP6 — RV24's counted, batched path has no test (LOW–MEDIUM; auditor + edge; traced by grep).** `getQuestionnaireDefinitions` and `databaseVersionIds` are referenced by no test; no API spec drives a DATABASE-pinned reply / visit through the assembler, so deleting the
  `bump()` (the original defect) leaves everything green and "+2 conditional → 33" is never reached. Also `readStepsFor` has no direct leg. Fix: domain live-DB legs (code-only ⇒ `queried: false` and NO statement; N distinct DATABASE ids ⇒ ONE statement; unparseable ⇒ `null` + alarm; unknown ⇒ `null`) and an
  API leg on `definitionsFor` (exported for it): code-only ⇒ no `bump`, no `run`; a DATABASE pin ⇒ one `bump` and one `run`, however many ids. **RV24; checklist 7.**
  [packages/domain/src/questionnaire-versions/read.ts; apps/api/src/modules/claims/peer-answers-assembler.ts (`definitionsFor`)]
- [x] [Review][Patch] **RP7 — The RV18 payload is still built from the BASE (LOW–MEDIUM; blind + auditor; traced).** The editor shows the newest code version's ruled questions (`ruledQuestions`, line 598) but `const pages = draftPages(b, questions)` (line 607) takes the ruled keys and
  layout from the base. If the newest Panel version added, removed or regrouped a ruled key, the locked list on screen and the proposal disagree (the validator then refuses a missing ruled key, which the editor cannot fix). QE5 is met for wording only. Fix: build the ruled pages from the
  current code version's pages when it loaded; fall back to the base only on the same notice as the display. A leg where the two versions differ. **QE5; AC9.** [apps/admin/src/modules/questionnaire-versions/QuestionnaireVersionsPage.tsx:537,598,607]
- [x] [Review][Patch] **RP8 — A failed reload drops the leave guard while answers are still unsent (LOW–MEDIUM; edge; traced).** The inspector panel's `reportUnsaved` lives in the editor child (cleanup sets it false); when the load-failed screen replaces the editor, the inspector can complete the visit or leave
  the claim with no warning, the unsent answers sitting only in the hand-over ref. Mobile: the failed-reload screen replaces the `Questionnaire` that owns `usePreventRemove`. Fix: keep reporting unsaved from the PARENT while `carried.current.length > 0` in the error branch; mobile: a leave guard on the failed screen. **RV8 (the same class: no exit / silent loss).**
  [apps/admin/src/modules/ground-inspection/QuestionnairePanel.tsx:151-160,279-284; apps/mobile/components/peer-request/PeerQuestionnaire.tsx:92-110]
- [x] [Review][Patch] **RP9 — A reload refetch that NEVER settles leaves the card / panel / screen stuck (LOW–MEDIUM; edge + blind; the house lesson).** The admin transport has no timeout and the recorded lesson says to RACE a bound ([[project_tanstack_refetch_rejoins_hung_fetch]]): the helpline card sits on "updating them…", the inspector
  on "Loading…", and mobile on its spinner, with no Try again, the answers neither saved nor recoverable. Fix: bound each `onReload` refetch (≈ 15 s) and treat the bound as a failure ⇒ the existing Try again. A leg with a never-resolving refetch under fake timers.
  [apps/admin/src/modules/helpline-claims/HelplinePeerRequests.tsx (onReload); apps/admin/src/modules/ground-inspection/QuestionnairePanel.tsx (onReload); apps/mobile/components/peer-request/PeerQuestionnaire.tsx (onReload)]
- [x] [Review][Patch] **RP10 — `versionVisibleTo` leans on RLS for its Pariwar filter (LOW; auditor + blind; traced).** Its steps leg is `readVersionSteps(db, id).length > 0` with the `pariwarId` argument unused: correct only on an RLS-bound tenant handle; on a superuser / BYPASSRLS handle any version with any step reads
  "visible" and `assertBase` fails OPEN. Inconsistent with `listVersionRows` and `shownSteps`, which filter explicitly (R4: "no query leans on RLS"). Fix: filter the steps by `scopePariwarId === null || === pariwarId` in code, plus a leg on the superuser handle.
  [packages/domain/src/questionnaire-versions/write.ts (versionVisibleTo)]
- [x] [Review][Patch] **RP11 — `isUniqueViolation` throws on `null`, retries ANY unique violation, and the retry has no persisted end-to-end leg (LOW; blind + auditor; traced).** `isUniqueViolation(null)` reads `e.code` on `null`; the retry fires for ⛔ only `(kind, version)` / `version_id` but any 23505
  (three attempts); the loop's success path was shown only by an unpersisted mutant run. Fix: guard non-objects; retry only when the constraint is `questionnaire_versions_kind_version_uq` or `…_version_id_uq` (else rethrow); a persisted two-connection leg — a raw uncommitted insert of the
  next number, then `proposeVersion` blocks on the unique index, the first commits, the proposal takes the NEXT number. **RV12; checklist 2.** [packages/domain/src/questionnaire-versions/write.ts (insertVersion, isUniqueViolation); packages/domain/tests/integration/questionnaire-versions/write-concurrency.spec.ts]
- [x] [Review][Patch] **RP12 — A base-moved tick outlives the warning it was given for (LOW; auditor + edge + blind; traced).** `ack` resets on scope change and success but ⛔ where `baseMovedVia` clears (View, open / close editor, an unrelated success). The panels are keyed per version, so a version switch is safe, but the SAME mounted panel
  re-shows a fresh `base_moved` with the box already ticked and Make live enabled — one click sends `acknowledgeBaseMoved: true`. The round-1 leg proves only the intermediate click. Fix: reset `ack` when `baseMoved` becomes false (panel and editor), and a leg that re-raises the 409. **RV14; QE7 (e).**
  [apps/admin/src/modules/questionnaire-versions/QuestionnaireVersionsPage.tsx:354-358,496,589-613]
- [x] [Review][Patch] **RP13 — The every-Pariwar gate accepts a STALE list and its error has no retry (LOW; auditor + edge + blind; traced).** `keeping.isSuccess` is also true for cached data while a background refetch runs, so a stale list can unlock the confirm; and `qv-keeping-own-error` says "Please try again" with no control (the only way
  out is toggling the radios). Fix: `isSuccess && !isFetching`; a Try again button calling `keeping.refetch()`. **RV13; QE7 (a).** [QuestionnaireVersionsPage.tsx:455-466,486]
- [x] [Review][Patch] **RP14 — `run` leaves the previous act's warnings and "Saved" beside a new failure (LOW; blind + edge; traced).** `run` clears the error but ⛔ the C9 warnings; after act 2 fails, act 1's warnings and (via per-call `mutateAsync`) a "Saved" can sit beside it. Fix: clear warnings and saved at the top of `run`.
  **RV15.** [QuestionnaireVersionsPage.tsx (run)]
- [x] [Review][Patch] **RP15 — The domain GI spec has two imports glued on one line (LOW; blind + auditor; traced).** Line 31: `…errors.js';import { assertClaimApprovable } from …` — a paste defect of the round-1 edit. [packages/domain/tests/integration/claim/ground-inspection-questionnaire.spec.ts:31]
- [x] [Review][Patch] **RP16 — The new `afterAll` sweeps have no ROLLBACK, and one test claim cannot fail (LOW; edge + blind + auditor; traced).** The ground-inspection and helpline API specs `BEGIN … COMMIT` with no `catch`: a failing `DELETE` aborts the transaction on a pooled client and skips the user cleanup in the same `try` (the member spec has the `ROLLBACK`).
  And "an OLD visit keeps its pin" re-GETs the same visit while the chain version is STILL the one in force — it would pass if the pin were ignored. Fix: the `try / catch → ROLLBACK` form; make a NEWER chain version live after the pin and assert the old visit still answers its pinned version.
  [apps/api/tests/integration/claims/ground-inspection-questionnaire.spec.ts (afterAll; the RV31 / AC4 test); apps/api/tests/integration/claims/peer-request-helpline.spec.ts (afterAll)]
- [x] [Review][Patch] **RP17 — The RV20 leg is non-hermetic and its bounds are vague (LOW; blind + auditor).** `top` is random in 1.3M–2.2M and the leg expects the peer_mesh versions to be EXACTLY `[top+2, top+1]` and the inspection one to contain `top`: any committed row above it (leaked rows from the API specs, 1.8M–1.95M, or the jobs tests, 2.0M+) fails it; the
  `gi` bounds are `>= 1` and `<= 2`. Fix: take `top` from `max(version) + 10` read in the test's own transaction; assert `gi` exactly. [packages/domain/tests/integration/questionnaire-versions/write.spec.ts (the RV20 leg)]
- [x] [Review][Patch] **RP18 — The nothing-gates direct scan is not recursive (LOW; blind).** It lists `questionnaire-versions/` and `questionnaires/` with a non-recursive `readdirSync`, so a subdirectory is never scanned. Fix: walk recursively; keep the `> 10` floor. [packages/domain/tests/questionnaire-versions/nothing-gates-fence.test.ts]
- [x] [Review][Patch] **RP19 — Test titles and comments that claim more than the leg proves (LOW; blind + auditor).** The "applied ONCE" admin / helpline / mobile legs settle for 60–80 ms against a retry that runs behind `retryDelayMs(1)` = 1000 ms (the comment "rules out the disposed editor's retry" is not what it observes); the RV16 title says "nor with none" but the none case (code, empty `skipped`) is not in it;
  four titles still say "the ceiling is 29 / 30" and "MAX_READS is pinned (30 …)" while the code asserts 33. Fix: advance the clock past the retry delay in the "ONCE" legs (or state what they observe), add the RV16 none case, correct the titles. [apps/admin/tests/*; apps/mobile/tests/unit/peer-questionnaire-render.test.ts; apps/api/tests/integration/claims/verifier-console*.spec.ts, suspicion-refusal-routes.spec.ts]
- [x] [Review][Patch] **RP20 — The story's records still describe the two-leg steps policy (LOW; auditor; checklist 9).** QE11 (A), AC2 ("steps keyed on `scope_pariwar_id`") and the step table were written before RV2's third SELECT leg, and the migration / policy-file notes give a rationale but no RE-EXAMINATION TRIGGER.
  Fix: a dated annotation under QE11 (A), AC2 and the step table naming the third leg and what it exposes at the DB level (the origin reads the target's uuid, the actor's display name and the time of a `made_live` for another Pariwar; the API's `shownSteps` withholds them); a trigger line in the migration header and the policy file ("any
  new consumer that returns step rows from a tenant handle"). **Checklist 9.** [this story, QE11 / AC2 / step table; packages/domain/migrations/0192_questionnaire-versions.sql; packages/domain/src/policies/questionnaire-versions-rls.ts]
- [x] [Review][Defer] **RPD1 — The reload is a DOUBLE rebuild by construction (data changes, then the generation bumps), so one answer is sent three times** [QuestionnairePanel / HelplinePeerRequests `onReload`; the "ASYNC reload" legs assert `saves()` = 3] — deferred: the merge makes the second rebuild survivable (round 1 RV7); removing it means restructuring the reload around ONE signal. Trigger: any change to the reload mechanism, or an observed duplicate-save complaint.
- [x] [Review][Defer] **RPD2 — A draft whose request is still on the wire is mirrored and re-sent under a NEW idempotency key by the successor** [the three clients' `mirror()`] — deferred: for a version change the old request is refused 409 (safe); for a same-version rebuild the old request could land after a later edit (last write wins), a narrow window. Trigger: the first report of an answer that reverted.
- [x] [Review][Defer] **RPD3 — No loop breaker on repeated stale → reload → re-save** [the three `onReload`s] — deferred: needs a server that keeps answering stale for a version it also serves, which the version compare makes impossible short of a cache fault. Trigger: a stuck-reload report.
- [x] [Review][Defer] **RPD4 — The version list truncates silently past 200 versions of ONE kind, and may cut the in-force one** [`listVersionRows`] — deferred: staff-written versions are few; a "more" signal needs a contract field. Trigger: any kind passing ~150 versions, or the list gaining a pager.
- [x] [Review][Defer] **RPD5 — The new `role="status"` nodes that mount WITH their text (`qv-keeping-own`, `qv-keeping-own-loading`, `qv-detail-warnings`) are not reliably announced** [QuestionnaireVersionsPage.tsx] — deferred: checklist 13 (d) by web analogy; the persistent `qv-status` region is right. Trigger: 11b.8's accessibility audit, or any surface refactor of this page.
- [x] [Review][Defer] **RPD6 — Validation issue lines show raw 0-based pointers, capped at 5 with no "and N more"** [`issueLine` / `errorLines`] — deferred: editorial. Trigger: the first editor who cannot find the field.
- [x] [Review][Defer] **RPD7 — The helpline omits an unreadable request silently from the operator's point of view** [`helplineList`] — deferred: round 1 RV32 disclosed it as BigDev's call (omit + alarm + audit count vs a visible stub, which needs a contract field). Trigger: BigDev's choice.
- [x] [Review][Defer] **RPD8 — Concurrency specs have no `try / finally` around the open transactions, and several specs draw version numbers from overlapping random bands** [`write-concurrency.spec.ts`; the API and jobs specs] — deferred: the same pattern as the specs before this story; the sweep is the real protection. Trigger: a hung run holding an advisory lock.
- [x] [Review][Defer] **RPD9 — The Editor swaps the form for "Loading…" if the code-version query changes id mid-edit, losing typed state** [Editor] — deferred: code versions change only on deploy. Trigger: a deploy while an editor is open.
- [x] [Review][Defer] **RPD10 — Refs are assigned during render (`questionsRef`, `allQuestionsRef`)** [QuestionnairePanel / HelplinePeerRequests / PeerQuestionnaire] — deferred: lint passes today; unsafe under a discarded concurrent render. Trigger: React concurrent features or a newer `react-hooks` rule.
- [x] [Review][Defer] **RPD11 — A cross-Pariwar withdraw-vs-make-live RACE leg** [`write-concurrency.spec.ts`] — deferred: round 1 RV2 added the non-racing legs; the step lock serialises both. Trigger: any change to the step lock order.
- [x] [Review][Defer] **RPD12 — A few test-infrastructure nits** [the RV7 legs re-assume the TanStack scheduler default after `setScheduler`; the mobile save-version test says "ONLY the transport is stubbed" yet mocks ~ten modules; the duplicated pure-function tests; the cross-feature import of `mergeCarried` through `helpline-claims/carry-over.ts`] — deferred: cosmetic. Trigger: the next edit of those files.

- [x] [Review][Defer] **RPD13 — The failed-reload screen does not replicate the editor's tab-close warning (`beforeunload`) or its router-block** [`QuestionnairePanel.tsx` `LoadFailed`] — deferred: it keeps `reportUnsaved`, a discard and the unsaved note; closing the TAB during a failed reload is still unwarned. Trigger: the first report of answers lost on a closed tab.
- [x] [Review][Defer] **RPD14 — A very late reload timeout can show the failed screen over an editor another route already rebuilt** [the three `onReload`s] — deferred: needs the reload's refetch still pending 15 s after a rebuild; judged degenerate. Trigger: a flash of "could not be updated" over a working questionnaire.
- [x] [Review][Defer] **RPD15 — The integration job is not re-runnable on one database: jobs / api specs commit `cycle_freeze_commits` for the shared `PARIWAR_A` and do not sweep them, so `announcement-activity-read.spec.ts` (top-2 window) fails on the second run** [`apps/jobs/tests/close-cycle-alert-live.test.ts`, `assignable-roster-live.test.ts`, `apps/api/tests/integration/announcement-channels.spec.ts`, …] — deferred: pre-existing test pollution, not this story's; CI and `ci:local` use a fresh database. Trigger: the next story that runs the job twice on one database, or a sweep pass over the committing specs.

Dismissed (14 groups, ~25 raw findings — listed so BigDev can audit them): (1) "migration 0192 edited in place never reaches an already-migrated database" — REFUTED: `git log --all -- 'packages/domain/migrations/0192*'` is empty and none of the four other story databases has the tables;
(2) "`recordResult` runs before the commit" — REFUTED: `closeScopeTx` is in `tenantWrite`'s `finally`, inside the function `withIdempotency` awaits, before `recordResult`; (3) "`translateGroundInspectionError` may return" — it is typed `never` and ends in `throw err`;
(4) "other callers of `groundInspectionVersionFor` turn a corrupt pin into a 500" — there are exactly three (the writer, the GET, the save pre-block), all covered; (5) "the contracts test lacks a `questionnaires` import" — it is at the top of the file (and was before); (6) "`mergeCarried` orders by recency, not dependency" — the order is the editor's
own edit order, which the editor's queue already handles; (7) the same-tick double click on Revert and the differing idempotency keys — cosmetic, the second is a 409 `nothing_to_revert`; (8) "changing a kind deletes `exclusive` irreversibly" — RV21's own intent; (9) "`ack` / `scope` survive a version switch" — `VersionPanel` and `Editor` are keyed, so they remount;
(10) "`apps/mobile/lib/peer-request.ts` now loads the api-client barrel" — the whole mobile suite (2,156) and the screen already import it; (11) the helpline `reloading` entry not reset on a rebuild — cosmetic; (12) `resolveSpecifier` on `.json` / `.tsx` — a missing resolution throws LOUDLY, by design;
(13) "the fence ROOTS are hard-coded" / "`ITEM_WORD_RE` is evadable" — stated in its own comment (a tripwire, ⛔ a proof); (14) "no test of a never-recorded `QuestionnaireDefinition` alarm on a missing pin", "RV11 has no non-human leg" — round 1's Fix text asked only for tampered sessions.

### Review Findings — round 3 (the whole story, code only)

Third three-layer review, 2026-10-30, of `origin/main..de86f2ad` restricted to `apps` + `packages` (13,463 diff lines, tests included, records excluded) — BigDev: *"full code only, at once"* — ONE Blind Hunter, ONE Edge Case Hunter, ONE Acceptance Auditor over the whole diff, in parallel, strictly read-only (the tree was clean before and after). 30 raw findings (14 blind / 12 edge / 4 auditor). After deduplication against rounds 1 and 2 and a hand-trace of every new claim: **2 decision-needed (both resolved ⇒ patches RT6 / RT7), 5 + 2 = 7 patch, 2 defer, 16 dismissed. 0 HIGH, 1 MEDIUM.** The Auditor: every AC met except AC11 / AC13 (⛔ checkable from code) and AC12 (partly met, as the record already says). No Trustee Panel question (§0 applied to each — both decisions are BigDev's build calls). IDs `RT` / `RTQ` / `RTD` (round 3; ⛔ `RV` round 1, ⛔ `RP` round 2).

- [x] [Review][Decision] ✅ RESOLVED 2026-10-30 — BigDev, verbatim, *"1, 1"* ⇒ option (A) ⇒ patch **RT6**. **RTQ1 — A Pariwar Admin's wire carries ANOTHER Pariwar's identity on a version made live for them (blind + edge; traced).** — `summaryOf` (`apps/api/src/modules/questionnaire-versions/handlers.ts:133-152`) returns `originPariwarId`, `authoredByDisplay`, `reason` and `baseVersionId` to EVERY viewer, while `shownSteps` deliberately withholds the other Pariwar's steps and the page renders only *"Proposed and approved in another Pariwar"* (QE11 (A) ACCEPTED). So Q's admin receives P's uuid and P's staff member's display name (the page never renders `authoredByDisplay` — it is wire-only), and `baseVersionId` can name P's still-open proposal (RV3 hid its body, ⛔ its id). Per-item hiding with a leak beside it ([[feedback_withholding_must_be_uniform]]). Options: (A, recommended) for a tenant viewer whose Pariwar ≠ the origin, withhold the author's display name and the origin uuid and name the base only when the viewer may read it (`versionVisibleTo`) — a contract change (nullable fields / a `fromAnotherPariwar` flag); *cost:* contract + page + tests touched. (B) Accept as QE11 (A)'s cost and annotate QE11; *cost:* the house rule's exception, written down.
- [x] [Review][Decision] ✅ RESOLVED 2026-10-30 — BigDev, verbatim, *"1, 1"* ⇒ option (A) ⇒ patch **RT7**. **RTQ2 — The Super Admin's "with modification" accepts a base in ANY stage (auditor + edge; traced).** — QE7 (b): *"`base` = the approved one"*; `directVersion` (`packages/domain/src/questionnaire-versions/write.ts:440-448`) calls `assertBase(db, kind, baseVersionId, null)`, which checks existence, parse and kind only — a proposed, returned or withdrawn version (any Pariwar's) can be the base, and the history then shows a live version built on a returned one. ⛔ an escalation (the direct path may author anything — QE7 (c)). Options: (A, recommended) enforce: the base is a CODE version or a database version whose stage is `approved` / `published`, else 422 `questionnaire.base_invalid` (the code already exists); a leg per refused stage; *cost:* a Super Admin who wants to rework a returned proposal copies its words into an edit of an approved base. (B) Accept and annotate QE7 (b) ("any visible version"); *cost:* the ruled text and the code disagree until annotated.
- [x] [Review][Patch] **RT1 — QE16's change markers mark EVERY carried-over staff question "changed" (MEDIUM; edge; traced).** `changeMarkers` compares `canonicalJson(lockedView(b))` with `canonicalJson(lockedView(q))`; `lockedView` returns the whole question incl. `approvedBy`, and `buildChainDefinition` re-stamps every chain question `['chain:<this version's id>']` (`write.ts:202-213`) — a fresh uuid per version — so an untouched staff question never compares equal. The approver (who attests with two ticks) cannot tell the real edits from the untouched ones. The one unit leg (`chain-versions.test.ts` ~400) uses ONE fixed `CHAIN_ID` for base and next, so it cannot see it. Fix: compare a chain question with its own chain record excluded (both sides' `approvedBy` matching `chain:<uuid>`), ruled questions as today; a leg with DISTINCT chain ids for base and next (unchanged ⇒ `unchanged`, an edited text ⇒ `changed`) and a mutant. **QE16, AC9.** [packages/domain/src/questionnaires/derive.ts:145-157]
- [x] [Review][Patch] **RT2 — The page offers the Super Admin tenant acts the server refuses (LOW–MEDIUM; blind + edge + auditor; traced).** The approve / return block renders on `d.stage === 'proposed'` with no `isSuperAdmin` guard, and "Propose this version" renders for everyone; both post to `/p/:pariwarId/…`. A Super Admin with ⛔ grant row in the Pariwar gets `scopeResolutionHook`'s 404 `pariwar.not_found` (`middleware/scope-resolution/index.ts:59-61`; `hooks.ts`' own comment says so); with one, a proposal from ANOTHER Pariwar (the global list shows them all) gets `ownTenantVersion`'s 404. Only Withdraw is hidden today. Fix: render the approve / return block and the Propose button only when `!isSuperAdmin` (the Super Admin's acts are QE7's global ones — make-live, direct, revert); a leg that the Super Admin's page shows neither. **QE16, AC8 / AC9.** [apps/admin/src/modules/questionnaire-versions/QuestionnaireVersionsPage.tsx:414,742]
- [x] [Review][Patch] **RT3 — "Make live directly" for ALL Pariwars never lists who keeps their own version (LOW–MEDIUM; auditor; traced).** QE7 (a): *"The make-live-for-ALL screen lists 'N Pariwars keep their own version: [names]' before the confirm"* — `-422` Q3 A ratified that "all" sets only the default level. `directVersion` with a NULL target writes the SAME default-level `made_live`, but the Editor's `qv-direct` block (scope radios at :755-758, confirm at :788) shows no list — `usePariwarsKeepingOwnQuestionnaire` is called only in `VersionPanel` (:368). Fix: the same list (and RP13's `isSuccess && !isFetching` gate + Try again) in the direct block when `scope === 'every'`; a leg. **QE7 (a) / (b), `-422` Q3, AC9.** [apps/admin/src/modules/questionnaire-versions/QuestionnaireVersionsPage.tsx:750-790]
- [x] [Review][Patch] **RT4 — Mobile "Try again" after a failed reload remounts the editor on the OLD version and re-sends the carried answers stale (LOW; blind + edge; traced).** `onTryAgain` runs `setReloadFailed(false)` THEN `onReload()`: the next render has the old `data` and ⛔ error, so `<Questionnaire key={old:reloads}>` mounts fresh, takes `carried`, and its timer saves with the old `questionnaireVersionId` while the refetch is on the wire ⇒ a certain 409 stale and a second `onReload` joining the first. Nothing is lost; an extra round trip and the old questions flash. The admin panel and helpline keep their failure screen until the refetch settles; the RP9 leg cannot see it (its mocked `refetch` resolves in a microtask). Fix: keep the failure screen (or a "loading" line) until the retry settles — clear `reloadFailed` inside `onReload`'s success branch, ⛔ before the call; a leg with a refetch that resolves AFTER the editor's timer. **R7, AC5.** [apps/mobile/components/peer-request/PeerQuestionnaire.tsx:78-92,109-113]
- [x] [Review][Patch] **RT5 — The R6 sync-resolver fence does not see a direct read of `QUESTIONNAIRE_REGISTRY` (LOW; auditor; traced).** The fence matches only `resolveLiveVersion(` / `getQuestionnaireVersion(`; `handlers.ts:367,382` read `QUESTIONNAIRE_REGISTRY.find` / `.some` directly (legitimately — a code version's detail), so a later consumer could resolve "live" from the registry and stay green ([[feedback_gate_scope_semantic_coverage]]). Fix: add `QUESTIONNAIRE_REGISTRY` to the fence with an explicit allow-list (the registry's module, the reader, the validator, the handlers' code-version detail) and a planted-violation leg. **R6, I6.** [packages/domain/tests/questionnaire-versions/sync-resolver-fence.test.ts:56]
- [x] [Review][Patch] **RT6 — (from RTQ1 (A)) Withhold another Pariwar's identity from a tenant viewer, uniformly.** In `summaryOf`, for a tenant viewer whose Pariwar ≠ the version's `originPariwarId` (a non-null origin), ⛔ send the author's display name or the origin uuid, and send `baseVersionId` only when `versionVisibleTo` admits the base for that viewer; the Super Admin's global view is unchanged. Contract: the fields nullable (or a `fromAnotherPariwar` flag) — the page's "Proposed and approved in another Pariwar" line stays the one rendering. Legs: Q's admin reading P's version made live for Q receives none of the three; P's own admin and the Super Admin still do. **QE11 (A); [[feedback_withholding_must_be_uniform]].** [apps/api/src/modules/questionnaire-versions/handlers.ts:133-152; packages/contracts/src/questionnaire-versions/index.ts]
- [x] [Review][Patch] **RT7 — (from RTQ2 (A)) The direct path's base must be a CODE version or an `approved` / `published` database version.** In `directVersion`, after `assertBase`, refuse a database base whose stage is `proposed` / `returned` / `withdrawn` with 422 `questionnaire.base_invalid`; legs per refused stage + an approved and a published base accepted; a dated annotation under QE7 (b). **QE7 (b).** [packages/domain/src/questionnaire-versions/write.ts:440-448]

**Round 3 — APPLIED 2026-10-30** (BigDev: *"1"* — apply every patch), each with a leg and a mutant that fails it:
- **RT1** — `derive.ts` `markerView`: a question's OWN chain record (`approvedBy` = one `chain:<uuid>`) is set aside by the marker; a ruled question keeps its Panel ids. Leg: distinct chain ids for base and next (`chain-versions.test.ts`); mutant (the old `lockedView` compare) ⇒ red.
- **RT2** — the approve / return block and Propose render only for `!isSuperAdmin`. Leg: the Super Admin sees neither, a Pariwar Admin both (`questionnaire-versions-page.test.tsx`, round 3); both guards mutated ⇒ red.
- **RT3** — ONE `KeepingOwn` component (+ `isKeepingReady`) for the make-live AND the direct path; the direct confirm for every Pariwar waits for a FRESH list (RP13's rule) with its Try again. Legs: loading ⇒ list ⇒ enabled ⇒ sent `targetPariwarId: null`; failed ⇒ disabled ⇒ Try again. The list and the gate mutated out ⇒ red.
- **RT4** — `onReload` clears `reloadFailed` ONLY with a successful generation bump; Try again calls it without clearing first. Leg: a retry refetch that settles AFTER the carry tick — the failure screen stays, ⛔ second stale send, then ONE send on the new version (`peer-questionnaire-render.test.ts`); the old order ⇒ red.
- **RT5** — `REGISTRY_READERS` + `REGISTRY_RE`: ⛔ `QUESTIONNAIRE_REGISTRY` outside the code module, the reader, the ground-inspection pin read and the editor's handlers; a teeth leg. A planted reference in `apps/jobs/src/boot.ts` ⇒ red (reverted).
- **RT6** — `summaryOf(…, baseShown)`: to a tenant viewer a version from ANOTHER Pariwar carries `originPariwarId: null` and `authoredByDisplay: null`; `baseVersionId` only when `baseVisibleTo` (the RV3 rule — the list uses its own visible set, asking by name past it). Contract docs say so (the fields were already nullable). Live HTTP leg (`questionnaire-versions.spec.ts`, RT6): Q withheld in detail AND list; P and the Super Admin see all; a base made live for Q is then named to Q. Mutants: the author / the base ⇒ red; ~~⚠ the past-the-list fallback (`|| baseVisibleTo`) is EQUIVALENT within the 200 cap (RPD4) — recorded, ⛔ killed.~~ ⚠ CORRECTED by round 4 (RF2): that claim was WRONG — a CODE base is never a listed row, so every code-based version reaches the fallback; the mutant is NOT equivalent and is now killed by RF2's list leg. ⚠ The first run's leg made a version live for ALL and moved RV31's default base — rewritten to target Q (a leg must ⛔ move the shared all-Pariwar level).
- **RT7** — `directVersion`: a DATABASE base must be `approved` / `published` (read on the global handle), else 422 `questionnaire.base_invalid` with its stage; docstring updated. Live leg (`write.spec.ts`, RT7): proposed / returned / withdrawn refused; approved, published and a code version accepted; the check mutated out ⇒ red. ⚠ A Super Admin who opens "New version" from a proposal now meets that 422 on the direct path (the decision's stated cost).

- [x] [Review][Defer] **RTD1 — An idempotent replay ignores the request body** [handlers.ts `withIdempotency`] — deferred: the replay returns the recorded result for the same key whatever the body (propose's hash omits `pages`; make-live's key omits `targetPariwarId`); the shipped client mints a fresh key per click (`newKey()`), so a reused key with a new body is ⛔ reachable from it; the house shape (`helplineSave`) has the same property — only the ground-inspection writer compares (`GroundInspectionIdempotencyMismatchError`). Trigger: a client or retry layer that reuses a key across bodies, or a house pass on `withIdempotency`.
- [x] [Review][Defer] **RTD2 — A STAFF health question's `'pending'` basis can never be cleared, so its hold outlives counsel's recorded basis** [handlers.ts `draftToPages` (`counselBasis: q.health ? 'pending' : null`); derive.ts `overlayCounselBasis` (ruled keys only); the jobs' `pendingCounselBasisKeys`] — deferred: QE10 lets a chain version carry a basis only as an id in `COUNSEL_BASIS_DECISIONS`, but the wire has ⛔ basis field and the API hard-codes `'pending'`, so once counsel's basis IS recorded a staff health question still holds that Pariwar's texts and reminders until a version without it replaces it — and the QE10 warning ("until counsel's basis is recorded") reads otherwise for staff questions. ⛔ reachable today (the list is empty). Trigger: the first entry in `COUNSEL_BASIS_DECISIONS` (the same trigger as RVD9).

Dismissed (16 — listed so BigDev can audit them): (1) the steps INSERT policy does not bind a step to the Pariwar's own version — RVD3 (blind + edge); (2) no existence check / FK on the target Pariwar — RVD4 (blind + edge); (3) the R8 alarm on every resolve, read cost — RVD5; (4) audit locators name the kind, direct logged as `made_live` — RVD7; (5) `recordResult` failing after the commit releases the key — RVD1; (6) the global list capped at 200 — RPD4; (7) "`serviceDb` may not bypass RLS" — REFUTED: `apps/api/src/deps.ts:429` names it the BYPASSRLS handle; (8) / (9) "read-only" (R7 (v)) ⛔ on the wire, and the inspector panel's GET 409 `…_version_unreadable` with only a generic Try again — round 1's dismissal (13), disclosed (unreadable terminal on mobile only); (10) the all-Pariwar level cannot return to a code version — QE7 (d)'s stated cost (a NEW direct version based on the code version in force); (11) a staff health question holding texts — QE10 (A) designed (the forward-looking half is RTD2); (12) `canonicalJson` undefined-vs-absent — round 1's dismissal (10); (13) `sensitive_answer_count` counts an answer whose decrypt failed — the field counts ciphertext answers READ (`peer-answers-assembler.ts:94`), a failed decrypt is still an access; (14) the peer pin's kind unchecked — ⛔ reachable (pins are written only from a resolved `peer_mesh` version; append-only); (15) the global serviceDb reads lack a re-examine trigger (auditor, checklist 9) — the rationale is in `routes.ts` and QE11, each route behind `requireGlobalPermission`; (16) AC12's single fresh-container `ci:local` run — already disclosed in the record and the ledger.

### Review Findings — round 4 (round 3's PATCH diff)

Fourth three-layer review, 2026-10-30, of round 3's patch diff (`git diff HEAD -- apps packages`, 651 lines, uncommitted) — BigDev: *"1"* (review the patch diff), then *"apply pacthes for findings, then open pr"*. Blind Hunter (diff only), Edge Case Hunter (repo read), Acceptance Auditor (round 3's record + the story + the checklist); read-only, the working-tree fingerprint unchanged across the run. ~32 raw ⇒ **7 patch (RF1–RF7, ALL APPLIED), 0 decision-needed, 0 defer, 14 dismissed. 1 MEDIUM (RF1).** It found defects round 3 INTRODUCED or OVERSTATED: RF1 (RT2 + RT7 together left the Super Admin a "New version" that ALWAYS failed, with a false "not available" message — and RT2's own leg opened exactly that editor), RF2 (round 3's "equivalent mutant" claim was FALSE), RF5 (a double tap undid RT4), RF7 (RT7's stage read raced a withdraw). Each fix has a leg and a mutant that fails it.

- [x] [Review][Patch] **RF1 — The Super Admin's "New version" on a proposed / returned / withdrawn version always failed (MEDIUM; blind + edge + auditor).** Fix: `VersionPanel` offers it to the Super Admin only from `code` / `approved` / `published`; RT2's leg now opens the editor from an APPROVED version and asserts no New version on a proposal; a per-stage leg. Mutant (the guard ⇒ `true`) ⇒ 2 red. [QuestionnaireVersionsPage.tsx `VersionPanel`]
- [x] [Review][Patch] **RF2 — RT6's "equivalent" past-the-list mutant was NOT equivalent (LOW–MEDIUM; auditor; closure honesty).** A code base is never a listed row. Fix: RT6's leg asserts a code-based version keeps its code base in the tenant AND the global list; the record above corrected (struck through, ⛔ deleted). Mutant ⇒ red.
- [x] [Review][Patch] **RF3 — RT7's dated QE7 (b) annotation was missing (LOW; auditor).** Added under QE7 (b) (above).
- [x] [Review][Patch] **RF4 — RT5's allow-list had no teeth (LOW; auditor).** Fix: the teeth leg asserts `REGISTRY_READERS` REFUSES six real files across the roots (and that each is scanned). Mutant (an `apps/` allow) ⇒ red.
- [x] [Review][Patch] **RF5 — A double tap on mobile Try again undid RT4 (LOW; blind + edge + auditor; TanStack `cancelRefetch` traced).** Fix: ONE reload at a time (`reloading` ref, released on settle). Leg: two taps ⇒ ONE retry refetch, ONE send on the new version. Mutant (the guard off) ⇒ red.
- [x] [Review][Patch] **RF6 — RT6 left a direct version's `reason` on the wire to another Pariwar, and the page renders it (LOW–MEDIUM; blind + edge + auditor).** RTQ1 named it. Fix: `reason` withheld with the origin and the author; contract doc; the RT6 leg asserts every approve / make-live status and adds a direct version for P made live for Q (Q: `reason`, author, origin all `null`; P: all). Mutant ⇒ red.
- [x] [Review][Patch] **RF7 — RT7 read the base's stage WITHOUT its step lock: a concurrent withdraw could slip in (LOW; edge; checklist 2).** Fix: `lockStep(base)` before `stageOf` — order numbering → live → step(base) → step(new), every other writer's order unchanged (traced). Live two-connection leg (`write-concurrency.spec.ts`, RF7): the direct path BLOCKS on the advisory lock, then sees `withdrawn` ⇒ `base_invalid`. Mutant (no lock) ⇒ red ("never blocked").

Dismissed (14): (1) `null` now means "withheld" in three fields — no consumer reads them (edge traced admin / mobile / api-client / jobs) and `historyElsewhere` is the marker; (2) list vs detail naming the base differently — REFUTED: `listVersionRows`' SQL and `versionVisibleTo` are the same rule; (3) the RT7 leg cannot prove the guard — REFUTED: its mutant fails it; (4) / (5) the RT5 fence misses `newestCodeVersion(` and allows the handlers file whole — a TRIPWIRE by its own comment, ⛔ a proof; no consumer today; (6) `markerView` strips ANY single chain record — the server stamps only the version's own; `CHAIN_RECORD_RE` has no `g` / `y` flag; (7) `KeepingOwn` "loading" while offline — RV19's own rule (a paused query says it is loading); (8) N+1 `baseVisibleTo` in the list — only bases outside the list (the code-base check is in memory), RVD5's trigger; (9) RT3 legs order-dependent on mocks — no `VersionPanel` is open in them; `beforeEach` resets; (10) RT2 hides approve / propose from a Super Admin who ALSO holds a tenant grant — DELIBERATE: the Super Admin's page reads the GLOBAL list and acts on the global path (QE7); recorded here; (11) the RT2 leg's mid-test `cleanup()` — each `open()` renders a fresh client; (12) RT7 mapped onto the existing code `base_invalid` with a misleading copy — moot after RF1 (the button is ⛔ offered); (13) direct `authoredByDisplay` when the origin is NULL — an all-Pariwar direct version's author is the Super Admin, also on its all-scoped steps every tenant is shown; (14) no RT6 leg for `reason` — closed by RF6.

## Dev Notes

### Current state of the code this story changes

| File | Today | This story | Must be preserved |
|---|---|---|---|
| `packages/domain/src/questionnaires/types.ts` | copy keys only; status `live`/`historical` | `text?` on question / option | every code version's shape |
| `questionnaires/validator.ts` | Panel ids only | chain records + QE5 / QE8 / QE10 rules | every existing rule; every code version valid |
| `questionnaires/registry.ts` | sync code registry | unchanged — the code fallback | `resolveLiveVersion`'s semantics for code versions |
| `claim/peer-mesh-reply.ts`, `claim/ground-inspection-questionnaire.ts` | sync pin | async reader in the tx | pin at FIRST save; newer version → new replies only |
| `apps/api/.../peer-request-core.ts`, `peer-answers-assembler.ts`, `claims.ground-inspection.handlers.ts` | `t()` words; sync | ONE word function; async | the wire shape `PeerRequestQuestionnaire`; 6.32's S-fixes (pre-lock decrypt, path-claim binding) |
| `apps/jobs/.../claim-peer-mesh-requests.ts`, `claim-peer-mesh-wa-reminders.ts` | injected sync registry | injected async reader | the two `config:*` holds |
| save contracts (G10) | ⛔ rendered version | optional `questionnaireVersionId` | `.strict()` inputs; installed clients |
| `packages/api-client/src/peer-answer-editor.ts`, `apps/mobile/lib/peer-request.ts` | injected `shouldRetry`; catch = retry or fail; unknown 409 ⇒ retry (mobile: forever) | a third `'reload'` outcome (`isReload`); clients rebuild the editor keyed on `versionId` | every existing retry / close arm; the queue / drain order (D10, the 6.27a drain-loop item) |
| `claim/peer-mesh-reply.ts` answer caps (G16) | sized for 7 questions | comments updated; the 20-question cap makes them hold | the caps' values |
| `rbac/permissions.ts`, `rbac/roles.ts` | v55, 71 keys | v56, 74 keys | ⛔ inert grant |

### Traps (TR)

- **TR1 — the pure engine fence.** ⛔ `db`, `pg`, `drizzle-orm` import under `questionnaires/` (G13). The reader lives in
  `questionnaire-versions/`.
- **TR2 — the type-only import cycle.** The new module imports `questionnaires/` and `claim/` modules import the new one — check for a
  runtime init cycle ([[project_type_only_import_cycle_trap]]); typecheck is blind to it.
- **TR3 — contracts never import domain** (6.27 F30); contracts mirror the wire shape, with a test-only lockstep
  (`packages/contracts/tests/claims-peer-request.test.ts` precedent). Contracts tests are outside `tsc`
  ([[project_contracts_tests_outside_tsc]]) — a new required field breaks fixtures silently.
- **TR4 — `t()` throws** on a missing key or param (G7). Stored text ⛔ goes through `t()`.
- **TR5 — the version sequence** is shared across Pariwars (G5) and must continue after the code max (QE3) — the helpdesk default-policy
  trap's class ([[project_helpdesk_default_policy_version_trap]]).
- **TR6 — RLS in CI vs production.** CI's superuser bypasses RLS; every read must run inside `openScopeTx` and the policy regression spec
  must run as `twt_app`. A NULL-target row must be visible in a Pariwar-scoped tx (the feature-flags `OR … IS NULL` leg). The OPPOSITE trap
  in the jobs: their pool is BYPASSRLS, so ⛔ resolver query may rely on RLS for its Pariwar filter (QE12 R4).
- **TR7 — append-only + column grants.** The new tables need ⛔ UPDATE grant at all. ⛔ seed by UPDATE. If a later RTBF ever scrubs a
  column here, REPLACE the guard function ([[project_append_only_guard_names_erasure_columns]]) — today staff text is ⛔ member data.
- **TR8 — migration order on a shared DB.** Journal `when` greater than every sibling's ([[project_sibling_migration_when_order_shared_db]]);
  ⛔ regenerate an applied migration ([[project_live_db_test_gotchas]]).
- **TR9 — `blindIndexMany` is forbidden inside a transaction** (6.32 deviation) — irrelevant to chain questions (⛔ indexes), but ⛔ add one.
- **TR10 — sensitive answers.** Before Task 4, prove the writers encrypt by the DEFINITION's `sensitive` flag and ⛔ by a fixed key list
  (`git grep -n "SENSITIVE_QUESTION_KEYS" -- packages apps ':!**/tests/**'` — every read judged); a fixed-list encrypt decision would store a
  chain answer in clear.
- **TR11 — the ruled lock.** Compare against the version's recorded `ruled_base_code_version_id` (a CODE definition — QE5's one definition:
  the newest code version of the kind AT WRITE TIME; the server replaces the submitted ruled questions), ⛔ against the base DB
  version (a chain of DB versions could otherwise drift a ruled field one step at a time) and ⛔ against "the newest code version" at READ
  time (a later code edit would then fail every stored version in force and strand its pins). The ruled health questions' `counselBasis` is
  excluded from the lock and overlaid at read (QE12).
- **TR12 — idempotent write shape** — for THESE routes the order is QE17's (claim → scope tx → `withCompensatingAudit` → COMMIT →
  `recordResult`, the `helplineSave` precedent), which supersedes the generic "COMMIT → `recordResult` → audit"; a 23505 retry inside a tx needs
  a SAVEPOINT; list routes use `clampLimit` ([[project_domain_limit_clamp_and_savepoint_retry]]).
- **TR13 — Fastify** bodyless POST needs `'{}'` ([[project_fastify_empty_json_body_400]]); ⛔ async `onSend` double-send
  ([[project_fastify_onsend_doublesend]]).
- **TR14 — markdown inside JSDoc**: `**cl.3**` contains `**/` ([[project_markdown_emphasis_closes_jsdoc]]).
- **TR15 — TanStack**: `onSettled` before success can wipe a banner ([[project_tanstack_onsettled_before_success]]); per-row actions
  `mutateAsync` per call.
- **TR16 — the microcopy gate** refused the word "report" in a 6.32 comment; run `pnpm microcopy` early. Unicode escapes in written
  content can land raw ([[project_unicode_escapes_written_raw]]) — scan after writing Hindi test fixtures.
- **TR17 — the shell**: every `git push` needs `DATABASE_URL=<story port>` ([[project_prepush_hook_inherits_5432]]); macOS has ⛔ `timeout`.

### Libraries and versions (as installed — ⛔ upgrades)

Node ≥ 22.12, pnpm 10.30.3, TypeScript ~5.9.2; API: fastify ^5.8, zod ^3.25.76, fastify-type-provider-zod ^4.0.2 (pinned — v5/v6 need
Zod 4, ADR-0009); domain: drizzle-orm ^0.45, drizzle-kit ^0.31, pg ^8.13; admin: react ^19, vite ^7, @tanstack/react-query ^5.101,
@tanstack/react-router ^1.95, react-hook-form ^7.54 + @hookform/resolvers ^3.10, zod ^3.23, tailwind ^4, @radix-ui/react-dialog ^1.1.6,
@radix-ui/react-label ^2.1.2; vitest ^3 (admin) /
^2.1 (api). ⛔ new dependency is needed.

### Testing standards

vitest; domain / API integration specs gated on `hasDatabase` against a live DB named `twt_dev` in the story's own container
([[project_known_livedb_test_failures]]); separate transactions for "before / after" ordering legs ([[project_db_clock_ordering_tests_tie]]);
FK + TRUNCATE ordering ([[project_fk_truncate_cascade_deadlock]]); admin tests with RTL `cleanup` and `lib/mmkv` mocks where mobile code is
touched ([[project_mobile_vitest_and_expo_install_traps]]); single-file runs `pnpm --filter <pkg> test <name>` (⛔ `--`). Every new leg RED
first; record mutants in the Debug Log.

### Project Structure Notes

- Domain: `packages/domain/src/questionnaires/` (pure, extended), `packages/domain/src/questionnaire-versions/` (NEW, db), schema
  `packages/domain/src/schema/questionnaire_versions.ts`, policies under `packages/domain/src/policies/`, migration `0192`.
- API: `apps/api/src/modules/questionnaire-versions/` (NEW); existing `apps/api/src/modules/claims/*` touched for the reader / words / stale.
- Contracts: `packages/contracts/src/questionnaire-versions/` (NEW) + the two claims files.
- Admin: `apps/admin/src/modules/questionnaire-versions/` (NEW), `router.tsx`, `routes/`, `RootLayout.tsx`, `api/client.ts`, `api/hooks.ts`.
- Mobile: only the save-request field and the version-stale RELOAD arm (`apps/mobile/lib/peer-request.ts` `PeerRequestFailure` +
  `classifyFailure`, and `PeerQuestionnaire.tsx` — there is ⛔ reload path today; the reload refetches `peerRequestDetailKey`, whose query
  is `staleTime: 0` — the by-link query is the `staleTime: Infinity` one — G17).
- Shared client: `packages/api-client/src/peer-answer-editor.ts` (`shouldRetry` is an injected option — the reload is a NEW third outcome,
  `isReload`; the version-stale code must ⛔ retry).
- ⚠ The ledger's 2026-10-10 phrase *"contracts `questionnaires/`"* is stale — the engine lives in domain (G13); ⛔ create a contracts copy.

### Recorded observations — ⛔ NOT this story's to change, ⛔ NOT routed

- `-304` Consequence 1 says *"PM23 (e)"*; the 6.27 story's PM23 has (a)–(d) TODAY — the "who approves" item is (d). Correct when written
  (at `bc1ec53c` PM23 ran (a)–(f), (e) = "Who approves a version"); 6.27 was re-lettered later. ⛔ edited.
- The IQ7 confirm note for 6.32 (`trustee-panel-routing-note-2026-10-28-6-32-family-answers-audience.md`) is drafted, ⛔ sent — unrelated to
  this chain; ⛔ merged into QE14's note.
- ⚠ **2026-10-30 — `2026-10-30-423`** (Trustee-ratified; on branch `governance/erasure-after-death-note`, ⛔ yet on this branch — cite it
  as plain text, its anchor 404s here): once a claim is filed for a member's death their personal data is ⛔ erased (unless the report is
  closed because the member is alive), and a claim for a never-verified, withdrawn, terminated or erased member is refused at intake — built
  by row `6-38-death-locks-erasure-and-non-member-claims-refused`. Effect here: QE8 C5's erasure scrub of chain answers runs on a
  death-claimed member only in the false-report case; C12 (a RESPONDER's own data) is unchanged; QE4's fallback cases "⛔ recorded name" and
  "erased on request" become pre-6-38 / false-report only — the decrypt failure remains, so the word stays. Little file overlap with 6-38
  (`claims.helpline.handlers.ts`, `rtbf-legality.ts`, the erasure routes — ⛔ touched here). Re-read C5 / C12 / QE4 at Task 0.1 if it has
  landed.
- Niyamavali's Part 9 "State Trustee panel" (R9) is a geographic voting body; the system's R9 vote is cast by Pariwar Admins as Trustee-Lite
  (`-305` §1 (c)). QE6 follows the same reality; it does ⛔ fix it.

### References

- `.decision-log.md` — `2026-10-10-304` (Q7 / Q8, readings, Consequence 2), `2026-10-10-305` §1 (c), `2026-10-10-310` CF2 / CF3,
  `2026-10-13-328` / `-329` item 3, `2026-10-14-331`, `2026-10-28-413` IQ2 / IQ9 / IQ12.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-10-6-27-the-neighbours-questions.md` (Q7, Q8 as put);
  `trustee-panel-routing-note-2026-10-10-6-27-confirms.md` (CF3); `trustee-panel-routing-note-TEMPLATE.md`.
- `_bmad-output/implementation-artifacts/6-27-peer-mesh-sending-replies-and-date-of-death.md` (PM23 (a)–(d), PM11, AC2);
  `6-27b-…` (Task 3c.1 / 3c.2); `6-27c-…` (R11); `6-32-inspector-questionnaire-at-the-ground-inspection.md` (IQ1, IQ2, IQ9, IQ12, I1, I4,
  TR11, D3, D5, the 6.32 File List).
- `docs/adr/` — ADR-0008 (RBAC), ADR-0019 (tone review), ADR-0021 (draft → publish), ADR-0030 (compensating audit), ADR-0037 (code-resident
  fence for tenant-authored definitions), ADR-0038 (versioned registry posture).
- `_bmad-output/planning-artifacts/architecture.md` §1.2 (RLS, cross-tenant surfaces), §1.7 (*"every governance constraint on what a
  definition may declare is code-owned, never tenant-authored"*), §2.6 (permission keys), §4.1–§4.4 (admin stack).
- `docs/launch-gate-inventory/inventory-roster.md` — Rows 27, 42 (and the new 45).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), Claude Code — `bmad-dev-story 6.33`, 2026-10-30.

### Debug Log References

- **Task 0.1 (2026-10-30).** `git fetch origin`: `origin/main` = `bc88bd5e`, HEAD `823c81cc` an ancestor ⇒ fast-forwarded (⛔ rebase needed).
  `git diff --name-only 26901c92..HEAD -- packages apps scripts infra docs` → only `docs/launch-gate-inventory/inventory-roster.md` (Row 45,
  this story's) ⇒ ⛔ cited code file moved. NUMBERS re-grepped on every branch / remote / worktree: decisions max `-423` (next `-424`);
  migrations max `0191` (this story `0192`); `PERMISSION_CATALOG_VERSION` max `55` (this story `56`); Row 45 minted; ledger next `2026-10-30l`.
  G8 call sites (the full grep, non-test): `claims.ground-inspection.handlers.ts` (`enWords` def; `getQuestionnaireVersion` in the completion
  discrepancy path; `groundInspectionVersionFor` ×2 — GET + save; `servedDefinition`; `toWireQuestionnaire`), `peer-answers-assembler.ts`
  (`enWords` def + 4 uses; `getQuestionnaireVersion` ×2 — replies + `familyAccountViews`), `peer-request-core.ts` (`toWireQuestionnaire`
  def; `pinnedVersionFor` ×2 — detail + `prepareSave`; `servedDefinition` ×3), `claim-peer-mesh-requests.ts` / `claim-peer-mesh-wa-reminders.ts`
  (`resolveLiveVersion` + `pendingCounselBasisKeys`), `claim/ground-inspection-questionnaire.ts` (`groundInspectionVersionFor` + its writer use),
  `claim/peer-mesh-reply.ts` (`pinnedVersionFor` + its writer use), `questionnaires/registry.ts` (the definitions). Matches G8.
- Task 1: chain-versions.test.ts RED first (36/37 failing before the engine change). Mutants KILLED: C1 reserved, C1 length, C2, C3 GI max, C4 optional truthy, C5 truthy, C6 text leg, C7 basis list, C8 cap, C10 placeholder, CHAIN_RECORD_RE widened to any string, code citing chain admitted, lock drops closing note, lock drops a field (approvedBy), chain decided by approvedBy (a DB question citing a Panel id escaping), code >= 1000 refusal dropped, exactly-one by truthiness. EQUIVALENT (recorded): dropping the regex inside isOwnChainRecord alone — checkDbVersion's own uuid check on the context id refuses the same input.
- Task 2: 0192 hand-written; fresh-DB migrate (twt-633-pg :5450) applied 0000–0192 in one run. Policy spec 10/10. DB mutants KILLED by ALTER POLICY: steps tenant INSERT admitting made_live; versions INSERT without NOT direct. twt_app inserts into the identity `seq` with ⛔ sequence grant (a leg).
- Task 3: read.spec.ts 11/11. Mutants KILLED: all-before-own, stale resolves, R1 validator dropped, strict → passthrough, string "true" admitted, counsel overlay dropped, revert keyed on version, seq ignored (array order). EQUIVALENT (recorded): the SQL Pariwar predicate dropped, the SQL step filter dropped — `liveCandidates` filters the Pariwar and the step again in JS (two layers); the R4 leg still runs on the superuser (RLS-bypassing) connection.
- Task 4.1 (TR10): `git grep SENSITIVE_QUESTION_KEYS -- packages apps ':!**/tests/**'` — the writers decide encrypt by the DEFINITION's `q.sensitive` (`answers.ts` `checkAnswer` → `storage.form`); the only fixed-list reads are the validator (rules), the two migrations' LOCKSTEP comments, and `familyAccountAuditCounts` (the `family_health_answer_count` audit count — kept; C11 adds the ciphertext counts beside it). ⛔ fixed-list encrypt decision.
- Task 4.2: every G8 site moved (GI GET / save INSIDE `pre` / completion discrepancy; peer detail + `prepareSave`; the assembler's two lookups — pre-read via `run('peer_section_family_definitions' / 'peer_section_reply_definitions')`, handed to `familyAccountViews`; both jobs inside the locale `withPariwarScope`). R6 fence `sync-resolver-fence.test.ts` (+ the QE4 word fence). `registry` kept as the CODE-registry test seam through the async reader (the ~70 jobs-test usages unchanged).
- Task 4.3: copy key `questionnaire.member_fallback` (en "the member", hi "सदस्य" — HUMAN-REVIEWED 2026-10-30, `$comment.questionnaire_member_fallback`); ⚠ the claimant screens' `member_fallback` ("your family member") is a DIFFERENT key, untouched. The fallback is logged only when a `{member}` slot actually takes it (an option-only read logs nothing). Real-t() leg in `apps/api/tests/unit/questionnaire-words.test.ts`.
- Task 4.4: also added the client-id compare to the PRE-LOCK paths (`prepareSave`, the GI save's `pre`) — a flip that removed the question would otherwise 422 there before the writer runs. Mutants KILLED (live DB): GI compare removed (handler-only), GI compare after checkAnswer, peer compare removed, peer compare after checkAnswer, version-stale classified as the retryable stale.
- Task 4.5: `PeerAnswerEditor` `isReload` + `'reload'` + `carryOverDrafts()`; each client keys its editor on `versionId` + a reload generation, hands drafts up, refetches, and the rebuilt editor re-saves surviving drafts one tick after mount (cancelled on cleanup — Strict Mode sends each once; seen 3 saves before the tick). Mobile: a failed reload refetch ⇒ the load error's "Try again" (⛔ a rebuild on the old version — it would only meet the 409 again). Admin helpline: the save hook's 409 invalidation EXCLUDES the version-stale code (it could rebuild the card before the drafts were handed over). Unreadable ⇒ terminal everywhere (mobile `not_openable`; panel / helpline a named admin-English line). Mutants KILLED: mobile version-stale → retry; mobile not sending the id.
- Task 4.6: 20 × 5 cap leg (live DB, 100 answers read, 20 live per reply); C11 `sensitive_answer_count` + `family_sensitive_answer_count` on BOTH read lines via an internal `onSensitiveAnswerCounts` callback (⛔ a wire field); approvers spec expectations updated.
- Task 5: catalog 55 → 56 (71 → 74); `questionnaire.propose` / `.approve` on `pariwar_admin` (Trustee-Lite consts + comment citing G6 / `-304` "or their own"); `.publish` super_admin only (derived). Tests: holder sets, ⛔ state_trustee (with the RANK-ORDER reason proven), LIVE-on-dimension for each, publish global-only. ⛔ contracts mirror of keys exists (grep) — none touched.
- Task 6 (domain): `questionnaire-versions/write.ts`. Mutants KILLED (live DB): step lock dropped (approve vs return; withdraw vs make-live — the second never blocked), live lock dropped (concurrent make-live; make-live vs revert), server ⛔ replacing the ruled questions, server ⛔ stamping chain:<id>. A new code `questionnaire.not_withdrawable` (409) for a withdraw in the wrong state (the story names not_approvable / not_publishable for approve/return and make-live; a withdraw is neither) and `questionnaire.base_invalid` (422) for an unknown / other-kind base.
- Task 6 (API): `apps/api/src/modules/questionnaire-versions/{handlers,routes,index}.ts` (QE17's composed order; a replay returns the RECORDED response — asserted); contracts `packages/contracts/src/questionnaire-versions/index.ts` (draft pages: a ruled question BY KEY, a staff question with en + hi words — the server sets optional / sensitive / ⛔ warning / counsel pending / the chain record). API spec 8/8 (403 by key incl. state_trustee; the chain end to end; 422 problems; ticks; not_author; the 404 rule + schema-shape; global reads; direct / revert / replay; Idempotency-Key required). ⛔ An all-Pariwar version is committed by any spec (the ALL legs run in the domain spec's rolled-back transaction).
- Task 7: admin page `/p/$pariwarId/questionnaires` (nav UNGATED), module-local English (both QE10 counsel warnings verbatim per kind). 10/10 RTL legs. The admin client function is `getQuestionnaireVersionDetail` (⛔ `getQuestionnaireVersion` — it collided with the R6 fence's pattern, which caught it).
- Task 8: `nothing-gates-fence.test.ts` (transitive import scan — ⛔ approval-warnings / ground-inspection-approval / inspection-discrepancy / nominee-name-check / medical; teeth leg); `nominee-name-no-comparison-fence.test.ts` +6 files (56 → 62) incl. its decrypt-free and medical-declaration legs; live-DB AC10 leg (two staff answers written; `assertClaimApprovable`'s outcome, the warnings read and the completion state byte-identical). Mutant KILLED: the fallback word dropped. ⚠ Every new leg was RED before its change BY CONSTRUCTION (the module / function / field did not exist) except where noted RED-run (Task 1's 36/37).
- Task 9 (AC11): the ONE probe — `tabs_context_mcp` answered *"Browser extension is not connected"* (a static page on `127.0.0.1:5199` served by curl) ⇒ the real-browser pass is recorded UN-ATTESTED (`deferred-work.md`; Row 45 (b)), ⛔ faked.
- Task 10: the contracts lockstep test (`packages/contracts/tests/questionnaire-versions.test.ts` — steps, kinds, chain kinds, the inspection option cap; the draft question refuses a client-chosen flag). Lint: the `{ x: _x, ...rest }` omit idiom is refused by the repo's lint (5 sites rewritten).

- **`ci:local` (AC12), honestly:** run 1 on a FRESH container (`twt-633-ci`, DB `twt_dev`, `DATABASE_URL` set) — 35 / 36: `domain-invariants` found a REAL
  defect (`listVersionRows`' `.limit(n)` clamped into a variable — the gate needs `clampLimit(…)` inline); fixed. Run 2 on a RECREATED fresh container — 35 / 36:
  `domain-invariants` ✓, `integration-tests` ✓; the one red was `test (unit)` → `apps/admin/tests/niyamavali-page.test.tsx` (*"shows the tone-review resolution
  path when publish is rejected 409"*) timing out at 5.4 s under `--concurrency=4` — the known unit-phase oversubscription class
  ([[project_ci_local_concurrency_oversubscription]]); ⛔ touched by this story; passes 3 / 3 in isolation and the whole admin suite passes alone (84 files,
  1470 tests). ⇒ ⛔ a single clean 36 / 36 run is claimed; every job has been green in at least one of the two fresh-container runs, and the red of each
  run is explained. The push's own gate re-runs it ([[project_prepush_hook_inherits_5432]] — `DATABASE_URL=<story port>` on the push).
### Completion Notes List

- ⭐ **Built as ruled and as answered** (`-304` Q7 / Q8; `-421` QE1–QE17 all (A); `-422` Q1 A, Q2 (a) A, Q2 (b) A, Q3 A): versions in the database
  beside the code ones (0192 — two append-only tables, `seq` order, RLS: versions readable by every tenant, tenant INSERT only own origin ⛔
  `direct`; steps keyed on `scope_pariwar_id`, the tenant leg only the four tenant steps); the ONE validator widened to the origin (`code` / `db`):
  the server-stamped chain record, the ruled-question lock against the RECORDED ruled base, QE8's C1–C8 / C10 (C9 as separate warnings), QE10's
  counsel basis, QE3's 1000 floor; the async database-aware reader (R1 strict parse + the same validator, R2 by `seq` with the revert rule and
  the invalid / stale skips, R3 overlay, R4 explicit Pariwar predicate, R8 alarm) and the boot check in both `main()`s; every consumer moved (R5)
  behind the sync-resolver fence (R6); the ONE word function (stored text + copy keys; D11's reviewed fallback word, logged); R7 — the optional
  `questionnaireVersionId`, the version compared FIRST under the lock in both writers (and pre-lock), new `*.questionnaire_version_stale` /
  `*_unreadable` codes, the editor's third `'reload'` outcome and a keyed rebuild in all three clients; RBAC catalog 56 (propose / approve on
  `pariwar_admin` as Trustee-Lite, the author MAY approve; publish super_admin only); the chain's domain writer (one fixed lock order) and API
  (QE17's composed order, the recorded replay); the admin page (both kinds; both counsel warnings verbatim); nothing gates, proven (import fence
  + a byte-identical live-DB leg).
- ⚠ **Departures, each stated:** (1) the `registry` test seam was KEPT (as the reader's code-registry fallback) instead of replacing the jobs'
  `deps.questionnaireRegistry` with the reader object — every existing test injection works unchanged; (2) the client-id compare is ALSO made
  pre-lock (`prepareSave`, the GI save's `pre`) — otherwise a flip that removed the question 422s before the writer sees it; (3) two refusal codes
  beyond AC8's list (`not_withdrawable`, `base_invalid`); (4) the draft wire carries ruled questions BY KEY and staff questions' words + kind +
  options + condition + health only — the server sets every flag; (5) the admin client function is `getQuestionnaireVersionDetail` (the R6
  fence caught the name `getQuestionnaireVersion(`).
- ⚠ **UN-ATTESTED:** the real-browser pass (AC11) — the extension was ⛔ connected; recorded in `deferred-work.md` and Row 45 (b), ⛔ faked.
- ✅ **Browser pass (AC11) — ATTESTED 2026-10-30, after the commit.** A SUPERSEDING record: the line above stays as written. **Setup:** the session's Claude-in-Chrome
  on the macOS browser (the extension WAS connected this time and reached `localhost`), the real admin (Vite `:3001`) against the real API (`buildServer` + `listen`
  `:3000`, a throwaway UNCOMMITTED vitest launcher in the 6.32 shape), a throwaway `postgres:16-alpine` migrated from scratch (`pnpm db:migrate`, every migration
  through `0192`), the tree at `bab56103` (clean, on the story branch). Four TEST staff accounts (Pariwar Admin, Super Admin, the assigned inspector, a helpline operator)
  were signed in through the REAL passkey routes with the FAKE WebAuthn provider; the step-up codes were read from the capturing delivery fake. **Observed:**
  (1) *Pariwar Admin* — the page showed `peer_mesh.v4` / `ground_inspection.v1` "the version the Trust Panel ruled"; one new version per kind with one staff question
  (`water_source`; `house_type`) was proposed → `peer_mesh.v1000` / `ground_inspection.v1000` **Proposed**; the detail showed the ruled questions *Ruled (locked) / Unchanged* and
  the new one *Added by staff / Answers encrypted / New*; both acknowledgements ticked → **Approved** (the SAME admin approved — the author-may-approve cost `-422` accepted).
  (2) *Super Admin* — "Make this version live for: This Pariwar / All Pariwars"; **This Pariwar** → the step-up ("Making a version live changes what families are asked…") →
  **Live**, "In force: `peer_mesh.v1000` — this Pariwar's own version", the same for `ground_inspection.v1000`; each make-live screen carried QE10's counsel warning for its kind.
  (3) *Inspector* — the OLD visit (its head's-letter answer saved BEFORE the flip) showed ONLY the ruled question with the saved answer selected; the NEW visit (seeded after) showed
  the ruled question AND "What kind of house did the member live in?"; the answer saved in the UI ("Saved"). Pins (`claim_ground_inspection_questionnaires`): OLD
  `ground_inspection.v1`, NEW `ground_inspection.v1000`. (4) *Helpline operator* — Member ID lookup → identity confirmed → "Requests to confirm a death" (the operator's earlier
  step-up had lapsed → re-elevated in the UI) → two cards: the NEW request showed "Where did the member get water?", the OLD one (`has_died` = "Yes, they have died" saved before the
  flip) showed none; "A well" saved on the NEW. Pins (`claim_peer_mesh_replies`): OLD ping `peer_mesh.v4`, NEW ping `peer_mesh.v1000`; answers `has_died` @ `v4`, `water_source` @ `v1000`.
  **Limits (⛔ overclaimed):** the NEW claim / visit / requests were SEEDED by fixtures at the states the real flows reach (the pings inserted as texted) — the TEXTING and the
  Pariwar's HOLD (`config:counsel_basis_pending`, which the make-live screen warns of) were ⛔ exercised (the live-DB leg `claim-peer-mesh-requests-live.test.ts` covers them);
  the neighbour's OWN client (the mobile app) was ⛔ driven — no browser member surface ([[project_no_browser_member_token_surface]]) — the neighbours' questionnaire was
  observed on the helpline operator's surface, which serves a ping's definition from the same reader; passkey sign-in and the step-up delivery were FAKED; the two acknowledgements
  ("I have read every Hindi line" / "…which questions are about health") were ticked by the AGENT on a test version it wrote itself — a pass, ⛔ a Hindi review; ⛔ exercised in
  the browser: "All Pariwars", return, withdraw, revert, the direct add. **One observation, ⛔ investigated:** after "Make live" was clicked at the foot of the long detail pane, the
  viewport showed no change — the step-up prompt (`role="alert"`) was elsewhere in `<main>` and was found by a DOM query; whether a real operator's viewport shows it is unknown
  (`deferred-work.md`). Cleanup: the launcher file, the container, the servers and the tab were removed; ⛔ code changed by the pass.
- ⚠ **D8 split, ⛔ overclaimed:** its version half is closed (the compare-first makes the six bare `Error`s unreachable on a flip); its S10 half
  (an erasure rewrite keeping the row id) is ⛔ touched and stays OPEN. `resolvePeerRequestMemberName` was ⛔ touched (its item stays OPEN).
- ⚠ **Equivalent mutants (recorded, ⛔ killed):** the SQL Pariwar predicate and the SQL step filter in the reader (`liveCandidates` filters both
  again in JS); the regex inside `isOwnChainRecord` alone (the context id is checked separately). "Steps ordered by `at`" is ⛔ expressible — `at`
  is ⛔ read by any resolver; the array-order mutant of `versionStage` / `liveCandidates` is killed.

### File List

**New**
- `packages/domain/migrations/0192_questionnaire-versions.sql`
- `packages/domain/src/schema/questionnaire_versions.ts`
- `packages/domain/src/policies/questionnaire-versions-rls.ts`
- `packages/domain/src/questionnaires/derive.ts`
- `packages/domain/src/questionnaire-versions/{index,parse,read,write}.ts`
- `packages/domain/tests/questionnaires/{chain-versions.test.ts,_chain-fixtures.ts}`
- `packages/domain/tests/questionnaire-versions/{sync-resolver-fence,nothing-gates-fence}.test.ts`
- `packages/domain/tests/integration/questionnaire-versions/{read,write,write-concurrency}.spec.ts`
- `packages/domain/tests/integration/rls/questionnaire-versions-policy-regression.spec.ts`
- `packages/contracts/src/questionnaire-versions/index.ts`
- `packages/contracts/tests/questionnaire-versions.test.ts`
- `apps/api/src/modules/claims/questionnaire-words.ts`
- `apps/api/src/modules/questionnaire-versions/{index,routes,handlers}.ts`
- `apps/api/tests/unit/questionnaire-words.test.ts`
- `apps/api/tests/integration/questionnaire-versions/questionnaire-versions.spec.ts`
- `apps/admin/src/modules/questionnaire-versions/{index.ts,i18n-en.ts,QuestionnaireVersionsPage.tsx}`
- `apps/admin/src/routes/QuestionnaireVersionsRoute.tsx`
- `apps/admin/tests/questionnaire-versions-page.test.tsx`

**Modified**
- `packages/domain/migrations/meta/_journal.json`; `packages/domain/src/{index.ts,schema/index.ts,policies/index.ts}`
- `packages/domain/src/questionnaires/{index,keys,types,validator}.ts`
- `packages/domain/src/claim/{peer-mesh-reply,ground-inspection-questionnaire}.ts`
- `packages/domain/src/rbac/{permissions,roles}.ts`
- `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts`; `packages/domain/tests/questionnaires/{questionnaires,ground-inspection-questionnaire}.test.ts`; `packages/domain/tests/rbac/{permissions,roles}.test.ts`
- `packages/domain/tests/integration/claim/{_peer-reply-fixtures.ts,peer-mesh-reply.spec.ts,peer-mesh-reply-concurrency.spec.ts,peer-mesh-reply-rtbf.spec.ts,ground-inspection-questionnaire.spec.ts,ground-inspection-questionnaire-concurrency.spec.ts}`
- `packages/contracts/src/{index.ts,claims/peer-request.ts,claims/ground-inspection-questionnaire.ts}`; `packages/contracts/tests/claims-peer-request.test.ts`
- `packages/api-client/src/{index,peer-answer-editor}.ts`; `packages/api-client/tests/{peer-answer-editor,peer-request-client}.test.ts`
- `packages/i18n/locales/{en,hi}/claim.json`
- `apps/api/src/{index,server}.ts`; `apps/api/src/modules/claims/{peer-request-core,peer-answers-assembler,claims.peer-request.handlers,claims.ground-inspection.handlers,claims.peer-answers.handlers,claims.verifier-console.handlers}.ts`
- `apps/api/tests/integration/claims/{peer-answers-approvers,peer-request-member,ground-inspection-questionnaire}.spec.ts`
- `apps/jobs/src/boot.ts`; `apps/jobs/src/scheduler/{claim-peer-mesh-requests,claim-peer-mesh-wa-reminders}.ts`; `apps/jobs/tests/claim-peer-mesh-requests-live.test.ts`
- `apps/mobile/lib/peer-request.ts`; `apps/mobile/components/peer-request/{PeerQuestionnaire.tsx,usePeerRequestQueries.ts}`; `apps/mobile/tests/unit/{peer-request,peer-questionnaire-render}.test.ts`
- `apps/admin/src/{router.tsx,routes/RootLayout.tsx,api/client.ts,api/hooks.ts}`; `apps/admin/src/modules/ground-inspection/{QuestionnairePanel.tsx,i18n-en.ts}`; `apps/admin/src/modules/helpline-claims/{HelplinePeerRequests.tsx,i18n-en.ts}`
- `apps/admin/tests/{ground-inspection-questionnaire,helpline-peer-requests}.test.tsx`
- `docs/launch-gate-inventory/inventory-roster.md` (Rows 27, 42, 45 — dated lines)
- `_bmad-output/implementation-artifacts/{deferred-work.md,sprint-status.yaml,6-33-questionnaire-editor-versions-and-approval.md}`

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-30 | 1.5 | The real-browser pass (AC11) RUN after the commit `0793112a` and ATTESTED — propose → approve → make live for one Pariwar; the inspector's panel and the helpline's neighbours' card serve the new version for a NEW visit / request while an OLD one keeps its pin (DB-checked). Task 9 ticked; Row 45 (b) MET (the row stays `open`). Limits and one observation in the Dev Agent Record. ⛔ code changed. |
| 2026-10-30 | 1.4 | `bmad-dev-story 6.33` — Tasks 0.1–10 implemented (the chain end to end: migration 0192, the widened validator, the async reader and every consumer, the ONE word function + D11's fallback word, R7's version compare and the clients' reload, RBAC 56, the chain's writer / API, the admin page, the nothing-gates proofs, the records). AC11's real-browser pass UN-ATTESTED (the extension ⛔ connected). Row → `review`. |
| 2026-10-30 | 1.3 | Task 0 completed and a FINAL fresh-context validation (three read-only verifiers — consistency / spec→Tasks, the v1.2 code claims, governance + cross-branch records — load-bearing findings re-checked by hand): 38 improvements, all applied (BigDev: *"all"*). Task 0: `-421` (`283e25f4`), the QE14 note drafted, `-422` ratified all four as built, Row 45 / `epics.md` / the deferred annotation (`577a4ca2`), the fallback word's Hindi reviewed (`83a34074`). Critical: a per-version step lock in one fixed order (approve / return / withdraw were unserialized); the tenant steps policy limited to the four tenant steps; the clients SEND `questionnaireVersionId`; a NEW `*.questionnaire_version_unreadable` (the existing 404 `ground_inspection.questionnaire_unavailable` is unchanged); the jobs' read sites corrected (`pariwarConfig` / `peerMeshWaReminderConfig`, two fault classes); the version compare FIRST in both writers (six bare `Error`s); NUMBERS restated (next decision ≥ `-424`, Row 46, ledger `30j`). Plus: the 404 rule, page-data routes, C1–C12 test split, the 6.27b hazard closed only for clients that send the id, the GI save's tolerance, C11 counted internally, the API boot file `index.ts`, replay returns the recorded response, five `classifyFailure` sites, the fallback log line, the `-423` pointer, stale post-ruling wording. |
| 2026-10-30 | 1.2 | Second fresh-context validation (`bmad-create-story validate 6.33`; four read-only verifiers — engine, API / jobs / clients, governance, design — each load-bearing finding re-checked by hand): 52 improvements, all applied. Critical: a stale-ruled-base rule (a DB version on an older ruled code base is ⛔ served; `ruled_base_moved` refusal; ONE definition of the ruled base, server-replaced); steps ordered by a `seq` identity, ⛔ `at`; the revert rule made exact; the flip compared UNDER the lock (D8's bare `Error` fixed; old clients keep the retryable code); a ≤ 20-question cap (the answer read caps were sized for seven); the jobs' BYPASSRLS pool ⇒ an explicit Pariwar predicate; the RELOAD path as a third editor outcome (`shouldRetry` is injected); the distinct-approver rule DROPPED (`-304`'s reading allows *"or their own"*; a different approver is Q8 A, ⛔ taken); QE17's precedent corrected to `helplineSave`. Plus: `NOT direct` on tenant inserts; every publish act on the global path; both ticks on direct steps; the R8 alarm and read-only invalid pins; the 404 rule; QE14 grown to three questions (§0 edges 2, 3 / 3a, 3b; new §0 edges 8–10 recorded as the author's / MATCH); `-413` IQ12 superseded in part; D10 / drain-loop / W3 / W9 dispositions; D11 fixed (fallback word); QE8 as checklist C1–C12; QE12 as rules R1–R8; the step table. |
| 2026-10-30 | 1.1 | Fresh-context validation (one read-only verifier re-traced every code claim, quote and number): 8 critical gaps folded in — DB versions number from 1000 (a code / DB id collision); the ruled lock against a RECORDED code base + a read-time counsel-basis overlay (else counsel's code edit strands every DB version in force); the distinct-actor trigger keyed on `direct` and the direct path writes all three steps; steps tenancy on a new `scope_pariwar_id`; NEW version-stale codes mapped to RELOAD in all three clients (mobile retried any unknown 409 forever); "chain question" decided by ORIGIN with server-stamped `approvedBy`; the alcohol rule on stored text incl. Devanagari; the jobs read under `withPariwarScope`. Plus: wire limits, three word sites, the widened G8 grep + a sync-resolver fence, a third deferred item and the D8 / D11 triggers, the route table, the audit-order composition, the classification attestation, the cross-Pariwar disclosure in QE14, status labels on the recorder's text. |
| 2026-10-30 | 1.0 | Created by `bmad-create-story 6.33` at `26901c92` on `story/6-33-questionnaire-editor-versions-and-approval`: QE1–QE17 PROPOSED (real asks QE5, QE6, QE10, QE14); G1–G15 traced; Policy meaning written (⛔ gate; the held-texts adjacency stated); ⛔ code. Ultimate context engine analysis completed — comprehensive developer guide created. |
