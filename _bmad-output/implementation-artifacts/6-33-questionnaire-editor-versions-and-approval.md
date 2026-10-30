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

STATUS: ready-for-dev (v1.1 — one fresh-context validation folded in; a further round on the v1.1 edits is ⛔ yet run). QE1–QE17 PROPOSED — BigDev answers at Task 0.2; the FOUR real asks are QE5, QE6, QE10, QE14 (each carries
an honest cost). ⛔ No code before Task 0.3's author-commit. ⛔ Committed, ⛔ pushed.

GLYPH REGISTER: `⛔` NEGATES the word or phrase it precedes (before an already-negative word it is emphasis: "⛔ never") · ⭐ = action /
emphasis · ⚠ = hazard.

ADDRESSING RULE: ⛔ file:NNN into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite decision id +
clause, item heading, row key). Line numbers into other files are perishable hints; re-locate by function.

NUMBERS (`-366` decision 6: *"the number belongs to the first COMMIT that takes it on any branch"*), as of 2026-10-30, every branch and
worktree: decisions — highest `2026-10-29-420` ⇒ the author-commit takes ≥ `-421`. Migrations — highest `0191_announcement-post-recovery`
(journal `when` 1796096400036) ⇒ this story's migration takes ≥ `0192`, journal `when` GREATER than every sibling's
([[project_sibling_migration_when_order_shared_db]]). Roster — highest Row `44` (`trust-announcement-channels-live`) ⇒ this story mints Row
`45`. Ledger — 2026-10-30 holds only the bare `2026-10-30` (both ledgers) ⇒ this creation takes `2026-10-30a`. RBAC —
`PERMISSION_CATALOG_VERSION = 55` (71 keys) ⇒ this story takes `56`. ⭐ Re-grep ALL FIVE at Task 0.1 and again at the commit that takes each.

LETTERS: G = found facts (traced at the pin) · QE = build decisions (PROPOSED) · TR = traps · I = invariants.
-->

# Story 6.33: Staff Write New Versions of the Neighbours' and the Inspector's Questionnaires — the Pariwar Admin Proposes, an Approver Approves, the Super Admin Makes a Version Live for One Pariwar or All — Every Version Kept, Every Answer Tied to Its Version `[SURFACE]` `[PRIMITIVE]` `[GOVERNANCE]`

Status: ready-for-dev

## ⭐⭐ WHAT THIS STORY IS, IN ONE PARAGRAPH

Today every questionnaire version is reviewed CODE: `peer_mesh.v1`–`v4` (the neighbours') and `ground_inspection.v1` (the inspector's, with
the family), each minted from a Panel decision id because the staff chain the Panel ruled did not exist. The Panel's own words
(`2026-10-10-304` Q7 / Q8, Trustee-ratified): *"Pariwar Admin proposes, State Trustee proposes/approves with/without modification. Super Admin
make it live for one pariwar/all pariwar with/without modification. Superadmin can add question directly and make it live. No additional
Permission required for Superadmin."* `-304` Consequence 2 hands that chain to THIS row, *"for both questionnaires"*. This story builds it:
versions stored in the database beside the code ones, an append-only record of every step (who proposed, approved, returned, made it live,
for which Pariwar or all, when), the ONE validator the code versions already pass (so a chain version inherits every Panel limit —
`-310` CF3 (a)–(d)), the ONE live-version resolver made database-aware (so the neighbours' app, the helpline, the inspector's panel, the
staff views and the sending jobs serve the new version to NEW replies and visits only), staff-written words in English AND Hindi, three
permission keys, and an admin page to propose, approve, return, withdraw, make live and revert. **It gates nothing**: no chain question can
be a warning, a flag, a required answer or a condition of completion or approval — the validator refuses it (I1). ⚠ The ruled "State
Trustee" step cannot be granted to the `state_trustee` role (its `state` ceiling can ⛔ never pass a Pariwar-wide check — `scope.ts`
§RANK-ORDER); QE6 proposes the established Trustee-Lite posture and a NON-BLOCKING Panel confirm (QE14).

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
whose peer-mesh leg reads ONLY the two warning keys `has_died` / `death_date`; its other legs are certificate / ground-inspection /
other-claim warnings a questionnaire never produces), and `APPROVAL_WARNING_KINDS`. A chain version can ⛔ add a warning
(`warningKeysFor` — `peer_mesh` admits only the two ruled keys, `ground_inspection` none), ⛔ make any question required (every chain
question is `optional` — QE8; every `ground_inspection` question already is), ⛔ make an answer comparable (the comparable keys are the four
ruled ones; the DB admits code indexes only on `death_cause` / `death_illness`), and ⛔ reach a reader that decides, flags, routes or delays a
claim (I1). ⭐ The proof is AC12's validator legs PLUS a fence leg that a DB-loaded version reaches the same validator (TR11 of 6.32: *"a rule
only in a test is a rule 6-33 drops"*).

**In a member's and a family's terms:** *"Staff may later ask your neighbours or your family different questions. Whatever is asked, and
however anyone answers, your claim is never held, flagged, refused or reduced because of it — the answers are background for the Trust's
staff, and 'I don't know' is always fine."*

