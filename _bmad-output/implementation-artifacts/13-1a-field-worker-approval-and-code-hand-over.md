---
baseline_commit: 06bab925
---

<!--
PINNED: `06bab925` = `origin/main` (ledger 2026-11-04g - Story 13.1 LANDED, PR #323, `268d86b5..e27351d6`). The story lives on branch
`story/13-1a-field-worker-approval-and-code-hand-over` in its OWN worktree
(`.claude/worktrees/13-1a-field-worker-approval-and-code-hand-over`), created from `origin/main` on 2026-11-04. Every `apps/` /
`packages/` / `scripts/` claim was traced at the pin on 2026-11-04 by the create-story pass (three read-only research passes - domain
+ database, API + RBAC + gates, the admin web app - then the author's own reads; the load-bearing claims were re-read by the author).
Every NEGATIVE ("nothing decrypts a field worker's columns", "no field-worker screen exists", "the door checks no worker state")
was re-grepped. Perishable - re-check at Task 0.1. Re-locate by FUNCTION, not by line.

STATUS: review (v1.9, 2026-11-05) — code review round 2 of the implementation is DONE and every finding is resolved: 31 patches APPLIED, both decisions (CR1, CR35) APPLIED per decision `-448`, 3 deferred. PUSHED as PR #324 (`pnpm ci:local` PASSED 38/38 at `2205ba20` on a fresh container). The real-browser pass was RE-RUN on the amended code on 2026-11-05 (Completion Notes). The Panel's non-blocking keys-confirm note has been SENT (reported by BigDev, 2026-11-05) — no ruling yet. (Before: v1.8, 2026-11-05, not yet committed; before that in-progress v1.7, 2026-11-04, with CR1 and CR35 open; before that review v1.6, 2026-11-04.) IMPLEMENTED on the branch; R1–R14 resolved (decision `-447`); ci:local 38/38 at `9f3666b1`; the real-browser pass (Task 9.4) RAN in this Mac's Chrome after BigDev connected it — see the Completion Notes. Nothing pushed. (Before: review round 1 complete; BigDev chose option 2.) GOVERNANCE IS DONE - decision `2026-11-04-446` (`218a7424`) and the roster lines + the Panel draft (`1c3b6bce`) are committed, each before any code; the dev agent starts at Task 0.1 (re-verify at the then-current tip), then Task 1. BigDev ANSWERED Q-1..Q-5 on 2026-11-04 (his words are in the Change Log, v1.1): every answer is the
author's recommendation, so the build decisions AD1-AD14 STAND UNCHANGED. Only Q-1..Q-5 (AD2, AD6, AD8, AD9, AD13) were put to him as asks; the other
nine are the author's, recorded on his instruction to write the decision entry ("all, commit and write the decision entry") - he may still change them
before the code that depends on them. The entry that records them is decision `2026-11-04-446` (Task 0.3), committed alone, before any code
([[feedback_governance_commits_precede_implementation]]). Nothing here has been shown to
the Panel; the keys' confirm is a non-blocking note drafted at Task 0.5 (roster Row 48 leg (i)) [SENT 2026-11-05, reported by BigDev — v1.9].

GLYPH REGISTER: the warning sign marks a hazard and nothing else. Every negation - in ACs, Invariants, Tasks, Traps and the build
decisions - is written in PLAIN WORDS ("No ...", "Do NOT ...", "never ..."), so a skim cannot invert one.

ADDRESSING RULE: never cite file:NNN into `.decision-log.md`, `deferred-work.md`, `epics.md`, `sprint-status.yaml` or the roster -
they are newest-first / growing files. Cite the decision id + clause, the item heading, the row key. Code is cited by path +
FUNCTION. This file holds ZERO numeric pointers into any of them.

LOCAL LETTERS (this story's own; a cross-story citation always carries its owner, `-168` cl.9): G = found facts - AD = build
decisions (the author's recommendations) - Q = asks that are BigDev's or the Panel's - I = invariants - TR = traps - C = carried
to a sibling story. "13.1 QE9" means Story 13.1's QE9; a bare "QE" never appears.

NUMBERS - traced 2026-11-04 across `origin/main`, every worktree and every local ref. RE-GREP at Task 0.1 AND at each numbered commit:
- Migrations: `origin/main`'s highest is `0200_field-workers` (journal idx 200, `when` 1796874000045). This story takes the next free
  number >= `0201` with a `when` ABOVE every sibling's (house step +86400001 => `1796960400046` if `0201` is free; a lower `when`
  behind a higher one is skipped by drizzle on a shared DB, [[project_sibling_migration_when_order_shared_db]]). `0201` is
  CONTENDED: `story/14-3-...` holds a `<MIG>` placeholder, `story/6-22b-...` and `story/6-39-...` plan migrations of their own and
  renumber after `0200`. The number follows the MERGE order.
- Decisions: the highest id on any ref is `2026-11-04-445` (landed). Any NEW decision this story writes takes >= `-446` (re-grep
  every ref first).
- RBAC: `PERMISSION_CATALOG_VERSION = 59` (78 keys) at the pin. This story mints THREE keys (AD6): ONE bump and +3 keys RELATIVE to the
  live values - every "60" and "81" in this file is the value AT THE PIN; the tests import `PERMISSION_CATALOG_VERSION` and assert +1 / +3
  against the live base (if 14.3's `breach.manage` lands first they become 61 and 82). CONTENDED: `story/14-3-...` mints `breach.manage` with a placeholder.
- Ledger: the newest letter on any ref is `2026-11-04g` (Story 13.1's landing). This story's entries take `2026-11-04h` onward -
  re-grep every ref first; there are TWO ledgers in `sprint-status.yaml` (the top comment block and the `last_updated: >-` key block).
- Roster: Row 48 (`field-worker-registration-live`, Story 13.1) is the highest; 46 is reserved by 6.39 / 14.3. This story adds NO
  row; it appends dated lines under Row 48's legs (h) and (i) (Task 0.4).
- ADR: none proposed.
-->

# Story 13.1a: A Pariwar Admin Approves the Field Worker a District Admin Registered, and an Admin Can Give the Worker Their Code by Hand - With the Screens That Register, Approve and Show It `[SURFACE]`

Status: review

## WHAT THIS STORY IS, IN ONE PARAGRAPH

Story 13.1 (done) built the field worker as a record with a lifecycle and ONE admin route that registers a worker and gives them a
code the response never shows. This story is the **critical path to go-live** for Epic 13: until a registered worker can be
**approved** (`pending_kyc` -> `active`), nobody is credited (13.1 Q-5 A, the Panel's `-441`), and until an admin can **read the
code to the worker** nobody has one to share (13.1 QE22: the registration response withholds it, and the SMS is Story 13.1b's).
It builds, in order: (1) the **approval** - a Pariwar Admin approves a registered worker, which records `kyc_completed` and
`activated` together, with the verified authorization that allowed it in the log (13.1 QE18); (2) the **audited by-hand code read**;
(3) the **reads the screens need** - a worker list that pages by cursor (13.1's carried D1), a worker's name and mobile decrypted
for the admin who opens them, and the Pariwar's recorded districts for the screens' pickers; and (4) the **three screens** in the admin console -
register, awaiting approval, find a worker and show the code. It builds NO SMS (13.1b), NO move / suspend / reactivate / terminate /
log read (13.1c, 13.1d), NO worker login (13.3), and no search by mobile or name.

## Story

As a **Pariwar Admin**,
I want to **approve a field worker a District Admin has registered - and, when a worker has not received their code, read it out to
them on their request - with screens to register, approve and find a worker**,
so that **a worker is credited only after a second officer has approved them, and no code reaches anyone before that.**

## Policy meaning (AI-10-1)

> ⚠ AMENDED 2026-11-05 by decision `-448` item 2: the worker's sentence below gains "after they have been checked against the record" — a District Admin or Pariwar Admin checks your details with you, then reads your code to you if you ask; the Trust records each look and each read.

**This story introduces TWO predicates that gate a benefit, and the benefit is the field worker's, not a member's:**
(1) *who may make a registered worker creditable* - approval, by a Pariwar Admin; and (2) *when a worker may be given their code by
hand* - only while `active`. Neither is a member predicate: no member state, no `account-frozen` source and no `member_attribution`
row changes (I12). The predicate each one feeds - `acceptsNewAttributions` (`active` only) - is 13.1's and is unchanged.

*In the field worker's terms:* **"You start to be credited with the teachers you bring in only when a Pariwar Admin has approved
you - the District Admin who registered you cannot make you creditable alone (a Pariwar Admin may do both steps when the District
Admin is not available). Until you are approved nobody will give you your code, and a teacher who signs up with it is not credited
to you afterwards. Once you are approved, a District Admin of your district or a Pariwar Admin will read your code to you if you
ask, for as long as you are not suspended or ended - and the Trust records each time they do."**

*In the member's terms:* **nothing changes** - 13.1's sentence stands: *"Who introduced you never changes what you are covered
for - if your introducer is no longer active, you are a member in full; only the credit to them is not recorded."*

*Costs, stated so they are not found later:* (a) when the Pariwar Admin registers AND approves, there is no second pair of eyes -
accepted by the Panel (`-443` Q4 A) and not enforced here; the log shows both acts and which authorization allowed each. (b) A
suspended worker cannot be given their code by hand until reinstated (AD8) - harmless, since a suspended worker is not credited
whatever code they quote, and the way back (`reactivated`) is 13.1's. (c) "Approve" records `kyc_status = completed`: it means *the
approving officer accepts the identity check done at the interview*, not that the approver ran one (AD2; 13.1 QE8 - an operator-
recorded attestation only).

**Checked against the Niyamavali** (the git-ignored private copies in the main checkout, grepped 2026-11-04):
`docs/legal/niyamavali.md` for `field.?worker|commission|referr|attribution|introduc|recruit|agent|representative|volunteer|remunerat|honorari|stipend|payee|employee|staff|approv`.
**Result: SILENT on field workers.** The hits are unrelated (the public visibility of a claim's post-approval outcomes; the DPDPA-
rights row; the moderation ground on abuse toward members, volunteers, staff or office-bearers). No text is pasted here:
`ulanzi1/twt` is public and the legal corpus is kept out of it on purpose ([[project_legal_corpus_private_repo_split]]). The
Niyamavali is a rulebook, not a ratified spec ([[feedback_niyamavali_rulebook_not_spec]]) - "silent" is a finding, not a blocker.
**Checked against the Privacy Policy** (private copy, same date): grepped for `field.?worker|contractor|recruit|commission` -
no hit. A field worker is outside its Members / nominees / claimants scope (13.1 §0 edge 5), so the footing and the notice for the
name and mobile these screens now SHOW to officers are the physical recruitment form's (13.1 Q-3, MET on BigDev's word, the form
unseen) plus counsel's go-live legs (Row 48 (b), (g)) - this story neither widens nor closes them.

## The rulings and sources this story builds on (quoted, never paraphrased)

Quotes are word-for-word; only typographic dashes are written as ASCII hyphens, and "..." marks a cut. Every quoted fragment was checked against its
source text on 2026-11-04 (a fragment that did not match was corrected, not left).

| Source | Verbatim | Status |
|---|---|---|
| `epics.md` Story 13.1a, "Approving" | "A Pariwar Admin approves a registered worker (`pending_kyc`) in a district their grant covers. Approval confirms the identity check done at the interview and activates the worker, by calling 13.1's `kyc_completed` and `activated` commands - whether both are recorded together, in one transaction, is this story's create-story decision (13.1 QE21, `-442`). The log records who approved and the authorization snapshot (13.1 QE18). A worker who is not awaiting approval, who belongs to another Pariwar, or whose district is outside the approver's grant is refused." | epic text - binding; AD2 answers its open question |
| same, "Giving the code by hand" | "A District Admin (own district) or a Pariwar Admin reads an ACTIVE worker's code through 13.2's door (`readAttributionCodeForRequest`). A worker who has not been approved is refused - no code before approval. Every read writes one audit line naming who read it; the code and the mobile are in no log." | epic text - binding |
| same, "Screens" | "A District Admin registers a worker (name, mobile, district); the Pariwar Admin sees the workers awaiting approval and approves; an admin finds a worker and shows their code. Names and mobiles are decrypted only for these screens, and each decrypt is audited. ... 13.1a's screen MUST mint one key per submission (never per form-open) and show the returned `field_worker_id`." | epic text - binding |
| same, "The keys this story mints" | "The approval key and the audited by-hand code-read key, each built with its route ... Every new field-worker permission key this story mints is a `-059` B(3) field-worker permission: per `-441` (\"ratified when their feature sets ship\" still applies to every other field-worker permission) it goes to the Panel with this work - built on the default as a non-blocking confirm, ratified before go-live (a roster leg)." | epic text - binding; AD6 mints a THIRD key (the reads) |
| `epics.md` INHERITED FROM 13.1, D1 | "`listFieldWorkersForPariwar` ... is capped at 200 ... with a default page of 50 and NO offset or cursor ... its `ORDER BY created_at DESC, field_worker_id DESC` is not served by `field_workers_pariwar_state_idx` ... This story's \"workers awaiting approval\" screen is the first consumer: add keyset paging (on `created_at, field_worker_id`) and the matching index WITH the first screen that lists workers." (the same block adds, in its own words, that raising the cap instead is not allowed: the cap is 13.1's forced-pagination guard, AC10, not a tuning knob) | binding (AD10) |
| Decision `2026-11-03-443` (Trustee-ratified) - Q4 A | "The District Admin registers; the Pariwar Admin approves; if the District Admin is not available, the Pariwar Admin does both (the system can detect only that no District Admin holds the district). A worker is creditable only after a second officer approves. ⚠ Cost as put, accepted: two steps; when the Pariwar Admin does both there is no second pair of eyes, and the system does not stop the same person registering and approving." | RULED - WHO approves |
| same - Q3 A | "Both can always act, and the log records which authorisation allowed each act: a Pariwar Admin can add or manage a field worker at any time; the full log keeps, for each act, a snapshot of the authorisation the system checked ... taken from the check itself, so a fill-in by a Pariwar Admin is visible afterwards. ⚠ Cost as put, accepted: nothing stops a Pariwar Admin acting when the District Admin is perfectly able; it is visible afterwards, not prevented." | RULED - the fill-in is not enforced |
| same - "What this ruling does NOT cover" | "The permission KEYS for opening, answering, moving and approving. ... Each key still comes with the work that builds it (`-059` amendment B (3), \"ratified when their feature sets ship\", as `-441` applies it); that work cites this entry for WHO holds the key. Whether this entry satisfies B (3) for those keys is NOT recorded as made - as `-441` left it." and "whether the approval records identity confirmed and activated together (Story 13.1a) - each that story's create-story decision." | binding - why AD6 is a non-blocking confirm, not a claim |
| Decision `2026-11-03-441` (Trustee-ratified) | the Panel's "Keep the full log of field worker." (quoted only that sentence: the entry's longer relay is the Panel's wording as typed and is not re-pasted here) | RULED - the log of every act is kept (I9) |
| Decision `2026-06-21-059` amendment B (3) (Trustee-ratified) | "Future permission additions for Finance Officer, Media/Comms, Field Worker, and Helpline Operator are to be ratified when their feature sets ship." | ratified - AD6 builds on the default and confirms before go-live |
| Decision `2026-09-08-210` cl.2 | NOT delegated: anything touching `PERMISSION_CATALOG_VERSION`, a role, or a permission key | ratified - a key is never a silent mint (AD6 records it by author-commit) |
| 13.1 QE21 (ANSWER), recorded in `2026-11-03-442` | "the District Admin REGISTERS and the Pariwar Admin APPROVES; if the District Admin is not available the Pariwar Admin does both. So activation is a separate sign-off by a different officer ... `pending_kyc` now means \"registered, awaiting the Pariwar Admin's approval\". Left to Story 13.1a's create-story ...: whether the APPROVAL records `kyc_completed` AND `activated` in ONE transaction (B2 - the approver confirms the interview's identity check and activates) rather than the registrar attesting identity (B1)." | author-commit - AD2 |
| 13.1 QE22, recorded in `2026-11-03-442` | "WITHHOLD the code from the 201 ... 13.1a's audited read is the ONLY way an admin sees the code, and it refuses a worker who is not yet active." | author-commit + BigDev's approval ("Approve QE22 - yes") |
| 13.1 QE18, as recorded in `2026-11-03-442` (amended by `-444` and `-445`) | `-442`: "the authorization that passed is written to the log as a VERIFIED SNAPSHOT (`permission_key`, `role`, `grant`, `target`, `catalog_version`), produced by the RBAC check itself and never recomputed by a handler". The Story 13.1 FILE's QE18 adds the sequencing (the story's own text, not the decision entry's): "`posted` carries it from day one (QE17); the other five events when their routes are built (C5)." | author-commit + story text - AD3 is "when their routes are built" for `kyc_completed` and `activated` |
| Roster Row 48 (`field-worker-registration-live`), legs (h) and (i) | (h) "a PRODUCTION PATH TO `activated` exists: owner row `13-1a-field-worker-approval-and-code-hand-over`" - (i) "the Panel's confirm of each field-worker permission key rows `13-1a` / `13-1c` / `13-1d` mint ..., each added here by its own story." | open - Task 0.4 |
| PRD FR-81 / FR-85 | FR-81: "Code generated on admin 'Add Field Worker.' Unique per Pariwar." - FR-85: "Field worker can be deactivated; existing attributions preserved; new attributions on deactivated code rejected." | PRD |
| 13.2's door (`attribution-code-access.ts`, header) | its guarantee is Pariwar CONTEXT, and authorization is not one of them: "Each calling route owns it." It also enforces no worker STATE (read from the code, G4) | built - G4 |

### 0 - whose decision is this (`trustee-panel-routing-note-TEMPLATE.md` section 0, per edge)

| # | Edge - stripped of citations | Verdict |
|---|---|---|
| 1 | Whether the approval records "identity confirmed" and "activated" in one transaction, or as two acts | **Yours** (AD2) - which events are written and when. The WHO is the Panel's and RULED (`-443` Q4 A); the Panel left this half to this story's create-story. |
| 2 | The names of the routes, the screens and the files | **Yours.** |
| 3 | Who holds the approval key | **The Panel's - RULED** (`-443` Q4 A: the Pariwar Admin approves). Only the key's NAME and the `-059` B(3) confirm remain, and that is a non-blocking confirm (AD6, Task 0.5). |
| 4 | *"May a District Admin and a Pariwar Admin read out a worker's code and see the names and phone numbers of the workers in their area?"* | **Possibly the Panel's - non-blocking.** It is what the Trust DISCLOSES about a person, and to whom - but to the very officers who may register and approve them (`-441`, `-443`), who already typed the data. Built on the default; the Panel confirms the keys before go-live (AD6, Row 48 (i)). A different answer changes a grant, not the build. |
| 5 | Decrypting the name in a list and the mobile in a detail, with an audit line each | **Yours, cost recorded** (AD9) - a design of an existing disclosure to existing officers; the footing for the data itself is Row 48 (b) / (g), unchanged. |
| 6 | Which workers an admin may see (their own district; the whole Pariwar for a Pariwar Admin) | **Yours** - it follows `-441` / `-443` (the District Admin is the intended manager; the Pariwar Admin fills in). |
| 7 | The code is readable only while `active` | **Yours, cost recorded** (AD8; Policy meaning (b)). |
| 8 | Keyset paging, indexes, the district-options read | **Yours.** |
| 9 | The 8-year removal, termination, the SMS | **Not this story's** - C5 (13.1c), 13.1b. |

## Names at a glance

| Thing | Name |
|---|---|
| Domain folder (EXTENDED, not new) | `packages/domain/src/field-worker/` - edits to `commands.ts`, `events.ts`, `read.ts`, `errors.ts`, `index.ts` |
| Commands that GAIN a required `authorization` (AD3) | `recordFieldWorkerKycCompleted`, `activateFieldWorker` (`FieldWorkerCommandBase & { authorization: VerifiedAuthorization }`) |
| Permission key the two commands accept | `FIELD_WORKER_APPROVE_PERMISSION_KEY = 'field_worker.approve'` (beside `FIELD_WORKER_REGISTER_PERMISSION_KEY`) - the ONLY key either command accepts |
| New domain reads (AD7, AD10) | `pageFieldWorkersForPariwar(db, pariwarId, { state, district?, after?, limit? })` -> `{ items: FieldWorkerListRow[]; nextCursor: string \| null }` (`FieldWorkerListRow = { view: FieldWorkerView; nameCiphertext: string }`); `getFieldWorkerSealedIdentity(db, pariwarId, id)` -> `{ view, nameCiphertext, mobileCiphertext } \| null`; `listRecordedDistricts(db, pariwarId, at)` -> `{ districts: string[]; truncated: boolean }` (shares `assertDistrictRecorded`'s two sources); `encodeFieldWorkerCursor` / `decodeFieldWorkerCursor`; `FieldWorkerCursorInvalidError` |
| The PII-free views | `getFieldWorker`, `listFieldWorkersForPariwar` and `FieldWorkerView` stay EXACTLY as they are (13.1's read.spec pins their array return and the 50 / 200 behaviour) |
| API folder | `apps/api/src/modules/field-worker/` - NEW: `approval-handlers.ts`, `read-handlers.ts`, `gate.ts` (the pre-gate loader and the list gate), `write-support.ts` (the keyed-write helpers extracted from `handlers.ts`, behaviour unchanged); EDITED: `handlers.ts` (the helpers move out), `routes.ts`, `errors.ts`, `field-worker-crypto.ts` (gains decrypt), `index.ts`. `attribution-code-access.ts` is NOT edited (its eleven-name export list is pinned) |
| Routes (AD5) | `GET /api/v1/p/:pariwarId/field-workers/districts` - `GET /api/v1/p/:pariwarId/field-workers` (list) - `GET /api/v1/p/:pariwarId/field-workers/:fieldWorkerId` (identity) - `POST /api/v1/p/:pariwarId/field-workers/:fieldWorkerId/approve` - `GET /api/v1/p/:pariwarId/field-workers/:fieldWorkerId/code`. 13.1's `POST /api/v1/p/:pariwarId/field-workers` is unchanged. |
| Permission keys (AD6) | `field_worker.approve` (`pariwar_admin`) - `field_worker.read_code` (`district_admin`, `pariwar_admin`) - `field_worker.view` (`district_admin`, `pariwar_admin`); all `district`-dimension (the list also gates at `pariwar` when no district is given, AD4); `super_admin` derived; catalog 59 -> 60, keys 78 -> 81, ONE bump |
| Audit actions (AD7) | `field_worker.kyc_completed` and `field_worker.activated` (the approval's two intent lines; each with its `_rolled_back` twin) - `field_worker.code_read` - `field_worker.list_viewed` - `field_worker.identity_viewed`. Locator `field_worker/<field_worker_id>` (`withCompensatingAudit` takes free text; ONLY `emitAuthAudit` needs the `field_worker:<uuid>` shape - TR8). |
| Request stash | `request.fieldWorkerGateDistrict?: string \| null` (declared in `apps/api/src/types.ts`, beside `nomineeNameCheckDistrict`) |
| New error codes (all PII-free) | ⚠ (500 also covers a key-service code 3: `-449`.) 409 `field_worker.code_not_available` (the worker is not `active`; carries `current_state`) - 400 `field_worker.cursor_invalid` - 503 `field_worker.decrypt_unavailable` (a KMS fault: never a null name) - 500 `field_worker.identity_unreadable` (an unparseable stored envelope: retry never helps). The approval inherits 13.1's mapper rows unchanged: 409 `illegal_transition`, `kyc_already_completed`, `kyc_not_completed`, `authorization_stale`, `stream_conflict`; 404 `not_found`; 409 `idempotency_in_progress`; 400 `idempotency_key_required` |
| Contract DTOs (`packages/contracts/src/field-workers/dto.ts`) | `ApproveFieldWorkerRequest` (`{}` strict) - `ApproveFieldWorkerResponse` (`{ field_worker_id, district, current_state, kyc_status }`) - `FieldWorkerCodeResponse` (`{ field_worker_id, code }` - the key is `code`; `attributionCode` is fenced) - `FieldWorkerListQuery` - `FieldWorkerListItem` - `FieldWorkerListResponse` (`{ items, next_cursor }`) - `FieldWorkerIdentityResponse` - `FieldWorkerDistrictsResponse` (`{ districts, districts_truncated }`) |
| Migration | `packages/domain/migrations/NNNN_field-workers-list-index.sql` (NNNN >= `0201`, re-grep) - the keyset index (AD10) |
| Admin module | `apps/admin/src/modules/field-workers/` (NOT `field-worker-dispatch/` - AD11) |
| Admin pages / routes | `RegisterFieldWorkerPage` at `/p/$pariwarId/field-workers/register` - `ApprovalsPage` at `/p/$pariwarId/field-workers/approvals` - `FindWorkerPage` at `/p/$pariwarId/field-workers` ; glue files `src/routes/FieldWorker{Register,Approvals,Find}Route.tsx`; one nav link in `RootLayout`'s `TopBar` |
| Admin api / hooks | functions in `apps/admin/src/api/client.ts`, hooks in `apps/admin/src/api/hooks.ts` (there are no per-module api files); copy in `modules/field-workers/i18n-en.ts` (English only - the admin console is English-only) |

## FOUND FACTS (G) - traced at `06bab925`, 2026-11-04

- **G1 - What 13.1 built that this story attaches to.** `packages/domain/src/field-worker/{commands,errors,events,index,project,read,state}.ts`;
  table `field_workers` (migration `0200`; name, mobile and a Tier-2 mobile index as ciphertext / hash columns); seven `field_worker.*`
  events; ONE route, `POST /api/v1/p/:pariwarId/field-workers`, in `apps/api/src/modules/field-worker/{routes,handlers,errors,
  field-worker-crypto,index}.ts` beside 13.2's door `attribution-code-access.ts`. The registration allocates the worker's code in
  the SAME transaction (`registerFieldWorker`, then `allocateAttributionCodeForRequest`), so an approved worker's code row always
  exists; the 201 carries `{ field_worker_id, district, current_state, kyc_status }` and no code (13.1 QE22).
- **G2 - HEADLINE: the two commands this story must call cannot record the authorization.** `recordFieldWorkerKycCompleted` and
  `activateFieldWorker` take only `FieldWorkerCommandBase` (`pariwarId, fieldWorkerId, auditId, actor, actorId`) and their payload
  schemas (`FieldWorkerKycCompletedPayloadSchema`, `FieldWorkerActivatedPayloadSchema` in `events.ts`) are `.strict()` over
  `{ from_state, to_state, trigger, actor }`. Only `registerFieldWorker` and `postFieldWorker` run `verifiedSnapshot(...)`. So the epic's
  "the log records who approved and the authorization snapshot (13.1 QE18)" is NOT met by 13.1 as built - 13.1 QE18 said "the other
  five events [carry it] when their routes are built". `packages/events/src/registry.ts` says the same of both entries: "No
  production emitter in 13.1; the emitting surface is Story 13.1a (unverified until built)". Traced by the domain pass AND by the
  author's re-read of `commands.ts`. Who approved is, today, only `events_log.actor_id`, the payload's actor KIND and the row's
  `audit_id` (the LAST transition's audit line).
- **G3 - Two lifecycle events in ONE transaction are legal, tested and have a precedent.** Each command takes the caller's
  `pg.PoolClient`, runs its own SAVEPOINT, locks the row `FOR UPDATE`, appends at the locked head + 1 and UPDATEs; the second
  command re-locks on the same connection and sees the first's uncommitted write (`kyc_status = completed`, version + 1), so
  `field_workers_active_needs_kyc` holds. `events_log.occurred_at` is the transaction-START `now()`, so the pair carries EQUAL
  stamps; `getFieldWorkerStateAt` cuts a PREFIX by `event_version` with ties included, so the pair is both in or both out of any
  capture's view - the intermediate state is never observable as-of. `tests/integration/field-worker/read.spec.ts` (b) already
  commits `kyc_completed` + `activated` in one transaction; `apps/api/src/modules/vyawastha-shulk/handlers.ts` appends two
  `member.*` events in one scope transaction (the `member` and `claim` read headers say `occurred_at` "CAN tie"). A failed second
  command rolls back only ITS savepoint - the first survives unless the CALLER rolls the transaction back (TR4). A concurrent second
  approver waits on the row lock, then finds `active`: `kyc_completed` on `active` is `FieldWorkerIllegalTransitionError` (guard 2 runs before
  guard 3), not `KycAlreadyCompleted`. `auditId` is only the row's `audit_id` (uuid NOT NULL, no FK, not unique).
- **G4 - The door enforces Pariwar CONTEXT only.** `readAttributionCodeForRequest(request, scopeTx, { fieldWorkerId })` returns
  `{ code, allocatedAt } | null` from a plain SELECT on (pariwar_id, field_worker_id) after checking `scopeTx.pariwarId` equals the
  request's. It checks no worker state, no authorization and writes no audit line - so "no code before approval" is THIS story's
  check. Its export list is pinned to eleven names and the reach fence (`apps/api/tests/unit/attribution-code-reach-fence.test.ts`)
  forbids the identifiers `attributionCode`, `readAttributionCodeForFieldWorker`, the two table names and any `generate` key outside the
  door and its importers under `apps/api/src`.
- **G5 - Nothing decrypts a field worker, and the KMS audit line cannot say who.** `field-worker-crypto.ts` exports
  `encryptFieldWorkerField`, `fieldWorkerMobileIndex`, `sealFieldWorkerIdentity` and its header says "No function here decrypts"
  (grep over `apps/api/src/modules/field-worker`, `packages/domain/src/field-worker` for `decrypt` hits only comments). Each module
  keeps its own `*-crypto.ts`: copy the shape of `fraud-investigation-crypto.ts` /
  `member-moderation/moderation-crypto.ts` (`encryption.decryptTier1(parseEnvelope(s), { pariwarId, fieldClass }, enc.kms, enc.kekRef)` with `enc = deps.encryption` (`EncryptionDeps`),
  UTF-8; field class `FIELD_WORKER_FIELD_CLASS`). Every `decryptTier1` calls the KMS `decryptDek` and the KMS hook writes a system
  audit line with `actorId: null` (`kmsEventToAuditInput`) - it records THAT a field was decrypted, never BY WHOM. A route that
  decrypts for an admin therefore owes its own actor-naming line. Precedents: decrypt-ON-DEMAND, one row (`member-moderation`
  `GET .../rationale`, KMS fault -> 503, never a null field); a reveal read aloud (`claims.contact-call.handlers.ts` `readNumber`:
  fresh step-up, `Cache-Control: no-store`, one audit line per reveal, KMS fault -> 503); bounded bulk decrypt
  (`modules/kyc/bounded-decrypt.ts` `mapWithConcurrency`, `DIRECTORY_DECRYPT_CONCURRENCY = 8`).
- **G6 - The reads that exist.** `getFieldWorker`, `listFieldWorkersForPariwar` (filters: `state` ONLY; default 50, cap 200 via
  `clampLimit`; `ORDER BY created_at DESC, field_worker_id DESC`; no cursor, no district filter), `getFieldWorkerStateAt`,
  `findLiveFieldWorkerByMobileIndex`, `assertDistrictRecorded` (a district is LISTED if the geo tree in force has a `district`
  node with that value, else if a listed workplace district matches). `FieldWorkerView` omits the three PII columns. The table has
  FOUR indexes: `field_workers_pkey`, `field_workers_pariwar_worker_uq`, `field_workers_pariwar_mobile_live_uq`,
  `field_workers_pariwar_state_idx (pariwar_id, current_state)` - NONE serves the list's ordering (13.1's carried D1). Keyset
  precedents with the same ordering: `marketplace/read.ts` `pageModulesForPariwar` / `encodeModuleCursor` / `decodeModuleCursor`
  (strict base64url `{"c":...,"m":...}`, `createdAtExact` as TEXT because a JS `Date` keeps milliseconds, over-fetch limit + 1,
  strict decode BEFORE SQL because a failed cast aborts the transaction) - the best copy; also `member/known-people-campaigns.ts`
  and `claim/correction-queue-read.ts`.
- **G7 - The RBAC mechanics.** `PERMISSION_CATALOG_VERSION = 59` with 78 keys; a key's footprint is `rbac/permissions.ts` (the
  version-history comment, the bump, the entry in `SEED_PERMISSION_KEYS`), `rbac/roles.ts` (a `permissionKey(...)` const and the
  `defaultRoleBundles` entries - role-to-key mapping is CODE ONLY: no seed migration, no table), `packages/domain/tests/rbac/{permissions,roles}.test.ts`
  (the `toBe(59)` and `toHaveLength(78)` pins; `holdersOf(...)` assertions and a grant-matching describe). A multi-key mint is ONE
  bump (`6.19c`: "added SIX keys: 58 -> 64, ONE bump"; `13.1`: ONE key). `requirePermissionHook(deps, key, { dimension?,
  resolveDimension?, resolveValue? })`: `resolveValue` / `resolveDimension` are SYNCHRONOUS ("resolve from data an earlier preHandler
  already stashed; never query") and a `null` target fails CLOSED to 403 for EVERYONE, a Pariwar Admin included (`scopeContains`
  rejects an unresolved geo target before it looks at the grant). The result is stored on `request.authorizations[key]`; two
  source fences forbid a handler to call `authorize(` or to use `requirePermission`'s return value - a handler reads the stored
  object only. Per-worker precedents: `claims.nominee-name-check.routes.ts` `resolveNomineeNameCheckDistrict()` (a pre-gate
  loader stashes the resource's district; missing resource -> `null` -> 403, so the boundary never leaks existence) and the LIST
  precedent `resolveQueueScopeStash(key)` (the gate answers "does this actor hold the key anywhere", the read filters per row).
  The session exposes ONLY `nationalGrants` (G10): the admin client cannot see a district or Pariwar grant.
- **G8 - Audit.** `audit.withCompensatingAudit(servicePool, { auditIntent, mutate })` writes the intent line FIRST (its own
  transaction) and THROWS if that write fails - audit-before-release - and on a `mutate` failure writes `<action>_rolled_back` (status 500)
  and rethrows. `emitAuthAudit` is fire-and-forget (`void writeAuditEntry().catch`): a read can succeed with NO line written, which
  fails the epic's "every read writes one audit line". The AI-5-3 gate (`scripts/access-wrapper-invariants`) flags only a DIRECT
  `audit.writeAuditEntry(...)` call; `FIELD_WORKER_ROOTS` lists the two DIRECTORIES `apps/api/src/modules/field-worker` and
  `packages/domain/src/field-worker`, walked recursively - a new file there is scanned with no edit. `AuditEntryInput`: `action`
  matches `^[a-z0-9_]+(\.[a-z0-9_]+)+$`; `resourceLocator` <= 1024 chars; `requestPayloadHash` is a SHA-256 digest, never a payload.
- **G9 - Idempotency.** `idempotency.createKeyedStore` is keyed on the STRING only: a reused key with a different body replays
  the first recorded result (13.1 TR15). 13.1's `tenantWrite(request, namespace, prepare, run)` goes `releaseHookTx` ->
  `withIdempotency` -> `prepare` (no transaction) -> `openScopeTx` -> `run` -> `finally closeScopeTx(false)`; the key is
  `field_worker.register:${pariwarId}:${actorId}:${key}`, 24 h. A bodyless POST must send `'{}'` (Fastify answers 400 to an empty JSON body).
  An approval has NO body, so the key must carry the worker id (TR6).
- **G10 - The admin app (`apps/admin`).** Vite 7 + React 19 + TanStack Router (code-based, `src/router.tsx`) + TanStack Query v5 +
  react-hook-form/zod + Tailwind v4. A route is three edits: a `createRoute` in `router.tsx`, a glue file in `src/routes/` (`useSession()`,
  redirect to `/login` on `session.isError`, render the page `key={pariwarId}`), a `<Link>` in `RootLayout`'s `TopBar`. There is NO
  route-level permission gating and `GET /api/v1/auth/session` returns `{ userId, nationalGrants }` only (GLOBAL-scope grants): the
  page cannot tell a Pariwar Admin from a District Admin, so a screen shows its own "no access" line on a 403. No client copy of
  the permission catalog exists. Every API function lives in `src/api/client.ts` and every hook in `src/api/hooks.ts`; `apiFetch`
  parses with `@twt/contracts` Zod schemas and throws `ApiError(status, code, message, details)`. `apps/admin` cannot import
  `@twt/domain`. English-only copy in per-module `i18n-en.ts`. The `microcopy` gate scans `apps/admin/src/**/*.ts(x)`, comments
  included: `passbook`, `receipt`, `invoice` and `report` are banned without a per-file `allow:` entry, and colours are token
  classes, never hex. Tests are flat in `apps/admin/tests/*.test.tsx` (vitest + jsdom + RTL; `vi.mock` of `../src/api/client.js`
  keeping the real `ApiError`; no msw, no axe harness, no E2E). Precedents: `modules/marketplace` (form + list + detail; `attemptKey(ref,
  body)` in `hooks.ts` keys on `JSON.stringify(body)`: unchanged body keeps its key, an edited body mints a new one, nulled on
  success; "Load more" on `useInfiniteQuery` with focus moved to the first new row; 409 `*.idempotency_in_progress` -> "still being
  processed"), `correction-chase/ContactCallForm.tsx` (a value revealed to be read aloud: held in component state only, cleared on
  hide, save, deadline, `visibilitychange` and unmount), `claim-verification/NomineeNameCheckDisclosure.tsx` (an on-demand
  audited read: `enabled` only while open, `removeQueries` on close), `member-status/MemberSearchResults.tsx` (decrypted names in a list).
- **G11 - Contracts, OpenAPI and the gates a route meets.** DTOs live in `packages/contracts/src/field-workers/{enums,dto,index}.ts`;
  registration with the OpenAPI emitter is a manual `registry.registerPath` in `packages/contracts/scripts/emit-openapi.ts` plus
  the barrel line; `openapi/v1.yaml` must equal a fresh emit (`contracts:check-openapi-determinism`). `forced-pagination.spec.ts`
  walks the live route table and requires every GET whose 200 body is a top-level array or `{ items: [...] }` to declare a `limit`
  query param with a finite `maximum`. `login-wall.spec.ts` requires every non-allowlisted route to carry the `requireAdminSession`
  tag (automatic with that hook). Rate limits: `namedRateLimits(deps).read / write / search`; 13.1's route sets none.
- **G12 - Contention at the pin.** `PERMISSION_CATALOG_VERSION` 59 on `origin/main`; the open worktrees `story/14-3-...` (2 commits
  ahead), `story/6-22b-...` (5) and `story/6-39-...` (3) change neither `rbac/permissions.ts` nor a migration, nor `apps/admin`'s router
  at their committed state (`git diff --name-only origin/main...<branch>` filtered to those paths: empty) - but their story files
  plan a `<CAT>` bump and migrations, so numbering is decided at merge. The ledger's newest letter on every ref is `2026-11-04g`.
- **G13 - No rival story.** `grep -rli "field_worker.approve\|activateFieldWorker\|readAttributionCodeForRequest"` over
  `_bmad-output/implementation-artifacts` and `planning-artifacts` hits only `deferred-work.md`, `13-1-...md`, `13-2-...md`, `epics.md`
  and the 13.1 Panel note. `grep -rln 'readAttributionCodeForRequest\|activateFieldWorker\|recordFieldWorkerKycCompleted' apps packages scripts`
  (`--include='*.ts' --include='*.tsx'`) names only: the door and its two tests (`attribution-code-access.spec.ts`,
  `attribution-code-reach-fence.test.ts`), `packages/domain/src/field-worker/commands.ts`, four domain test files
  (`commands-guards.test.ts`, `integration/field-worker/{commands,read,stream-concurrency}.spec.ts`) and
  `scripts/field-worker-state-invariant/lib.ts` (the gate's list of command names - Task 1 re-runs the gate after the signature
  change). Nothing else in the repo approves a field worker or reads a worker's code.
- **G14 - Text that goes stale when this story lands (comments and labels only - update them in the same commit).** Files whose
  text names Story 13.1a as the future owner (`grep -rn "13.1a"` over `apps packages scripts`): `apps/api/src/modules/field-worker/{errors,index,routes,handlers}.ts`,
  `apps/api/tests/unit/field-worker-errors.test.ts` ("no route yet - 13.1a / 13.1c / 13.1d" - the approval rows now HAVE a route),
  `packages/contracts/{scripts/emit-openapi.ts,src/field-workers/index.ts,src/field-workers/dto.ts}`,
  `packages/events/src/registry.ts` (the `kyc_completed` and `activated` descriptions: "No production emitter in 13.1" - and the
  "an owner named here is an ASSERTION NOTHING VERIFIES" block above the entries), `packages/domain/src/index.ts`, `packages/domain/src/field-worker/events.ts` (the owner comments on the `kyc_completed` and `activated` schemas), `packages/domain/src/rbac/permissions.ts`
  (the `field_worker.register` comment names 13.1a as the owner of approval and code read), and `packages/domain/src/field-worker/read.ts`'s header ("decrypt-on-read is Story 13.3's / 13.4's decision" - no longer
  true for the lists and the identity read; the `13.1a` grep does NOT find this one). Re-run the grep at
  Task 10; it is the only way to find them (footgun: a sibling leaves routing notes in doc-blocks that no `_bmad-output` diff shows).

## Build decisions AD1-AD14 - the author's recommendations; Q-1..Q-5 (AD2, AD6, AD8, AD9, AD13) ANSWERED by BigDev 2026-11-04, the rest recorded on his instruction in decision `-446`

**Status - read before relying on any of it.** BigDev answered Q-1..Q-5 on 2026-11-04 and took every recommendation (Change Log v1.1), so
AD1-AD14 stand as written. Only those five asks were put to him one by one (Q-1 = AD2, Q-2 = AD6, Q-3 and Q-4 = AD9 / AD13, Q-5 = AD8); the other
nine are the author's, recorded on his instruction in decision `2026-11-04-446` (Task 0.3, committed alone). The dev agent writes NO code before
that entry is committed. The Panel ruled WHO
approves (`-443` Q4 A) and left to this story: whether the approval records identity and activation together, the keys' names, and
how the reads are built. Each AD below states the choice, the alternatives rejected, and an HONEST cost.

- **AD1 - Scope. (A) one story, as BigDev minted it: the approval, the code read, the reads the screens need, the three screens.**
  (B) split into an API story and a screens story - cost: the critical path to go-live then needs two merges and a half-story
  that nobody can use; (C) drop the reads and let the screens ride 13.1's PII-free list - cost: a screen with no names cannot be
  approved honestly and the epic's "names and mobiles are decrypted only for these screens" is unmet. Recommended: (A). **Built:**
  the approval route; the code route; the list, identity and districts reads; the domain additions (AD3, AD10); the three keys (AD6);
  the screens. **NOT built** (each with its home, AD14): SMS, move / suspend / reactivate / terminate / the log's read, a worker
  login, search by mobile or name, a step-up, a role-aware UI.
- **AD2 - The approval is ONE act on ONE route that records `kyc_completed` AND `activated` in ONE transaction (13.1 QE21 option B2).**
  The approver confirms the interview's identity check and activates the worker. Options: (B1) the REGISTRAR attests identity -
  rejected: the Panel wants a SECOND officer's sign-off (`-443` Q4 A) and B1 has the first officer attest it, and it changes 13.1's
  registration, which QE21 left as built; (B3) two acts / two routes (confirm identity, then activate) - rejected: a worker left
  half-approved (`pending_kyc`, `kyc_status = completed`) has no screen and no route to finish it, and nothing in the system
  reaches that state today. Cost, recorded: `kyc_status = completed` then means *"the approving officer accepts the identity check
  done at the interview"*, not *"the approver ran one"* (13.1 QE8: an operator-recorded attestation only; no document, PAN or bank
  detail is captured). The registrar may approve their own registration when they hold both keys (Q4 A: not enforced; I9 keeps
  both acts in the log).
- **AD3 - `recordFieldWorkerKycCompleted` and `activateFieldWorker` gain a REQUIRED `authorization` (13.1 QE18: "the other five events
  when their routes are built").** Each payload schema gains a required `authorization` (the SAME `FieldWorkerAuthorizationSnapshot` the genesis and
  `posted` events carry); each command runs `verifiedSnapshot` at guard (0) with `expected.permissionKey = 'field_worker.approve'` (pure, before the
  lock: a verified result, this Pariwar, this actor, checked at `district`) and, UNDER the lock after the legality and KYC guards, refuses an authorization whose
  `target.value` is not the LOCKED row's `district` with `FieldWorkerAuthorizationStaleError` (the gate ran on a district read BEFORE the lock; a
  concurrent move would otherwise write a false target into an append-only log). ONE `VerifiedAuthorization` object is passed to both
  commands. The `registry.ts` descriptions and the "owner named here is an assertion" block are updated (G14); every 13.1 test that
  calls the two commands gets an approval authorization from the two fixture files already exempt from the `authorize` fence
  (`apps/api/tests/integration/_field-worker-fixture.ts`, `packages/domain/tests/integration/field-worker/_fixtures.ts` - by exact
  path). Cost: a domain signature change and a test sweep (13.1's `commands-guards`, `events`, `commands.spec`, `read.spec`,
  `stream-concurrency.spec`); a stream written before this change would fail a strict re-parse - nothing is live, tests only.
  Rejected: recording the role only in the audit line's `actorRole` - it is a handler's assertion, which 13.1 QE18's first
  condition forbids.
- **AD4 - How each route's gate gets its target (G7).** (a) The three PER-WORKER routes (identity, approve, code) run `requireAdminSession`
  -> `scopeResolutionHook` -> `loadFieldWorkerGateDistrict` -> `requirePermissionHook(key, { dimension: 'district', resolveValue })`.
  The loader reads `getFieldWorker` on `request.scopeTx` and stashes the worker's CURRENT district on `request.fieldWorkerGateDistrict`;
  a missing worker or another Pariwar's (RLS hides it) stashes `null`, which fails closed to 403 for everyone - no existence oracle
  (the `resolveNomineeNameCheckDistrict` precedent). (b) The LIST gates at `district` against the query's `district` verbatim when one
  is given and at `pariwar` against the Pariwar when it is not (the value must be exactly `request.scopeTx.pariwarId`; the resolved-locator check rejects anything else) (`resolveDimension` / `resolveValue` over the already-validated
  query): a District Admin must name a district they hold; only a Pariwar Admin can list across districts. Rejected: the
  `resolveQueueScopeStash` precedent (filter each row after the fetch) - it breaks a keyset page (a page of 25 may hold 3 visible
  rows) and it cannot tell a District Admin with two districts which one the screen means. (c) The districts read carries NO key
  (session + scope only): it returns the Pariwar's recorded district names, which are not personal data, and each action is
  gated by its own route. Cost of (a): one extra read per request; a worker moved between the loader and the command is caught
  by AD3's stale check (409 `field_worker.authorization_stale`; no route moves a worker until 13.1c, so it is not reachable yet).
- **AD5 - The routes** (the only place their shapes are written):

  | Route | Key | Success | Refusals |
  |---|---|---|---|
  | `GET .../field-workers/districts` | none | 200 `{ districts: string[], districts_truncated: boolean }`, sorted (UTF-16 code-unit order), exact recorded values | 401, 404 (no grant in this Pariwar) |
  | `GET .../field-workers?state=&district=&cursor=&limit=` | `field_worker.view` (AD4 b) | 200 `{ items: [{ field_worker_id, name, district, current_state, kyc_status, registered_by_display, created_at }], next_cursor }`; `limit` default 20, max 25; `Cache-Control: no-store` | 400 `request.validation` (a bad `state`, `limit`), 400 `field_worker.cursor_invalid`, 403, 503 `field_worker.decrypt_unavailable` |
  | `GET .../field-workers/:fieldWorkerId` | `field_worker.view` (AD4 a) | 200 the list item plus `mobile` (the full normalised number), `no-store` | 403 (unknown, other Pariwar, or outside the grant), 503 |
  | `POST .../field-workers/:fieldWorkerId/approve` | `field_worker.approve` | 200 `{ field_worker_id, district, current_state: 'active', kyc_status: 'completed' }` (from the second command's RETURN value, 13.1 RB1) | 400 `field_worker.idempotency_key_required`, 403, 409 `field_worker.idempotency_in_progress`, 409 `field_worker.illegal_transition` (not awaiting approval, or a concurrent approval won), 409 `field_worker.authorization_stale`, 404 `field_worker.not_found` (lost race only) |
  | `GET .../field-workers/:fieldWorkerId/code` | `field_worker.read_code` | 200 `{ field_worker_id, code }`, `no-store` | 403, 409 `field_worker.code_not_available` (the worker is not `active`; body names `current_state`), 503 |

  Params: `fieldWorkerId` is a UUID (`z.string().uuid()`, as `PariwarParam`). `/districts` is a static segment and beats the param in
  find-my-way (TR14). The list and identity GETs (each decrypt is a KMS call) and the code GET (each call writes an audit line) carry `namedRateLimits(deps).read`. The approval takes
  the body `{}` (`.strict()`) because a bodyless POST is a 400 in Fastify.
- **AD6 - THREE permission keys, minted by author-commit, ONE catalog bump (59 -> 60, keys 78 -> 81).** `field_worker.approve` -
  `district`-dimension, held by `pariwar_admin` ONLY (+ derived `super_admin`): the Panel's Q4 A. `field_worker.read_code` and
  `field_worker.view` - `district`-dimension, held by `district_admin` (its own district) and `pariwar_admin` (any) (+ `super_admin`): the
  Panel's primary manager and fill-in (`-441`, `-443` Q3 A) and the epic's "A District Admin (own district) or a Pariwar Admin reads".
  NOT `state_trustee` (refused because its bundle lacks them), `trustee_panel`, `helpline_operator`, nor the `field_worker` role
  (`permissions: []`; its own-read key is 13.3's). The epic names two keys; the THIRD, `field_worker.view`, exists because the reads
  need a gate and every alternative fails: gating on `field_worker.register` conflates adding with seeing; on `field_worker.read_code`
  conflates seeing people with seeing codes (and a later view-only role could not be granted); on `field_worker.approve` locks
  the District Admin out of their own workers. REUSE CHECK (listed 2026-11-04): no existing key fits - `field_worker.register` adds a
  worker; `member.*` act on members; `module.manage`, `workplace.manage`, `known_people.run_campaign`, `pariwar.provision` are unrelated.
  `-210` cl.2 forbids a silent mint, so the keys are RECORDED by author-commit (the `-433` QE2 / `-421` QE6 / `-442` QE10 precedent). Each is a
  `-059` B(3) field-worker permission: built on the default, NON-BLOCKING Panel confirm drafted at Task 0.5, ratified before go-live
  (Row 48 leg (i)). Cost: if the Panel meant B(3) literally, three keys were minted ahead of their ratification (merge is not go-live; a different
  answer changes a grant, not the build). The footprint is G7's file list; the two role bundles are code only.
- **AD7 - Audit: nothing is released before a durable, actor-naming line exists.** The approval nests two `audit.withCompensatingAudit`
  calls: the OUTER writes `field_worker.kyc_completed` (intent) and its `mutate` runs `recordFieldWorkerKycCompleted` (with that intent's id)
  on the `tenantWrite` scope transaction and THEN opens the INNER wrapper, which writes `field_worker.activated` (intent) and whose
  `mutate` runs `activateFieldWorker` (with the inner intent's id) and COMMITS. A first-command failure therefore writes only the kyc twin
  (`_rolled_back`) - never a line for an act that was not attempted; a second-command failure writes both twins and the whole
  transaction rolls back (AC3). Before the wrapper, `run` reads the worker on the same transaction and refuses a worker that is not in
  `pending_kyc` with 409 `field_worker.illegal_transition` and NO audit line (AC2 a); only a race loser reaches the first command. One audit line per
  EVENT keeps 13.1 QE6's "audit action = the event-type string" and QE14's pairing. The three reads (`field_worker.code_read`,
  `field_worker.list_viewed`, `field_worker.identity_viewed`) each run their read-and-decrypt as the `mutate` of ONE
  `withCompensatingAudit`: the line is written first and a failed write releases nothing. Every intent carries `actorRole:
  authorization.role` where an authorization exists (the reads read it from `request.authorizations[key]`), a locator
  `field_worker/<field_worker_id>` (the list: `field_workers`) and a `requestPayloadHash` over `{ field_worker_id, district }` - or, for the list,
  `{ state, district: district ?? null, limit: <the effective limit>, cursor: cursor ?? null }` (never `undefined`: `canonicalJsonStringify`
  throws on it and 13.1's `payloadHash` would swallow that into ONE constant hash; the cursor is in so two pages of one filter differ;
  neither is personal data; `payloadHash` moves to `write-support.ts`) - NEVER a name, a mobile or a code (a SHA-256 of a 10-digit mobile can be brute-forced). A
  refusal made BEFORE the wrapper (a 403, a 409 `code_not_available`, a 422) writes no line (13.1's convention); only a failure
  INSIDE `mutate` writes the pair. Rejected: `emitAuthAudit` - it is fire-and-forget, so a read could succeed with no line, which fails the
  epic's "every read writes one audit line". Cost: the list writes ONE line per PAGE, not per worker - the KMS hook adds one
  system line per decrypted field (`actorId: null`), so "who looked at the page" and "which fields were opened" are two records. Accepted:
  the three reads keep the hook's read transaction open across the intent-line write (with `servicePool === pool` in dev / CI that is the same
  hold-and-wait as 13.1's registration residual, its D3).
- **AD8 - The code is readable only while the worker is `active`.** The handler checks `getFieldWorker(...).currentState` (the door
  checks nothing, G4) and answers 409 `field_worker.code_not_available` for `pending_kyc` (not yet approved), `suspended` and
  `terminated`, with no audit line and no read. Cost, recorded in the Policy meaning: a suspended worker cannot be given their code
  by hand until reinstated - harmless, since a suspended worker is not credited whatever code they quote (13.1 Q-5 A). Alternative
  rejected: "approved" = `kyc_status = completed` (would also read to a suspended or terminated worker, giving a terminated person
  a live-looking code).
- **AD9 - Decrypt on read: names in the list, the full mobile only in the opened worker.** ⚠ (A key-service rejection of an envelope is a third 500 case: AMENDED 2026-11-06 by decision `-449`, review CR37.) The list decrypts `name` for at most 25
  rows with bounded concurrency (`mapWithConcurrency`, 8); the identity read decrypts `name` and `mobile`; the list NEVER carries a
  mobile. In both decrypting routes (the code route decrypts nothing): read the ciphertext, RELEASE the hook's transaction (`releaseHookTx`), THEN decrypt - a KMS round trip
  inside an open tenant transaction holds a pooled connection (the `moderation-crypto` placement note). A KMS fault fails the WHOLE
  response with 503 `field_worker.decrypt_unavailable` (retry helps), and an UNPARSEABLE envelope fails it with 500 `field_worker.identity_unreadable` (retry never helps: the message says the
  worker's stored details cannot be read, do not approve, tell the maintainer - one corrupt row therefore blocks the pages that include it, which is an integrity incident and meant to be loud): NEVER a blank or null name (a blank name on an approval screen is how the
  wrong person is approved). Responses are `Cache-Control: no-store`. No step-up (Q-4). Alternative (Q-3): the list carries no
  name and an admin opens each worker - cost: the finder for an `active` worker has no names, so an admin opens workers one at a
  time to find "Ramesh". Cost of the default: up to 25 KMS calls and 25 system audit lines per page view (the audit chain
  serialises on one global advisory lock - a few milliseconds each), and a district's worker names on an officer's screen. The footing
  for holding the data is unchanged (Row 48 (b), (g)).
- **AD10 - Keyset paging and the index (13.1's carried D1).** ⚠ AMENDED 2026-11-05 by decision `-448` item 1 (review CR35): the index is `field_workers_pariwar_created_idx (pariwar_id, created_at DESC, field_worker_id DESC)` — `current_state` and `district` are FILTERS, because beneath row-level security an enum comparison cannot be an index condition; the original text below is kept as put. `pageFieldWorkersForPariwar` follows `marketplace/read.ts`
  `pageModulesForPariwar`: `ORDER BY created_at DESC, field_worker_id DESC`, the cursor is strict base64url of `{ c: <created_at as exact
  TEXT>, w: <field_worker_id> }` decoded and validated in JS BEFORE any SQL (`FieldWorkerCursorInvalidError`), over-fetch limit + 1, `state`
  REQUIRED, `district` optional (an equality predicate), limit through `clampLimit` (default 20, ceiling 25 - a bulk-PII guard,
  ⚠ not a tuning knob, like 13.1's 200). `listFieldWorkersForPariwar` is NOT changed (its spec pins the array return). The migration adds
  `field_workers_pariwar_state_created_idx (pariwar_id, current_state, created_at DESC, field_worker_id DESC)` and DROPS
  `field_workers_pariwar_state_idx` (a strict prefix; the only places that name it are migration `0200` - never edited - the drizzle definition and
  `packages/domain/tests/integration/rls/field-workers-policy-regression.spec.ts`, which Task 2.3 updates). Proof: `EXPLAIN` on a seeded table (>= 2,000
  rows over >= 8 Pariwars and all four states, then `ANALYZE`) shows an index scan on the new index and NO `Sort` node
  ([[project_explain_index_cond_single_element_trap]]). Cost: `district` is a filter on the index range, not an index column - fine
  for the hundreds of workers a Pariwar holds; add it to the index if a Pariwar outgrows that. A 4th copy of the strict cursor code
  exists after this (marketplace, known-people, claim, field-worker): extraction is BigDev's to schedule (C4), not this story's.
- **AD11 - The admin module is `apps/admin/src/modules/field-workers/`, three pages, one nav link, NO role gating in the client.**
  The architecture reserves `field-worker-dispatch/` for the dispatch surface (13.3, ARCH §4.1: "Scope deferred"); this registry
  console is not dispatch. The session carries no district grants (G10), so the nav link is ungated inside a Pariwar and each page
  renders its own "no access" line on a 403 (the repo's pattern); the district `<select>` offers every recorded district and the
  server's 403 is the boundary. Cost: a District Admin sees districts they cannot act in (and gets a clear refusal); fixing it
  needs the session to expose district grants - an API change for every module, carried (C5).
- **AD12 - The register screen's idempotency key is per SUBMISSION ATTEMPT, never per form-open (13.1 TR15).** Use the
  marketplace `attemptKey(ref, body)` rule: the key is minted at SUBMIT, kept while the submitted body is byte-equal (a retry after a
  network error, a 5xx or a 409 `idempotency_in_progress` re-sends the SAME key), replaced when the body changes, and cleared on
  success; a synchronous in-flight ref stops a double click. After a 201 the screen shows the returned `field_worker_id`, the
  state "registered, awaiting a Pariwar Admin's approval" and "Register another" (which clears the form AND the key). The approve
  button mints a key PER CLICK (its body is empty), reused only to retry that same click (TR6).
- **AD13 - The code is shown, not kept.** ⚠ (Where "Show code" lives is AMENDED by `-448` item 2, review CR1.) "Show code" is an explicit click; each click is a fresh audited read (the query is
  fetched with no cache, `gcTime: 0`, and removed at once); the value is held in COMPONENT STATE ONLY and cleared on hide, on
  choosing another worker, on `visibilitychange`, on unmount and after 60 seconds; the digits are shown large with an accessible
  label that spells them one by one for reading aloud; the screen says it is for reading to the worker. No copy-to-clipboard (the
  clipboard outlives the screen). A 409 `code_not_available` shows copy by the worker's state ("not yet approved" / "suspended" /
  "ended").
- **AD14 - Not built, and where each goes.** An SMS and the "code not delivered" signal for the list - 13.1b (C1). Move / suspend /
  reactivate / terminate / the log's read, and the 8-year removal - 13.1c / 13.1d (C2). The worker's own login and "my code" - 13.3
  (C3). Search by mobile or name (the mobile blind index exists, the name has none) - C7. A step-up on the mobile reveal - C8.
  A role-aware client - C5. A notice to the worker that they are approved - 13.1b's SMS is that notice.

## Errors and their HTTP mapping - only the rows this story ADDS (13.1's mapper rows stand; the approval inherits them unchanged)

| Class / condition | When | HTTP + code |
|---|---|---|
| route: worker not `active` | the code route's pre-check (AD8) | 409 `field_worker.code_not_available` (no audit line) |
| `FieldWorkerCursorInvalidError` | a forged, malformed, truncated or wrong-shape `cursor` (decoded strictly BEFORE SQL) | 400 `field_worker.cursor_invalid` |
| route: an UNPARSEABLE envelope while decrypting | `decryptFieldWorkerField`'s safe variant - the whole response fails (AD9) | 500 `field_worker.identity_unreadable` (the message names no field and no id) |
| route: a KMS failure while decrypting ⚠ (except a code 3 rejection of the envelope: 500 `field_worker.identity_unreadable`, `-449`) | `decryptFieldWorkerField` (AD9) - the whole response fails | 503 `field_worker.decrypt_unavailable` (the message says it is a key-service problem, retry shortly; no field name, no id) |
| `FieldWorkerAuthorizationStaleError` | `kyc_completed` / `activated` whose authorization target is not the locked row's district (AD3) | 409 `field_worker.authorization_stale` (13.1's row; now reachable) |
| door `null` for an `active` worker | an integrity fault - registration allocates the code in the worker's own transaction | 500, rethrown unmapped; logs the error class only |

No message, in any row, carries a name, a mobile or a code. `apps/api/tests/unit/field-worker-errors.test.ts` gains the three new rows and
re-labels the approval rows ("no route yet" is no longer true for them).

## ASKs - BigDev's (or the Panel's), asked at Task 0.2

**ANSWERED by BigDev, 2026-11-04** - verbatim: "Q1 - Yes / Q2 - yes / Q3 - show decrypted name / Q4 - yes enough / Q5 - yes". Q-1 A, Q-2 A, Q-3 A, Q-4 A, Q-5 A: each is the option recommended below, so no AD changes. Q-P1
(the Panel's non-blocking confirm) is still to be drafted at Task 0.5 and sent by BigDev. The questions are kept as asked (never deleted).

Each is the author's recommendation in plain words.

- **Q-1 - Does "approve" mean identity confirmed AND activated, in one step (AD2)?** *Deciding fact:* the Panel ruled the Pariwar
  Admin is the second officer who makes a worker creditable; the identity check itself happened at the interview. *Options:*
  (A) one step, the Pariwar Admin records both - recommended; the log shows who and under which grant. (B) the District Admin
  records "identity checked" when registering, the Pariwar Admin only activates - cost: changes the landed registration and gives the
  first officer a second attestation. (C) two separate steps for the Pariwar Admin - cost: a half-approved worker with no screen.
- **Q-2 - Are the three keys and their holders right (AD6)?** *Deciding fact:* the epic named two keys; a third (`field_worker.view`)
  is needed to let anyone see the list. *Options:* (A) `approve` = Pariwar Admin; `read_code` and `view` = District Admin (own
  district) + Pariwar Admin - recommended; (B) `view` and `read_code` for the Pariwar Admin only - cost: the Panel's intended
  manager, the District Admin, cannot see or help their own workers; (C) fold `view` into `read_code` - cost: AD6's conflation.
  Either way the Panel confirms the keys before go-live (non-blocking).
- **Q-3 - Names in the list, or only inside an opened worker (AD9)?** *Options:* (A) names in the list (<= 25 a page) and the full
  mobile only when a worker is opened - recommended (the approver recognises who they interviewed; the finder shows names);
  (B) no names in the list - cost: an admin opens workers one at a time.
- **Q-4 - Is a plain, audited read enough for the mobile and the code, with no step-up (AD9, AD13)?** *Options:* (A) no step-up -
  recommended: the officers already hold and typed the data; each read is audited and `no-store`; (B) a fresh step-up like the claim
  contact number's - cost: a second factor on a screen an admin uses a dozen times a day, and a new step-up context in contracts.
- **Q-5 - Is "the code is read only while the worker is `active`" right (AD8)?** *Options:* (A) active only - recommended;
  (B) also while suspended - cost: a suspended worker gets a code that credits nobody.
- **Q-P1 (the Panel's, NON-BLOCKING, drafted at Task 0.5, sent by BigDev):** a single confirm of the three keys (`-059` B(3)). The
  build does not wait for it; go-live does (Row 48 (i)).

## Invariants (I)

- **I1** - No code reaches anyone before the worker is `active`. No route, response, log line, audit field or error shows a code for a worker who is
  not `active`; 13.1's registration response still carries no code.
- **I2** - An approval is TWO events - `field_worker.kyc_completed` then `field_worker.activated` - appended in ONE transaction under ONE verified
  authorization, or NEITHER is recorded. There is no reachable half-approved worker.
- **I3** - The authorization on those two events is the RBAC check's own result for the key `field_worker.approve` (read from
  `request.authorizations['field_worker.approve']`), never a handler's assertion or a recomputation; neither command accepts any other key.
- **I4** - No name, mobile or code in plaintext appears in any event payload, audit field (action, locator, hash input), log line, error message,
  idempotency record, OpenAPI example or URL, and none is kept by the admin client beyond the screen that shows it.
- **I5** - No decrypt of a name or mobile, and no release of a code, happens before a durable audit line naming the acting admin exists. A failed
  audit write releases nothing.
- **I6** - Pariwar isolation holds; a District Admin sees and acts only in a district they hold; a per-worker route answers 403, never 404, for an
  unknown worker, another Pariwar's worker or a worker outside the caller's grant (no existence oracle).
- **I7** - Every list pages by an opaque cursor with a clamped limit that an index serves. There is no offset and no way to ask for "all".
- **I8** - `PERMISSION_CATALOG_VERSION` moves by exactly ONE (59 -> 60) and the key count by exactly THREE (78 -> 81); the holders are exactly AD6's;
  the `field_worker` role stays `permissions: []`; `defaultRoleBundles` stays at its current count (no new role).
- **I9** - The full log of a field worker is kept (the Panel, `-441`: "Keep the full log of field worker."). Approvals and reads only ADD
  `events_log` and audit rows; nothing is deleted, truncated or rewritten, including the `_rolled_back` lines.
- **I10** - The door file `attribution-code-access.ts` is not edited and its export list stays eleven names; the reach fence stays green; no
  file outside the door names the registry.
- **I11** - A district name is compared byte for byte wherever it gates or filters; it is never trimmed, case-folded or normalised on the way.
- **I12** - No member-facing behaviour changes: no member state, no `account-frozen` source, no `member_attribution` row, no payout field (13.1 I12).
- **I13** - 13.1's projection rules hold: only the projector writes the projected columns, `field-worker-state-invariant` stays green, and after
  an approval the row equals `foldFieldWorkerProjection(loadEvents(field_worker_id))` (13.1 I4).

## Acceptance Criteria

**AC1 - Approving (the happy path).** Given a worker in `pending_kyc` with `kyc_status = pending` in this Pariwar, and a Pariwar Admin holding a
`pariwar`-scope grant, when they `POST .../field-workers/:fieldWorkerId/approve` with the header `Idempotency-Key` and the body `{}`, then the
response is 200 `{ field_worker_id, district, current_state: 'active', kyc_status: 'completed' }` taken from the second command's return value;
the row is `active` / `completed`; `events_log` gains exactly TWO events for the stream - `field_worker.kyc_completed` at version n + 1 and
`field_worker.activated` at n + 2, written in ONE transaction (equal `occurred_at`, ordered by `event_version`); each payload carries the SAME
`authorization` snapshot `{ permission_key: 'field_worker.approve', role: 'pariwar_admin', grant: { dimension: 'pariwar', value, grant_id? }, target: { dimension: 'district', value: <the worker's district> }, catalog_version: 60 }`;
`events_log.actor_id` is the admin; two audit lines exist (`field_worker.kyc_completed`, `field_worker.activated`), each naming the admin and locator `field_worker/<id>` (`events_log` has no audit column, so
the line itself is the link; the row's `audit_id` is the SECOND line's - 13.1 QE14: the most recent transition's); and no name, mobile or code appears in any payload, audit
field, response or log.

**AC2 - Approving: who and what is refused.** (a) A worker not in `pending_kyc` (`active`, `suspended`, `terminated`) -> 409 `field_worker.illegal_transition`,
no event, no audit line from a refusal made before the wrapper. (b) An unknown id, another Pariwar's worker or an id of a worker the caller
cannot reach -> 403, identical for all three. (c) A District Admin (bundle lacks the key), a caller with no grant in this Pariwar (404
`pariwar.not_found`, from the scope hook), a missing session (401) -> refused. (d) A missing, empty or over-200-character `Idempotency-Key` -> 400
`field_worker.idempotency_key_required`. (e) The same key replayed (same worker) returns the first 200 and appends NOTHING; the same key while the first
is in flight -> 409 `field_worker.idempotency_in_progress`; the same key used for a DIFFERENT worker is NOT replayed (the worker id is in the key's namespace,
TR6). (f) A Pariwar Admin approving a worker they registered themselves SUCCEEDS (`-443` Q4 A) - both acts are in the log.

**AC3 - Approving: atomic, and safe under a race.** (a) If `activateFieldWorker` fails after `recordFieldWorkerKycCompleted` succeeded (a leg that
makes it fail), NEITHER event persists, the row is unchanged, and both intent lines have their `_rolled_back` twins. (b) Two concurrent approvals of the
same worker produce exactly ONE pair of events; the loser gets 409 `field_worker.illegal_transition`. (c) If the worker's district changes between the
gate and the command, the command refuses with `FieldWorkerAuthorizationStaleError` -> 409 `field_worker.authorization_stale` and writes nothing.

**AC4 - The two commands carry the authorization (AD3).** `recordFieldWorkerKycCompleted` and `activateFieldWorker` require `authorization`; each
refuses (`FieldWorkerProjectorInputError`, before any SQL) an object that is not a verified result of the RBAC check, one for another Pariwar or
actor, one not checked at `district`, one for any key but `field_worker.approve`; and, under the lock after the legality and KYC guards, one whose target
is not the locked row's `district`. The two payload schemas are `.strict()` and require `authorization`; the registry entries reuse the SAME schema objects;
`packages/events/tests/field-worker-registry-coverage.test.ts` is UPDATED, not left green by accident: its third test expects the two entries to say
`Emitted by the Story 13.1a approval route` (instead of `No production emitter in 13.1`), while its set-equality and schema-identity checks and the two
substrings its second test pins (`on the FIELD WORKER stream (stream_id = field_worker_id) (Story 13.1)` and `Human actor only (operator / trustee - QE7); NO PII (I8).`)
pass UNCHANGED - the rewritten descriptions keep both substrings. The guard order of 13.1's `commands-guards.test.ts` is extended and still pinned. Every test that
reaches these two payload schemas - through the commands OR directly through the projector (`projector-trigger.spec.ts`) - is updated to pass an approval authorization.

**AC5 - Reading the code by hand.** Given an `active` worker and a caller who is a District Admin of the worker's district or a Pariwar Admin, when
they `GET .../field-workers/:fieldWorkerId/code`, then the response is 200 `{ field_worker_id, code }` with `Cache-Control: no-store`; EXACTLY ONE audit line
`field_worker.code_read` exists, written BEFORE the response, naming the actor and role, locator `field_worker/<id>`, whose hash input is `{ field_worker_id,
district }` only; the code is in no audit field and no log line. Refusals: `pending_kyc`, `suspended`, `terminated` -> 409 `field_worker.code_not_available`
(body `current_state`), with NO audit line and NO call to the door; a District Admin of another district, a caller without the key, an unknown or other-Pariwar
worker -> 403; if the audit write fails the code is NOT released; an `active` worker for whom the door returns `null` -> 500 (an integrity fault, never a made-up code).

**AC6 - The worker list.** ⚠ (Its index is AMENDED by `-448` item 1 — see AD10; its error split by `-449`.) `GET .../field-workers?state=&district=&cursor=&limit=`: `state` is required and one of the four states; `district` optional;
`limit` default 20, maximum 25. The gate is `district` against the query's `district` verbatim when given, `pariwar` when not (AD4 b): a Pariwar Admin can
list either way; a District Admin can list only a district they hold and gets 403 without one. The response is `{ items, next_cursor }`, each item
`{ field_worker_id, name, district, current_state, kyc_status, registered_by_display, created_at }` with `name` DECRYPTED and NO mobile; ordered
`created_at DESC, field_worker_id DESC`; a worker registered between two page requests causes no skipped and no duplicated row; a forged, truncated or wrong-shape
cursor -> 400 `field_worker.cursor_invalid` with no SQL run; a KMS fault -> 503 `field_worker.decrypt_unavailable` and an unparseable envelope -> 500 `field_worker.identity_unreadable`, each for the whole page; exactly one
`field_worker.list_viewed` line exists per page, written before any decrypt; `Cache-Control: no-store`; the route declares `limit` with a finite `maximum` and
`forced-pagination.spec.ts` passes. The keyset query uses the new index with no `Sort` node (EXPLAIN on a seeded, analysed table, AD10).

**AC7 - The identity read.** ⚠ (Its error split is AMENDED by `-449`.) `GET .../field-workers/:fieldWorkerId` returns the list item plus the full normalised `mobile`, `no-store`; gate on the worker's district
(AD4 a) with `field_worker.view`; exactly one `field_worker.identity_viewed` line before the decrypt; 503 `field_worker.decrypt_unavailable` on a KMS fault and 500 `field_worker.identity_unreadable` on an unparseable envelope; 403 for an
unknown, other-Pariwar or out-of-grant worker.

**AC8 - The districts read.** `GET .../field-workers/districts` returns `{ districts }`: the geo tree's `district` nodes when a tree is in force, else the
listed workplace districts - the SAME two sources `assertDistrictRecorded` uses - sorted, exact values, no personal data; a session and a grant in this Pariwar are
required, no key. `districts_truncated` is true when the Pariwar has more listed workplace districts than the read may return (200) - the screen then says the list is incomplete. A district it
returns is accepted by `assertDistrictRecorded` (a parity test).

**AC9 - Registration is unchanged.** `POST .../field-workers` behaves exactly as 13.1 built it (contracts, errors, the 201 without a code); only its stale
doc-block text (G14) changes. The extraction of the keyed-write helpers into `write-support.ts` changes no behaviour and leaves 13.1's
`field-worker-handler-identity.test.ts` and `apps/api/tests/integration/field-worker/registration*.spec.ts` green UNEDITED.

**AC10 - Keys and holders.** The catalog has the three keys in `SEED_PERMISSION_KEYS`; `PERMISSION_CATALOG_VERSION` is 60 and the key count 81; the version-history comment
records the bump and the REUSE CHECK; `roles.test.ts` asserts the holders exactly - `approve`: `pariwar_admin`, `super_admin`; `read_code` and `view`: `district_admin`,
`pariwar_admin`, `super_admin` - and, for each key, a POSITIVE leg for every holder (a District Admin passes in their own district and fails in another; a Pariwar Admin
passes in any; a `super_admin` passes), and a leg that `state_trustee`, `trustee_panel`, `helpline_operator` and the `field_worker` role are refused. No inert grant: a seeded
holder that authorizes no one fails the story.

**AC11 - The screens** (RTL tests against a mocked client; all copy through `modules/field-workers/i18n-en.ts`).
(a) **Register** (`/p/$pariwarId/field-workers/register`): name, mobile and a district `<select>` filled from the districts read (values emitted exactly; when `districts_truncated` a line says the list is incomplete); one
`Idempotency-Key` per submission attempt (AD12: an unchanged body re-sends the same key, an edited body mints a new one, success clears it, never minted on open or
render); a synchronous in-flight guard against a double click; on 201 the screen shows the returned `field_worker_id` and the state "registered, awaiting approval";
every 13.1 code maps to guidance - 400 key, 409 `idempotency_in_progress`, 409 `mobile_already_registered`, 422 `name_invalid` / `mobile_invalid` / `district_unknown`
(each to its field with `aria-invalid` and `aria-describedby`), 503 `code_allocation_exhausted`, 403 to the "no access" line, 401 to `/login`.
(b) **Awaiting approval** (`.../field-workers/approvals`): a district choice whose DEFAULT is "all districts" (the client cannot tell who may use it, so a District Admin who leaves it gets the 403 guidance "choose a district you manage" and picks one), the `pending_kyc` list with
"Load more" (cursor; focus moves to the first new row), "Review" opens the identity read (name, full mobile, district, registered by, date) and an "Approve" button that
mints a key per click and sends `{}`; success removes the row and announces it; 409 `illegal_transition` reads "already approved or no longer awaiting"; 403 / 503 /
401 handled; the empty state says so.
(c) **Find a worker and show the code** ⚠ AMENDED 2026-11-05 by decision `-448` item 2 (review CR1): each row has a "Check details" button that opens the audited identity panel, and "Show code" is rendered ONLY inside that panel once the identity has loaded — the original text below is kept as put (`.../field-workers`): an explicit district choice with NO default (nothing loads until one is chosen) + an `active` list; "Show code" fetches the code with no cache, holds it in component state only,
shows it large with an accessible spelled-out label and the line that it is for reading to the worker, clears it on hide, another worker, `visibilitychange`, unmount and after
60 seconds; 409 `code_not_available` shows state-specific copy; no clipboard control; the query cache holds no code afterwards.
(d) A nav link "Field workers" in `TopBar` inside a Pariwar; the three routes are in `router.tsx`; each page carries links to the other two (Register / Awaiting approval / Find a worker), so all three are reachable from the one nav link (an RTL leg asserts the links); the copy test walks every key (resolves, no stray brace); the `microcopy`
gate passes (no banned word, token colour classes only); headings take focus after a state change or a failed write; loading is `role="status"`, errors `role="alert"`;
status is never colour alone.

**AC12 - Contracts, OpenAPI and gates.** The new DTOs are `.strict()` and exported; the OpenAPI emitter registers all five new paths and `openapi/v1.yaml` equals a fresh emit; the
reach fence, `login-wall`, `forced-pagination`, the `authorize` and `requirePermission`-result source fences, `field-worker-state-invariant`, the compensating-audit gate and
`domain-accessor-invariants` pass; no new gate is needed; `pnpm ci:local` passes on a FRESH container with the story's `DATABASE_URL` port prefixed
([[project_prepush_hook_inherits_5432]]).

**AC13 - Governance and records.** Before any code: the decision entry (>= `-446`) recording AD1-AD14 and the answers to Q-1..Q-5 is committed ALONE; Row 48 gains a dated
line under leg (h) (a production path to `activated` is built on the branch - the leg closes at go-live evidence, not at merge) and leg (i) (the three keys, awaiting the
Panel's confirm); the Panel confirm note is drafted from the template and NOT sent; at the end `epics.md`, `deferred-work.md` (D1 DISCHARGED, never deleted), the ledger
and the sprint row are updated, and this story's Dev Agent Record is filled.

## Tasks / Subtasks

Order matters: governance first ([[feedback_governance_commits_precede_implementation]]), then the domain, then the API, then the screens. Commit on the story
branch only, never on `main` ([[feedback_commit_on_story_branch]]); check the branch before EVERY commit ([[feedback_concurrent_review_agents_mutate_tree]]);
prefix every `ci:local` and `git push` with the story's `DATABASE_URL` port ([[project_prepush_hook_inherits_5432]]); hand-format, never `prettier --write`
([[project_prettier_not_enforced]]).

- [x] **Task 0 - Preflight and governance (AC: 13)** - runs FIRST; writes no code.
  - [x] 0.0 DONE (`b4ecfcfb`): Commit this story file and the create-story record edits (`epics.md`, `deferred-work.md`, `sprint-status.yaml`) as ONE `records(13.1a)` commit on the story branch, BEFORE anything
    else - the create-story pass left them uncommitted (nothing was committed without BigDev asking).
  - [x] 0.1 `git fetch origin`; `git merge-base --is-ancestor 06bab925 HEAD`; `git diff --name-only 06bab925..origin/main -- packages apps scripts` (a code claim re-derived at the NEW tip, not
    inherited - the pin being valid and the claims being current are two facts). Re-grep the NUMBERS block (next free migration and its `when`, the highest decision id, `PERMISSION_CATALOG_VERSION`,
    the ledger letter, the roster's highest row) and G13's and G14's greps. If a sibling landed a migration, a catalog bump or a `field-worker` change, re-read its diff, not its file list.
    Check `git branch -a` + the open worktrees for another branch that edits `packages/domain/src/field-worker/` or `apps/admin/src/router.tsx`.
  - [x] 0.2 DONE 2026-11-04: BigDev answered Q-1..Q-5, each the recommended option; his words are in the Change Log (v1.1); no AD changed. The code-start gate is now Task 0.3 (the decision
    entry, committed alone) - still no code before it.
  - [x] 0.3 DONE (`218a7424`, decision `2026-11-04-446`, committed alone): Write the decision entry (>= `-446`; re-grep every ref) in `.decision-log.md` and commit it ALONE with the `governance:` prefix and the Co-Authored-By line: an author-commit
    (BigDev) recording AD1-AD14, the answers, the three keys and their holders, the Panel's non-blocking confirm, and "supersedes nothing". Cite `-441`, `-442`, `-443`, `-444`, `-445`, `-059` B(3),
    `-210` cl.2 by clause. Try the write first; if it is refused, ask once ([[project_decision_log_writes_user_inserted]]).
  - [x] 0.4 DONE (`1c3b6bce`): Append dated lines under Row 48 (`docs/launch-gate-inventory/inventory-roster.md`): under leg (h) - the production path to `activated` is DECIDED (decision `-446`, row `13-1a`) and NOT BUILT; the leg stays
    OPEN until the approval route is deployed with go-live evidence (merge is not go-live) - Task 11 changes the line to "built" when it is; under leg (i) - the three keys `field_worker.approve`, `field_worker.read_code`, `field_worker.view` (decided in `-446`, minted by Task 3, built on the default), the
    Panel's confirm outstanding and its note drafted (Task 0.5), not sent. No new row. Commit it as its OWN `governance:` commit right after the decision's (AC13: the decision is committed ALONE), still before any code.
  - [x] 0.5 DONE (`1c3b6bce`; `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-04-story-13-1a-field-worker-keys-confirm.md`, NOT sent): Draft the Panel's NON-BLOCKING confirm note from `trustee-panel-routing-note-TEMPLATE.md` (copy; delete the guidance blocks): section 0 answered first (the keys' HOLDERS are ruled; the Panel is asked
    only to confirm three keys under `-059` B(3), a disclosure to the Trust's own officers); the plain sentence, the ONE deciding fact, options with an honest cost each, what is at stake ("live today:
    nothing; blocked: nothing; if nothing is decided: go-live waits on Row 48 (i)"), how much to trust the note, evidence last. DRAFTED, NOT SENT - BigDev sends it.

- [x] **Task 1 - The domain: the two commands carry the authorization (AC: 4, 2f, 3c; I2, I3, I13)**
  - [x] 1.1 `events.ts`: add a required `authorization` (the existing `FieldWorkerAuthorizationSnapshot` schema) to `FieldWorkerKycCompletedPayloadSchema` and `FieldWorkerActivatedPayloadSchema` (`.strict()`);
    update the payload types and any exported union.
  - [x] 1.2 `commands.ts`: `export const FIELD_WORKER_APPROVE_PERMISSION_KEY = 'field_worker.approve'`; make both input types `FieldWorkerCommandBase & { authorization: VerifiedAuthorization }`; at guard (0) call
    `verifiedSnapshot(eventType, i.authorization, i, { permissionKey: FIELD_WORKER_APPROVE_PERMISSION_KEY })` (pure, before the lock); inside each `guard(row)`, AFTER the existing legality / KYC guard, throw
    `FieldWorkerAuthorizationStaleError(i.fieldWorkerId, target)` when `authorization.target.value !== row.district`; add the snapshot to the returned `extraPayload` (as `postFieldWorker` does). Update the guard-order
    header comment. Keep `trigger` strings fixed literals.
  - [x] 1.3 `packages/events/src/registry.ts`: update the `field_worker.kyc_completed` / `field_worker.activated` descriptions (the emitter is Story 13.1a's `POST .../approve`; the payload now carries the
    authorization) and the "an owner named here is an ASSERTION" block for these two; the schema objects stay the SAME objects as the domain's. UPDATE
    `packages/events/tests/field-worker-registry-coverage.test.ts` test 3 (AC4); the two substrings its test 2 pins must survive the rewrite.
  - [x] 1.4 Tests (update, then add): `packages/domain/tests/field-worker/{events,commands-guards}.test.ts` (the VALID payloads gain `authorization`; a RED proof per new guard: unverified literal, other Pariwar, other actor,
    wrong key - including `field_worker.register` - wrong dimension, stale target; the extended guard ORDER is pinned); the fixtures
    `packages/domain/tests/integration/field-worker/_fixtures.ts` and `apps/api/tests/integration/_field-worker-fixture.ts` gain an approval-authorization helper (they are exempt from the `authorize` fence by exact
    path - put it nowhere else); `integration/field-worker/{commands,read,stream-concurrency,projector-trigger}.spec.ts` updated (`projector-trigger.spec.ts` calls `projectFieldWorkerTransition` directly with bare
    `kyc_completed` payloads: its `input()` helper needs the `authorization` snapshot for the two event types); a NEW live-DB leg: both commands on ONE client in ONE transaction -> two events with equal
    `occurred_at`, ascending versions, `getFieldWorkerStateAt` sees both or neither, the row equals the fold (I13); a leg where the second command is made to fail and the CALLER rolls back (nothing survives, TR4).
    Re-run `pnpm field-worker-state:check` and `:test` and the events coverage test.

- [x] **Task 2 - The domain: reads and the index (AC: 6, 7, 8; I7; AD10)**
  - [x] 2.1 `read.ts` (+ `errors.ts`, `index.ts`): `pageFieldWorkersForPariwar`, `getFieldWorkerSealedIdentity`, `listRecordedDistricts`, `encodeFieldWorkerCursor` / `decodeFieldWorkerCursor`,
    `FieldWorkerCursorInvalidError`. Copy `marketplace/read.ts` `pageModulesForPariwar` and its cursor code (G6): `created_at` as exact TEXT (`created_at::text`), `(created_at, field_worker_id) < ($c::timestamptz, $w::uuid)`,
    over-fetch limit + 1, strict decode before SQL, a non-integer limit is a `RangeError`, the limit through `clampLimit` (default 20, ceiling 25; `domain-accessor-invariants` demands `clampLimit` on a dynamic `.limit()`),
    an explicit `pariwar_id` predicate on every statement. `listRecordedDistricts` reuses `assertDistrictRecorded`'s two sources (the geo tree in force at `at`, else the listed workplace districts) - factor the
    shared part so the two cannot disagree. It returns `{ districts, truncated }`: the no-tree branch reads `pageWorkplaceDistricts` (capped at `WORKPLACE_DISTRICTS_LIMIT`
    = 200, with a `hasMore`), so `truncated` is that flag (the geo-tree branch is never truncated); sort by UTF-16 code-unit order (`a < b`), as 12.2's `byValue` does.
    `pageFieldWorkersForPariwar` takes the already-DECODED cursor (`after: { createdAtExact, fieldWorkerId }`, as marketplace's does); the route decodes it with `decodeFieldWorkerCursor`.
    Do NOT change `getFieldWorker`, `listFieldWorkersForPariwar` or `FieldWorkerView`.
  - [x] 2.2 ⚠ (index AMENDED by `-448` item 1: `field_workers_pariwar_created_idx`) `schema/field_workers.ts`: the new index in the drizzle table definition; the migration `NNNN_field-workers-list-index.sql` by hand in house style ("never regenerate" header; `CREATE INDEX` then `DROP INDEX
    field_workers_pariwar_state_idx`; statement breakpoints), the journal entry added by hand with a trailing newline, `when` above every sibling's. NEVER edit `0200`. Apply it ONLY to the story's own container
    ([[project_sibling_migration_when_order_shared_db]]).
  - [x] 2.3 Tests: ⚠ (The index this names is AMENDED by `-448` item 1: `field_workers_pariwar_created_idx`.) a unit test of the cursor (round trip; every malformed shape is `FieldWorkerCursorInvalidError`; no SQL on a bad cursor - assert with a stub client that records statements); a live-DB spec
    (`packages/domain/tests/integration/field-worker/page.spec.ts`): ordering with TIED `created_at` (seed explicit `created_at` literals as the OWNER role (the superuser: under FORCE a plain owner does not bypass RLS, `-449`) - one transaction has one `now()`, 13.1 TR10), a cursor that
    walks every row exactly once, a registration between pages, the `district` and `state` filters, the limit ceiling, RLS (another Pariwar's rows never appear) via `enterAppScope`; the EXPLAIN spec (AD10: >= 2,000 rows,
    >= 8 Pariwars, all four states, `ANALYZE`, no `Sort`, the new index named); the districts parity test (every returned district passes `assertDistrictRecorded`); and UPDATE
    `packages/domain/tests/integration/rls/field-workers-policy-regression.spec.ts`, test "AC1 ... the list index": its exact index-name list becomes
    `[field_workers_pariwar_mobile_live_uq, field_workers_pariwar_state_created_idx, field_workers_pariwar_worker_uq, field_workers_pkey]` and the new index's column list is matched
    WITH its `DESC` suffixes (the old `pariwar_id, current_state` assertion goes).

- [x] **Task 3 - RBAC: the three keys (AC: 10; I8; AD6)**
  - [x] 3.1 `rbac/permissions.ts`: the version-history comment (59 -> 60, THREE keys 78 -> 81, ONE bump; holders; the REUSE CHECK; the `-059` B(3) note; "READ LIVE at <sha>"), the bump, the three entries in
    `SEED_PERMISSION_KEYS`. `rbac/roles.ts`: the three `permissionKey(...)` consts and the bundle entries (AD6). Leave `rbac/roles.ts`'s stale "Dispatch keys land Epic 12" comment alone (13.1 G15).
  - [x] 3.2 Tests: `permissions.test.ts` (`toBe(60)`, `toHaveLength(81)`), `roles.test.ts` (`holdersOf` for each key; the positive legs and the refusals of AC10; the `state_trustee` leg - its bundle lacks them).
    Re-count `hasPermission` / `requirePermissionHook` callers is NOT needed (no RBAC core change in this story).

- [x] **Task 4 - Contracts and OpenAPI (AC: 12; G11)**
  - [x] 4.1 `packages/contracts/src/field-workers/dto.ts` (+ the barrel): the DTOs of "Names at a glance", all `.strict()`; the list query's `state` is the existing `FieldWorkerState` enum, `limit`
    is `z.coerce.number().int().min(1).max(25).optional()` (querystring values are strings; this is 12.2's `ModuleListQuery` shape and it must emit `maximum: 25` for
    `forced-pagination.spec.ts`), `district` is `z.string().min(1).max(200)` refined to reject a NUL (a NUL district would otherwise reach Postgres - 22021, a 500 and a
    `list_viewed_rolled_back` line; build the NUL in the test with `String.fromCharCode(0)`, [[project_unicode_escapes_written_raw]]), `cursor` the existing `Cursor`, the whole query `.strict()`;
    the code field is `code`. `packages/contracts/scripts/emit-openapi.ts`: five `registry.registerPath` entries (+ the response components); run
    `pnpm contracts:emit-openapi`; commit the regenerated `openapi/v1.yaml`. Update the stale 13.1a text in the contracts files (G14).
  - [x] 4.2 `packages/contracts/tests/field-workers.test.ts`: strictness and sync-guard legs for each new DTO (an unknown key is rejected; the response schemas carry no `mobile` in the list item and no `code` anywhere but
    `FieldWorkerCodeResponse`).

- [x] **Task 5 - API plumbing (AC: 9; I4, I6; AD4, AD9)**
  - [x] 5.1 `write-support.ts`: extract `requireIdempotencyKey`, `releaseHookTx`, `namespace`, `payloadHash`, `tenantWrite` (and the error mapper wiring) from `handlers.ts`, parameterised by the action name so the key is
    `field_worker.<act>:${pariwarId}:${actorId}[:${fieldWorkerId}]:${key}` (`fieldWorkerId` the BRANDED, lower-cased id from `ids.fieldWorkerId`); behaviour for registration is byte-identical. `field-worker-handler-identity.test.ts` and `apps/api/tests/integration/field-worker/registration*.spec.ts` must pass UNEDITED
    (TR10); if a mock there breaks, the extraction is wrong.
  - [x] 5.2 ⚠ (A code 3 from the key service is 500 `key_rejected`, not 503: AMENDED by `-449`.) `field-worker-crypto.ts`: `decryptFieldWorkerField(ciphertext, pariwarId, deps)` and a `...Safe` variant that turns a KMS fault into a typed error (-> 503 `field_worker.decrypt_unavailable`) and an UNPARSEABLE envelope into a distinct one (-> 500 `field_worker.identity_unreadable`),
    the `decryptModerationRationaleSafe` shape), UTF-8; update the "No function here decrypts" header. `gate.ts`: `loadFieldWorkerGateDistrict()` (reads `getFieldWorker` on `request.scopeTx`, stashes the district or `null`)
    and `listGateDimension` / `listGateValue` for `resolveDimension` / `resolveValue` (AD4). `types.ts`: declare `fieldWorkerGateDistrict?: string | null`. `errors.ts`: the three new rows (G, errors table).
  - [x] 5.3 Tests: `apps/api/tests/unit/field-worker-errors.test.ts` (the new rows; re-label the approval rows); a unit test of the loader (found, missing, other Pariwar -> `null`) and of the list gate (the four
    cases of AD4 b), asserting the gate answers 403 for `null` for a Pariwar Admin as well.

- [x] **Task 6 - The approval route (AC: 1, 2, 3; I2, I3, I9; AD2, AD7, TR4-TR6, TR16)**
  - [x] 6.1 `approval-handlers.ts` + `routes.ts`: guard chain `[requireAdminSession, scopeResolutionHook, loadFieldWorkerGateDistrict, requirePermissionHook('field_worker.approve', { dimension: 'district',
    resolveValue: stash })]`; params `fieldWorkerId` UUID; body `ApproveFieldWorkerRequest`; response 200 `ApproveFieldWorkerResponse`. Handler: read `request.authorizations['field_worker.approve']` (a plain Error / 500 if absent -
    never a recomputation), `tenantWrite` with the worker id in the key's namespace, a pre-read of the worker on the `tenantWrite` transaction (absent -> 404; not `pending_kyc` -> `FieldWorkerIllegalTransitionError` -> 409 `field_worker.illegal_transition`, NO audit line),
    then AD7's nested `withCompensatingAudit` pair (outer: the `kyc_completed` intent, its `mutate` runs `recordFieldWorkerKycCompleted` and then the inner wrapper: the `activated` intent,
    its `mutate` runs `activateFieldWorker` and COMMITS) with the same authorization on `scopeTx.client`; build the 200 from the SECOND command's return value; `finally closeScopeTx(false)`. The actor is `operator`, `actorId` the session's
    user. The handler file must not contain the word `generate` (TR9).
  - [x] 6.2 Tests (`apps/api/tests/integration/field-worker/approval.spec.ts`, extending `_registration-harness.ts` - `createHarness` gives `actor`, `addGrant`, `listDistrict`, `seedTree`, `register`, `cleanup` in 13.1's order; fresh `randomUUID()` Pariwar per test, assert by your own ids, clean up under `session_replication_role = 'replica'` in 13.1's order):
    AC1 in full (the two events, equal stamps, the snapshot, two audit lines, no PII); AC2 (a)-(f) one leg each, including the unknown / other-Pariwar legs returning the SAME 403 and the replay and
    cross-worker-key legs; AC2 (a) writes NO audit line for a `suspended` / `active` target and a race loser writes ONLY the `kyc_completed_rolled_back` twin; AC3 (a) with a forced failure of the second command (both twins), (b) two concurrent approvals from separate pools, (c) a worker moved between gate and command (via the owner role); a positive leg for
    EVERY holder (Pariwar Admin passes; District Admin refused) and the `super_admin` leg. Unit: the handler with the door and crypto mocked.

- [x] **Task 7 - The code route (AC: 5; I1, I5; AD7, AD8, TR1)**
  - [x] 7.1 `read-handlers.ts` + `routes.ts`: guard chain as Task 6 with `field_worker.read_code`; handler: `getFieldWorker` -> if not `active` answer 409 `field_worker.code_not_available`
    (no audit line; `current_state` rides the error's `details`); else `withCompensatingAudit` (AD7) whose `mutate` calls `readAttributionCodeForRequest(request, request.scopeTx, { fieldWorkerId })` (import the door by its path; name no registry identifier); `null` -> 500;
    response `{ field_worker_id, code }`, `Cache-Control: no-store`, the named `read` rate limit. Never copy `code` or `allocatedAt` into a log, an audit field or an error.
  - [x] 7.2 Tests (`apps/api/tests/integration/field-worker/code-read.spec.ts`): AC5 in full - the three non-active states with NO audit line and NO door call (spy), a failing audit write releases nothing, the District Admin of another district
    is refused, a positive leg for each holder, `no-store`, the code is absent from every captured log line and audit row (scan the captured sinks for the literal code), the `null`-door 500. The reach fence and the AT9
    `generate` check (`attribution-code-reach-fence.test.ts`) run green.

- [x] **Task 8 - The list, identity and districts routes (AC: 6, 7, 8; I4, I5, I7; AD4, AD9, AD10)**
  - [x] 8.1 Handlers + routes per AD5: the list reads `pageFieldWorkersForPariwar`, RELEASES the hook transaction, decrypts the names with `mapWithConcurrency`, inside ONE `withCompensatingAudit`
    (`field_worker.list_viewed`); the identity read the same for name + mobile (`field_worker.identity_viewed`); the districts route reads `listRecordedDistricts` (`at` = the request's `SELECT now()`) behind
    `requireAdminSession` and `scopeResolutionHook` only. Register `/districts` BEFORE `/:fieldWorkerId` (TR14). Each response declares its schema; the list declares `limit` with `maximum`.
  - [x] 8.2 Tests (`apps/api/tests/integration/field-worker/reads.spec.ts`; seed identities with `sealFieldWorkerIdentity` and the test `deps.encryption` - `_field-worker-fixture.ts` seeds `'enc:v1:fixture-name'`, which is not an
    envelope and would answer 500 `field_worker.identity_unreadable` — corrected by review R13, 2026-11-04; it said 503): AC6 (a NUL or empty `district` -> 400 `request.validation`; `?limit=20` as a STRING is accepted; an unparseable envelope -> 500 `field_worker.identity_unreadable`) (the four gate cases, the cursor walk with a registration between pages, `cursor_invalid` runs no SQL, a KMS fault -> 503 for the whole page with no
    partial names, one `list_viewed` line per page written BEFORE the first decrypt - assert the order with a spy on both, `no-store`); AC7; AC8; a leg that a KMS fault on ONE row of 25 fails the page; `forced-pagination.spec.ts`
    and `login-wall.spec.ts` green.

- [x] **Task 9 - The admin console (AC: 11; I4; AD11-AD13; G10)**
  - [x] 9.1 `apps/admin/src/api/client.ts` + `hooks.ts`: `getFieldWorkerDistricts`, `listFieldWorkers` (`useInfiniteQuery`), `getFieldWorkerIdentity`, `registerFieldWorker` (the header `Idempotency-Key`),
    `approveFieldWorker` (body `'{}'`, key per click), `readFieldWorkerCode` (no cache). Parse every response with the `@twt/contracts` schema. Reuse `attemptKey` and `newIdempotencyKey`.
  - [x] 9.2 `modules/field-workers/`: `RegisterFieldWorkerPage`, `ApprovalsPage`, `FindWorkerPage`, `WorkerDetail` (the shared identity panel), `CodeReveal` (AD13), `derive.ts` (error code -> guidance, the unknown-code
    fallback), `i18n-en.ts`, `index.ts`. Glue files `src/routes/FieldWorker{Register,Approvals,Find}Route.tsx`; three `createRoute`s in `router.tsx`; the `TopBar` link in `RootLayout.tsx`; each of the three pages carries links to the other two. Use `mutateAsync` per act
    (TR12), a synchronous in-flight ref, headings with `tabIndex={-1}` focused after a state change or a failed write, token colour classes, `aria-invalid` + `aria-describedby`, `role="status"` / `role="alert"`.
  - [x] 9.3 Tests (flat in `apps/admin/tests/`, mocking `../src/api/client.js` and keeping the real `ApiError`): `field-worker-register-page`, `field-worker-approvals-page`, `field-worker-find-page`,
    `field-worker-derive` (+ the copy-key walk). Legs: the key rules of AD12 (unchanged body -> same key; edited -> new; success clears; never minted on mount), a double click sends once, every code of AC11 (a), (b), (c);
    the code view clears on hide / other worker / `visibilitychange` / unmount / 60 s (fake timers), is absent from the query cache (`queryClient.getQueryCache().getAll()`) afterwards, and no clipboard control renders; a 403
    shows the no-access line; the nav link renders in `RootLayout`. Run the `microcopy` gate.
  - [x] 9.4 A browser pass on the seeded API with the cookie helper ([[project_admin_browser_pass_launcher]]; probe once - [[project_agent_chrome_cannot_reach_localhost]]): register, approve, show the code, once as ⇒ RE-RUN 2026-11-05 on the amended code — see the Completion Notes (v1.9).
    a Pariwar Admin and once as a District Admin (a district they hold and one they do not). Record what was and was NOT observed; do not claim a pass that did not run.

- [x] **Task 10 - Stale text, gates, the full run (AC: 12, 9)**
  - [x] 10.1 Re-run `grep -rn "13.1a" apps packages scripts` and update every file G14 lists (and any it missed): comments and labels only. 10.2 `pnpm lint`, `pnpm typecheck`, the unit and integration suites for
    `packages/domain`, `packages/events`, `packages/contracts`, `apps/api`, `apps/admin`; `pnpm field-worker-state:check` / `:test`; the access-wrapper, reach-fence, `microcopy`, `contracts-determinism` gates.
  - [x] 10.3 `DATABASE_URL=<story port> pnpm ci:local` on a FRESH container; record the job count and the result honestly, including the known live-DB failures ([[project_known_livedb_test_failures]]).

- [x] **Task 11 - Records (AC: 13)** - `epics.md`: a dated line under Story 13.1a (built; what the story decided; the three keys; D1 homed here is DISCHARGED) and the INHERITED-block closures; `deferred-work.md`: D1
  DISCHARGED (marked, never deleted - [[feedback_closure_language_precision]]); this story's carried items C1-C8 were WRITTEN at create-story - verify they still say what was built and amend if not; the sprint row `13-1a-...` `ready-for-dev` -> `in-progress` -> `review`; the ledger entry
  (re-grep the letter first; verify the YAML after - [[project_sprint_status_safe_prepend]]); the Dev Agent Record, File List and Change Log of this file; and (added by review R14, 2026-11-04) a dated line under roster Row 48 leg (h) recording the approval route as BUILT on the branch with its evidence - the leg stays open until deployment evidence, and the earlier NOT BUILT line is kept as history.

### Review Findings — round 1 (2026-11-04, story and governance records)

Review target: `06bab925...ef6879a7` on this story's own worktree; 7 files, +1,097 / -1 lines. This is a **ready-for-dev, records-only** review. No implementation is claimed or expected yet. Three independent layers completed: Blind Hunter, Edge Case Hunter and Acceptance Auditor. After deduplication: **0 decision-needed, 14 patch, 0 defer, 2 dismissed**. Severity: **2 HIGH, 10 MEDIUM, 2 LOW**. Findings below concern the implementation contract and the records added by this branch; they do not claim defects in code that has not been written. Original source locations below refer to the reviewed tip, before this subsection was inserted.

**Disposition (BigDev, 2026-11-04):** option **2 — Leave as action items**. R1–R14 remain unchecked and unresolved; no patch was applied. Story and sprint tracking move to `in-progress` because review actions remain open; this does not attest that implementation has started.

- [x] [Review][Patch] **R1 — HIGH: The inherited move-request gate excludes the receiving District Admin.** [`_bmad-output/planning-artifacts/epics.md:7690`; blind + auditor] The new 13.1d C2 block instructs request routes to gate on the worker's CURRENT district. For a worker moving from A to B, a District Admin holding only B therefore cannot open an incoming request or accept A's request. That contradicts the existing 13.1d Opening / Responding criteria (either end opens; the other responds), which implement the consent flow recorded in `-443` Q1 A. Inherit the pre-loader pattern, but resolve the route's target from the relevant request endpoint and actor; do not prescribe the current-district target for every request route. Require a destination-only admin's positive opening and acceptance tests. This is an engineering correction, not a new Panel question.

- [x] [Review][Patch] **R2 — HIGH: Per-worker reads do not bind the disclosed row to the district that passed the gate.** [this story:330-333, AD4; Tasks 7.1 / 8.1; blind + edge] The loader and the later identity/code reads are separate statements on a READ COMMITTED transaction (`openScopeTx` uses bare BEGIN). A `postFieldWorker` committing between them can move A's worker into B while A's verified authorization remains on the request. AD3 protects the approval commands, but neither proposed read rechecks that target against the row supplying the disclosure. Qualify the actual row read by the authorized district, or use a consistent locked read that proves that relationship; refuse before decrypting or opening the door on a mismatch. Add a real two-connection move/read race test. A move command already exists, although production move routes belong to 13.1c / 13.1d; those stories are explicitly instructed to reuse these helpers. Violates I6 / AC5 / AC7.

- [x] [Review][Patch] **R3 — MEDIUM: The active check and code access have no shared concurrency boundary.** [this story:390-395, Task 7.1; blind + edge] The prescribed sequence is `getFieldWorker` -> durable audit write -> door SELECT, and the door checks no state. A suspend/terminate command can commit during the intervening audit write; the handler then opens the door using an earlier active check. Specify a row lock or equivalent consistent state-qualified read covering eligibility and code access, and a two-connection regression leg. The current non-active-state spies prove only a static refusal. Lifecycle HTTP surfaces are later work, but the domain commands are already constructible. Violates I1 / AC5's active-only contract.

- [x] [Review][Patch] **R4 — MEDIUM: A late reveal response can restore a cleared code.** [this story:431-436, AC11(c), Task 9.3; blind + edge] Clearing component state and removing cached results does not invalidate a promise already in flight. A worker switch or `visibilitychange` during the fetch can clear the view, then the older response can populate it with the previous worker's digits or reveal digits while hidden. Specify a reveal generation/token invalidated by every clear and on unmount; check it and the current worker/visibility before accepting a response. Test a deliberately deferred response after each invalidation, not only clearing an already displayed value. `ContactCallForm`'s `numberEpochRef` is an existing precedent. Violates AD13 / I4.

- [x] [Review][Patch] **R5 — MEDIUM: Registration plaintext survives screen exit in MutationCache.** [this story:729-735, Task 9.2 / 9.3; edge] `mutateAsync` retains its submitted variables, including the registration name/mobile. The existing `createQueryClient` sets `gcTime: 0` for QUERIES only; its mutations configure only `retry: false`. Query cleanup therefore does not clear registration variables after navigation. A local reproduction using the installed `@tanstack/query-core`, the exact client defaults and an unsubscribed settled `MutationObserver` retained one mutation with both synthetic name and mobile. Specify cleanup of settled registration mutations and of pending mutations when they settle after exit; check `getMutationCache()` as well as `getQueryCache()`. Avoid a pending mutation's zero-delay GC spin (the existing ground-inspection mutation documents that trap). Violates I4's screen-lifetime retention rule.

- [x] [Review][Patch] **R6 — MEDIUM: Approval omits the required historical admin display-name snapshot.** [this story:515-519, Task 6.1; auditor] AC1 and the handler task carry actor UUID, role and verified authorization, but never load/snapshot `users.display_name` or refuse a missing display name. Load-bearing checklist family 8 requires both. The strict `AuditEntryInput` accepts actorId/actorRole, not a display name, so the writer cannot add the promised name automatically. Registration snapshots `registeredByDisplay`; approval has no equivalent. Specify a server-derived approving-admin snapshot in the durable approval record, a missing-name refusal before mutation, and rename/missing-name regression legs; preserve the prohibition on WORKER names in event/audit plaintext. Align the Panel draft's promise of logging under the officer's name with what is actually persisted. REAL GAP in family 8.

- [x] [Review][Patch] **R7 — MEDIUM: The list audit cannot identify which workers the officer saw.** [this story:380-387, AD7; blind] The actor line has the generic locator `field_workers` and only a hash of filters/cursor. Existing `kmsEventToAuditInput` emits actorId/traceId null, and this story's decrypt context supplies only pariwarId/fieldClass, with no worker rowKey. Those system lines consequently identify neither the worker nor the requesting officer. AD7's claim that the second record shows "which fields were opened" is unsupported; concurrent requests and changing page membership cannot reconstruct each worker's read history. Preserve a bounded, durable association between the page's actual worker ids and its actor audit before decrypting, without recording names, mobiles or codes. Test two concurrent pages with overlapping ids and a changing result set. Violates I9's full-log claim and the stated audit design.

- [x] [Review][Patch] **R8 — MEDIUM: Copying the proposed safe-decrypt split misclassifies authenticated ciphertext corruption as a KMS outage.** [this story:691-692, Task 5.2; edge] `decryptModerationRationaleSafe` treats every failure after `parseEnvelope` as operational. But `decryptTier1` also performs local AES-GCM authentication after KMS successfully unwraps the key. A well-formed envelope with altered ciphertext parses, KMS succeeds, and local authentication throws. This was reproduced with the existing encryption helpers and synthetic data. Copying that split yields retry-oriented 503 guidance for a permanently corrupt worker identity. Specify and test an integrity-error branch for authentication failure as well as the parse-error branch, while keeping actual KMS/transport faults at 503. The existing primitive/predecessor need not be refactored globally; the new helper must classify its own results honestly.

- [x] [Review][Patch] **R9 — MEDIUM: Districts outside the first 200 have no selection path.** [this story:565-568, 581, 592-594, Task 2.1; blind] In the no-tree branch, the district options stop at 200 with only a truncation flag. Registration accepts only a dropdown value, and the finder requires an explicit district before loading anything. A District Admin whose legitimate district falls beyond the first page cannot register a worker or retrieve an existing worker's code through these screens; the warning does not make the district selectable. Add bounded continuation or an exact district-entry/resolution path, preserving byte-exact matching and server authorization. Test a valid district beyond the first 200. This is a new screen reachability problem, even though the bounded source helper predates this story.

- [x] [Review][Patch] **R10 — MEDIUM: The Panel note says a fresh identity check needs no build.** [`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-04-story-13-1a-field-worker-keys-confirm.md:69`; blind + auditor] The plain-English conclusion applies "changes a setting, not the build" to option C, although option C's own cost says a new second-check step must be built and carried C8 identifies contracts/API/screen work. Correct the cost and distinguish a grant-only change from additional authentication work; keep BigDev's answered Q-4 and the current no-step-up scope explicit. The narrow permission/disclosure confirmation must not present an answered implementation choice as an uncosted setting. No new trustee decision is needed to correct this draft.

- [x] [Review][Patch] **R11 — MEDIUM: The Panel draft presents an unresolved worker classification as fact.** [`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-04-story-13-1a-field-worker-keys-confirm.md:43`; blind] Option A calls workers "contractors", whereas Row 48(g) and decisions `-442` / `-446` leave contractor-versus-employee classification to counsel (the form says employed). Describe them neutrally as field workers/non-members and retain the open classification leg; do not prejudge counsel's answer in the Panel's decision material.

- [x] [Review][Patch] **R12 — MEDIUM: The Panel-note closeout can discharge sibling keys without their confirmations.** [`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-04-story-13-1a-field-worker-keys-confirm.md:123`; blind] Its after-ruling instruction says to discharge Row 48 leg (i), but that leg covers every key minted by 13.1a, 13.1c and 13.1d and the cross-story path names each story's Panel note. This question confirms only 13.1a's three keys. Specify a dated discharge of THIS contribution, and permit whole-leg closure only after checking all applicable sibling-key confirmations; do not imply this answer ratifies keys outside the question. Keep the roster's governing criterion unchanged.

- [x] [Review][Patch] **R13 — LOW: The fixture warning gives the wrong corrupt-envelope status.** [this story:721-722, Task 8.2; blind] It says `'enc:v1:fixture-name'` would answer 503, while the immediately following test instruction and AD9 require an unparseable envelope to answer 500 `field_worker.identity_unreadable`. Correct the warning to 500 so the regression test does not encode conflicting expected behavior.

- [x] [Review][Patch] **R14 — LOW: Task 11 omits the roster update that two records assign to it.** [this story:744-746, Task 11; blind] Task 0.4 and Row 48's new dated line promise Task 11 will record that the approval route has been built, but Task 11 lists other records and never lists the roster. Add the dated build observation and its evidence to Task 11, keeping leg (h) open until deployment evidence; preserve the earlier NOT BUILT observation as historical. Otherwise completing the task list can leave the go-live record stale.

**Resolutions (2026-11-04, `bmad-dev-story 13.1a`).** BigDev chose, before any code: "Commit + amend first (Recommended)", R6 "Row column (Recommended)", R7 "Ids in the locator (Recommended)", R9 "Exact-text entry (Recommended)". The design amendments are decision `2026-11-04-447` (committed alone, `99a01805`, before the code); the review records were committed first (`ee714c7d`), the records fixes next (`b82094e8`).
- R1 — `epics.md` 13.1d INHERITED C2 rewritten: each request route resolves its target from the endpoint its actor stands at; destination-only legs required (`b82094e8`).
- R2 — the identity read selects the sealed row QUALIFIED by the authorization's district (`getFieldWorkerSealedIdentity`); the code read re-checks the district on a `FOR SHARE`-locked row; mismatch ⇒ 409 `field_worker.authorization_stale`, no line, no decrypt / door. Proven: `reads.spec.ts` "R2" (a move committed between the loader and the read) and `code-read.spec.ts` "R2" (a move committed while the request waits on the lock).
- R3 — `lockFieldWorkerForCodeRead` (`FOR SHARE` on the hook transaction) covers the `active` check, the audit line and the door read. Proven both ways in `code-read.spec.ts`: a suspend committed while the read waits ⇒ 409 `code_not_available`; a suspend started inside the audit wrapper WAITS until the code has been read.
- R4 — `CodeReveal` carries a generation token bumped by every clear and on unmount, and drops an answer when the tab is hidden; deferred-answer legs after hide / another worker / hidden tab / unmount in `field-worker-find-page.test.tsx`.
- R5 — the register page calls `api.registerFieldWorker` itself (no `useMutation`); the code reveal calls `api.readFieldWorkerCode` itself (no query). `field-worker-register-page.test.tsx` asserts the MutationCache is empty and neither cache holds the name or mobile after unmount.
- R6 — `field_workers.approved_by_display` (migration `0201`; set once by the projector on `activated`, guard rule (f), two CHECKs), read in `prepare` with no transaction open, missing ⇒ 409 `admin.display_name_missing` before any write; rename and missing-name legs in `approval.spec.ts`; not in any payload. The Panel draft now says "naming the officer's account".
- R7 — the list writes its line AFTER the page read and BEFORE any decrypt with locator `field_workers/<id>,<id>,…` (page order); legs: order (line before decrypt), cursor pages, two concurrent officers with overlapping pages, a changed result set (`reads.spec.ts`).
- R8 — `decryptFieldWorkerField` classifies by where it failed (parse; KMS unwrap; local AES-GCM after a successful unwrap) via a provider Proxy; tampered ⇒ 500 `identity_unreadable`, KMS ⇒ 503. Unit (`field-worker-crypto.test.ts`) and HTTP (`reads.spec.ts`) legs.
- R9 — `DistrictPicker` adds an exact-text field when `districts_truncated`; sent byte for byte; legs in `field-worker-register-page.test.tsx` and `reads.spec.ts` (a district beyond the first 200 registers).
- R10, R11, R12 — the Panel draft corrected (option C is new work; no contractor classification; only this note's keys discharged) — still NOT sent (`b82094e8`).
- R13 — Task 8.2's fixture warning now says 500; `reads.spec.ts` asserts 500 for `'enc:v1:fixture-name'`.
- R14 — Task 11 now names the roster line; the dated Row 48 (h) "BUILT ON THE BRANCH, NOT MERGED, NOT DEPLOYED" line is added, the earlier line kept.

**Verification actually performed:** source tracing against the reviewed worktree; a synthetic-data MutationObserver reproduction (name/mobile retained after unsubscribe); a synthetic-data envelope reproduction (`parseSucceeded: true`, `kmsSucceeded: true`, local AES-GCM failure). The encryption reproduction ran against main's identical helper source because this worktree has no installed dependencies; its first sandboxed tsx run was blocked by the runner's temporary socket, and the approved rerun succeeded. No application suites, live-DB races, browser pass or proposed story tests ran; none of this branch's implementation exists yet.

**Dismissed after triage (2):** literal catalog 60/81 instructions are already qualified by the NUMBERS block's explicit live-base rule; "no SQL on a bad cursor" is read in its stated pagination context as no cursor-dependent SQL, not as forbidding authentication/scope SQL. Neither is a separate action item.

**Load-bearing-invariant verdicts (design review, not executed implementation coverage):**

| Family touched | Verdict and evidence |
|---|---|
| 1 — state-machine totality / guards | covered-by-construction: no event kind is added; the existing total reducer and terminal guards remain. AD3 extends authorization only. |
| 2 — concurrency / redelivery | REAL GAP: R2 / R3 leave read/move and read/state races unspecified. AC3 / Task 6 explicitly design the approval transaction, keyed replay and two-pool race proof; those tests remain to be built. |
| 3 — tenant / actor boundaries | REAL GAP: R1 / R2. The new inherited current-district target excludes the receiving admin, and the read's authorization target can diverge from its disclosure row. |
| 4 — event payload completeness | covered-by-construction: AD3 / AC4 require the same verified authorization snapshot on both approval events and registry schema identity. |
| 5 — DB backstops | covered-by-construction: existing RLS / FKs / CHECKs are preserved; Task 2.3 explicitly updates the dedicated migration-policy regression spec for the changed index. This is a planned check, not a recorded test pass. |
| 6 — projection / snapshots / PII minimization | REAL GAP: R4 / R5 permit disclosure state to outlive its intended screen lifetime; explicit list/detail DTO fields and mobile exclusion are otherwise specified. |
| 8 — audit / attribution | REAL GAP: R6 lacks the admin display-name snapshot; R7's two records cannot identify the workers viewed. AD7 otherwise specifies compensating audit/event pairing. |
| 9 — deliberate exceptions | covered-by-construction: AD4(c) explicitly explains the keyless district-options read, while consequential routes retain their own permission gates. |
| 10 — closure honesty | REAL GAP: R12 can overstate the scope of a confirmation. The existing ready-for-dev status and empty Dev Agent Record otherwise honestly state that nothing is built. |
| 11 — policy meaning | covered-by-construction: the worker/member consequences and accepted self-approval exception are stated; the private-rulebook check is disclosed as a prior trace, not re-attested by this review. |
| 13 — semantic accessibility | covered-by-construction: AC11 requires announced success/loading/errors, focus movement, field-error associations and an accessible code label. Screen-reader/runtime delivery remains an implementation obligation. |

### Review Findings — round 2 (2026-11-04, code review of the implementation, in three chunks)

Review target: `06bab925...733181a4` on this story's own worktree (83 files, +7,325 / -331), reviewed in three chunks so no layer saw more than about 2,500 diff lines: **chunk 1** domain, migration `0201`, events, contracts source, RBAC, the state-invariant gate and their tests (33 files, 2,454 diff lines); **chunk 2** `apps/api` source and tests (20 files, 2,524 lines); **chunk 3** `apps/admin` source and tests (22 files, 2,061 lines). Records and the generated `openapi/v1.yaml` were not review targets (the Acceptance Auditor read the story, decisions `-446` / `-447` and the AI-6-5 checklist as spec). Three layers ran per chunk (Blind Hunter on the diff alone; Edge Case Hunter with read access to the worktree; Acceptance Auditor with the story, the decisions and the checklist) — nine runs, about 92 raw findings. Every finding kept below was traced in the tree by the triager; the layers' reports are claims. After deduplication: **2 decision-needed (CR1; CR35 — found while applying CR8; BOTH RESOLVED 2026-11-05 by decision `-448`), 31 patch (CR36 was found while applying CR1), 3 defer, 23 dismissed**. Severity of the patches: **0 HIGH, 7 MEDIUM, 24 LOW**. No finding is the Panel's (the Panel-routing gate was applied to the one decision: it changes what an officer sees on a staff screen, not what the Trust discloses to anyone new).

Chunk 3's Edge Case Hunter rated CR2 HIGH; the Acceptance Auditor rated it MEDIUM. It is rated MEDIUM here: nothing is shown to anyone who was not already entitled to it — the harm is audit lines and decrypts for reads nobody performed.

Settled and not re-raised: a Pariwar Admin may register and approve the same worker (`-443` Q4 A, accepted cost); UUID brands are lower-case by design; `clampLimit` clamps to [1, cap]; one unreadable row failing the whole list page is the specified behaviour (AD9, the Errors table) — only the diagnosability is deferred (CR32).

**Disposition (BigDev, 2026-11-04):** after chunk 3, *"apply all the findings"* — option 1, **apply every patch**. **CR2–CR31 (30) were applied and are checked off below; CR1 and CR35 are decisions and were NOT applied; CR32–CR34 are deferred (`deferred-work.md`).** Nothing is committed and nothing is pushed. *(Superseded 2026-11-05, v1.9: committed in five commits and pushed as PR #324.)*

**How the patches landed (what differs from the entry, and what was proven):**
- **Done by two hands.** The domain, API and script patches (CR7, CR8, CR17–CR31) were applied in the review session; the admin patches (CR2–CR6, CR9–CR16) by a separate agent working only in `apps/admin`. The admin result was not taken on trust: the review session re-ran the admin suite, typecheck, lint and the `microcopy:check` gate, and read the diff of `CodeReveal.tsx`, `DistrictPicker.tsx`, `ApprovalsPage.tsx` and `hooks.ts`.
- **RED then GREEN where a behaviour changed.** CR7: with the code-3 branch disabled, the wrong-Pariwar and corrupt-key legs fail. CR20: with the `rateLimit` line removed from the code route the new test fails with "declares no rateLimit". CR25: with the dimension branch disabled the new approval leg fails. The admin agent reverted each of its fixes one at a time (about 30 mutations) and each turned a specific new test red.
- **CR8 found CR35** (above): explaining the statement the function really sends, as the role the API runs as, did not give the "ordered index scan, no Sort" the story had claimed. The owner-role leg now proves what it can; an `it.fails` leg records the RLS-role gap and goes red when the property starts to hold; the JSDoc and the `0201` header comment now say what is true. The index itself is unchanged.
- **CR25 — a limit.** The new "right key, wrong dimension" leg isolates the dimension check for the two approval commands. For `register` a second check (the target value) also refuses it, so that leg cannot isolate it; both are in the test.
- **CR3 — a choice made.** The typed district is committed on blur and on Enter, not per keystroke; Enter does `preventDefault`, so on the register form it commits but does not submit (a submit in the same breath could register under the previous district). Cost, accepted: typing a district and then clicking the select commits the abandoned text on blur — one extra audited list read.
- **CR24 — one claim in the review was wrong.** The "door returns null" leg already asserted the 500; it now also asserts the intent line and its compensating twin. The failed-intent leg (CR17 / CR24) now hands the REAL wrapper a pool that cannot connect instead of a mock that throws before calling it.
- **CR28 / CR31.** The `0201` header (3) wording "the eight projected columns and the approver" is accurate and was left; comment-only edits to `0201` (CR31, CR35) do not change the migration (no gate hashes migration files; drizzle skips by `when`).
- **Not done by the patches, by design:** the district limit literal `200` in the picker (no exported constant in `@twt/contracts` — worth exporting one), and the 429 copy is keyed on the status, not the code.
- **Verified (against the story database on :5461, the shell's default :5432 never touched):** domain field-worker + RLS-regression + RBAC suites 465 passed; `apps/api` field-worker unit + live + reach fence + code-access 376 passed; the gate (`field-worker-state:test` 57, `field-worker-state:check` green); `@twt/contracts` 1,706 and `@twt/events` 30 passed; `apps/admin` 1,951 passed; typecheck and lint clean for domain, api and admin; `microcopy:check` and `microcopy:test` green. **`pnpm ci:local` was NOT run** — the full push gate on a fresh container is still owed before any push (repo root `eslint` also fails to load its config in this worktree, a pre-existing setup fault, so `scripts/` was covered by its own vitest and `tsx` gate only).

**Disposition 2 (BigDev, 2026-11-05):** on the two open decisions, *"for CR35 and CR1 apply the recommendation"* — option (B) for each. **Decision `2026-11-05-448` was written first** (`.decision-log.md`, author-commit amending `-446` AD10 and AC11 (c) / AD13; BigDev's words verbatim; the costs stated; what it does NOT change), then the code. CR35 and CR1 are resolved below; CR36 was found on the way.
- **CR35, the evidence for the index change.** Migration `0201` now creates `field_workers_pariwar_created_idx (pariwar_id, created_at DESC, field_worker_id DESC)`; the Drizzle schema, the policy-regression spec, `read.ts` and `page.spec.ts` follow. `page.spec.ts` EXPLAINs the statement the function really sends as the table owner AND as `twt_app`, for three forms each — an ordered index scan with no Sort in all six; with the old index put back both roles fail. The edited migration was applied to a FRESH Postgres 16 container from zero (:5465, since removed) and produced the same indexes as the hand-swapped story database (:5461); 465 domain and 376 API field-worker tests passed on the fresh database. The 13.1 D1 discharge in `deferred-work.md` carried "EXPLAIN-proven: no Sort", true only for the owner; it now carries a dated correction.
- **CR1, two observations the implementing agent left for the owner** (neither is a defect in the contract): (1) on Safari and Firefox for macOS a mouse click does not focus a button, so after "Check details" the panel heading holds focus and `CodeReveal`'s "focus only if unclaimed" rule will not move it to Hide there (keyboard and Chrome are unaffected; adding the panel root as a focus owner is a one-line change if wanted); (2) closing the panel unmounts the reveal, so "Code hidden" is not announced — focus goes to the row's "Check details" instead.
- **Not run.** `pnpm ci:local` (the full push gate on a fresh container) — still owed before any push, with the story `DATABASE_URL` port prefixed. Nothing is committed. *(Superseded 2026-11-05, v1.9: the pre-push hook ran `pnpm ci:local` on a fresh container — 38/38 green at `2205ba20` — and the branch is pushed.)*

- [x] [Review][Decision] **CR1 — The Find screen cannot tell two workers with the same name apart.** [`apps/admin/src/modules/field-workers/FindWorkerPage.tsx`, `WorkerList.tsx`; AC11(c), AD9; blind] AC11(c) specifies a district choice and an `active` list; each row shows the name, district, state, who registered the worker and when. The list never carries a mobile (AD9) and the Find screen never opens the audited identity panel (only Awaiting approval does). Two workers called the same in one district, registered on the same day by the same admin, look identical, and "Show code" is a by-hand read-aloud to the person in front of the admin — so the wrong person can be handed a worker's referral code. Not caught by any layer's AC check because the AC does not mention it. Options: (A) leave as built and record the accepted cost; (B) let the Find rows open the existing audited identity panel (full mobile, the same `identity_viewed` line) before "Show code" — no list change, one more audited read, and it also makes the "Approved by" line reachable (CR16); (C) add the last digits of the mobile to each list row — changes AD9 ("the list never carries a mobile"), the list DTO and adds a decrypt per row. Our reading: (B). BigDev's call (it changes an AD and a screen flow; not the Panel's). **Nothing was applied when this was raised.** **RESOLVED 2026-11-05 — option (B)** (BigDev: *"for CR35 and CR1 apply the recommendation"*; decision `2026-11-05-448` item 2, written BEFORE the code): each Find row has a "Check details" button that opens the audited identity panel (`WorkerDetail` — name, full mobile, district, state, who registered, who approved: one `identity_viewed` line); "Show code" is rendered ONLY inside that panel once the identity has loaded (never in a row, never before a panel is open and loaded, and not after a 401 / 403 / 409 / 500 / 503 identity answer); one panel at a time; closing, switching or changing the district clears the code and removes the identity from the client by the handlers (not by an effect cleanup). The "Approved by" line is now reachable for an active worker. `CodeReveal` lost its `isCurrent`, `onShow` and `focusRef` props (nothing referenced them once a switch unmounts the panel); every reveal rule is unchanged and re-proven through the panel. **Proven:** 51 find-page tests; the implementing agent reverted its own work 14 ways (Show code before the identity loads, no explicit removal, no focus restore, no token bump on unmount, Show code also in rows, refetch on focus, …) and each turned a specific test red; the review session re-ran the whole admin suite (1,975), typecheck, lint and the microcopy gate, and read the screen and `CodeReveal`.

- [x] [Review][Decision] **CR35 — MEDIUM: Under the role the API runs as, the list query does not use the new index for its order — it reads the Pariwar's rows and Sorts. FOUND WHILE APPLYING CR8; the layers did not see it.** [`packages/domain/migrations/0201_field-workers-list-index.sql` (the index), `read.ts` `pageFieldWorkersForPariwar`, `page.spec.ts`; AD10, 13.1's carried D1] AD10's index is `(pariwar_id, current_state, created_at DESC, field_worker_id DESC)` and its proof said "an index scan, no Sort". That proof ran as the table owner, which bypasses row-level security. Explaining the statement the function really sends: **as the owner** it is an ordered index scan (cost ~61, no Sort); **as `twt_app` with the Pariwar scope** (what the API runs) it is a bitmap scan on the `pariwar_id` prefix of the same index plus a Sort of every row of that Pariwar and state (cost ~1,276; on a smaller sample a Seq Scan plus Sort). Cause, consistent with the evidence rather than proven: `current_state = $n` is an enum comparison, `enum_eq` is not leakproof (`pg_proc.proleakproof = false`; `uuid_eq`, `texteq` and `timestamptz_lt` are), so beneath the RLS policy qual it cannot be an index condition; with `current_state` not usable the index's column order no longer yields `created_at` order. **Experiment (rolled back):** with an index on `(pariwar_id, created_at DESC, field_worker_id DESC)` and the state as a plain filter, all three real statements — first page, cursor page AND the district page (which the owner-role index could never keep Sort-free) — were ordered index scans with no Sort under `twt_app`. What it costs today: a list request sorts one Pariwar's workers in one state (hundreds, per AD10's own sizing) — correct results, work that grows with the Pariwar, and every statement in the story that says "no Sort" is true only for a role that bypasses RLS. Options: (A) accept at the stated sizing and keep the corrected wording (done in this round: the JSDoc, the migration header comment and `page.spec.ts`, whose `it.fails` leg turns red when the property starts to hold); (B) re-shape the index to `(pariwar_id, created_at DESC, field_worker_id DESC)` — amends AD10 and edits `0201` (a decision entry first; the developer database at :5461 needs the index swapped by hand), drops the "no Sort" cost caveat for the district page, and the state filter then discards other states' index entries on the way; (C) partial indexes per state — one index per list state, more to maintain, not tried. Our reading: (B). BigDev's call (an AD and a migration; no change to what anyone sees — not the Panel's). **Nothing was changed in the index when this was raised.** **RESOLVED 2026-11-05 — option (B)** (BigDev: *"for CR35 and CR1 apply the recommendation"*; decision `2026-11-05-448` item 1, written BEFORE the code): migration `0201` now creates `field_workers_pariwar_created_idx (pariwar_id, created_at DESC, field_worker_id DESC)`; the Drizzle schema, the policy-regression spec, `read.ts` and `page.spec.ts` follow. **Proven:** `page.spec.ts` EXPLAINs the statement the function really sends, as the table owner AND as `twt_app`, for the first page, a cursor page AND a district page — an ordered index scan, no Sort, in all six; with the old index put back both roles fail (the `twt_app` plan shows the Sort), then the new index was restored. The edited migration was applied to a FRESH Postgres 16 container from zero and produced the same indexes as the hand-swapped developer database (:5461, `DROP INDEX … ; CREATE INDEX …` by hand); 465 domain and 376 API field-worker tests pass on the fresh database.

- [x] [Review][Patch] **CR2 — MEDIUM: Audited, decrypting reads re-fire on every tab return and reconnect, with no admin action — and under StrictMode a Review click reads the identity twice.** [`apps/admin/src/api/hooks.ts:42-49` (`createQueryClient`), `useFieldWorkers`, `useFieldWorkerIdentity`; `modules/field-workers/WorkerDetail.tsx:26-29`; AD9, I4, AC6/AC7 "one line per read", checklist 6 and 8; edge + auditor + blind] The client defaults leave `refetchOnWindowFocus` / `refetchOnReconnect` at TanStack's `true` and `staleTime: 0`; neither new hook opts out (its precedents `useNomineeNameCheck` and `useClaimPeerAnswers` do, for exactly this reason: "an audit line that fires without a human is worse than no audit line"). Alt-tabbing away and back writes another `identity_viewed` line and two KMS decrypts; an infinite list re-walks every loaded page (N `list_viewed` lines, up to 25N decrypts). The ledger's StrictMode observation has its own cause: `WorkerDetail`'s effect cleanup calls `removeQueries`, so StrictMode's simulated unmount destroys the in-flight query and the remount builds and fetches a new one (dev only; the repo documents the same artefact for `useClaimPeerAnswers`). Fix: opt both hooks out of focus / reconnect refetch (and the identity query out of mount refetch); move the cache removal out of the effect cleanup into the explicit close / approve-success handlers (`gcTime: 0` already drops it on unmount); tests: a focus event causes no second read; StrictMode causes exactly one identity read.

- [x] [Review][Patch] **CR3 — MEDIUM: The typed-district field blanks itself when the typed text equals a listed district, and every keystroke starts an audited list read.** [`DistrictPicker.tsx:37,72-75`; `ApprovalsPage.tsx`, `FindWorkerPage.tsx`; R9, -447 item 5; blind + edge + auditor] The input's value is derived (`value !== null && !listed ? value : ''`), so typing "Aurangabad Rural" when "Aurangabad" is listed erases the field at the tenth character and the rest lands in an empty box (the sent district is " Rural"). The field exists for districts past the first 200, which can share prefixes with listed ones. `onChange` also feeds page state on every keystroke, and the district is part of the list query key: each partial string is a new audited `GET` (a `list_viewed` line for a Pariwar Admin; a 403 and a repeated alert for a District Admin), against the 120/min read budget. Only the register page has a typed-path test, with one `fireEvent.change`. Fix: keep the typed text in the picker's own state and commit it when the admin leaves the field or presses Enter; `maxLength` at the district limit; the error id in `aria-describedby`; a retry control when the districts read fails (today the register form is a dead end); tests on all three pages.

- [x] [Review][Patch] **CR4 — MEDIUM: A failed "Load more" replaces the whole loaded list, and the copy written for it can never show.** [`WorkerList.tsx:59-70` vs `:98`; blind + edge] In TanStack v5 a failed `fetchNextPage` or refetch leaves `status: 'error'` with `data` kept, so `isError` is true whenever `isFetchNextPageError` is, and the early `if (query.isError) return` wins: the rows vanish, "Try again" re-reads page 1, and `fw.list.moreError` is dead. On the Find page this also unmounts every `CodeReveal`. `marketplace/ModulesPage.tsx` guards this exact case and the guard was not carried over. Fix: replace the list only when there is no data; keep the rows and show the alert beside "Load more" (and a refetch-failure alert); tests.

- [x] [Review][Patch] **CR5 — MEDIUM: "Redirecting to sign in…" is shown on four surfaces that never redirect.** [`derive.ts:42`; only `RegisterFieldWorkerPage.tsx:75` navigates; `ApprovalsPage.tsx`, `WorkerList.tsx`, `WorkerDetail.tsx`, `CodeReveal.tsx`; AC11(b); blind + edge + auditor] After a session expires, Approve / Review / Show code / a list refetch show a promise nothing keeps; the route gate redirects only when `useSession()` flips, which waits for a focus or mount. Sibling routes navigate on 401 (`NomineeRefusalsRoute.tsx`, `CertificateReminderRoutes.tsx`, `CorrectionQueueRoute.tsx`). Fix: navigate to `/login` on a sign-in guidance, once, in one shared place; a 401 test per surface.

- [x] [Review][Patch] **CR6 — MEDIUM: Code-reveal accessibility — the spelled-digits label sits on a paragraph, and showing, hiding and expiry are never announced; focus is dropped.** [`CodeReveal.tsx:79-107`, `:84`, `:98`; `ApprovalsPage.tsx:117`; AD13, AC11(c) and (d), checklist 13(a) and (d) translated to the web; blind + edge + auditor] `aria-label` on a `<p>` is not a supported name (ARIA 1.2), so a screen reader reads "forty-two thousand…" instead of digits — the stated purpose of the label. The Show and Hide buttons unmount when the view changes, so focus falls to the page; the shown / hidden / 60-second-expiry states have no live region (only a conditional "Fetching…" status). `aria-label` on the Show, Hide and Approve buttons replaces the visible text ("Try again", "Approving…" never reach the name; WCAG 2.5.3 label-in-name). Fix: give the digits a supported role with the spelled label; a persistent polite region that says "shown / hidden / will hide in 60 seconds" and never contains the digits; focus to Hide on show and back to Show when focus was inside the component on hide or expiry; names that contain the visible text (hidden suffix, not `aria-label`). Tests assert roles, names, the region text and focus — not only attributes.

- [x] [Review][Patch] **CR7 — MEDIUM: A KMS-side rejection of a stored envelope is classified as a retryable 503, not the 500 integrity error.** [`apps/api/src/modules/field-worker/field-worker-crypto.ts:100-103`, `field-worker-crypto.test.ts:127-130`; -447 item 4, R8, AD9, checklist 10; auditor + edge + blind] The catch yields the integrity error only if `decryptDek` had already resolved; every other failure is "key service unavailable, try again shortly". A corrupt wrapped DEK, or an envelope sealed under another Pariwar, field class or KEK, makes `decryptDek` throw gRPC `code: 3` (INVALID_ARGUMENT) — the fake provider models it and `kyc/name-render.ts` (`withKmsOutageClassification`) already treats `code === 3` as "KMS rejected THIS envelope". The new classifier ignores it, so a poisoned row answers "retry" for ever and "Do not approve; tell the maintainer" never appears. The test beside it claims "still an integrity answer" but asserts only `toBeInstanceOf(Error)`. Fix: a `code === 3` rejection from `decryptDek` becomes `FieldWorkerIdentityUnreadableError`; any other KMS failure stays 503; fix the doc block; the test pins the class and stage for the wrong-Pariwar and the corrupt-DEK cases and the 503 for a non-3 code.

- [x] [Review][Patch] **CR8 — MEDIUM: The EXPLAIN proof runs a hand-copied query, not the statement the code builds; the district-filtered page has no no-Sort proof; the comments overclaim.** [`packages/domain/tests/integration/field-worker/page.spec.ts:178-193`, `read.ts` JSDoc of `pageFieldWorkersForPariwar`; AC6 last sentence, AD10, I7; auditor + blind] `base` / `order` / `LIMIT 21` are written out by hand, so a change to the real `ORDER BY` or cursor predicate leaves the test green. The district form (the one the Find screen always sends) asserts only that the index name appears — AD10 records that cost but the proof reads as "no Sort" everywhere. The comment "(here ~75 rows)" is stale (the seed is 20,000 rows) and the JSDoc says "no Sort" without carving the district form out. Fix: capture the SQL the function really runs and EXPLAIN that; assert index + no Sort for the pariwar/state forms; for the district form assert the index and say in the comment and JSDoc that a small Sort is AD10's recorded cost.

- [x] [Review][Patch] **CR9 — LOW: Approve completion closes whichever panel is open, steals focus, can leave a failure silent, and waits on the list refetch.** [`ApprovalsPage.tsx:35-52,92-95,107`, `hooks.ts` `useApproveFieldWorker`; AC11(d); blind + edge] A's late success runs `setOpen(null)` and focuses the heading while the admin is reading B's panel; A's late failure is stored for A, so B's panel (which shows only its own problem) shows nothing. `onSuccess` returns the invalidate promise, so the button says "Approving…" until the list refetch ends although the approval has committed. A 409 `illegal_transition` / `authorization_stale` leaves the stale row (and an enabled Approve) in the list. A failed approve moves no focus (AC11(d) says headings take focus after a failed write). Fix: close and focus only when the finished worker is the open one; show a problem for a worker whose panel is not open; do not wait on the refetch; refresh the list on those two 409s; focus the heading on failure; tests.

- [x] [Review][Patch] **CR10 — LOW: Other states and focus moves are not announced.** [`WorkerList.tsx:72`, `WorkerDetail.tsx:48-51` and its `dt`/`dd`, `FindWorkerPage.tsx:44-50`; AC11(b); auditor + edge + blind] The empty list line has no status role (after a district choice neither the rows nor the empty line is announced); closing the identity panel drops focus; "Load more" moves focus to an unnamed `div`; `<h1 tabIndex={-1}>` has no ref; in `WorkerDetail` the `dt` is the state and the `dd` is "Registered by …". Fix: a status role for the empty line, focus back to the Review button on close, a named focus target, a ref or no `tabIndex`, correct term / description pairs; tests.

- [x] [Review][Patch] **CR11 — LOW: Server errors the screens cannot name, and copy that is wrong off the approvals page.** [`derive.ts:23-46`, `i18n-en.ts`; blind + edge] `BY_CODE` lacks `field_worker.not_found`, `stream_conflict`, `kyc_already_completed`, `kyc_not_completed`, `cursor_invalid` and the 429; `retryable` is `status >= 500`, so a 429 or a `stream_conflict` leaves a list with no "Try again"; `fw.err.keyRequired` ("Press Register again") can appear on an approve; the generic no-access line says "approving is for a Pariwar Admin" on Show code and registration; the Find page's no-access line tells a user with no field-worker grant to "choose a district you manage". Fix: add the codes and copy, make 429 and `stream_conflict` retryable, make the no-access copy depend on the surface; copy tests walk the new keys with the real `t()`.

- [x] [Review][Patch] **CR12 — LOW: The list's "N more workers shown" line survives a filter change and "Load more" has no filter guard.** [`WorkerList.tsx:29,44-56,93-96`; edge] `revealed` is never reset when the query key changes; if the district changes while a next page is in flight, `fetchNextPage()` resolves with the new key's result, `after[before]` indexes the wrong list, and a false "No more workers." can be announced. Fix: reset on key change and guard the in-flight call with a sequence (as `ModulesPage` does); test.

- [x] [Review][Patch] **CR13 — LOW: `'*'` is the "all districts" sentinel in the list query key.** [`hooks.ts` `fieldWorkersListKey`; the `DistrictPicker` header says no sentinel can be guaranteed unlike every district; blind + edge] A typed district `*` shares the all-districts cache entry. Fix: a key shape that cannot collide (`['all']` vs `['district', value]`); test.

- [x] [Review][Patch] **CR14 — LOW: The hidden-tab early return in the code answer handler does not reset the view.** [`CodeReveal.tsx:69`; blind + edge, both "suspect"] If it were ever reached with a matching epoch the button would stay disabled in "Fetching…" for ever (today the visibility handler bumps the epoch first, so it is unreachable). Fix: return to the idle view on that branch.

- [x] [Review][Patch] **CR15 — LOW: Dead code and a wrong comment.** [`i18n-en.ts` `fw.list.error`; `index.ts` `fieldWorkersEn` alias; `hooks.ts` `fieldWorkerIdentityKey(pariwarId, fieldWorkerId ?? '')` when closed and the block header "Hooks for the registration and the code read"; blind] Remove or correct; grep first that nothing references them.

- [x] [Review][Patch] **CR16 — LOW: Tests that cannot fail, and unproven claims.** [`apps/admin/tests/field-worker-find-page.test.tsx`, `field-worker-approvals-page.test.tsx`, `field-worker-register-page.test.tsx`; auditor + blind] (a) The "late answer after unmount" leg asserts an empty `body.innerHTML` after `unmount()` — true regardless; observe the 60-second timer instead. (b) The leg labelled "Hide" says there is no Hide button while loading, so it re-tests "another worker". (c) The identity-removal test passes without the removal when the test client's `gcTime` is 0. (d) "No clipboard" is a DOM-text assertion that would miss a `navigator.clipboard` call. (e) The register page's links to the other two pages are asserted nowhere (AC11(d)). (f) "Approved by" (`WorkerDetail.tsx:55`) is rendered only when the identity carries an approver, which no current flow opens, and the fixture hard-codes `null` — add a render test (reachability is CR1). Fix each.

- [x] [Review][Patch] **CR17 — LOW: The identity route (which decrypts the full mobile) has no "audit line precedes the first decrypt" test, and neither the list nor the identity has a failed-audit-releases-nothing leg.** [`apps/api/tests/integration/field-worker/reads.spec.ts`; AC7, I5, checklist 8; auditor] Only the list has the ordering test and only the code route has the failed-intent test. The code is correct today (decrypts only inside `mutate`); moving them out would leave every test green. Fix: add both legs for both routes.

- [x] [Review][Patch] **CR18 — LOW: "The hash input is `{field_worker_id, district}` only" (AC5) and the list's hash shape (AD7) are asserted by no test.** [`approval.spec.ts`, `code-read.spec.ts`, `reads.spec.ts`; AC5, AD7, I4; auditor] The PII sweeps search audit JSON for literals; a SHA-256 of a payload containing the code or a name would pass them (and the spec says such a digest is brute-forceable). Fix: assert the stored `request_payload_hash` equals the hash of the exact expected object, with a control that a different object differs.

- [x] [Review][Patch] **CR19 — LOW: The keyless `/field-workers/districts` route has no in-code DELIBERATE block with a rationale and a re-examination trigger.** [`apps/api/src/modules/field-worker/routes.ts:94-99`, `read-handlers.ts:3,69`; checklist 9; auditor + edge] The keyless design is ratified (AD4(c), AC8, `-446` item 4); the checklist wants the reason at the site (as `multi-tenant/index.ts` SITE 6 does). Fix: the block, with a trigger (the response gains per-district counts or any worker data; the `field_worker` role gets a Pariwar grant, 13.3).

- [x] [Review][Patch] **CR20 — LOW: The `read` rate limit on list, identity and code (AD5) is configured but proven by no test.** [`routes.ts:106,120,139`; AD5; auditor + edge] Dropping the `config` line leaves every test green (test ceilings are 100,000). Fix: a test that the three routes carry the `read` tier (the `login-wall.spec` route-table pattern) and approve / districts do not need one.

- [x] [Review][Patch] **CR21 — LOW: The race and concurrency legs are narrower than their comments and Tasks 6.2 / 8.2.** [`approval.spec.ts:225-237`, `field-worker-approval-handler.test.ts:155`, `reads.spec.ts:240-241`; auditor] (a) The comment says the loser "wrote ONLY the kyc twin"; the test asserts only that `activated` appears once and `activated_rolled_back` is absent. (b) The same-key in-flight 409 is covered only by a stubbed-store unit test. (c) "KMS fault on ONE row of 25" runs with 3 rows. Fix: assert what the comment says, add a live same-key-in-flight leg, run the fault leg on a 25-row page — or correct the claim to what runs.

- [x] [Review][Patch] **CR22 — LOW: The AC3(c) lock-wait poll falls through silently on timeout, and its `ILIKE` matches any waiter in the shared database.** [`approval.spec.ts:248-254`; blind, verified] `code-read.spec.ts`'s `waitForLockWaiter` throws on timeout; this loop commits the mover after 5 seconds regardless, so a drifted SQL text turns the leg into a sleep and a waiter from another spec file satisfies it. Fix: one shared throwing helper.

- [x] [Review][Patch] **CR23 — LOW: The comment in `approval-handlers.ts:23-24` reads inverted.** [blind, verified] "⛔ The word that names how codes are made appears in this file (the reach fence's AT9 — TR9)" — the fence requires that the word does NOT appear, and the story's GLYPH REGISTER says negations are written in plain words. Fix: reword.

- [x] [Review][Patch] **CR24 — LOW: Two tests promise more than they assert.** [`approval.spec.ts:140-149`, `code-read.spec.ts` "door returns null"; blind] AC2(b)'s title says "a worker the caller cannot reach" but the Gaya-District-Admin-vs-Patna-worker case is a comment; the "door returns null" test asserts only a regex on the body, not the status or error code. Fix: add the leg and assert the 500 / code.

- [x] [Review][Patch] **CR25 — LOW: The "wrong DIMENSION" RED proof for the approval commands cannot isolate the dimension check.** [`packages/domain/tests/field-worker/commands-guards.test.ts:47-53,418`; AC4, Task 1.4; auditor] `authAt('Patna', { key: 'module.manage' })` forces that key to the pariwar dimension, so the leg has a wrong key AND a wrong dimension; deleting the dimension branch leaves the key branch refusing it. Fix: a leg with `field_worker.approve` at the pariwar dimension.

- [x] [Review][Patch] **CR26 — LOW: Two of the three arms of CHECK `field_workers_approved_by_state` are unproven.** [`schema-trigger.spec.ts:289-293`; checklist 5; auditor] Only "activation without approver" is tested; `pending_kyc ⇒ NULL` and `suspended ⇒ NOT NULL` are not. Fix: replica-mode legs that reach each arm.

- [x] [Review][Patch] **CR27 — LOW: No test cuts `getFieldWorkerStateAt` at the approval pair's own timestamp.** [`read.spec.ts` (b), `commands.spec.ts:338`; Task 1.4 "sees both or neither"; auditor] The pair is one transaction, so both events share a stamp; the existing cuts are around an inversion and a later suspend. Fix: cut at the stamp (both in) and one microsecond before (both out).

- [x] [Review][Patch] **CR28 — LOW: Stale text.** [`errors.ts` `FieldWorkerAuthorizationStaleError` (doc and message describe only `posted` — it is now thrown by the approval commands and the reads); `scripts/field-worker-state-invariant/{check.ts:3,29,README.md:3,10,42,lib.ts,lib.test.ts}` ("eight projected columns"; `EIGHT` holds nine); the `0201` header (3); auditor + blind + edge] Fix wording only.

- [x] [Review][Patch] **CR29 — LOW: A search-and-replace left `reactivateFieldWorker(client, approve(id))`.** [`commands.spec.ts:112,143`; auditor + blind] The command takes no authorization (AD3); the extra fields are ignored and suggest otherwise. Fix: pass the base input.

- [x] [Review][Patch] **CR30 — LOW: `pageFieldWorkersForPariwar` has no NUL guard on `district`.** [`packages/domain/src/field-worker/read.ts:~280`; edge] `assertDistrictRecorded` refuses NUL before any SQL (Postgres raises 22021 and aborts the transaction); the new reader relies on the route DTO. Not reachable today; reachable by 13.1c / 13.1d, which `deferred-work.md` C2 tells to reuse the list. Fix: the same guard and a test.

- [x] [Review][Patch] **CR31 — LOW: Migration `0201`'s header explains only the ADD failure of the NOT VALID CHECK.** [`0201_field-workers-list-index.sql` header (4); blind + edge] A legacy developer-database `active` / `suspended` row with a NULL approver fails the CHECK on every later UPDATE (23514, shown as a 500) and rule (f) forbids the repair. Production and CI hold no such row. Fix: say so in the header: reset the developer database.

- [x] [Review][Patch] **CR36 — LOW: "Review" pressed again on the worker whose panel is ALREADY open emptied that worker's identity from the cache while the panel stayed mounted, so the next render read (and audited) it again.** [`apps/admin/src/modules/field-workers/ApprovalsPage.tsx` Review `onClick`; found by the agent rebuilding the Find screen, confirmed by a failing test; same class as CR2] The Find page had the guard (`if (openRef.current === id) return;`) from the start; Approvals did not, and CR2's explicit-removal change is what made the miss matter (the removal used to run in an effect cleanup). Fixed with the same guard; the new test fails without it (the cache entry is emptied) and passes with it (one identity read, the panel keeps its data, the cache keeps the identity).

- [x] [Review][Defer] **CR32 — One unreadable row fails the whole list page and the log names no row.** [`read-handlers.ts`, `errors.ts:74`; blind] — deferred, a decided design (AD9: the whole response fails; the error names no field and no id; the log carries `{stage}` only). A poisoned row keeps its page unreachable and an operator cannot name it without a query. Consider logging the worker id (not personal data) — that amends AD9, so it needs a decision entry.

- [x] [Review][Defer] **CR33 — A `recordResult` failure after COMMIT releases the idempotency key, so a retry gets 409 `illegal_transition` for an approval that landed.** [`write-support.ts:74-81`; blind + edge] — deferred, pre-existing: the 12.2 keyed-write shape, moved unchanged (verified with `diff -w` against `main`). User-visible for approve; the fix belongs to the shared helper.

- [x] [Review][Defer] **CR34 — The 13.1 field-worker seal's AAD carries no row key.** [`field-worker-crypto.ts:28-35`; edge] — deferred, pre-existing (13.1): a ciphertext moved between workers, or between the name and mobile columns of one Pariwar, decrypts cleanly, so the "authentication" stage cannot detect it. Reachable only by a superuser or replica-mode write.

**Dismissed (23 groups), the ones worth a line:** separation of duties (`-443` Q4 A); required `authorization` on old event payloads (no replay parser in `src` validates stored payloads through the registry; developer rows only); `postFieldWorker` accepting any district-dimension key (its JSDoc and `deferred-work.md` C2 already say it will refuse every key outside the move-key list, which covers the new keys); a half-approved worker (`pending_kyc` + `kyc_completed`): no route produces it and AD2 accepted it; pool hold-and-wait when the service pool is the app pool (AD7 accepts it); the idempotency key's length (`idempotency_keys.key` is unbounded `text`); upper-case UUID path parameters (UUID brands are lower-case); a request-header merge in `apiFetch` (it merges, `content-type` stays); the register page keeping its key after a non-retryable failure (the server releases a failed key, so a same-key retry is safe).

**Carry-over questions put to the chunk 2 layers (all answered):** the code read compares the locked row's district to the district on the verified authorization after `FOR SHARE` and before the audit write and the door read — sound; no lock-order inversion (the audit write is its own `servicePool` transaction under one advisory lock and takes no row locks); the approver's display name is read server-side from `users.display_name` before the scope transaction and a missing name is refused with 409 before either event — sound.

**Load-bearing-invariant verdicts for round 2 (touched families):**

| Family | Verdict |
|---|---|
| 1 — state-machine | covered-by-construction (`state.ts` untouched; no event kind added). |
| 2 — concurrency | covered-by-test for the two-connection races (AC3(c), the R2 / R3 code-read legs); narrower than claimed in CR21. |
| 3 — tenant and actor boundary | covered-by-test (cross-Pariwar, geo asymmetry, anonymous / stranger); CR25 for the dimension leg; non-human denial covered-by-construction. |
| 4 — event payload completeness | covered-by-test (same snapshot on both events). |
| 5 — DB backstops | CR26 (two CHECK arms), CR31. |
| 6 — projection / PII | CR2 (decrypting reads re-fire), CR18 (hash inputs). |
| 8 — audit and attribution | CR2, CR17; the approver-name snapshot is covered-by-test; the approver line is unreachable on screen (CR1 / CR16). |
| 9 — deliberate-vs-oversight | REAL GAP: CR19. |
| 10 — closure honesty | CR8, CR21 (comments that claim more than the tests assert). |
| 11 — policy meaning (AI-10-1) | covered-by-test; the copy matches the one-sentence meaning. CR1 is the open question on the same screen. |
| 12 — cross-member ownership | covered-by-test (re-action refused; ids validated server-side). |
| 13 — semantic accessibility | REAL GAP: CR6, CR9, CR10 (translated to the web). |

### Review Findings — round 3 (2026-11-06, the round 2 fix diff `b54a3e2e..c69cc9f9`, one pass)

`bmad-code-review 13.1a` on the fix diff only (41 files, +2,483 / -309): BigDev chose one pass over three chunks ("one pass"). Three read-only layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor with the load-bearing-invariant checklist), `DATABASE_URL` unset, no test run; the Blind Hunter read the diff from one file rather than inline and opened nothing else. 38 raw findings; the load-bearing claims were then re-read by hand in the code. **Result: 1 decision-needed, 15 patch, 0 defer, 9 dismissed; no HIGH.** Numbering continues from CR36. Confirmed by the Auditor and not findings: CR1 (no other route to the code in the console), CR35 and `-448` (the real statement is explained for both roles and all three forms), CR36. Checklist family 10 and family 13 (d) are REAL GAPs: CR37 and CR39.

- [x] [Review][Decision] **CR37 — MEDIUM: CR7 goes beyond `-447` item 4, and the premise it rests on is un-attested.** [`apps/api/src/modules/field-worker/field-worker-crypto.ts:111`, `errors.ts:76`; `-447` item 4, AD9, the Errors table, AC6, AC7; checklist 10; auditor + edge] `-447` item 4 names two 500 cases, an unparseable envelope and an envelope that "parses and unwraps but fails local authenticated decryption", and says "only a key-service or transport fault is 503". CR7 adds a third 500: a KMS gRPC code 3 rejection, an envelope that did NOT unwrap. No decision entry records it, the Errors table and AC6 / AC7 still read 503, and `-448` says it does not change `-447`. The new comment states "Cloud KMS's answer for a malformed ciphertext or an AAD mismatch" as fact and cites `kyc/name-render.ts`, which records that premise as UN-ATTESTED against the live service, verification owed. If the premise is false a corrupt row keeps the 503 retry (it fails closed, an outage, per `name-render.ts`). A SYSTEMIC code 3 (a mis-set key reference, the cost `public-pages/handlers.ts` accepts) would show "Do not approve; tell the maintainer" for every worker, logged under `stage: 'authentication'`, the same stage as AES tampering. Every CR7 test runs against the fake provider or stubbed errors. Engineering, not the Panel's (template section 0): what is owed to a person does not change. **Resolved 2026-11-06, BigDev: "1"** — keep CR7 and record it. Now a patch: decision `-449` (author-commit, written and committed FIRST) amends `-447` item 4, AD9, the Errors table, AC6 and AC7 and corrects `-448`'s wording on the owner and row-level security; the premise is marked UN-ATTESTED in the code and this story; a distinct `key_rejected` stage is logged. Accepted cost: a mis-set key shows "Do not approve" for every worker until it is fixed.
- [x] [Review][Patch] **CR38 — MEDIUM: A failed refresh or Load more ignores the error's guidance, so the non-retryable "Do not approve; tell the maintainer" never appears.** [`apps/admin/src/modules/field-workers/WorkerList.tsx:107,134`; CR4 with CR7; edge + blind] `g` is computed only when there are no rows. A 500 `identity_unreadable` or a 403 on a later page or a post-approval refresh shows the fixed "Could not load more workers. Try again." or "may be out of date" with Try again, which is the retry loop CR7 removed. `fw.err.cursorInvalid` is unreachable for the same reason. Fix: take the guidance for these two paths too, show its text, and offer Try again only when it is retryable.
- [x] [Review][Patch] **CR39 — MEDIUM: Load-bearing status lines still mount already holding their text, and a loaded identity is never announced.** [`apps/admin/src/modules/field-workers/ApprovalsPage.tsx:101`, `WorkerDetail.tsx:53`; AC11 (b), checklist 13 (d); auditor + blind] `WorkerList.tsx`'s own header calls this pattern unreliable. CR9's late approval depends on the Approvals line alone, because focus deliberately stays on B's panel. `WorkerDetail` says "Loading…" and nothing when the details arrive, which on Find is the moment "Show code" appears (`-448`). Fix: persistent `role="status"` containers, and a loaded line with a new copy key and a real-`t()` test leg.
- [x] [Review][Patch] **CR40 — MEDIUM: Three forced-race tests return a connection to the pool with its transaction open.** [`apps/api/tests/integration/field-worker/approval.spec.ts:277,301,326`; CR22; blind + edge] `waitForBlockedBy` now throws on timeout, so `COMMIT` is skipped, the bare `release()` hands back the row lock and the parked request hangs; the suite timeout then hides the real failure. Fix: `finally { await c.query('ROLLBACK').catch(() => undefined); c.release(true); }`, and settle the parked request.
- [x] [Review][Patch] **CR41 — LOW: "Load more" pressed during the post-approval refresh cancels it.** [`apps/admin/src/modules/field-workers/WorkerList.tsx:140`; CR9; edge] `fetchNextPage` defaults to `cancelRefetch: true`, so new pages append to stale ones, the approved worker stays listed and a showing "may be out of date" alert clears. Fix: `disabled={query.isFetching}`. An approval that commits while Load more is in flight still adds no rows and says nothing until pressed again; that is accepted.
- [x] [Review][Patch] **CR42 — LOW: A failed identity read says "try again shortly" and offers no way to.** [`apps/admin/src/modules/field-workers/WorkerDetail.tsx:54`; AC11 (b), the CR11 class; auditor] `guidance.retryable` is ignored, and the `openRef` guard makes "Check details" and "Review" silent no-ops on the open worker. Fix: a Try again button that refetches when the guidance is retryable.
- [x] [Review][Patch] **CR43 — LOW: CR22 is half-applied.** [`apps/api/tests/integration/field-worker/code-read.spec.ts:107`; CR22; auditor] Three callers keep `waitForLockWaiter`, which matches any backend waiting on a lock with that query text in the shared database. Fix: move them to `waitForBlockedBy` and delete it.
- [x] [Review][Patch] **CR44 — LOW: The typed district still spends an audited read nobody asked for.** [`apps/admin/src/modules/field-workers/DistrictPicker.tsx:59,113`; CR3; edge + blind] Leaving the window mid-typing blurs the input and commits partial text; on Find that also closes the panel and clears a shown code. An Enter that confirms IME composition does the same, which matters for Hindi input. Fix: ignore a blur that leaves `document.activeElement` on the input, and ignore Enter while composing. A blur into the select still commits: that is what blur is for.
- [x] [Review][Patch] **CR45 — LOW: The districts read shows an error over a working select, and a 401 there never redirects.** [`apps/admin/src/modules/field-workers/DistrictPicker.tsx:91`; blind + edge] The query keeps focus refetching, so a failed background refetch shows "load error" although the list works, the trap `WorkerList.tsx` warns about. A 401 on the Retry added here repeats the error, though `sign-in.ts` is the one place for every surface that can meet a 401. Fix: show the alert only with no data, and add `useSignInRedirect`.
- [x] [Review][Patch] **CR46 — LOW: Close loses focus when the row has left the list.** [`apps/admin/src/modules/field-workers/ApprovalsPage.tsx:62`, `FindWorkerPage.tsx:49`; blind + edge] A 409 refreshes the list while the panel stays open; Close then unmounts itself and focus falls to `body`. Fix: fall back to the page heading on both pages.
- [x] [Review][Patch] **CR47 — LOW: A 409 saying the worker moved leaves the stale list up on the reads, and one approve code refreshes nothing.** [`apps/admin/src/api/hooks.ts:3073`, `WorkerDetail.tsx`, `CodeReveal.tsx`; blind] `read-handlers.ts` raises `authorization_stale` on the identity and code reads; the copy says "Reload and try again", focus refetch is off, and nothing refreshes the list. `kyc_already_completed` shows the same "already approved" line as `illegal_transition` without its refresh. Fix: invalidate the lists on both.
- [x] [Review][Patch] **CR48 — LOW: The hook relies on the client default to drop a decrypted identity.** [`apps/admin/src/api/hooks.ts:3048`; CR2; blind] Since CR2 removed the unmount cleanup, `gcTime: 0` is the only backstop on route navigation, and no test proves it. Fix: set `gcTime: 0` on `useFieldWorkerIdentity` itself, as `hooks.ts:785` does.
- [x] [Review][Patch] **CR49 — LOW: `WorkerList`'s `surface` prop does nothing and its comment is false.** [`apps/admin/src/modules/field-workers/WorkerList.tsx:32`; blind] `Surface` only changes the 403 line, which `noAccessText` replaces. Fix: remove the prop.
- [x] [Review][Patch] **CR50 — LOW: Admin tests that prove less than they say.** [`apps/admin/tests/field-worker-find-page.test.tsx:511,527`, `apps/admin/tests/field-worker-approvals-page.test.tsx`; edge + blind] The "switched" and "CLOSED" deferred-answer legs cannot fail on the digits, because the reveal has already unmounted and React drops the update: assert that no `CODE_VISIBLE_MS` timer started, as CR16 (a) does. In the 409 test, `waitFor(row not null)` passes at once on the old rows and the absence check after it races: put it inside the `waitFor`. The CR9 comment claims the identity left the cache, which is never asserted.
- [x] [Review][Patch] **CR51 — LOW: API and domain tests that prove less than they say.** [`apps/api/tests/integration/field-worker/approval.spec.ts:151`, `packages/domain/tests/integration/field-worker/page.spec.ts:235`, `schema-trigger.spec.ts` (CR26 `pending_kyc` arm); edge + blind] The Gaya District Admin's 403 comes from the missing key, while the title names the district. Nothing asserts the cursor's row comparison is an Index Cond, so a cursor that fell back to a Filter stays green: assert it for the cursor form, and if it goes red under `twt_app` that is a new finding, measured, not a test to soften. The `toBeNull` after a savepoint rollback on a row that was already NULL cannot fail: the control is that the UPDATE does not throw.
- [x] [Review][Patch] **CR52 — LOW: The records lag the code.** [this story's File List, Task 2.3, AD13; `deferred-work.md`; `read.ts`, `0201`, `page.spec.ts:222`; auditor + blind] The File List omits `sign-in.ts`, `field-worker-reads.test.tsx` and `check.ts`. Task 2.3 and AD13 carry no `-448` pointer. `deferred-work.md` still says "The 30 patches and the one decision (CR1)". "No Sort" is stated without its limits: not explained for district plus cursor, proven at about 2,500 rows a Pariwar. The "owner" leg runs as the Docker superuser, and `0200` sets FORCE ROW LEVEL SECURITY, so "the table owner bypasses it" is true only of the superuser; that wording is also in `-448`. Four new lines read inverted on a skim, the class CR23 fixed (`schema/field_workers.ts`, `read.ts`, the policy-regression spec, a `field-worker-crypto.test.ts` title).

**Disposition (BigDev, 2026-11-06):** CR37 *"1"*; the patches *"1"* (apply every patch). Decision `2026-11-06-449` was written and committed FIRST, alone (`e4ca7981`); then the code. All 16 are APPLIED *(corrected 2026-11-06, round 4, CR59: CR40's "settle the parked request" was NOT done — the ROLLBACK frees the request, which finishes by itself — and CR38 reached non-retryable failures only: a retryable one keeps the fixed line, so a 429 on Load more says "Try again")*; NOTHING after `e4ca7981` is committed.
- **CR37:** a `key_rejected` stage (`errors.ts`, `field-worker-crypto.ts`); the comment no longer states the premise as fact and carries the un-attested note. ⚠ Still un-attested: no leg has seen the live key service.
- **CR38, a third thing found while building it:** `cursor_invalid` was marked retryable, but its only path is a next page, where "Load more" re-sends the same refused cursor. It is now `reload`: Load more is refused and Try again walks the list from its first page.
- **CR41:** the Trigger B case in the finding (an approval committing while Load more is in flight) is not changed: no rows arrive and nothing is said until the admin presses again.
- **CR48, a cost found while building it:** the hook's `gcTime: 0` overrides `keepingClient`, so the tests of the handlers' removals would have passed with the handlers deleted (the mutant for Find's `forget` stayed green). They now assert in the tick of the press, before the gc timer can run; the hook has its own leg. *(Corrected 2026-11-06, round 4, CR56: true of Find and the panel; Approvals followed in CR56.)*
- **CR51:** the new assertion holds: the cursor's row comparison IS an Index Cond under `twt_app`. District + cursor was added as a fourth EXPLAIN form, so "every form the screens send" is now true, at this volume. `read.ts` and `0201`'s header say so; a comment-only edit of a never-merged migration.
- **CR43, beyond the finding:** `waitUntilBlocked` was added for the R3 leg, whose blocker is the request's own connection; a second helper, `releaseHolder`, is used by the three tests of CR40 and the three of `code-read.spec.ts`.
- **RED then GREEN.** 22 admin mutants, each reverting one fix or handler, one at a time: all RED at the end *(the list, 2026-11-06, round 4: CR38 ×3 — next-page words, refresh words, the disabled rule; CR39 ×2; CR41; CR42 ×2; CR44 ×2; CR45 ×2; CR46 ×2; CR47 ×3; CR48; the three identity-removal handlers as whole functions; CR50's epoch check)*. Three were GREEN on the first run and exposed weak new tests (CR45's alert read before the observers were told; CR46 on Approvals, where focus was already on the heading; Find's `forget`, above). API: `key_rejected` put back to `authentication` fails 2 legs. Domain: `first` added to the Index Cond loop fails both roles, so the assertion can fail. The test-only patches of CR40, CR43 and CR51 are not mutation-proved: their failure paths were not forced.
- **Verified (the story database on :5461):** admin 1,995; domain field-worker + RLS regression 192; API field-worker 241; the gate 57 + `field-worker-state:check`; `microcopy:check`; `tsc` and ESLint on the three packages' changed paths (exit 0); no invisible character on any added line. **Not run:** `pnpm ci:local`, a browser pass, a screen reader. The status-region changes (CR39) are proven by the DOM only. Owed before any push: `ci:local` on a FRESH container with the story `DATABASE_URL` port prefixed.

**Dismissed (9):** `keyAtPariwar`'s non-null assertion (the Pariwar Admin holds both keys and the grant contains the target, so it is a real result, and CR25 records the RED proof); `0201` edited in place (never merged, recorded in CR35); the district page's "no Sort" flake (the index range is about 2,500 entries a Pariwar, unlike the old ~75 rows; `ci:local` green); the single `retryKey` slot (the worst case is a truthful 409 and a refreshed list); the `.not.toBe` hash controls and the clipboard stub proof (harmless; the second guards the stub trap); `field_worker.not_found` not refreshing (a lost race only, and nothing deletes a worker); `/Index Scan/` also matching a bitmap scan (the no-Sort assertion closes it); the code route having no server check for an earlier identity read (`-448` is a screen guarantee and did not amend the route); a blur into the select committing typed text (by design).

### Review Findings — round 4 (2026-11-06, the round 3 fix diff, working tree against `e4ca7981`)

`bmad-code-review 13.1a` on the uncommitted code and tests only (26 files, +453 / -102; records excluded): BigDev chose "Review this fix diff, then commit and push". Three read-only layers, `DATABASE_URL` unset, no test run; about 40 raw findings, the load-bearing ones re-read by hand. **Result: 0 decision-needed, 7 patch (2 MEDIUM, 5 LOW), 1 defer, 13 dismissed; no HIGH.** Confirmed clean by the layers: the `gcTime: 0` hook (no panel loses data while mounted; one read under StrictMode), `isFetchNextPageError` cannot stick, the stale-list effect cannot loop, `release(true)` and the new wait helpers, the Index Cond regex. Checklist family 3 is a REAL GAP (CR54). The Auditor's second REAL GAP (family 10, "all RED" contradicted on Approvals) does not stand as stated: the whole-function `forget` mutant did go RED when run; its narrower point is CR56.

- [x] [Review][Patch] **CR53 — MEDIUM: "Load more" can still be pressed after a failed refresh, and pressing it wipes the warning.** [`apps/admin/src/modules/field-workers/WorkerList.tsx:154`; CR38, CR41; edge] A refresh fails with rows on screen; `isFetching` is false and `isFetchNextPageError` is false, so the button is live. A next page that succeeds sets `error: null`: "Do not approve; tell the maintainer" disappears, `isInvalidated` clears, and the new page appends to stale pages. After a `reload` re-walk that fails it re-sends the refused cursor. Fix: `disabled={query.isFetching || (query.isError && !(query.isFetchNextPageError && retryable))}`, and the refresh block offers Try again for `reload` too, or that path has no way out.
- [x] [Review][Patch] **CR54 — MEDIUM: AC2 (b)'s "a worker the caller cannot reach" has no proof on the approve route.** [`apps/api/tests/integration/field-worker/approval.spec.ts:151`; AC2 (b), I6, checklist 3 REAL GAP; auditor + blind] CR51 made the leg honest and left the gap showing: nothing tests a holder of `field_worker.approve` whose grant does not contain the worker's district. Fix: a `pariwar_admin` granted at `district` Gaya approving a Patna worker gets the same 403 and nothing is written, with a Patna-grant control that gets 200.
- [x] [Review][Patch] **CR55 — LOW: The `reload` Try again unmounts under focus and raises a second alert.** [`apps/admin/src/modules/field-workers/WorkerList.tsx:141`; AC11 (d), the CR42 class; blind + edge + auditor] `refetch` nulls `fetchMeta`, so the more-error block and its focused button unmount, focus falls to `body`, and a refresh-error alert repeats the words with no button during the re-walk. The test's `waitFor(more-error gone)` passes as soon as the fetch starts, on a one-page list where the refused cursor was never stored. Fix: focus the list heading before the refetch, suppress the refresh block during a `reload` re-walk, and test two loaded pages, waiting for Load more to be enabled.
- [x] [Review][Patch] **CR56 — LOW: The Approvals tests still assert after `waitFor`, and one comment is now false.** [`apps/admin/tests/field-worker-approvals-page.test.tsx:152,159,186`; CR48; auditor] The disposition says the handler tests "assert in the tick of the press"; on Approvals only the whole `forget` is proved, not each of its call sites, and "with `gcTime: 0` this would pass without it" no longer describes the client. Fix: assert in the tick for approve, another worker, another district and Close; correct the comment; prove each call site by its own mutant.
- [x] [Review][Patch] **CR57 — LOW: Two small gaps in the fixes.** [`DistrictPicker.tsx:69`, `WorkerDetail.tsx:65`; CR44, CR42; blind + edge + auditor] Safari fires `compositionend` before the confirming keydown, so `isComposing` is false and an IME Enter still commits (from known browser behaviour, not observed here): also check `e.keyCode === 229`. Retry while offline gives `status: pending`, `fetchStatus: paused`, so `isLoading` is false and the panel shows only its title until reconnect: use `isPending`.
- [x] [Review][Patch] **CR58 — LOW: Tests that claim more than they assert.** [`apps/admin/tests/field-worker-reads.test.tsx` (CR47), `field-worker-find-page.test.tsx` (CR45 title), `packages/domain/tests/integration/field-worker/page.spec.ts` (`DISTRICT_CURSOR`); edge + blind + auditor] `waitFor(toHaveBeenCalledTimes(n))` exits on first satisfaction, and for 0 on the first poll: flush a tick, then assert the count outside it. The CR45 title says "a first read that fails says so" with no such leg (the register test has it): fix the title. `DISTRICT_CURSOR` is commented as what Find sends but uses `pending_kyc`; Find sends `active`.
- [x] [Review][Patch] **CR59 — LOW: Comments and records that lag the patches.** [`errors.ts:27`; `WorkerDetail.tsx:11,60`; `ApprovalsPage.tsx:53`; `FindWorkerPage.tsx:40`; `hooks.ts` field-worker header; `read.ts:3`; `page.spec.ts:2,34`; this story's Names table, Task 5.2, Task 2.3 and TR text, round 3 disposition; `-449` item 1; auditor + edge + blind] `errors.ts` still cites only `-447` and states the premise without the un-attested note. Three comments credit "the client's `gcTime: 0`". The hooks header misses CR47's refresh. "Mounted empty" is false for the panel. "Owner" remains where the superuser is meant. The Names table and Task 5.2 have no `-449` pointer. The round 3 disposition overclaims twice and must say so: CR40's "settle the parked request" was not done (the ROLLBACK frees the request, which finishes by itself) and CR38 applies to non-retryable failures only (a retryable one keeps the fixed line, so a 429 on Load more says "Try again"). It should also list the mutants. `-449` item 1 says every other failure before the unwrap stays 503, but `decryptDek` runs the `getCryptoKey` pre-flight inside the same catch, so a code 3 from it is also `key_rejected`, and a parse failure is 500: `-449` has not left this machine, so correct the entry before it does.
- [x] [Review][Defer] **CR60 — A suspended worker's refused code leaves them on the `active` Find list.** [`apps/admin/src/api/hooks.ts`, `CodeReveal.tsx:105`; blind] — deferred to 13.1c: 409 `code_not_available` means the row is stale, but nothing can suspend a worker until 13.1c ships its routes, so it is unreachable here.

**Disposition (BigDev, 2026-11-06):** *"1"* (apply every patch), after *"Review this fix diff, then commit and push"*. All 7 are APPLIED.
- **`-449` was corrected in place, by amending its commit, before it left this machine** (`50642900` became `e4ca7981`; BigDev was told first and did not object). Its item 1 now names the `getCryptoKey` pre-flight and the parse failure; the entry says it was corrected. No other entry was touched.
- **CR53, beyond the finding:** a re-walk refused again has a Try again in the refresh block, or the new `disabled` rule would have left no way out. New leg: "a re-walk refused again still has a way out".
- **CR54:** the leg passes: a `pariwar_admin` granted Gaya gets the same 403 for a Patna worker, with nothing written, and the same role granted Patna gets 200. The behaviour was right; only its proof was missing. It is proved by its control, not by a mutant of the shared gate.
- **CR56:** approve cannot be checked in the tick (the approval resolves later), so that call is observed with a spy on `removeQueries`; Close, another worker and another district assert in the tick.
- **CR55's test** now loads two pages, holds the re-walk open to check focus and the single alert, and checks that the fresh cursors are used and `c2` is not re-sent.
- **RED then GREEN.** The ten new mutants all RED: CR53 (the `disabled` rule; the refresh block's button), CR55 (focus; the one-alert guard), CR56 (Close; approve; another worker; another district), CR57 (Safari key code; `isPending`). Round 3's nineteen that still apply re-run RED on this code; the three CR53 had moved (CR38 disable, CR41, CR44 IME) were rewritten for it and are RED.
- **Verified (the story database on :5461):** admin 1,998; domain field-worker + RLS regression 192; API field-worker 242; `tsc` and ESLint on the three packages' changed paths (exit 0); `microcopy:check`; `field-worker-state:check`. **Not run at this point:** `pnpm ci:local`, a browser pass, a screen reader. Safari's IME order is from known browser behaviour, not observed.

**Dismissed (13):** Load more stays refused after a non-retryable failure (by design of CR38; repeating a 500 helps nothing; a district change or an approval's refresh is the way out); dropping `surface` from `WorkerList` (it only selects the 403 line, which `noAccessText` replaces; `derive.ts` read); rows kept after a 403 on refresh (nothing new is disclosed, and the server refuses each action); a stale 409 after the epoch check skipping its refresh (it heals on the next read); the "same tick" assertion after `await chooseDistrict` (only microtasks run after the synchronous change); the synchronous negative checks in CR44 (the fetch would start inside the `act` flush, and both mutants went RED); the R4 timer spy having no control (CR16 (a)'s NON-VACUITY test is that control); `waitForBlockedBy` being less specific than the old pattern (it is scoped to the holder's pid, which is the point of CR22); the comment-only edit of `0201` (never merged, no content hash); the redundant `not.toContain` in CR39; `isFetching` disabling Load more under focus (the state the button already enters on its own press, reached here only by a late approval); a hung refresh leaving Load more disabled (`apiFetch` has no timeout anywhere, not a matter for this button); the remaining status nodes in `DistrictPicker` and the register page (not load-bearing: each outcome is announced another way).

## Dev Notes

### Current state (what exists, what this story changes, what it must preserve)

- **`packages/domain/src/field-worker/commands.ts`** - today: `recordFieldWorkerKycCompleted` and `activateFieldWorker` take `FieldWorkerCommandBase` and write
  `{ from_state, to_state, trigger, actor }`. CHANGES: both gain a required `authorization` (AD3). PRESERVE: SAVEPOINT -> LOCK -> HEAD -> APPEND -> UPDATE order, the guard order
  (the legality guard before the KYC guard, so a repeated approval is `illegal_transition`), the fixed `trigger` literals, human-only actors, the lock order (row lock -> `events_log` append -> row UPDATE).
- **`packages/domain/src/field-worker/read.ts`** - today: PII-free `getFieldWorker` / `listFieldWorkersForPariwar` and `assertDistrictRecorded`. CHANGES: adds the paged read, the sealed-identity read and
  `listRecordedDistricts`. PRESERVE: the existing functions and their spec (an array return, 50 / 200).
- **`apps/api/src/modules/field-worker/handlers.ts`** - today: ONE handler, `register`, with `tenantWrite` and its helpers inside `createFieldWorkerHandlers`. CHANGES: the helpers move to `write-support.ts` with
  no behaviour change. PRESERVE: every registration behaviour, the unit test's mocks (`field-worker-crypto.js` -> only `sealFieldWorkerIdentity`, `scope-tx.js`, `admin-auth.repo.js`).
- **`attribution-code-access.ts`** - read-only to this story (I10).
- **`rbac/permissions.ts` / `rbac/roles.ts`** - three keys added; no RBAC CORE change (`check.ts`, `matching-grant.ts`, `apps/api/src/modules/rbac/index.ts` are untouched).
- **`apps/admin`** - gains a module, three routes and a nav link; PRESERVE `RootLayout`'s existing links and every other module.
- **Nothing is live.** Merge is not go-live: roster Row 48 gates the first `field_workers` row in production ([[project_not_in_production_merge_is_not_golive]]).

### Traps (TR)

- **TR1 - the door checks no worker state.** `readAttributionCodeForRequest` returns the code of ANY worker in the Pariwar, `pending_kyc` and terminated included. The `active` check (AD8) is this
  story's and must run in the SAME request as the read; a test that stubs the door and asserts it was NOT called for a non-active worker is the only proof.
- **TR2 - `resolveValue` / `resolveDimension` are synchronous and a `null` target is a 403 for everyone.** Never query inside them; stash from a preceding hook. A missing worker therefore answers 403, not 404 -
  a test that expects 404 for an unknown id is wrong. A PARIWAR Admin is refused too when the stash is `null`.
- **TR3 - the clock.** `kyc_completed` and `activated` appended in one transaction carry the SAME `occurred_at` (the transaction-start `now()`); order by `event_version`, never by time. An ordering spec must COMMIT
  in separate transactions (own pool) or seed explicit literals as the OWNER role (the superuser: under FORCE a plain owner does not bypass RLS, `-449`) (13.1 TR10). The as-of cut includes both or neither.
- **TR4 - a failed second command rolls back only its own savepoint.** If `activateFieldWorker` throws after `recordFieldWorkerKycCompleted` succeeded, the first command's event and row update are STILL in the
  open transaction. The handler must let the error propagate so `closeScopeTx(scopeTx, false)` rolls everything back; a `catch` that swallows or retries the second command writes a half-approved worker. Test it (AC3 a).
- **TR5 - a double approval is `illegal_transition`, not `kyc_already_completed`.** The loser of the row lock finds `active`, and guard (2) fires before guard (3). Copy the screen's message to that code.
- **TR6 - the approval has no body, so the idempotency key MUST carry the worker id.** The keyed store keys on the string only and keeps no body fingerprint (G9): without the worker id in the namespace, the same
  key sent for worker B replays worker A's 200 and approves nobody. The registration's own residual (a reused key with a DIFFERENT body replays the first 201 and registers nothing - 13.1 TR15) is why AD12
  mints the key per submission attempt.
- **TR7 - decrypt cost and placement.** Every `decryptTier1` is a KMS `decryptDek` call plus a system audit line (`actorId: null`) on the global audit chain's advisory lock; a 25-row page is 25 of each.
  Do not decrypt inside an open tenant transaction (release the hook tx first, AD9), do not decrypt the mobile in the list, and never decrypt a row the caller's gate did not cover.
- **TR8 - `emitAuthAudit` is the wrong tool.** It is fire-and-forget (`void ... .catch`), types its event in `AuthAuditEventType`, and silently replaces a locator that does not match
  `^[a-z0-9][a-z0-9:_.-]{0,127}$` with `user:<actorId>`. `withCompensatingAudit` takes the free-text `field_worker/<id>` locator and fails closed.
- **TR9 - the reach fence and the `generate` ban.** A file that imports the door and contains the identifier or string `generate` fails AT9; the response key is `code`, never `attributionCode`; no file outside the
  door names the registry's table or function names (13.1 TR3). Run `apps/api/tests/unit/attribution-code-reach-fence.test.ts` after the first handler is written, not at the end.
- **TR10 - the registration handler's unit test mocks modules by path.** A new import in `handlers.ts` from a mocked module breaks it. New handlers live in NEW files; the extraction in 5.1 must leave that test
  green and unedited. That test imports `routes.js`, which now imports the new handler modules: they must not touch the mocked `field-worker-crypto.js` exports (it exports only
  `sealFieldWorkerIdentity`) or `deps.config` at import time, and `namedRateLimits(deps)` is called only INSIDE `registerFieldWorkerRoutes`.
- **TR11 - the admin gates.** `apps/admin` cannot import `@twt/domain` (use `@twt/contracts`); the `microcopy` gate scans comments too - `report`, `receipt`, `invoice`, `passbook` need a per-file `allow:` or a
  rewrite; colours are token classes (`text-status-fail-fg`, `bg-status-ok-bg`), never hex; copy lives in `i18n-en.ts` (the admin is English-only) and a test that names a key calls the real resolver
  ([[feedback_stub_must_call_not_transcribe]]).
- **TR12 - TanStack Query.** Per-call `mutate()` callbacks fire for the LATEST call only: use `mutateAsync` per act ([[project_tanstack_mutate_callbacks_latest_only]]). The client default is
  `gcTime: 0` and `retry: false`; still `removeQueries` for the code read so a cached value cannot be re-rendered. `useInfiniteQuery` pages hold NAMES in memory while the page is open - acceptable, and cleared on unmount.
- **TR13 - stale text.** G14 lists the files that name Story 13.1a as a future owner; they are found only by grep.
- **TR14 - find-my-way.** `/field-workers/districts` is a static segment and wins over `/:fieldWorkerId`; the param schema is a UUID, so `districts` could never match it anyway. Keep the registration order and the comment.
- **TR15 - migration contention.** `0201` is contended (G12); apply it ONLY to the story's own container until merged ([[project_sibling_migration_when_order_shared_db]]); never regenerate an applied migration.
- **TR16 - a bodyless POST is a 400 in Fastify.** The approval declares the body `{}` (`.strict()`) and the admin client sends `'{}'` ([[project_fastify_empty_json_body_400]]).
- **TR17 - the stale-target check exists for `posted` already; it is NEW for these two events.** No route moves a worker until 13.1c, so AC3 (c) is reachable only by a test that moves the worker through the owner role
  or `postFieldWorker`.
- **TR18 - `domain-accessor-invariants` demands `clampLimit` on a dynamic `.limit()`; `Math.min` does not satisfy it.** The over-fetch `limit + 1` is applied AFTER the clamp.
- **TR19 - `forced-pagination.spec.ts` reads the LIVE route table.** A GET whose 200 is `{ items: [...] }` must declare a `limit` query param with a finite `maximum`, or the suite fails. Declare it in the route's
  `querystring` schema, not only in the handler.
- **TR20 - the two `authorize` / `requirePermission`-result source fences** reject a handler that calls `authorize(` or uses the return value of `requirePermission`. A handler reads `request.authorizations[key]`
  ONLY; the new fixture helper lives in the two exempt fixture files and nowhere else.
- **TR21 - tests that COMMIT.** The approval spec commits append-only rows (`events_log`, audit lines, the code) to the shared DB: a fresh `randomUUID()` Pariwar per test, assertions by your own ids (never counts),
  cleanup under `session_replication_role = 'replica'` in 13.1's order; audit rows written by the service pool cannot be rolled back and the KMS lines arrive asynchronously (13.1 TR5) - never assert audit COUNTS.

### Carried to sibling stories (C) - WRITTEN to `deferred-work.md` ("Deferred from: story 13-1a-... (create-story, 2026-11-04)") and, as dated "INHERITED FROM 13.1a" blocks, under Stories 13.1b (C1), 13.1c and 13.1d (C2) and 13.3 (C3 / C5) in `epics.md` by this create-story pass. Build NONE of these.

- **C1 -> Story 13.1b (the SMS).** The approval's `field_worker.activated` event (now carrying the authorization) is its trigger; a failed send must be VISIBLE to the admins so the code can be given by hand - a
  "code not delivered" signal on the list (13.1a deliberately shows none: no producer exists). The send needs a purpose-limited audited decrypt of the mobile - reuse `decryptFieldWorkerField` (Task 5.2) and AD7's
  audit shape; the form's stated purposes must reach "to text the worker their code" (13.1 Q-3). Trigger: 13.1b create-story.
- **C2 -> Stories 13.1c / 13.1d.** Suspend, reactivate, terminate, the Pariwar Admin's direct move, the move request, every notice, and the full log's READ (`-441`: "Keep the full log of field worker."): the list route's
  `state` enum already carries all four states, so their lists reuse it; `postFieldWorker` still accepts any verified district-dimension key until the story that mints a move key makes it refuse every key outside the
  move-key list (13.1 C5 / C10) - NOT this story. Trigger: those stories' create-story.
- **C3 -> Story 13.3.** The worker's own login and "my code"; the `field_worker_self` scope; the session exposing a principal's roles and districts (see C5).
- **C4 -> BigDev's scheduling, NO ROW.** The strict keyset-cursor code now exists in FOUR places (marketplace, known-people, claim correction queue, field-worker): the "extract once a 2nd consumer exists" trigger
  ([[feedback_no_premature_package]]) has long since fired. 13.1's carried D2 is the same family (the `marketplace` helpers the field-worker domain imports).
- **C5 -> an API change that touches every admin module.** `GET /api/v1/auth/session` returns `nationalGrants` only, so no admin screen can show only the actions its user may take. Exposing the caller's
  roles and district grants (and a client-side permission catalog) is a decision of its own; until then the repo's pattern is the server's 403 and a "no access" line (AD11).
- **C6 -> go-live (no story).** Row 48's legs (h) and (i) close only with deployment evidence and the Panel's confirm; (b), (e), (f), (g) are untouched by this story. Tell Story 14.3 that the screens now decrypt
  `field_workers` name and mobile (its list of people-holding tables does not name `field_workers`, 13.1 C7).
- **C7 -> a later story, if lists grow.** Search by exact mobile (the blind index exists: `findLiveFieldWorkerByMobileIndex`) and by name (no name index exists; ARCH's is unbuilt). Cost of not building it: an admin
  scans a district's names.
- **C8 -> if counsel asks.** A fresh step-up before the mobile reveal or the code read (a new step-up context constant in `@twt/contracts`).

### Testing standards

- Unit: `packages/domain/tests/**/*.test.ts`, `apps/api/tests/unit/`, `packages/contracts/tests/`, `apps/admin/tests/*.test.tsx`. Live-DB: `packages/domain/tests/integration/**/*.spec.ts` and `apps/api/tests/integration/`,
  self-skipping on `!hasDatabase`, per-test rolled-back transaction (`setupLiveDb`) EXCEPT the specs that must COMMIT (TR21); `SET LOCAL ROLE twt_app` (`enterAppScope`) before asserting policy behaviour. Prefix EVERY
  `ci:local` and `git push` with the story's `DATABASE_URL` port and use a FRESH container for the push gate ([[project_known_livedb_test_failures]]).
- Twin specs to copy: `packages/domain/tests/integration/field-worker/{commands,read,stream-concurrency}.spec.ts` and `_fixtures.ts`; `apps/api/tests/integration/field-worker/{_registration-harness.ts,registration.spec.ts,registration-exhaustion.spec.ts}` (the harness gives `createHarness` with `actor`, `addGrant`,
  `listDistrict`, `seedTree`, `register` and `cleanup` in 13.1's order - EXTEND it; new API specs go in that folder) and `apps/api/tests/integration/marketplace-admin.spec.ts`; the admin
  tests `tests/workplaces-page.test.tsx` (mocks, `deferred()`, grants) and `tests/modules-route.test.tsx` (a real router).
- Every guard gets a RED proof; every scan a non-vacuity floor; an assertion after a savepoint rollback must assert the reason AND a control
  ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]); a green gate proves nothing about what it does not scan ([[feedback_gate_scope_semantic_coverage]]); an absence assertion
  (`not.toHaveProperty`) is only meaningful against a 200 body, never against a 403 / 404 / 500. A "not called" assertion on the door needs a spy that is proven callable in a sibling leg.
- No browser E2E harness exists for the admin; AC11 is RTL plus the Task 9.4 browser pass. State plainly in the Dev Agent Record what ran.

### Project Structure Notes

- New: `apps/api/src/modules/field-worker/{approval-handlers,read-handlers,gate,write-support}.ts`; `apps/admin/src/modules/field-workers/*`; `apps/admin/src/routes/FieldWorker{Register,Approvals,Find}Route.tsx`;
  `packages/domain/migrations/NNNN_field-workers-list-index.sql`; tests as in Tasks 1-9; the Panel confirm note; the decision entry.
- Modified: `packages/domain/src/field-worker/{commands,events,read,errors,index}.ts`; `packages/domain/src/schema/field_workers.ts`; `packages/domain/src/rbac/{permissions,roles}.ts` (+ their two tests);
  `packages/events/src/registry.ts` and `packages/events/tests/field-worker-registry-coverage.test.ts`; `packages/domain/tests/integration/rls/field-workers-policy-regression.spec.ts`;
  `packages/domain/tests/integration/field-worker/projector-trigger.spec.ts`; `packages/contracts/{src/field-workers/*,scripts/emit-openapi.ts}` and `openapi/v1.yaml`; `apps/api/src/modules/field-worker/{routes,handlers,errors,field-worker-crypto,index}.ts`;
  `apps/api/src/types.ts`; `apps/admin/src/{router.tsx,api/client.ts,api/hooks.ts,routes/RootLayout.tsx}`; the stale-text files of G14; `docs/launch-gate-inventory/inventory-roster.md` (Row 48 lines);
  `_bmad-output/planning-artifacts/epics.md`; `_bmad-output/implementation-artifacts/{deferred-work,sprint-status}.yaml|md`; `.decision-log.md`.
- Variance from the epic, with reason: a THIRD permission key (`field_worker.view`, AD6); the approval route is a `POST .../:fieldWorkerId/approve` on the registry's resource tree; reads the epic's "Screens" bullet
  implies but does not list (list, identity, districts); an `authorization` snapshot on `kyc_completed` and `activated` (AD3 - 13.1 QE18's deferred half); the module is `field-workers/`, not the architecture's reserved
  `field-worker-dispatch/` (AD11); `kyc_completed` is the epic's `kyc-completed` as 13.1 QE6 spelled it.
- Detected conflicts: none with a ratified text. The Niyamavali and the Privacy Policy are silent on field workers (Policy meaning); roster Row 48 stays open.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 13 (summary), Story 13.1 (incl. the INHERITED and VARIANCE blocks), Story 13.1a (the AC "in brief" and the INHERITED D1 block), 13.1b, 13.1c, 13.1d, 13.2, 13.3, 13.8.
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` - section 2.4 (Vikram), section 4.12, section 4.14 (statutory), FR-81, FR-85; `architecture.md` - section 2.3 (admin auth), section 2.7 (tiers), section 4.1 (the field-worker surface),
  the admin module tree.
- `_bmad-output/implementation-artifacts/13-1-field-worker-identity-lifecycle-state-machine.md` (QE1-QE22, TR1-TR15, C1-C11, the Review Findings) and `13-2-6-digit-attribution-code-generation-per-pariwar.md` (AT1-AT10, the door);
  `12-2-admin-module-targeting-wizard.md` (the route and wizard template).
- `.decision-log.md` - `2026-11-03-441`, `-442`, `-443`, `-444` and `2026-11-04-445` (by clause); `2026-06-21-059` amendment B (3); `2026-09-08-210` cl.2; `2026-11-01-433` QE2; `2026-10-30-421` QE6.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`; `docs/launch-gate-inventory/inventory-roster.md` Row 48.
- Code: `packages/domain/src/field-worker/*`; `packages/domain/src/marketplace/read.ts`; `packages/domain/src/audit/compensating.ts`; `packages/domain/src/rbac/{permissions,roles,check}.ts`;
  `apps/api/src/modules/field-worker/*`; `apps/api/src/modules/rbac/index.ts`; `apps/api/src/modules/claims/{claims.nominee-name-check.routes,claims.contact-call.handlers}.ts`;
  `apps/api/src/modules/member-moderation/moderation-crypto.ts`; `apps/api/src/modules/kyc/bounded-decrypt.ts`; `apps/admin/src/modules/{marketplace,correction-chase,claim-verification}/`;
  `apps/admin/src/{router.tsx,api/client.ts,api/hooks.ts}`.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 13.1a`, 2026-11-04, on the story's own worktree.

### Debug Log References

- Task 0.1 at `ef6879a7` (+ the review round's uncommitted records): `origin/main` still `06bab925`; no sibling branch changes migrations, RBAC, the field-worker modules or the admin router; next free: migration `0201`, catalog 59 → 60, decision `-447`, ledger `2026-11-04l`.
- Story DB: own container on :5461 (migrated, 0201 applied ONLY there). ci:local: fresh containers on :5462.
- ci:local run 1 (fresh container): 38 jobs, 37 ✓, ✗ `integration-tests` — ONE failure, this story's own EXPLAIN spec: with ~37 rows in the cursor's range the planner chose bitmap + Sort. Fixed by seeding 20,000 rows (`9f3666b1`); 5/5 green in isolation afterwards (and 1 of 3 runs of the OLD seed failed in isolation — it was flaky, not a regression).
- ci:local run 2 (fresh container, after the fix): 38 jobs, 37 ✓, ✗ `test (unit)` — `@twt/validity-service` `tests/determinism.test.ts` (100 threaded evaluations) timed out at 124 s under the parallel load; it passes alone in 3.8 s, and nothing this story changed is imported by it (the known oversubscription class). `integration-tests` ✓ in run 2.
- ci:local run 3 (fresh container, at `9f3666b1`): **PASSED — 38 job(s) green** (lint, typecheck, unit, integration and every gate).
- Chrome: the only connected browser is a Windows machine (`list_connected_browsers`), which cannot reach this Mac's localhost; no Playwright package is installed in any checkout. BigDev then connected this Mac's Chrome ("1"), and the pass ran: a throwaway Postgres (:5463, migrated, removed after), an UNCOMMITTED env-guarded launcher spec serving the API on :3000 with a Pariwar Admin and a District Admin of Patna (real passkey sessions through the fake WebAuthn), admin Vite on :3001, a cookie helper on :5197; all stopped and the launcher file deleted afterwards.

### Completion Notes List

- **Governance before code:** the review round's records committed (`ee714c7d`); R1 + R10–R12 record fixes (`b82094e8`); decision `2026-11-04-447` (amends `-446` AD4 / AD7 / AD8 / AD9 / AD11 for R2 / R3 / R6 / R7 / R8 / R9 on BigDev's four selections) committed ALONE (`99a01805`); then the code.
- **Domain (`54ed242a`, `b1c1e825`):** the two approval commands take a verified `field_worker.approve` result (guard 0) and refuse a stale target under the lock (3d); payloads carry the snapshot; `activateFieldWorker` writes `approved_by_display`; migration 0201 (keyset index replacing `field_workers_pariwar_state_idx`, the approver column, guard rule (f), two CHECKs — the state-tying one NOT VALID for developer DBs holding 13.1's committed rows); `pageFieldWorkersForPariwar` + strict cursor; `getFieldWorkerSealedIdentity` (district-qualified); `listRecordedDistricts` (shares `assertDistrictRecorded`'s sources); `lockFieldWorkerForCodeRead` (FOR SHARE); three keys (catalog 60 / 81 at the pin); registry + coverage test; the state-invariant gate watches the new column.
- **Contracts (`9c5c9a32`):** the eight DTOs, five OpenAPI paths, `v1.yaml` regenerated (determinism ✓, pii-scrape ✓).
- **API (`7c6660f3`):** approve (tenantWrite, worker id in the key, display name in `prepare`, nested compensating audit per event, commit inside the inner `mutate`); code (FOR SHARE, district + active re-check, audit, door on the same tx, `no-store`, read rate limit); list (page read → line with the page's ids → decrypt, bounded 8); identity (district-bound read → line → decrypt); districts (no key); `write-support.ts` extraction — 13.1's handler unit test and registration specs pass UNEDITED; the decrypt classifies parse / KMS / AES-GCM failures.
- **Admin (`229e6795`):** three pages + nav link + per-page links; register calls the client directly (no MutationCache), key per attempt, in-flight guard; approvals default "All districts", identity panel removed on close, approve key per click reused only for that click's retry; finder loads nothing until a district is chosen; `CodeReveal` with a generation token, cleared on hide / another worker / hidden tab / unmount / 60 s; exact typed district when the list is truncated. A real bug found by the tests and fixed: "Load more" could set its focus target before the new rows rendered.
- **Tests that ran (all green at the last run of each):** domain full suite 514 files / 7972 tests (story DB); API field-worker unit 6 files + live 8 specs / 58 tests incl. forced-pagination and login-wall; admin full suite 100 files / 1881 tests; contracts 96 files / 1706 tests; events 43 tests; gates field-worker-state, domain-invariants, access-wrapper, microcopy, pii-scrape, OpenAPI determinism.
- **Task 9.4 — the real-browser pass, RAN 2026-11-04 in this Mac's Chrome** (synthetic data). OBSERVED as the **Pariwar Admin**: registered "Ramesh Testworker" (Patna) → the 201 panel showed the id and "Registered, awaiting a Pariwar Admin's approval"; Awaiting approval (All districts) listed it; Review showed the name and the full mobile (`+919876500001`); Approve → "Ramesh Testworker is approved and active." and the row left the list; Find → Patna → Show code showed `876255` large with the label "Code: 8 7 6 2 5 5" and the read-aloud line, no clipboard control; Hide cleared it. As the **District Admin of Patna**: Find → Gaya ⇒ "Choose a district you manage…"; Patna ⇒ Show code `876255`; Awaiting approval with All districts ⇒ the same guidance; registering in Gaya ⇒ the no-access line, then the SAME form changed to Patna registered "Sita Testworker"; Review showed the identity; Approve ⇒ the no-access line. DB CHECKED after: the code row is `876255`; Ramesh `active` / `completed` / approver "Meera Approver"; Sita still `pending_kyc` with only `field_worker.registered`; the audit lines in order (registered, list_viewed with the page ids, identity_viewed, kyc_completed, activated, code_read ×2 — one per role); **no audit row contains the code, either mobile or either name**. NOT observed in the browser: the 60-second auto-hide, the hidden-tab clear, "Load more" (one row per list), a truncated district list, a keyboard-only or screen-reader run (all covered by RTL only). ⚠ Observation for review: one Review click wrote `identity_viewed` TWICE — React StrictMode (`apps/admin/src/main.tsx`) double-runs effects in DEV, and `WorkerDetail`'s cleanup removes the identity query, so it is fetched again; a production build mounts once. Not changed here. ⇒ **FIXED in review round 2 (CR2, CR36) and OBSERVED fixed in the browser on 2026-11-05**: one identity request and one `identity_viewed` line per Review, pressed twice, in a dev build with StrictMode on.
- **NOT done:** the Panel's key confirm is drafted, NOT sent (BigDev sends it). Nothing pushed; no PR. ⇒ **SUPERSEDED 2026-11-05 (v1.9):** pushed as PR #324; the note SENT (reported by BigDev; no ruling yet).
- **Task 9.4 RE-RUN — 2026-11-05, in this Mac's Chrome, on the code AFTER review round 2** (the Find flow of `-448`, focus handling, the typed-district field). Synthetic data; a throwaway Postgres 16 container, the API seeded in ~10 s by an uncommitted env-guarded launcher spec, the admin app under Vite in DEV with StrictMode on, the passkey-free cookie helper; all of it removed afterwards. The first attempt found NO browser (`list_connected_browsers` = `[]`, "extension is not connected") — said so and NOT recorded as un-attested; after BigDev reconnected, a 127.0.0.1 probe loaded. SEEDED: Pariwar A (Patna, Gaya) with 30 active Patna workers including two named "Ramesh Namesake" (mobiles …10001 / …10002), one awaiting approval, one in Gaya; Pariwar B with 207 listed districts, so Patna and Gaya sit PAST the first 200; a Pariwar Admin with grants in both and a District Admin of Patna in A.
  **OBSERVED, real clicks and real key presses unless marked:** Find → Patna: 20 rows, each "Check details for {name}", ZERO "Show code" buttons on the page; the two namesakes are visually identical in the list and their panels show different mobiles; the panel shows the full mobile and "Approved by"; "Show code" exists only inside it; switching rows replaces the panel; the digits are `role="img"` labelled "Code: 3 5 8 1 5 1", the live region says "Code shown for … It hides in 60 seconds." and never holds the digits, focus lands on Hide (a real Chrome click focuses the button), no copy control; Hide → "Code hidden." and focus back on Show; the **60-second auto-hide** (still shown at 58.5 s, gone at 60.016 s, panel left open); **"Load more"** (20 → 30 rows, focus on the first new row, "10 more workers shown."); a **keyboard-only** run (Enter on Check details → focus on the panel heading; Tab → Show code; Enter → Hide has focus; Enter → Show has focus; Tab → Close; Enter → focus back on that row's Check details); Close and a panel switch while the code is shown leave the digits nowhere in the DOM; the **truncated district list** (201 options, last `D199`, no Patna, the note and a typed field with `maxLength` 200): typing "D199" — also a listed district — keeps every character and makes no request until Enter (one request, `district=D199`), then "Patna" (one request) lists a worker reachable only that way; as the **District Admin of Patna**: Gaya ⇒ the finder's own no-access line, Patna ⇒ list → Check details → mobile → Show code, Awaiting approval with All districts ⇒ "Choose a district you manage. Only a Pariwar Admin can see every district at once."; as the Pariwar Admin the real **register** form (the 201 panel, focus on its heading), **Review pressed twice** on the same worker ⇒ ONE identity request (CR36, and the StrictMode double read gone), **Approve** ⇒ "Browser Pass Worker is approved and active.", the panel closed, focus on the page heading, the row left the list, Find lists the worker first as Active. No console errors (tracked from the first read of the console).
  **SIMULATED — and labelled so:** the hidden-tab clear and the tab-return no-refetch (CR2). The extension keeps every tab `visible` — even a second tab on a real page left the first with `visibilityState: 'visible'`, `hasFocus()` true and no `visibilitychange` — so a genuine hidden tab cannot be produced with this tool. The event was dispatched with `document.visibilityState` overridden: the shown code cleared ("Code hidden.", focus on Show, panel open); a simulated hidden→visible, `focus` and `online` re-read NOTHING of the list, the identity or the code (the session and districts reads, which keep the client defaults, ran: the control that the event reached TanStack).
  **NOT observed:** a real hidden tab or tab switch; a screen reader; Safari and Firefox (so the macOS-click-does-not-focus case stays unverified); a District Admin on the truncated list.
  **DB CHECKED after (throwaway DB):** the read lines in order — list pages with their ids (20 + 10 on "Load more"), one `identity_viewed` and three `code_read` for the namesake shown three times in ONE open panel, one `list_viewed` per typed-district commit (never per keystroke), one `identity_viewed` for the double Review, NOTHING from the simulated tab returns; **all 7 `code_read` lines have an EARLIER `identity_viewed` of the same worker (7/7)**; no `_rolled_back` line; a refused read (Gaya, All districts) wrote no line. **A sweep for the 34 worker codes (ids and hashes stripped first), every mobile and every name in the 85 KB of audit rows and the 59 KB API log found none.**

### File List

**Governance / records:** `.decision-log.md` (decision `2026-11-04-447`) · `_bmad-output/implementation-artifacts/13-1a-field-worker-approval-and-code-hand-over.md` · `_bmad-output/implementation-artifacts/deferred-work.md` · `_bmad-output/implementation-artifacts/sprint-status.yaml` · `_bmad-output/planning-artifacts/epics.md` · `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-04-story-13-1a-field-worker-keys-confirm.md` · `docs/launch-gate-inventory/inventory-roster.md`

**Domain (new):** `packages/domain/migrations/0201_field-workers-list-index.sql` · `packages/domain/tests/field-worker/cursor.test.ts` · `packages/domain/tests/integration/field-worker/page.spec.ts`
**Domain (modified):** `packages/domain/migrations/meta/_journal.json` · `packages/domain/src/field-worker/{commands,errors,events,project,read}.ts` · `packages/domain/src/index.ts` · `packages/domain/src/rbac/{permissions,roles}.ts` · `packages/domain/src/schema/field_workers.ts` · `packages/domain/tests/field-worker/{commands-guards,events}.test.ts` · `packages/domain/tests/integration/field-worker/{_fixtures.ts,commands.spec.ts,projector-trigger.spec.ts,read.spec.ts,schema-trigger.spec.ts,stream-concurrency.spec.ts}` · `packages/domain/tests/integration/rls/field-workers-policy-regression.spec.ts` · `packages/domain/tests/rbac/{permissions,roles}.test.ts`
**Events:** `packages/events/src/registry.ts` · `packages/events/tests/field-worker-registry-coverage.test.ts`
**Gate:** `scripts/field-worker-state-invariant/{check.ts,lib.ts,lib.test.ts,README.md}`
**Contracts:** `packages/contracts/src/field-workers/{dto,index}.ts` · `packages/contracts/scripts/emit-openapi.ts` · `packages/contracts/tests/field-workers.test.ts` · `openapi/v1.yaml`
**API (new):** `apps/api/src/modules/field-worker/{approval-handlers,read-handlers,gate,write-support}.ts` · `apps/api/tests/integration/field-worker/{approval,approval-atomicity,code-read,reads}.spec.ts` · `apps/api/tests/unit/{field-worker-approval-handler,field-worker-gate}.test.ts`
**API (modified):** `apps/api/src/modules/field-worker/{errors,field-worker-crypto,handlers,index,routes}.ts` · `apps/api/src/types.ts` · `apps/api/tests/integration/_field-worker-fixture.ts` · `apps/api/tests/integration/field-worker/_registration-harness.ts` · `apps/api/tests/unit/{field-worker-crypto,field-worker-errors}.test.ts`
**Admin (new):** `apps/admin/src/modules/field-workers/{ApprovalsPage,CodeReveal,DistrictPicker,FieldWorkerNav,FindWorkerPage,RegisterFieldWorkerPage,WorkerDetail,WorkerList}.tsx` · `apps/admin/src/modules/field-workers/{derive,i18n-en,index,sign-in}.ts` · `apps/admin/src/routes/FieldWorker{Approvals,Find,Register}Route.tsx` · `apps/admin/tests/field-worker-{approvals-page,find-page,reads,register-page}.test.tsx` · `apps/admin/tests/field-worker-derive.test.ts`
**Admin (modified):** `apps/admin/src/api/{client,hooks}.ts` · `apps/admin/src/router.tsx` · `apps/admin/src/routes/RootLayout.tsx`

## Change Log

| Version | Date | Note |
|---|---|---|
| v1.13 | 2026-11-06 | BigDev: "1" (apply every patch). CR53-CR59 APPLIED, RED-proved, verified on :5461; `-449` corrected by amending its unpushed commit (`50642900` -> `e4ca7981`); round 3 disposition corrected in place with dated notes; pointers added (Names table, Task 5.2, the OWNER lines). Row stays `review`. |
| v1.12 | 2026-11-06 | `bmad-code-review 13.1a` round 4, the round 3 fix diff (uncommitted, against `e4ca7981`): 0 decision-needed, 7 patch (CR53-CR59: 2 MEDIUM, 5 LOW), 1 defer (CR60, to 13.1c), 13 dismissed, no HIGH. Findings written; nothing applied, committed or pushed. Row stays `review`. |
| v1.11 | 2026-11-06 | BigDev: "1" (apply every patch). Decision `-449` committed first, alone (`e4ca7981`); CR37-CR52 APPLIED, RED-proved as recorded in Review Findings round 3, verified on :5461. Nothing after `e4ca7981` is committed; `pnpm ci:local` NOT run; the PR's head is unchanged. Row stays `review`: `done` is set at landing. |
| v1.10 | 2026-11-06 | `bmad-code-review 13.1a` round 3, the round 2 fix diff `b54a3e2e..c69cc9f9`, one pass (BigDev: "one pass"): 1 decision-needed (CR37), 15 patch (CR38-CR52: 3 MEDIUM, 12 LOW), 0 defer, 9 dismissed, no HIGH. Findings written; nothing applied. CR37 resolved by BigDev: "1" (keep CR7, record it in `-449`). Row stays `review`. |
| v1.9 | 2026-11-05 | **Committed and pushed** — five commits (the decision entry `-448` alone first, then domain, API, admin console, records), PR #324; `pnpm ci:local` PASSED 38/38 at `2205ba20` on a fresh container (supersedes v1.8's "nothing committed / ci:local not run"). **Task 9.4 RE-RUN** in Chrome on the amended code: the Find flow, the 60 s auto-hide, Load more, keyboard-only, the truncated district list and the typed field, the District Admin, register → Review → Approve, all OBSERVED; the hidden-tab / tab-return legs SIMULATED (this tool cannot hide a tab); no screen reader, Safari or Firefox; DB and log swept clean (7/7 code reads preceded by an identity view). **The Panel's non-blocking keys-confirm note SENT** (BigDev's word, 2026-11-05; channel, time and whether it matches the draft not recorded; no ruling) — dated lines in the note and roster Row 48 leg (i). |
| v1.8 | 2026-11-05 | BigDev: *"for CR35 and CR1 apply the recommendation"* → **decision `2026-11-05-448`** written first (amends `-446` AD10 and AC11 (c) / AD13), then the code. **CR35:** the list's index is now `field_workers_pariwar_created_idx (pariwar_id, created_at DESC, field_worker_id DESC)` (migration `0201` edited in place; the story database's index swapped by hand; a fresh database migrated from zero matches it); `page.spec.ts` proves an ordered, Sort-free scan for three forms as both the owner and `twt_app`. **CR1:** the Find screen opens the audited identity panel ("Check details") and "Show code" lives only inside it. **CR36** (a double identity read on Approvals) found and fixed on the way. AD10, AC6, AC11 (c), Task 2.2 and the Policy meaning carry "amended by `-448`" pointers; the original text is kept as put. Row back to `review` (not `done`: nothing is committed or gated). Verified: admin 1,975, domain 465, API 376, gate 57, contracts 1,706, events 30; typecheck, lint and the microcopy gate clean; `pnpm ci:local` NOT run. |
| v1.7 | 2026-11-04 | `bmad-code-review 13.1a` round 2 — the IMPLEMENTATION, in three chunks (domain / API / admin), nine layer runs, ~92 raw findings → **2 decision-needed (CR1, CR35), 30 patch (7 MEDIUM, 23 LOW), 3 defer (CR32–CR34 → `deferred-work.md`), 23 dismissed**. BigDev: "apply all the findings" → CR2–CR31 APPLIED and verified (uncommitted; nothing pushed); CR8 surfaced CR35 (measured under `twt_app`: the list query Sorts; a re-shaped index measured as Sort-free — NOT applied). Row `in-progress` while CR1 / CR35 are open. `pnpm ci:local` not run. |
| v1.6 | 2026-11-04 | Task 9.4 RAN in this Mac's Chrome after BigDev connected it ("1"): register → approve → show code as a Pariwar Admin, and the District Admin's refusals and permitted reads; DB checked after; observed vs not observed in the Completion Notes. All tasks done; Status → `review`. |
| v1.5 | 2026-11-04 | `bmad-dev-story 13.1a`: review findings R1–R14 RESOLVED (governance first — `ee714c7d`, `b82094e8`, decision `-447` `99a01805` — then code `54ed242a` … `9f3666b1`); Tasks 0.1–8, 9.1–9.3, 10.1, 11 done; Task 9.4 (browser pass) — see v1.6; Task 10: ci:local 38/38 green at `9f3666b1` (run 3; runs 1–2 each failed one job, recorded in the Debug Log). Task 8.2's fixture warning corrected (R13) and Task 11 gains the roster line (R14). |
| v1.0 | 2026-11-04 | Created by `bmad-create-story 13.1a` on `story/13-1a-field-worker-approval-and-code-hand-over` (its own worktree, from `origin/main` `06bab925`). Three read-only research passes (domain + database; API + RBAC + gates; the admin web app) and the author's own reads. The headline finding: 13.1's `kyc_completed` and `activated` carry no authorization snapshot, so the epic's "the log records who approved and the authorization snapshot" needs a domain change (AD3). Build decisions AD1-AD14 and asks Q-1..Q-5 await BigDev (Task 0.2); the keys' Panel confirm is drafted at Task 0.5. Validated ONCE by a fresh-context read-only checker (19 findings: 3 HIGH, 8 MEDIUM, 1 LOW-MEDIUM, 7 LOW; each HIGH re-verified by the author against the code; all applied - see the `2026-11-04h` ledger entry). Not validated a second time. |
| v1.4 | 2026-11-04 | Records-only review round 1 at `ef6879a7`: 14 patch findings (2 HIGH, 10 MEDIUM, 2 LOW), 0 decision-needed, 0 defer, 2 dismissed. BigDev selected option 2, leave as action items; R1–R14 remain unchecked, no patches applied. Story and sprint row move to `in-progress` for unresolved review actions. Two synthetic-data helper reproductions ran; no implementation or application-suite pass is claimed. |
| v1.3 | 2026-11-04 | GOVERNANCE COMMITTED, on `story/13-1a-field-worker-approval-and-code-hand-over`, nothing pushed (BigDev: "all, commit and write the decision entry"): `b4ecfcfb` the story and its record edits (Task 0.0); `218a7424` decision `2026-11-04-446`, ALONE (Task 0.3); `1c3b6bce` Row 48 legs (h) and (i) dated lines and the Panel's key-confirm note, DRAFTED and NOT sent (Tasks 0.4, 0.5). The decision entry says plainly that only Q-1..Q-5 were put to BigDev one by one. Tasks 0.0, 0.2-0.5 ticked; Task 0.1 is the dev agent's first act. No AD, AC or Task text changed. |
| v1.2 | 2026-11-04 | Precision pass before the first commit: only Q-1..Q-5 were put to BigDev as asks (AD2, AD6, AD8, AD9, AD13); AD1, AD3, AD4, AD5, AD7, AD10-AD12 and AD14 are the author's, recorded on BigDev's instruction ("all, commit and write the decision entry") - the status text, the AD section heading and Task 0.4 now say so, and Task 0.4's line for leg (h) says DECIDED, not built. No AD, AC or Task changed. |
| v1.1 | 2026-11-04 | BigDev ANSWERED Q-1..Q-5 (Task 0.2), verbatim: "Q1 - Yes / Q2 - yes / Q3 - show decrypted name / Q4 - yes enough / Q5 - yes". Q-1 A (approve = identity confirmed AND activated, one step), Q-2 A (the three keys and holders as AD6), Q-3 A (names decrypted in the list, AD9), Q-4 A (a plain audited read is enough - no step-up), Q-5 A (the code is readable only while `active`). Every answer is the recommendation: AD1-AD14 and every AC / Task are UNCHANGED; only status text moved (header, the AD and ASKs sections, Task 0.2). Not yet done: the decision entry (>= `-446`, Task 0.3), the roster lines (0.4), the Panel confirm draft (0.5), the commit of the story and its record edits (0.0). |