**The one adjacency, stated (the cost row 6-33 must state — 6.27a PM23 (a), roster Row 27 note (4), Row 42 discharge path):** a `peer_mesh`
version with a HEALTH question whose counsel basis is pending HOLDS that Pariwar's texts and WhatsApp reminders to the neighbours (6.27c R11,
`config:counsel_basis_pending`). That holds a SIGNAL, ⛔ a claim: the peer mesh is a signal, ⛔ a `pass` gate (`-263`; PRD FR-40 annotation);
an un-sent text produces ⛔ answer, so ⛔ warning, so ⛔ wait (6.27b's wait is entered only by a late WARNING answer). In a member's terms:
*"If staff add a health question your neighbours cannot yet be asked, the Trust stops texting your neighbours until it can — your claim
carries on through the ground inspection."* Today v4 already holds the texts for `death_cause` / `death_illness` (Row 27 (f)), so a new
pending question changes nothing until (f) closes; after it closes, a new one re-holds. QE10 makes the make-live screen say this in words.

**Checked against the Niyamavali** (the main checkout's gitignored `docs/legal/niyamavali.md`, mtime 2026-08-16; a rulebook, ⛔ ratified —
[[feedback_niyamavali_rulebook_not_spec]]): §5.1 (*"Eligibility is governed by the actual cause of death"*), §5.5 (suicide; murder where a
nominee is accused — *"subject to State-Trustee review"*), §5.6 (an undeclared IMA-listed illness — *"the engine flags the claim for
State-Trustee review — it is never auto-denied"*). A chain question about cause or illness is ⛔ read by §5.5's review or §5.6's flag — they run
on their own evidence (`-304` Q4 A: *"⛔ never compared automatically with the member's medical declaration"*; the fence
`nominee-name-no-comparison-fence.test.ts` — this story EXTENDS it to the new modules, AC12). Part 9 names *"District Admin / State Trustee /
Trustee Panel (Core Team)"* as tiers of decision authority over claims; approving a questionnaire is ⛔ a Part 9 act, so the Trustee-Lite
mapping (QE6) contradicts ⛔ clause. **Result: ⛔ conflict — and a standing hazard, recorded:** the day any reader uses a chain question's
answer to gate, delay or flag a claim, that changes who is paid and is the Panel's (`-304`: *"making any other answer gate, delay or flag a
claim changes who is paid — that stays the Panel's"*; [[feedback_mechanization_split_commitment]]).

## The rulings and decisions this story builds on (quoted, never paraphrased)

| Source | Key text (verbatim) | Status |
|---|---|---|
| `2026-10-10-304` Q7 / Q8 | *"Pariwar Admin proposes, State Trustee proposes/approves  with/without modification. Super Admin make it live for one pariwar/all pariwar with/without modification. Superadmin can add question directly and make it live. No additional Permission required for Superadmin."* (Q8 verbatim; Q7 identical but for a missing space — *"make it live.No additional"*; Q7 the neighbours', Q8 the inspector's; double spaces are the original's) | ⭐ Trustee-ratified — the Panel's OWN chain, ⛔ our reading (Q7 B / Q8 A were ⛔ taken) |
| `-304` "What this supersedes" (recorder's text in a Trustee-ratified entry) | *"⚠ **Q7 / Q8 decline our proposed limit** (*"a NEW question, or any question about health, cause of death or habits, comes to you"*) — under the chain, those reach members **without** a Panel ruling. The Panel chose this with the limit in front of it."* | ⭐ Trustee-ratified entry (the recorder's words, ⛔ the Panel's) |
| `-304` Consequence 2 (recorder's text in a Trustee-ratified entry) | *"Row `6-33-questionnaire-editor-versions-and-approval` builds the Q7 / Q8 chain (propose → approve / modify → make live per Pariwar or for all; the Super Admin's direct addition), for both questionnaires."* | ⭐ Trustee-ratified |
| `-304` "Our reading — ⛔ NOT RATIFIED" | *"'Live' = shown to members (or inspectors) from that moment; a version in progress is ⛔ never shown. Every version is kept with who proposed, who approved, who made it live, for which Pariwar(s), and when; every answer stays tied to its version."* · *"A State Trustee 'approves' a Pariwar Admin's proposal or their own; the Super Admin makes it live — so routine changes pass through at least two people … EXCEPT the Super Admin's direct addition, which the Panel allowed alone."* · *"The fixed checks the Panel ruled (the original certificate seen and photographed — FQ11; the date and time of death — FQ8 C) are ⛔ never editable through the chain."* | ⚠ reading, ⛔ ratified — still unratified at the pin; built as written (it MATCHES the ruled text) |
| `-304` "does ⛔ NOT cover" | *"The Hindi of staff-added questions — our reading: the chain supplies both languages and a person reviews the Hindi before it goes live."* | ⚠ reading, ⛔ ratified — QE9 builds it |
| `2026-10-10-310` CF3 | *"(a) Every question the Panel ruled is in every version from now on (the first two-question draft kept on record, ⛔ never used); (b) a question added through the chain is ⛔ never a warning or a flag; (c) an alcohol question needs Q5 changed first; (d) every health question is asked only once counsel has confirmed the basis — the texts wait for it."* | ⭐ Trustee-ratified. ⚠ CF3 (a) as PUT (confirms note) listed the NEIGHBOURS' questions only; its reach to `ground_inspection` is 6.32's application (I4 there), already in the validator |
| `2026-10-10-305` §1 (c) | *"the final vote (`cycle.freeze`…) and the R9 vote (`claim.r9_vote`…) — both keys held by `pariwar_admin` … — are cast by **Pariwar Admins acting as Trustee-Lite**; the `state_trustee` role holds neither key"* | author-commit (a FOUND fact told to the Panel) |
| `2026-10-10-310` CF2 | *"whoever approves the claim at a later step — in practice the Pariwar Admin at the final vote or an R9 vote, or the Super Admin"* | ⭐ Trustee-ratified (the Trustee-Lite reality acknowledged for VOTES — ⛔ for questionnaire approval) |
| `2026-10-28-413` IQ2 (A) | *"the "Has the family filed any other claim for this death?" question … is ⛔ built in 6.32: it waits for row 6-33's chain, where the Super Admin "can add question directly and make it live" (`-304` Q8)"* · IQ12: *"row 6-33's database-backed versions replace the source without a screen change"* · "Not covered: a question added through the chain (row 6-33)" | author-commit |
| `2026-10-13-329` item 3 / `-328` / `-331` | v3 and v4 minted from Panel ids *"`-304` Q7's chain is ⛔ not yet built (row 6-33)"*; new words under a NEW copy key, ⛔ an in-place edit; the old version `historical`, ⛔ removed | author-commit / Trustee-ratified |
| 6.27a PM23 (a)–(d) (story file `6-27-peer-mesh-sending-replies-and-date-of-death.md`) | *"Because the rules live in the VALIDATOR, row 6-33's database-backed versions inherit them."* · `approvedBy` = *"a Trustee-ratified decision id — or, once row 6-33 lands, a chain record"* · `counselBasis` = *"`'pending'` or a recorded basis id (… a later one recorded through row 6-33)"* · *"a later health question (v3+, from the Panel or row 6-33) likewise HOLDS that Pariwar's texts until its basis is recorded — ⚠ a cost row 6-33 must state"* · (c) *"a reply pins `resolveLiveVersion('peer_mesh', pariwarId)` at its first save … a newer version applies to new replies only"* | the engine record (PM23 (d) is what `-304` Consequence 1 calls "PM23 (e)" — a lettering slip there; PM23 has (a)–(d)) |
| 6.32 deferred D5 (`deferred-work.md`, 6-32 second code review) | *"a handler/writer version mismatch under a concurrent first pin is a bare `Error` (500) … ⭐ Trigger: row 6-33 adds a chain-authored question to a `ground_inspection` version."* | deferral — THIS story fires its trigger ⇒ fixed here (QE12) |
| 6.27b Task 3c.2 (recorded hazard) | *"a reply pins whatever is LIVE at its first save …; a client that loaded before a version flip shows the old words but pins the new — unreachable at 6.27b's deploy …, accepted for later flips."* | recorded hazard — THIS story makes flips routine ⇒ fixed here (QE12) |

### §0 — whose decision is this (template `trustee-panel-routing-note-TEMPLATE.md` §0)

| # | Edge | Ratified text | Verdict |
|---|---|---|---|
| 1 | Pariwar Admin proposes; the Super Admin makes live for one Pariwar or all; the Super Admin adds directly, alone | `-304` Q7 / Q8 | MATCH — built as ruled |
| 2 | Who performs "State Trustee proposes/approves" | `-304` names the State Trustee; the role can ⛔ pass a Pariwar-wide check (G6) | **NARROWS / RE-HOMES a named actor ⇒ the Panel's** — built on the established Trustee-Lite posture (QE6), NON-BLOCKING confirm (QE14) |
| 3 | The ruled questions' WORDS through the chain | CF3 (a) keeps the questions; *"with/without modification"* is silent on their words; `-328` re-routed a word change to the Panel | **NARROWS the delegation if locked ⇒ the Panel's** — QE5 (A) locks, NON-BLOCKING confirm (QE14) |
| 4 | Health / alcohol / warning / flag limits on chain questions | CF3 (b)–(d) | MATCH — the validator already enforces; DB versions inherit (QE8, QE10) |
| 5 | Hindi supplied by the chain, a person reviews it | `-304` unratified reading | author's (building the reading as written; ⛔ a change to what anyone is told) — QE9 |
| 6 | Storage, numbering, resolver, RLS, UI, audit | — | author's (engineering) — QE1–QE4, QE7, QE11, QE12, QE15–QE17 |
| 7 | The "any other claim?" question | `-413` IQ2 (A) — it waits for the chain | author's: ⛔ authored in code (QE13) |

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
  ruled keys, every question optional, the shared cause / illness codes, `head_letter` neither sensitive nor health. ⚠ `keys.ts`'s comment
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
  pariwar_admin-as-Trustee-Lite; direct state_trustee gating RANK-ORDER BLOCKED"* (`roles.ts` comments). `trustee_panel` (pariwar ceiling,
  PROVISIONAL, `-096` cl. 4) is the trust-wide Panel itself — Niyamavali Part 8: *"The Trustee Panel is not the "State Trustee panel" of
  Part 9."* `super_admin` = `PERMISSION_CATALOG.keys` (every key, `global`) — *"No additional Permission required for Superadmin"* is
  automatic.
- **G7 — the word path.** `toWireQuestionnaire(def, memberName)` (`apps/api/src/modules/claims/peer-request-core.ts`) resolves every copy key
  with `t(copyKey, {member}, {locale, namespace:'claim'})` in BOTH `en` and `hi` into `PeerRequestWords {en, hi}`; the inspection GET reuses
  it; the staff view (`peer-answers-assembler.ts`) uses `enWords`. `t()` THROWS on a missing key or missing interpolation param
  (`packages/i18n/src/resolver.ts`); the catalog is a static JSON import ⇒ a staff-written question can ⛔ be a copy key (QE4). Clients render
  the SERVER's words: mobile `apps/mobile/components/peer-request/PeerQuestionnaire.tsx`, admin `HelplinePeerRequests.tsx` and
  `ground-inspection/QuestionnairePanel.tsx` ⇒ ⛔ app release for a new version.
- **G8 — the synchronous consumers** (each moves to the async reader, QE12): `claim/peer-mesh-reply.ts` (`pinnedVersionFor` + the save
  path), `claim/ground-inspection-questionnaire.ts` (`groundInspectionVersionFor`), `apps/api/src/modules/claims/peer-request-core.ts` (the
  served definition + save pre-check), `peer-answers-assembler.ts` (staff view, two sites), `claims.ground-inspection.handlers.ts` (GET,
  save, completion's discrepancy path), `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts` and `claim-peer-mesh-wa-reminders.ts` (already
  take an injected `deps.questionnaireRegistry` — the hold on `resolveLiveVersion(...) === null` ⇒ `config:questionnaire_unavailable` and on
  `pendingCounselBasisKeys(live)` ⇒ `config:counsel_basis_pending` — ⚠ resolved OUTSIDE any transaction today). ⭐ Re-derive the list at
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
- **G12 — config surfaces do ⛔ use `events_log`** (it holds the five state primitives only — `packages/events/src/registry.ts`); they use
  their own table + audit (`audit.withCompensatingAudit`, ADR-0030, or post-commit `emitAuthAudit` with a closed `AuthAuditEventType` union
  in `apps/api/src/audit/audit-sink.ts`). Attribution = `getDisplayName(deps.pool, actorId)`; missing ⇒ `AdminDisplayNameMissingError` (409);
  ⛔ email-derived ([[project_admin_display_name_attribution]]).
- **G13 — the pure engine is fenced.** `packages/domain/tests/questionnaires/questionnaires.test.ts` proves `questionnaires/index.ts` reaches ⛔
  `db.ts` / `pg` / `drizzle-orm`; `claim/approval-warnings.ts` and `claim/inspection-discrepancy.ts` import `keys.ts` as a leaf ⇒ a DB reader
  can ⛔ live in `questionnaires/`.
- **G14 — the admin app.** Vite + React 19, TanStack Router (code-based, `apps/admin/src/router.tsx`, pages `/p/$pariwarId/<feature>`),
  TanStack Query 5 (`src/api/hooks.ts`), react-hook-form + zod, `apiFetch(path, schema, init)` + `ApiError` in `src/api/client.ts`,
  module-local English `i18n-en.ts` (admin chrome stays OUT of `@twt/i18n`). Nav in `src/routes/RootLayout.tsx` — a Pariwar-grant link is
  ungated (the server's 403 is the boundary). Closest editors: `src/modules/surveys/` (`SurveyEditor.tsx`), `src/modules/niyamavali-admin/`
  (`DraftForm.tsx`, `DiffPanel.tsx`), `src/modules/approval-warning-reasons/`.
- **G15 — Epic and records.** ⛔ `### Story 6.33` in `epics.md` (owed at Task 0.4). `deferred-work.md` names this row in THREE items: the
  *"Has the family filed any other claim for this death?"* item (trigger: this row `done`), D5, and *"An optional multi-select answer, once
  given, can never be CLEARED"* (trigger: *"row 6-33's questionnaire versions revisiting the answer model"* — this story does ⛔ revisit the
  answer model ⇒ disposition: stays open, trigger re-pointed). Two more triggers this story FIRES or may fire: 6.32 D11 (*"any change to
  `toWireQuestionnaire`"* — QE4 changes it) and D8 (*"any change to `peer-mesh-reply.ts`'s pre-read"* — QE12 may) ⇒ each gets a recorded
  disposition (AC13). Roster Row 27 note (4) and Row 42's
  `cross_story_discharge_path` name this row's cost.

## ⚖️ Build decisions QE1–QE17 (PROPOSED — BigDev answers at Task 0.2)

> ⭐ The FOUR real asks are **QE5, QE6, QE10, QE14**. The rest are the author's calls with a stated default; answering "as recommended"
> takes every (A). ⛔ Silently pick: an option not taken is recorded in the author-commit as not taken.

**QE1 — one story, phased (recommended) or a split.** (A) One story; Tasks are phased so the substrate (Tasks 1–4) lands and is green before
the chain and the editor (Tasks 5–8). *Cost:* one large diff and one review. (B) Split 6.33a (versions in the DB + async resolver + words)
and 6.33b (the chain + the editor). *Cost:* 6.33a ships a source nothing writes (a substrate without a producer); two governance rounds.

**QE2 — storage: code versions stay code; two append-only tables (recommended).** (A) `questionnaire_versions` — one IMMUTABLE row per
version: `id uuid`, `kind`, `version int`, `version_id text UNIQUE` (`<kind>.v<N>`), `base_version_id text` (what it was started from — a
code or DB version), `ruled_base_code_version_id text` (the CODE version whose ruled questions this one carries — QE5 / TR11),
`origin_pariwar_id uuid NULL` (NULL = written at all-Pariwar scope by the Super Admin), `definition jsonb` (the
`QuestionnaireDefinition` minus `scope` / `status`, which are DERIVED), `authored_by_actor`, `authored_by_display`, `authored_at` (DB time),
`direct boolean` (the Super Admin's direct path), `reason text NULL`. And `questionnaire_version_steps` — the chain's log, one row per step:
`id`, `version_id`, `step` ∈ `proposed | approved | returned | withdrawn | made_live | pariwar_reverted`, `target_pariwar_id uuid NULL`
(RESOLUTION only — for `made_live`: NULL = all Pariwars; for `pariwar_reverted`: the Pariwar; NULL on the other four steps),
`scope_pariwar_id uuid NULL` (TENANCY only — for `proposed / approved / returned / withdrawn`: the version's `origin_pariwar_id`; for
`made_live / pariwar_reverted`: the target; NULL ⇔ written through the global path — QE11), `actor`, `actor_display`, `note text NULL`,
`hindi_reviewed boolean` and `classification_attested boolean` (both required true on every `approved` step — QE9 / QE10), `at` (DB
time). Current state is DERIVED from the steps; ⛔ status
column. Both tables: append-only trigger, ⛔ UPDATE / DELETE grants. *Cost:* state is a query, ⛔ a column. (B) One table with a status
column + a column-scoped guard. *Cost:* a mutable status on a governance record (the CHECK-vs-UPDATE trap class). (C) Move the five code
versions into seeded rows. *Cost:* re-homes reviewed versions and their pins; a fresh database needs a seed to serve anything.

**QE3 — numbering: two disjoint ranges, taken at creation (recommended).** (A) DB versions number from a FLOOR of **1000**
(`version >= 1000`, a CHECK): a new DB version takes `max(999, DB max) + 1` for its kind under
`pg_advisory_xact_lock(hashtext('questionnaire_version:' || kind))`; the validator REFUSES a CODE version `>= 1000`; a boot-time assertion in
the reader (and a migration-time check) fails if any code `versionId` exists in `questionnaire_versions`. ⚠ Why a floor and ⛔ "max(code, DB)
+ 1": the repo cannot know production's DB max, so the next reviewed code version (e.g. a counsel-basis `peer_mesh.v5`) could take an id
the DB already holds and every reply pinned to it would be read under the wrong questions — the code registry's duplicate check sees only
code, `UNIQUE(version_id)` sees only DB rows. A returned or withdrawn version leaves a GAP (allowed, shown in history). The pin columns,
both CHECKs and the validator's `versionId === ${kind}.v${version}` rule stay unchanged. *Cost:* ids like `peer_mesh.v1000`; visible
gaps. (B) Number at make-live. *Cost:* an unpublished proposal has no id; approvals and the editor need a second identifier.

**QE4 — words: chain text is STORED, in both languages; ruled questions keep their copy keys (recommended).** (A) `QuestionDefinition` /
`QuestionOption` gain `text?: { en: string; hi: string }`; the validator requires EXACTLY ONE of `copyKey` / `text` (both strings non-empty,
trimmed, ≤ 500 chars; the only placeholder admitted is `{member}`); `closingNoteCopyKey` / `thankYouCopyKey` stay copy keys (inherited —
QE5). ONE word function serves every reader — extend the existing resolution in `toWireQuestionnaire`, the assembler's `enWords`
(`peer-answers-assembler.ts`) AND the ground-inspection handler's own `enWords` (`claims.ground-inspection.handlers.ts` — the discrepancy
result's family words) — three sites, one function (6.32 IQ9: ⛔ a second resolver); `{member}` in stored text is substituted with the SAME semantics `t()` applies (incl. 6.32 D11's empty member).
`approvedBy` admits a chain record: the literal form `chain:<questionnaire_versions.id>` (validator regex), alongside the Panel ids.
⭐ **What a "chain question" IS is decided by ORIGIN, ⛔ by `approvedBy`:** the validator takes the origin as input (`{ origin: 'code' | 'db' }`);
in a DB-stored version EVERY question whose key ∉ the kind's ruled set is a chain question — it carries `text` (⛔ `copyKey`) on itself and
every option, and its `approvedBy` is exactly `['chain:<this version's id>']`, STAMPED BY THE SERVER, ⛔ accepted from the client. (Otherwise
a staff question citing `2026-10-10-304` escapes QE8's `sensitive: true` and is stored in clear, and a staff-chosen `copyKey` needing an
unknown interpolation param makes `t()` throw on every GET of that Pariwar's questionnaire.) *Cost:* two word sources behind one function. (B) Mint copy keys into a DB catalog read by `t()`. *Cost:* changes `@twt/i18n`'s static
contract and its parity gate for every surface.

**QE5 — what the chain may change (⭐ REAL ASK).** (A, recommended) **The Panel's ruled questions are LOCKED**: every ruled question
(`peer_mesh` v2+'s seven; `ground_inspection`'s three) appears in every chain version EXACTLY as in its recorded
`ruled_base_code_version_id` (at write time = the newest code version of the kind) — key, kind, codes, copy keys, flags, `approvedBy` (the
validator compares field by field; `counselBasis` of the two ruled health questions is EXCLUDED and overlaid at read — QE12); changing a ruled question's
WORDS stays a Panel decision id + a reviewed code version (the v3 / `-328`, v4 / `-331` route). The chain may ADD, CHANGE, REORDER and
REMOVE its OWN questions (subject to `showIf` order and the page rule); the closing note and thank-you are inherited, ⛔ editable here. The
ruled FIXED checks (FQ11 certificate, FQ8 C date and time) are 6.26a / 6.7 code, ⛔ questionnaire questions — ⛔ reachable by the chain
(`-304` reading, already true). *Cost:* NARROWS *"with/without modification"* for the ruled questions — the Panel's ⇒ NON-BLOCKING confirm
(QE14). (B) The chain may reword a ruled question (key, codes, flags still locked). *Cost:* what neighbours and families are asked in words
the Panel ruled changes without the Panel; `-328` sent exactly such a change to the Panel.

**QE6 — who holds which step (⭐ REAL ASK).** (A, recommended) Three new keys (catalog 55 → 56):
`questionnaire.propose` (pariwar dimension) — `pariwar_admin`; `questionnaire.approve` (pariwar dimension) — `pariwar_admin` **acting as
Trustee-Lite for the State Trustee** (the 6.13 `cycle.freeze` / 6.14 `claim.r9_vote` posture, `-305` §1 (c)); `questionnaire.publish`
(GLOBAL — `requireGlobalPermission`) — `super_admin` only (make live, modify at make-live, direct addition, revert). `super_admin` holds all
three automatically. ⛔ granted to `state_trustee` (an INERT grant — G6). Because proposer and approver now hold the same role, **an
`approved` step on a NON-direct version must be by a DIFFERENT actor than the version's author** (app refusal `questionnaire.same_actor` 409 +
a BEFORE INSERT trigger backstop: `step = 'approved' AND NOT v.direct ⇒ actor <> v.authored_by_actor` — a trigger cannot see roles, so the
carve-out is the `direct` flag, which only the global publish path can set) — otherwise one Pariwar Admin proposes and approves alone and the "two people" the `-304` reading counts
collapses to the Super Admin's make-live. ⚠ A single-admin Pariwar therefore needs the Super Admin to approve or make live directly (the
10.5 / 10.9 / 10.15 PO-ratified shape). *Cost:* the ruled "State Trustee" is a Pariwar Admin in practice ⇒ disclosed to the Panel
(QE14). (B) `questionnaire.approve` held by `trustee_panel`. *Cost:* the trust-wide Panel becomes the per-version approver — the very
"every version comes to you" option (Q8 B) the Panel did ⛔ take; the role is PROVISIONAL. (C) Approve held by `super_admin` only. *Cost:*
the chain's middle step disappears into the Super Admin; the State Trustee has ⛔ role at all.

**QE7 — the Super Admin's powers, exactly (recommended).** (a) Make an APPROVED version live for THIS Pariwar or ALL Pariwars
(`made_live`, `target_pariwar_id` = the Pariwar | NULL). (b) "With modification": a NEW version authored by the Super Admin, `base` = the
approved one, made live in the SAME transaction (its own `proposed` + `approved` + `made_live` steps by the Super Admin, `direct: true`,
`hindi_reviewed` recorded on its `approved` step, a REQUIRED `reason`). (c) "Add question directly and make it live": author + make live
alone — the SAME three steps as (b), `direct: true`, a REQUIRED `reason` (≤ 500 chars) shown in history, `hindi_reviewed` on its `approved`
step (so the state machine's "`made_live` only from `approved`" holds on every path). (d) Revert a Pariwar to the all-Pariwar version
(`pariwar_reverted`). ⚠ There is ⛔ "revert ALL to code" step: a bad all-Pariwar version is replaced by a NEW direct version based on the
code version in force (the remedy, stated as the cost). (e) Make-live REFUSES 409 `questionnaire.base_moved` when the version's
`base_version_id` ≠ the target's version in force, unless `acknowledgeBaseMoved: true` — otherwise a stale proposal silently drops the
other version's changes. (f) Make-live and revert require step-up (`requireStepUp(deps, 'questionnaire_publish')`) — they change what
families are asked from that moment.

**QE8 — what a chain question may be (recommended; enforced IN THE VALIDATOR for code and DB versions alike).** A question whose
`approvedBy` is a chain record: key ∉ every ruled / warning / comparable / health key set of BOTH kinds and ∉ `callback_consent`; kind ∈
`single | multi | yes_no` (⛔ `date` — the DB admits date indexes only on `death_date`); `optional: true`; `warning: false`;
**`sensitive: true` ALWAYS** (G9: the flag is the ONLY guard that the answer is encrypted — `questionnaires/answers.ts` decides
`q.sensitive ? encrypted : codes`, traced; making every chain answer Tier-1 removes a classification the author could get wrong; ⚠ cost:
every chain answer is decrypted to be shown — the read audit is ONE line per read with counts (`claims.peer-answers.handlers.ts`), and
`family_health_answer_count` counts by the FIXED `GROUND_INSPECTION_SENSITIVE_QUESTION_KEYS` (`peer-answers-assembler.ts`) ⇒ count by
"stored as ciphertext" instead and add a `sensitive_answer_count` on the neighbours' side, so chain decrypts are counted);
⛔ `callbackAudience`; ⛔ alcohol — **and `FORBIDDEN_TOPIC_RE` is applied to `text.en` and `text.hi` of every question and option, and
gains Devanagari terms (शराब, दारू, मदिरा, नशा, ठर्रा)** (today it reads only keys, codes and copy keys, Latin only — a stored "Did they
drink alcohol?" under key `habits` would pass); its key is ⛔ comparable (never in discrepancy — I1); key ≤ 64 chars and ≤ 20 options
(and ≤ `GROUND_INSPECTION_ANSWER_MAX_CODES` for `ground_inspection`) — the wire limits (`PeerRequestAnswerPathParams .max(64)`,
`PeerRequestAnswerValue .max(20)`), else a version is served but cannot be saved. ⚠ The validator warns the editor (⛔ refuses) when a
chain question's `showIf` parent is a pending health question — `servedDefinition` drops dependants, so it is silently never shown.
*Cost:* staff cannot ask a free-text or date question through the chain in this story.

**QE9 — Hindi (recommended).** Both languages are REQUIRED on every stored string (QE4). The `approved` step — and the Super Admin's direct
path — records `hindi_reviewed = true` with the actor: the screen shows every Hindi line and the approver ticks *"I have read every Hindi
line"*; ⛔ tick ⇒ 422 `questionnaire.hindi_review_required`. This builds `-304`'s unratified reading as written. *Cost:* the approver is the
Hindi reviewer (⛔ a separate translator role). (B) A separate Hindi-review step and role. *Cost:* a fourth step and a role nobody holds.

**QE10 — health questions through the chain (⭐ REAL ASK).** (A, recommended) Allowed — the Panel declined our limit. An author-declared
`health: true` forces `counselBasis: 'pending'`; a chain version may carry a basis ONLY if it is an id in a NEW code-resident
`COUNSEL_BASIS_DECISIONS` list (EMPTY today — adding counsel's recorded basis stays a reviewed code edit, exactly as Row 27 (f) / Row 42 (a)
already require). A pending question is SKIPPED in the served form (`servedDefinition`, unchanged). For `peer_mesh`, a version in force with
ANY pending question HOLDS that Pariwar's texts and WhatsApp reminders (6.27c R11, unchanged) — ⭐ the make-live screen says, before the
confirm: *"This version has a health question that counsel has not yet cleared. Until counsel's basis is recorded, the neighbours in [this
Pariwar / every Pariwar] will not be texted and the question will not be shown."* (the stated cost). ⚠ HAZARD, recorded, ⛔ mechanizable:
`health` is author-declared — a health question labelled non-health bypasses counsel; mitigation: the approve and make-live screens list
every question with its classification badge and the step records `classification_attested = true` (a second tick, *"I have checked which
questions are about health"*; ⛔ tick ⇒ 422 `questionnaire.classification_attestation_required`). *Cost:* a mislabel is a human control. (B) Refuse chain
health questions in this story. *Cost:* narrows the Panel's chain (it declined that limit with the limit in front of it) ⇒ the Panel's.

**QE11 — tenancy (recommended).** (A) `questionnaire_versions`: SELECT open to `twt_app` in every tenant transaction (`USING (true)`) — a
Pariwar's pinned version can originate in ANOTHER Pariwar (made live for all) and must resolve under the reading Pariwar's RLS; question
text is reference data every tenant already reads from the code registry; INSERT `WITH CHECK (origin_pariwar_id = current_setting('app.pariwar_id')::uuid)`,
the NULL-origin insert ONLY through the global path (`deps.serviceDb` under `requireGlobalPermission` — the feature-flags precedent).
`questionnaire_version_steps`: SELECT `USING (scope_pariwar_id IS NULL OR scope_pariwar_id = <current>)`; INSERT
`WITH CHECK (scope_pariwar_id = <current>)` — a NULL scope only via the global path; `<current>` is the house form
`nullif(current_setting('app.pariwar_id', true), '')::uuid` (re-check the exact form in an existing policy file). ⚠ The policies key on
`scope_pariwar_id`, ⛔ `target_pariwar_id` (which is NULL on propose / approve / return / withdraw — keying on it would refuse every Pariwar
Admin's own step). The API ⛔ lists another Pariwar's open proposal to anyone but
the Super Admin. *Cost:* drafts are readable cross-tenant at the DB layer (an API filter, ⛔ RLS, hides them). (B) Every read through
`serviceDb`. *Cost:* a tenant read path bypasses RLS (architecture §1.2 names cross-tenant reads as a named surface).

**QE12 — the async resolver, the call sites, the flip, D5 (recommended).** (A) A new db-touching module
`packages/domain/src/questionnaire-versions/` exports `resolveLiveQuestionnaire(tx, kind, pariwarId)` and
`getQuestionnaireDefinition(tx, versionId)`: a DB row is parsed and run through the SAME `assertValidQuestionnaireDefinition`, validated
against ITS OWN recorded `ruled_base_code_version_id` (⛔ later code — TR11); resolution = the Pariwar's newest `made_live` step not followed
by a `pariwar_reverted` for it → else the newest all-Pariwar `made_live` → else the code registry's live version; a code `versionId`
resolves from the code registry. A DB version that fails validation is SKIPPED by live resolution (logged) but STILL served for the replies
and visits already pinned to it (logged) — ⛔ a pinned answer made unreadable. **Counsel's basis overlay:** at read time the reader overlays
the ruled health questions' `counselBasis` (`death_cause`, `death_illness`) from the NEWEST code version of the kind — so recording
counsel's basis by the reviewed code edit Row 27 (f) / Row 42 (a) already require reaches every DB version in force exactly as it reaches
`peer_mesh.v4` / `ground_inspection.v1` today (6.32 D3's disposition applies to both equally); the ruled-question lock therefore EXCLUDES
those two fields' `counselBasis`. Every G8 consumer moves to it inside its existing transaction; **the jobs have none** — the sweep and the
child's begin path read via `withPariwarScope(deps.pool, pid, …)` once per Pariwar per run (else a Pariwar's own `made_live` is invisible and
a Pariwar-only version with a pending health question would ⛔ hold its texts — the exact "send with a question hidden" CF3 (d) forbids); the
jobs' `deps.questionnaireRegistry` becomes this reader. A fence test: ⛔ non-test code outside `questionnaire-versions/` and the code
registry's own module calls the sync `resolveLiveVersion` / `getQuestionnaireVersion` (I6).
**The flip:** both save requests gain an OPTIONAL `questionnaireVersionId` (what the client rendered); EVERY save compares it with the
PINNED version (or, before the first pin, the version in force) ⇒ on a mismatch 409 with NEW codes `peer_request.questionnaire_version_stale`
/ `ground_inspection.questionnaire_version_stale` (⛔ reuse of the existing `peer_request.stale` / `ground_inspection.questionnaire_stale`,
which every client already RETRIES); ABSENT ⇒ today's behaviour (installed apps). ⚠ Every client must map the new codes to RELOAD, ⛔
retry: the mobile `classifyFailure` (`apps/mobile/lib/peer-request.ts`) maps every unknown 409 to `'retry'` and the detail query is
`staleTime: Infinity` — a new code would retry forever (backoff capped, never gives up); the admin `QuestionnairePanel.tsx` and
`HelplinePeerRequests.tsx` retry their stale codes ×3. All three share `packages/api-client/src/peer-answer-editor.ts` (`shouldRetry`) ⇒
the reload is: refetch the questionnaire, drop drafts whose key is ⛔ in the new version. Deploy order: the server before a mobile build that
sends the field (an old `.strict()` server 400s it). **D5:** the version mismatch under a concurrent first pin returns the version-stale
409, ⛔ a bare 500. *Cost:* ~10 call sites change from sync to async; three clients gain a reload path. (B) Keep the sync registry and refresh it from the DB on a timer. *Cost:* a window where two processes serve different
versions; a cache the code base does ⛔ have.

**QE13 — the "any other claim?" question (recommended).** (A) ⛔ authored by this story's code or migration (that is the bypass 6.32 IQ2 (C)
rejected). The `deferred-work.md` item's trigger fires at `done` ⇒ annotated *"HOMED: the chain is built; adding it is a Super Admin act
through the editor (direct addition) — ⛔ code. Closes when a live `ground_inspection` version carries it."* (B) Seed it as
`ground_inspection.v2` in the migration. *Cost:* the author adds a question outside the chain the Panel ruled.

**QE14 — the Panel (⭐ REAL ASK).** (A, recommended) A NON-BLOCKING confirm note, from `trustee-panel-routing-note-TEMPLATE.md` (§0 first,
the deciding fact first, an honest cost on every option), drafted at Task 0.4 — ⛔ sent by the agent; BigDev sends. Two questions: (1) the
"State Trustee" step is performed by a Pariwar Admin acting as Trustee-Lite, and the approver must be a different person from the author
(QE6) — the system can ⛔ give the State Trustee role a Pariwar-wide act (G6) — and, disclosed with it, a Pariwar Admin of ONE Pariwar can
approve a version the Super Admin then makes live for ALL Pariwars; (2) the words of the questions the Panel ruled stay with the Panel; the
chain adds and changes only its own questions (QE5). Build proceeds on the recommendations; a different answer changes a grant or
a validator rule and is roster Row 45 (a) — ⛔ go-live before it is answered. *Cost:* the build may need a follow-up. (B) BLOCKING — ⛔ code
before the Panel rules. *Cost:* the row waits for a sitting.

**QE15 — go-live: roster Row 45 `questionnaire-editor-live` (recommended).** (a) The QE14 confirm answered and, if it differs, reflected in
code; (b) the real-browser pass (AC11) on the admin surface — propose → approve → make live → a NEW visit / reply is served the new version,
an OLD one keeps its pin; (c) a named Super Admin and at least one approver per launching Pariwar hold the keys (an ops fact, observable by
query); (d) ⛔ chain version made live in production before (a)–(c) are met. Each leg observable BEFORE the row closes. Merge ≠ go-live
([[project_not_in_production_merge_is_not_golive]]).

**QE16 — the admin page (recommended).** ONE page `/p/$pariwarId/questionnaires`, both kinds: the version IN FORCE for this Pariwar (own or
all-Pariwar — and which); every version's history (each step: who, when, for which Pariwar or all, the note, the reason on a direct one);
open proposals; a read-only render (the English line, the Hindi line beneath — the 6.32 panel's look) with badges — *Ruled (locked)*,
*Added by staff*, *Health — counsel pending*, *Answers encrypted*; a per-question change marker against the base (*New*, *Changed*,
*Removed*, *Unchanged* — derived by key); the editor (start from the version in force; ruled questions shown locked); actions by key —
propose, approve (with the QE9 tick), return (note required), withdraw (author only), make live (scope: *This Pariwar* / *All Pariwars*;
the base-moved acknowledgement; the QE10 counsel warning; step-up), revert. Nav link ungated (the server's 403 is the boundary). Admin chrome
English, module-local `i18n-en.ts`. Per-row actions use per-call `mutateAsync` ([[project_tanstack_mutate_callbacks_latest_only]]).

**QE17 — audit (recommended).** Every step is written through `audit.withCompensatingAudit` (ADR-0030 — ⛔ step row without its audit line;
it writes the audit INTENT first, then the mutation, then compensates on failure — so TR12's "COMMIT → `recordResult` → audit" order reads,
for these routes: claim the idempotency key → `withCompensatingAudit` (intent → the step's transaction commits) → `recordResult`; the
feature-flags handlers are the composed precedent — copy them),
actions `admin_questionnaire.{proposed,approved,returned,withdrawn,made_live,pariwar_reverted}`; ⛔ `events_log` (G12). The steps table IS
the durable, attributed record (`-304` reading: *"who proposed, who approved, who made it live, for which Pariwar(s), and when"*).
Attribution = `getDisplayName` snapshot.

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
   `copyKey` on it and every option, `approvedBy` exactly the server-stamped `['chain:<id>']`); exactly one of `copyKey` / `text` everywhere
   (`text` both languages non-empty; only `{member}`); QE5 (A)'s field-by-field lock of every ruled question against the version's recorded
   `ruled_base_code_version_id` (ruled health `counselBasis` excluded); QE8's limits on every chain question incl. `FORBIDDEN_TOPIC_RE` on
   `text.en` / `text.hi` with the Devanagari terms, the key / option-count wire limits, and the hidden-dependant warning; QE10's
   `counselBasis` rule (`'pending'` or an id in `COUNSEL_BASIS_DECISIONS`, empty); a CODE version `>= 1000` refused (QE3); every existing
   rule unchanged; `keys.ts`'s stale v4 comment rewritten. Every code version still validates.
2. **AC2 — the two tables** (migration `0192`, QE2 / QE3 / QE11): append-only triggers (⛔ UPDATE / DELETE), ⛔ UPDATE / DELETE grants, RLS
   ENABLE + FORCE with per-command policies keyed on `origin_pariwar_id` (versions INSERT) and `scope_pariwar_id` (steps), CHECKs
   (`version_id ~ '^(peer_mesh|ground_inspection)\.v[0-9]+$'`, `version_id = kind || '.v' || version`, `version >= 1000`,
   `definition->>'versionId' = version_id`, `(definition->>'version')::int = version`, the step enum, `reason` required when `direct`, `note`
   required on `returned`, `hindi_reviewed` and `classification_attested` true on every `approved`), the distinct-actor BEFORE INSERT
   trigger (`step = 'approved' AND NOT v.direct ⇒ actor <> v.authored_by_actor`), a UNIQUE `(kind, version)`. Journal `when` > every
   sibling's.
3. **AC3 — the async resolver** (QE12): resolution order exactly as QE12 (A); a DB row that fails validation is skipped by LIVE resolution
   (logged, the next level used) but still served for its existing pins (logged); the counsel-basis overlay from the newest code version;
   the boot-time code-vs-DB id-collision assertion (QE3); two live at one level is impossible by construction (newest wins).
4. **AC4 — every consumer moved** (G8 list re-derived at Task 0.1): the neighbours' app and link routes, the helpline, the inspector's
   GET / save / completion, the staff view, both jobs — each reads in its own transaction; the jobs via `withPariwarScope` once per Pariwar
   per run (a live-DB leg: a Pariwar-only version with a pending health question holds THAT Pariwar's texts and ⛔ another's); the
   code-only behaviour is byte-identical when ⛔ DB version exists (every existing test green unchanged except where a sync signature became
   async); the sync-resolver fence (I6).
5. **AC5 — the flip and D5** (QE12): the optional `questionnaireVersionId` on both save requests, compared on EVERY save with the pinned
   version (or, before the first pin, the version in force); a mismatch ⇒ 409 `peer_request.questionnaire_version_stale` /
   `ground_inspection.questionnaire_version_stale` (⛔ the existing stale codes); absent ⇒ today's behaviour; D5's concurrent first pin ⇒ the
   version-stale 409, ⛔ 500. The mobile app, the helpline and the inspector's panel send the id and map the new codes to RELOAD (refetch the
   questionnaire; drop drafts whose key is ⛔ in the new version) — ⛔ retry; `peer-answer-editor.ts`'s `shouldRetry` and the mobile
   `classifyFailure` gain the arm.
6. **AC6 — words** (QE4): stored text served in both languages through the ONE word function; `{member}` substituted as `t()` does; the
   staff view shows stored English words; ⛔ second resolver.
7. **AC7 — RBAC** (QE6): the three keys, catalog `56`; `pariwar_admin` holds propose + approve; `super_admin` all three (derived);
   `state_trustee` ⛔ any (a holder-set test pins it, with the RANK-ORDER reason); a "LIVE on its dimension, ⛔ inert" `hasPermission` test per
   key; `questionnaire.publish` checked with `requireGlobalPermission`.
8. **AC8 — the chain's routes** (`apps/api/src/modules/questionnaire-versions/`): list + detail (both kinds; open proposals of other
   Pariwars only for the Super Admin), propose (from the version in force or a named base), approve (QE9 tick), return (note), withdraw
   (author only), make live (QE7 (a)/(b)/(e)/(f)), direct (QE7 (c)), revert (QE7 (d)). Route table (write it out in the routes file):
   tenant routes under `/api/v1/p/:pariwarId/questionnaire-versions…` with `[requireAdminSession, scopeResolutionHook,
   requirePermissionHook(propose | approve)]`; make live / revert FOR THIS PARIWAR under the same prefix with
   `[requireAdminSession, scopeResolutionHook, requireGlobalPermission(publish), requireStepUp]` (⚠ no precedent mixes these two hooks —
   `rbac/index.ts` documents `requireGlobalPermission` for routes NOT under `/p/:pariwarId/`; prove it with a test, or move these too);
   make live for ALL and direct addition at all-Pariwar scope under `/api/v1/global/questionnaire-versions…` on `deps.serviceDb` (the
   feature-flags routes' shape). Refusals: `questionnaire.same_actor` 409, `questionnaire.not_approvable` / `not_publishable` 409 (wrong
   state — the state machine below), `questionnaire.base_moved` 409, `questionnaire.hindi_review_required` /
   `questionnaire.classification_attestation_required` 422, `questionnaire.definition_invalid` 422 with the validator's problems in
   `details`, 403 by key, 404 for another Pariwar's version. State machine (derived): `proposed` → `approved` | `returned` | `withdrawn`; `approved` → `made_live` |
   `withdrawn`; `returned` / `withdrawn` are terminal (a revision is a NEW version with this one as base); `made_live` may repeat for
   another target. Writes are idempotent (`Idempotency-Key`; COMMIT then `recordResult` — [[project_idempotent_write_handler_shape]]);
   every step audited (QE17); version numbering and make-live serialized by advisory locks (QE3; per (kind, target) for make-live).
9. **AC9 — the admin page** (QE16), incl. the QE10 counsel warning text verbatim, the QE9 Hindi tick and the QE10 classification tick on
   approve / direct / make-live-with-modification, the QE8 hidden-dependant warning, and the QE7 (e) acknowledgement.
10. **AC10 — nothing gates, proven** (I1): a fence test that ⛔ new module imports `approval-warnings`, `ground-inspection-approval`,
    `inspection-discrepancy`'s rule table or `member_medical_disclosures`; `nominee-name-no-comparison-fence.test.ts` extended to the new
    modules; a live-DB leg — a chain question answered (any value) on a claim leaves `assertClaimApprovable`, the completion predicate and
    the warnings summary byte-identical.
11. **AC11 — the real-browser pass** of the admin page (propose → approve → make live for one Pariwar → the inspector's panel and the
    neighbours' questionnaire for a NEW claim show the new version; an OLD visit keeps its pin) — or, if the agent's Chrome cannot reach the
    local host after ONE probe ([[project_agent_chrome_cannot_reach_localhost]]), recorded UN-ATTESTED in `deferred-work.md` and Row 45 (b),
    ⛔ faked ([[feedback_record_unattested_no_backfill]]). Use the 6.32 launcher shape ([[project_admin_browser_pass_launcher]]).
12. **AC12 — proof.** Every new test leg seen RED against the pre-change code first; named mutants killed (the `chain:` regex widened to any
    string; the ruled-question lock dropping one field; `sensitive` default flipped; a DB question citing a Panel id escaping the chain
    rules; the forbidden-topic text leg dropped; the code-version `>= 1000` refusal dropped; the distinct-actor check removed; the resolver
    preferring all-Pariwar over a Pariwar's own; a `proposed` version resolving as live; the counsel overlay dropped; the jobs reading
    unscoped; the stale check inverted; the version-stale code classified as retry on a client); live-DB legs for RLS (incl. a Pariwar
    Admin's own propose / approve / return / withdraw INSERTs as `twt_app`)
    (positive and negative; cross-tenant assertions as a 404 + a separate schema-shape test, ⛔ `not.toHaveProperty` on a 404), the
    append-only triggers, the distinct-actor trigger, concurrent make-live, and a fresh-database migrate; `ci:local` 36 / 36 on a FRESH
    container with `DATABASE_URL` set on the push ([[project_prepush_hook_inherits_5432]]).
13. **AC13 — records.** Row 45; `epics.md` `### Story 6.33`; `deferred-work.md`: the "any other claim?" item annotated (QE13), D5 marked
    Closed by 6.33, the 6.27b flip hazard noted Closed by 6.33, the "multi-select can never be CLEARED" item's trigger re-pointed (⛔
    closed — G15), D11 and D8 each given a recorded disposition (closed if fixed, else re-triggered — ⛔ silently passed); dated pointers on Row 27 note (4) and Row 42's discharge path (*"the chain
    exists — the cost is stated on the make-live screen"*); the ledger lines; the story's Dev Agent Record and File List.

## Tasks / Subtasks

- [ ] **Task 0 — governance first (AC0).** Nothing below starts before 0.3 is committed.
  - [ ] 0.1 `git fetch origin`; rebase onto `origin/main` if it moved (backup branch first — [[project_rebase_ledger_conflict_separator]]);
    `git diff --name-only 26901c92..HEAD -- packages apps scripts infra docs` — re-read any cited file that moved; re-grep the five NUMBERS on
    every branch and worktree; re-derive G8's call-site list (the grep in G8) and paste it into the Debug Log.
  - [ ] 0.2 Put QE1–QE17 to BigDev; the four real asks (QE5, QE6, QE10, QE14) first, each with its cost as written. Record the answers here
    verbatim.
  - [ ] 0.3 ONE author-commit decision entry (≥ `-421`), committed ALONE: QE1–QE17 as answered; its §0 table (edges 1–7); "How much to
    trust this entry" naming what was traced vs inferred; ⛔ an in-place edit of `-304` / `-310` / `-413`. If the classifier refuses the
    `.decision-log.md` write, stage the entry and ask BigDev once ([[project_decision_log_writes_user_inserted]]). Write its SHA here AFTER
    the commit.
  - [ ] 0.4 Records commit: roster Row 45 (QE15) in `docs/launch-gate-inventory/inventory-roster.md`; `epics.md` `### Story 6.33` (title,
    `[SURFACE] [PRIMITIVE] [GOVERNANCE]`, the minted-by-ruling banner citing `-304` Consequence 2, the ACs in brief — the 6.32 entry's
    shape); `deferred-work.md` (QE13 annotation); the ledger line (next free letter). If QE14 (A): draft
    `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-3x-6-33-questionnaire-chain.md` FROM the template — ⛔ send it.
- [ ] **Task 1 — the engine (AC1).** `questionnaires/types.ts` (`text?`), `keys.ts` (`COUNSEL_BASIS_DECISIONS = []`, the chain-record regex,
  the reserved-key sets, the stale comment), `validator.ts` (AC1's rules — the ruled-question lock compares against the CODE definition the
  version's `base` chain traces to; for a ground-inspection or v2+ peer-mesh version that is the newest code version of the kind), pure
  helpers `questionnaires/derive.ts` (state from steps; the per-question change marker). The ruled-question lock compares against the
  `ruled_base_code_version_id` passed in (TR11). Keep `questionnaires/` pg-free (G13 fence green). Tests in
  `packages/domain/tests/questionnaires/` — RED first.
- [ ] **Task 2 — the migration and schema (AC2).** `packages/domain/migrations/0192_questionnaire-versions.sql` (hand-written; ⛔
  `db:generate` over an applied migration — 42P07), `schema/questionnaire_versions.ts`, the RLS policies file, `meta/_journal.json`
  (`when` > 1796096400036 and > any sibling's at the commit). ⚠ Compare enums AS TEXT in any `LANGUAGE sql` body (the 6.32 55P04 trap — a
  fresh database applies every migration in ONE transaction). Live-DB policy regression spec (positive + negative).
- [ ] **Task 3 — the reader (AC3).** `packages/domain/src/questionnaire-versions/{read,index}.ts`: `resolveLiveQuestionnaire`,
  `getQuestionnaireDefinition`, the row → definition parse. Live-DB spec covering every resolution branch incl. revert.
- [ ] **Task 4 — move every consumer (AC4, AC5, AC6).** The G8 list (incl. the jobs via `withPariwarScope`, the three word sites, the
  counsel overlay, the sync-resolver fence); the word function (QE4); the optional `questionnaireVersionId` + version-stale 409 on both saves
  (contracts `packages/contracts/src/claims/{peer-request,ground-inspection-questionnaire}.ts`, the handlers); the RELOAD arm in
  `packages/api-client/src/peer-answer-editor.ts` (`shouldRetry`), `apps/mobile/lib/peer-request.ts` (`classifyFailure`) + the mobile
  questionnaire screen, `apps/admin/src/modules/ground-inspection/QuestionnairePanel.tsx` and
  `apps/admin/src/modules/helpline-claims/HelplinePeerRequests.tsx`, each with a test; D5; the `sensitive_answer_count` / ciphertext-based
  health count (QE8). Every existing suite green.
- [ ] **Task 5 — RBAC (AC7).** `rbac/permissions.ts` (append three keys with REUSE CHECK comments; version 56 with its paragraph),
  `rbac/roles.ts` (`pariwar_admin` gains propose + approve with the Trustee-Lite comment citing G6; ⛔ state_trustee), contracts mirror if
  any, `tests/rbac/permissions.test.ts` (56 / 74), `tests/rbac/roles.test.ts` (holder sets; live-on-dimension).
- [ ] **Task 6 — the chain (AC8).** Domain writer `questionnaire-versions/write.ts` (one function per step; locks; the state machine; the
  validator on every new definition), API module `apps/api/src/modules/questionnaire-versions/{routes,handlers,index}.ts` registered in
  `server.ts`, contracts `packages/contracts/src/questionnaire-versions/` (`.strict()` inputs; output schemas ⛔ tightened on reused
  fields), audit types in `audit-sink.ts`, error codes. The AC8 route table, each `preHandler` array inline PER ROUTE (a shared const was
  misread by a route gate in 6.27a). The human-actor AST gate's `COVERAGE_SET` (`scripts/claim-adjudication-human-actor-invariant`) does ⛔
  cover these routes — leave it unless BigDev wants them in; if added, its classifier must recognise `requireGlobalPermission`.
  API integration specs (each refusal; idempotent replay; concurrent make-live; the global path).
- [ ] **Task 7 — the admin page (AC9).** `apps/admin/src/modules/questionnaire-versions/` (page, editor, history, render, `i18n-en.ts`),
  route in `router.tsx` + `src/routes/QuestionnaireVersionsRoute.tsx`, nav in `RootLayout.tsx`, client + hooks. Tests in
  `apps/admin/tests/` (RTL `cleanup`; generous timeouts — the 6.32 5 s timeout under `ci:local` load).
- [ ] **Task 8 — nothing gates, proven (AC10)** + the mutants (AC12).
- [ ] **Task 9 — the real-browser pass (AC11).**
- [ ] **Task 10 — records (AC13)**, `ci:local` on a fresh container, the Dev Agent Record, File List, Change Log; the row → `review`.

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
| `packages/api-client/src/peer-answer-editor.ts`, `apps/mobile/lib/peer-request.ts` | unknown 409 ⇒ retry (mobile: forever) | version-stale ⇒ RELOAD | every existing retry / close arm |
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
  must run as `twt_app`. A NULL-target row must be visible in a Pariwar-scoped tx (the feature-flags `OR … IS NULL` leg).
- **TR7 — append-only + column grants.** The new tables need ⛔ UPDATE grant at all. ⛔ seed by UPDATE. If a later RTBF ever scrubs a
  column here, REPLACE the guard function ([[project_append_only_guard_names_erasure_columns]]) — today staff text is ⛔ member data.
- **TR8 — migration order on a shared DB.** Journal `when` greater than every sibling's ([[project_sibling_migration_when_order_shared_db]]);
  ⛔ regenerate an applied migration ([[project_live_db_test_gotchas]]).
- **TR9 — `blindIndexMany` is forbidden inside a transaction** (6.32 deviation) — irrelevant to chain questions (⛔ indexes), but ⛔ add one.
- **TR10 — sensitive answers.** Before Task 4, prove the writers encrypt by the DEFINITION's `sensitive` flag and ⛔ by a fixed key list
  (`git grep -n "SENSITIVE_QUESTION_KEYS" -- packages apps ':!**/tests/**'` — every read judged); a fixed-list encrypt decision would store a
  chain answer in clear.
- **TR11 — the ruled lock.** Compare against the version's recorded `ruled_base_code_version_id` (a CODE definition), ⛔ against the base DB
  version (a chain of DB versions could otherwise drift a ruled field one step at a time) and ⛔ against "the newest code version" at READ
  time (a later code edit would then fail every stored version in force and strand its pins). The ruled health questions' `counselBasis` is
  excluded from the lock and overlaid at read (QE12).
- **TR12 — idempotent write shape** — claim → open scope tx inside the try → COMMIT → `recordResult` → audit; a 23505 retry inside a tx needs
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
@tanstack/react-router ^1.95, react-hook-form ^7.54 + @hookform/resolvers ^3.10, zod ^3.23, tailwind ^4, radix ^1.1; vitest ^3 (admin) /
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
- Mobile: only the save-request field and the version-stale RELOAD arm (`apps/mobile/lib/peer-request.ts` `classifyFailure` + the
  existing questionnaire screen — there is ⛔ reload path today; the detail query is `staleTime: Infinity`).
- Shared client: `packages/api-client/src/peer-answer-editor.ts` (`shouldRetry` — the version-stale code must ⛔ retry).
- ⚠ The ledger's 2026-10-10 phrase *"contracts `questionnaires/`"* is stale — the engine lives in domain (G13); ⛔ create a contracts copy.

### Recorded observations — ⛔ NOT this story's to change, ⛔ NOT routed

- `-304` Consequence 1 says *"PM23 (e)"*; the 6.27 story's PM23 has (a)–(d) — the "who approves" item is (d). A lettering slip in a ratified
  entry; ⛔ edited.
- The IQ7 confirm note for 6.32 (`trustee-panel-routing-note-2026-10-28-6-32-family-answers-audience.md`) is drafted, ⛔ sent — unrelated to
  this chain; ⛔ merged into QE14's note.
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

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-30 | 1.1 | Fresh-context validation (one read-only verifier re-traced every code claim, quote and number): 8 critical gaps folded in — DB versions number from 1000 (a code / DB id collision); the ruled lock against a RECORDED code base + a read-time counsel-basis overlay (else counsel's code edit strands every DB version in force); the distinct-actor trigger keyed on `direct` and the direct path writes all three steps; steps tenancy on a new `scope_pariwar_id`; NEW version-stale codes mapped to RELOAD in all three clients (mobile retried any unknown 409 forever); "chain question" decided by ORIGIN with server-stamped `approvedBy`; the alcohol rule on stored text incl. Devanagari; the jobs read under `withPariwarScope`. Plus: wire limits, three word sites, the widened G8 grep + a sync-resolver fence, a third deferred item and the D8 / D11 triggers, the route table, the audit-order composition, the classification attestation, the cross-Pariwar disclosure in QE14, status labels on the recorder's text. |
| 2026-10-30 | 1.0 | Created by `bmad-create-story 6.33` at `26901c92` on `story/6-33-questionnaire-editor-versions-and-approval`: QE1–QE17 PROPOSED (real asks QE5, QE6, QE10, QE14); G1–G15 traced; Policy meaning written (⛔ gate; the held-texts adjacency stated); ⛔ code. Ultimate context engine analysis completed — comprehensive developer guide created. |
