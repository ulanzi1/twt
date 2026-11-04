---
baseline_commit: 268d86b5
---

<!--
PINNED: `268d86b5` = `origin/main` (ledger 2026-11-03g — Story 13.2 LANDED, PR #322, `b7b43c47..ae4d9737`). The story lives on branch
`story/13-1-field-worker-identity-lifecycle-state-machine` in its OWN worktree
(`.claude/worktrees/13-1-field-worker-identity-lifecycle-state-machine`), created from `origin/main` on 2026-11-03. Every
`apps/` / `packages/` / `scripts/` claim was traced at the pin on 2026-11-03 by the create-story pass (two read-only research
passes, then the author's own greps; every NEGATIVE — "no `kyc_status`", "no PAN capture", "`identity_type` has one value",
"no route creates a principal" — was re-grepped by hand). Perishable — re-check at Task 0.1. Re-locate by FUNCTION, ⛔ by line.

STATUS: ready-for-dev (v1.19 — the v1.17 / v1.18 PATCH was reviewed by three fresh read-only reviewers (technical; governance;
consistency) and every finding applied on BigDev's "apply all". Before push, three unpushed decision commits were corrected by
autosquashed fixups (the tree after each squash was byte-identical to before): `-441`'s verbatim quote restored to "yet to be Join";
`-442` QE18 RESTORED to its v1.16 text (the v1.17 design is not folded into it) and its pre-push corrections disclosed; `-443`'s
readings narrowed to the options' own words. The author's later QE amendments are a NEW entry, `-444` (`86274245`), committed alone.
Final SHAs: `-441` `93b7e419`, `-442` `6a3172e4`, v1.16 `9c0050fc`, v1.17 `88243907`, `-443` `7cd400f2`, v1.18 `7fefe8dc`, `-444`
`86274245`. ⭐ `authorize` now takes `requirePermission`'s actor-bearing params; a shared pure `authorizingGrant` picks the grant and
`matchingGrantRole` is re-pointed to IT.)
v1.18 — THE PANEL RULED on the follow-up note (decision `2026-11-03-443`, by DR and KB, `7cd400f2`): Q-6 A
(consent, or a Pariwar Admin directly), Q-7 C (a new registration now, a link between the person's records LATER — carried as C11, no
row), Q-8 A (the fill-in is not enforced; the log records the authorisation), Q-9 A (the District Admin registers, the Pariwar Admin
approves, and does both if the District Admin is not available). Q-6 A, Q-8 A and Q-9 A match their build defaults; Q-7 C keeps the
build (a new registration, QE19) and adds a LATER link, carried as C11 — so NO AC or Invariant changes.
Q-6…Q-9 are DISCHARGED; only the counsel question is still unsent.)
v1.17 — VALIDATED a third time at `268d86b5` by four fresh-context read-only verifiers (code claims;
database + domain; governance + consistency; API + RBAC + tests); every finding applied on BigDev's "apply all findings" — see
the Change Log. ⭐ GOVERNANCE IS DONE: decision `2026-11-03-441` (the Panel's ruling, `93b7e419`) and the author-commit
`2026-11-03-442` (QE1–QE22, Q-2, Q-3, Q-4, `6a3172e4`) are COMMITTED, each alone, and the story was amended to them (`9c0050fc`).
Nothing this build waits on is open. Task 0.1 runs first; Task 0.4 (the roster row) is the only governance step left before code.
⭐ EVERY VERSION PARAGRAPH BELOW IS HISTORY: where one says a decision entry is "not written", an item is "PROPOSED", "awaiting
BigDev" or "open", or that `bmad-dev-story` "MUST STOP at Task 0.2", it is superseded by the v1.19, v1.18 and v1.17 paragraphs above.
v1.16 — BigDev REPLACED the move rule with CONSENT (2026-11-03): a District Admin no longer records a move alone;
one District Admin (EITHER end) opens a request at the worker's request and the other ACCEPTS or REFUSES it with a reason from a fixed
list; unanswered for 7 days it goes to the Pariwar Admin, never accepted by default; a Pariwar Admin may also move a worker directly,
for either reason. Row `13-1d-field-worker-move-requests-and-notices` MINTED for the request flow and for the notices (email AND
in-app; both District Admins are told of a Pariwar Admin's direct move). QE17 and Q-6 are rewritten; AC5's "either end" target STAYS
(the accepting District Admin may be at either end); C5 splits and C10 is added. No AC or Task of 13.1 changes. v1.15 — BigDev WIDENED the move rule (2026-11-03): the District Admin a worker is LEAVING may also record a move
at the worker's request, so a move gates on EITHER end (the destination or the current district); the notice to the District Admin who
loses the worker goes by BOTH email AND in-app (neither exists for District Admins today — 13.1c builds them). PROPOSED, awaiting
BigDev: tell the receiving District Admin too (SETTLED in v1.16: both District Admins are told — Story 13.1d). Nothing in this story's build changes beyond AC5's target. v1.14 — BigDev DECIDED two points of QE17 (2026-11-03): the Pariwar Admin is NOT blocked from the
"at worker's request" reason (the request may be placed with a District Admin or a Pariwar Admin), and the District Admin a worker
LEAVES is NOTIFIED (built with the move route, 13.1c; nothing in this story changes beyond its wording). v1.13 — BigDev REFRAMED THE DISTRICT (2026-11-03): workers must NOT be restricted to a district (a school near a
boundary would cost a second trip), so `district` is the REPORTING district — whose District Admin manages the worker — and nothing ties
where a worker recruits to it. It changes only when the worker asks (the RECEIVING District Admin or a Pariwar Admin records it) or when
the Pariwar Admin needs it (the Pariwar Admin alone): QE17 is rewritten, the `posted` event gains a REQUIRED `reason_code`
(`at_worker_request` | `reassigned`; QE12's sixth value is `reassigned`), a move gates on the DESTINATION district, and Q-6 and
Question 1 of the unsent Panel note are rewritten as "who may change the District Admin a worker reports to". No other decision
changed. v1.12 — BigDev ANSWERED the last asks (2026-11-03): QE22 APPROVED (the registration response withholds the
code — QE9, AC8, Task 7, TR11 follow; 13.1a's audited read is the only way an admin sees it); Q-3: "yes it states" — the form states
the purposes and records the worker's agreement (recorded on BigDev's word, the form unseen; counsel's first question falls away);
Q-4: No — no code has been handed out by hand. The Task 0.2 HALT is LIFTED: nothing this story waits on is still open. The v1.11
and v1.10 paragraphs are HISTORY wherever they call QE22, Q-3, Q-4 or Q-2 open. v1.11 — BigDev MINTED THE THREE ROWS ("mint 13-1a, 13-1b, 13-1c", 2026-11-03), so ASK Q-2 is DISCHARGED:
13-1a (approval, the by-hand code read, the admin screens — the critical path), 13-1b (the SMS — parallel; the DLT template is a long
lead), 13-1c (move, suspend, reactivate, terminate, the full log's read). BigDev also said the District Admin recruits, the Pariwar
Admin approves, and the code can be sent only once the worker is approved, so registration and approval are two steps — which
CONFIRMS QE21 as answered (option C stays out). NOT applied: QE22 (whether the registration response still shows the code) and the
B2 nod — BigDev has not answered them; QE22 now blocks nothing but this story's route shape, and B2 is 13-1a's. Still open: Q-3's
purposes and recorded agreement, Q-4, QE22; the unsent Panel and counsel notes. v1.10 — BigDev DESCRIBED THE ONBOARDING PROCESS (2026-11-03): the District Admin REGISTERS and the Pariwar
Admin APPROVES (the Pariwar Admin does both if the District Admin is unavailable); the worker's code goes to them BY SMS once they
are in the system, and a District or Pariwar Admin gives it BY HAND on the worker's request; "actual last day" is the date of
termination; the form is "Application for Field Worker", version 1. APPLIED: QE20 APPROVED — `terminated` carries `ended_on`,
projected into a nullable `ended_on` column with a pair CHECK (I1, I4, QE4, QE6, AC4, AC5, Errors table, Tasks 2.2 and 4);
QE21 ANSWERED — registration stays as built, approval is a LATER act by another officer (option C is OUT; the approval route is
Q-2's owner's); QE22 PROPOSED — withhold the code from the registration response; Q-9 (who approves) added and drafted as
Question 4 of the unsent follow-up Panel note; C9 (onboarding completion) carried; the Q-2 RECOMMENDATION written (13-1a approval
and code read, 13-1b SMS, 13-1c move / suspend / reactivate / terminate). Still open then: Q-2 (since discharged, v1.11), Q-3's
purposes and recorded agreement, Q-4, the B2 nod on QE21, and QE22. The v1.9 paragraph below is HISTORY where it calls QE20 / QE21
"proposed" and says no AC or Task changed.
v1.9 — BigDev ANSWERED the Q-3 form check and one more fact (2026-11-03). THE FORM says the Trust keeps a
worker's name and mobile number ELECTRONICALLY while they are employed and REMOVES them 8 years after the date of termination — so
retention is confirmed (the 8-year removal is now a dated obligation, C5) and the counsel question is narrowed again; purposes, the
recorded agreement and the form's version are NOT yet stated. THE IDENTITY CHECK is performed in the INTERVIEW, before registration —
so QE8's `kyc_completed` records something already done, and QE21 (PROPOSED, BigDev chooses A / B / C) reopens how registration
works. QE20 (PROPOSED): the date of termination is a date the admin supplies. No AC or Task changes until QE20 / QE21 are chosen.
BigDev also asked how a code is handed out TODAY: it is not — nothing in the system can issue one (Q-4). v1.8 — BigDev APPROVED QE18 on 2026-11-03 with TWO conditions: the role in the log must be a VERIFIED
authorization RESULT produced by the authorization check itself (not a handler assertion), and it is recorded as an authorization
SNAPSHOT. QE18 is rewritten: `acting_role` is replaced by an `authorization` snapshot (`permission_key`, `role`, `grant`, `target`,
`catalog_version`) that the RBAC core now produces through ONE shared predicate, carried on `request.authorizations[key]` and refused
by the domain if forged or not this act's; Task 8 gains the RBAC-core edit. Still open: Q-2, Q-3's form check, Q-4, and whether the
interview already verifies identity. v1.7 — BigDev APPROVED (2026-11-03) the revised district model — a CURRENT district changed by a seventh
event, `field_worker.posted` (QE17) — and QE19 (a move to another Pariwar is a new registration there); the follow-up Panel note for
Q-6 / Q-7 and the fill-in question is DRAFTED, ⛔ sent. BigDev ALSO told us how workers are recruited: they submit a PHYSICAL FORM,
are interviewed and recruited after ACCEPTING THE ORGANIZATION'S TERMS — all BEFORE anyone registers them in the system — so Q-3 and
the counsel question are rewritten and may fall away. The lines that treated `district` as immutable or the events as six are
REWRITTEN. QE18 (`acting_role`) then awaited BigDev's nod — given in v1.8, as an `authorization` snapshot. v1.6 — BigDev: field workers ROTATE between districts every few months and
will move between Pariwars; QE17's lifelong district was WITHDRAWN. v1.5 — the PANEL RULED on Q-1 and Q-5 (decision `2026-11-03-441`, by DR and KB): a District Admin may add a
field worker (the intended manager of field workers) and the Pariwar Admin fills in; the full log is kept; `active`-only credit is
CONFIRMED. So QE10's key is gated at `dimension: 'district'` and held by `district_admin` + `pariwar_admin`; QE17 (the worker's
district) and QE18 (the acting role in the log) are PROPOSED for BigDev; ACs and Tasks amended; Q-1 and Q-5 DISCHARGED; Q-2, Q-3 and
Q-4 are still open. v1.4 — BigDev SETTLED QE11 on 2026-11-03 ("approved and settled — the implementation rule is active only"), so
Q-5's BUILD rule is settled; the Panel note (Question 1 = Q-1, Question 2 = Q-5's non-blocking confirm) and the counsel question
(Q-3) are DRAFTED, ⛔ sent; Q-2 and Q-4 are BigDev's own and unanswered; pasted text from the private legal corpus was replaced by
section citations (`ulanzi1/twt` is public). v1.3 — BigDev APPROVED QE1–QE16 on 2026-11-03, in session, as listed ⭐ with QE10 = the
per-act key `field_worker.register` and QE12 = the neutral reason codes; Q-1…Q-4 were still open; AC6 and AC10's ordering contract corrected.
v1.2 — created v1.0 by `bmad-create-story 13.1`; validated v1.1 by ONE fresh-context read-only checker
(147 tool calls): 0 critical / 2 high / 13 medium / 11 low; validated AGAIN v1.2 by a second pass of three read-only verifiers
(code + database, API + the 13.2 door, governance + policy) plus the author's own consistency read: 31 findings, 0 critical, all
applied. Each finding that changed substance was re-verified against the repo by the author, then applied. The build decisions
QE1–QE16 are APPROVED in session (the decision ENTRY is Task 0.3's, and is not written yet); ASKs Q-2, Q-3 and Q-4 are still
OPEN (Q-1 and Q-5 are RULED by the Panel — decision `-441`) — BigDev answers them at Task 0.2. `bmad-dev-story` MUST STOP at Task 0.2 and write NO code until BigDev has answered them;
⭐ Task 0.1 runs FIRST).

⭐ ORDER NOTE: 13.2 was built BEFORE 13.1 (it needs this story's table only for a foreign key). So 13.1 is the registry's FIRST
caller, and it inherits obligations that the epic's own AC text does not carry — read the "INHERITED FROM 13.2" block under
Story 13.1 in `epics.md` and "Deferred from: story 13-2-…" in `deferred-work.md` (C1, C2, C6, C7) BEFORE the ACs below.

GLYPH REGISTER: `⛔` NEGATES the word or phrase it precedes · ⭐ = action / emphasis · ⚠ = hazard. In ACs, Invariants, Tasks and
Traps, negations are written in PLAIN WORDS ("No …", "Do NOT …"), so a skim cannot invert them.

ADDRESSING RULE: never cite file:NNN into `.decision-log.md`, `deferred-work.md`, `epics.md` or `sprint-status.yaml` — they are
newest-first / growing files. Cite the decision id + clause, the item heading, or the row block. Code is cited by path + FUNCTION.

NUMBERS — traced 2026-11-03 across main, every worktree and the local refs. RE-GREP at Task 0.1 AND at each numbered commit:
- Migrations: main's highest is `0199_field-worker-attribution-codes` (journal idx 199, `when` 1796787600044). This story takes the
  next free number ≥ `0200` with a `when` ABOVE every sibling's (house step +86400001 ⇒ `1796874000045` if `0200` is free; a
  lower `when` behind a higher one is skipped by drizzle on a shared DB). ⚠ `0200` is CONTENDED: `story/6-22b-…` planned `0199`
  and must renumber, `story/14-3-…` holds a `<MIG>` placeholder, `story/6-39-…` plans three. The number follows the MERGE order.
- Decisions: main holds up to `2026-11-02-439`; `-440` is minted on `story/6-22b-…` (not landed). `-441` (the Panel's ruling on
  Q-1 / Q-5, `93b7e419`), `-442` (this story's author-commit, `6a3172e4`) and `-443` (the Panel's ruling on Q-6…Q-9, `7cd400f2`) are
  COMMITTED on this branch, and `-444` (the author-commit amending `-442`'s QEs, `86274245`) ⇒ any NEW decision this story writes
  takes ≥ `-445` (re-grep every ref first). No decision `-431`…`-440` mentions field workers or attribution.
- RBAC: `PERMISSION_CATALOG_VERSION = 58` at the pin. This story moves it by exactly ONE: the Panel ruled (`-441`) that a District
  Admin and a Pariwar Admin may add a field worker, so the key is minted. ⚠ CONTENDED: `story/14-3-…` mints `breach.manage` with a
  `<CAT>` placeholder — the bump is +1 from whatever `main` holds when this lands (58 → 59 today; 59 → 60 if 14.3 lands first).
- Ledger — TWO ledgers live in `sprint-status.yaml`: the top `# last_updated:` comment block (newest `2026-11-03g`) and the YAML key
  `last_updated: >-` block (newest `2026-11-03e`; 13.2's `f` / `g` went to the top block only). No other ref holds a `2026-11-03*`
  line ⇒ this story's entry is `2026-11-03h`; the create-story pass wrote it to the top block and a short `h` line to the key
  block; the v1.17 validation took `2026-11-03i`, v1.18 `2026-11-03j` and v1.19 `2026-11-03k`. Task 12 does the same for its own entry (re-grep the letter first).
- ADR: highest `ADR-0044`; this story proposes none. Roster (`docs/launch-gate-inventory/inventory-roster.md`, highest row on main
  `47` — re-grep the next free number): one go-live-fence row is proposed at Task 0.4 (nine legs, (a)–(i); 46 is reserved by 6.39 / 14.3 — take ≥ 48 unless 46 is confirmed free).

LETTERS: G = found facts · QE = build decisions (APPROVED 2026-11-03) · Q = asks that are BigDev's / the Panel's · I = invariants ·
TR = traps · C = carried to a sibling story.
-->

# Story 13.1: Field Worker Identity + Lifecycle State Machine `[PRIMITIVE]`

Status: review

## ⭐⭐ WHAT THIS STORY IS, IN ONE PARAGRAPH

A **field worker** (Vikram) is a part-time paid recruiter — engaged as an independent contractor (PRD §4.14.1; the classification is
still open with counsel, §0 edge 5), ⛔ a member — who brings teachers into the Trust and is credited through a 6-digit code. (The
UX spec gives a field worker a second job, visiting a claimant — G17, C8; this story's lifecycle governs CREDITING only.) Workers are recruited the way the organization already does it: they submit a
PHYSICAL FORM, are interviewed and are recruited after ACCEPTING THE ORGANIZATION'S TERMS (BigDev, 2026-11-03) — all BEFORE an
administrator registers them here, so registering records a person already engaged; it is not how they are asked or told. Story
13.2 built the code registry; this story builds **the person the code
belongs to**: a Pariwar-scoped `field_workers` record holding the worker's name and mobile as encrypted data, and a lifecycle
`pending_kyc → active ⇄ suspended → terminated` that is derived **only from `events_log`** — the **seventh** event-derived-state
primitive after member (3.1), claim (6.1), pool (7.1), alert (8.1), helpdesk (10.1) and module (12.1). It also adds the
foreign key 13.2 left open, and the ONE admin route that registers a worker and allocates their code in the same transaction —
the registry's first caller.

It does ⛔ build: a worker login, any screen, the other lifecycle routes (approval, suspend, reactivate, terminate, move),
commission, KYC machinery, PAN or bank capture, an erasure flow, or the member-signup wiring. Several of those had **no owner
anywhere in Epic 13** until BigDev minted Stories 13.1a, 13.1b, 13.1c and 13.1d (ASK Q-2, discharged 2026-11-03) — that was the
story's most important finding.

## ⭐ Names at a glance

| Thing | Name |
|---|---|
| Domain folder / namespace | `packages/domain/src/field-worker/` — `export * as fieldWorker from './field-worker/index.js'` (⛔ `packages/field-worker-lifecycle`, QE1) |
| API folder | `apps/api/src/modules/field-worker/` — beside 13.2's door `attribution-code-access.ts` |
| Table / drizzle export | `field_workers` / `fieldWorkers` (`packages/domain/src/schema/field_workers.ts`) |
| Enums (domain tuples → pgEnums) | `FIELD_WORKER_STATES` → `field_worker_state` (`pending_kyc`,`active`,`suspended`,`terminated`); `FIELD_WORKER_KYC_STATUSES` → `field_worker_kyc_status` (`pending`,`completed`); `FIELD_WORKER_REASON_CODES` → `field_worker_reason_code` (six neutral values, QE12: `under_review`, `at_worker_request`, `left_voluntarily`, `inactive`, `registered_in_error`, `reassigned`) |
| Brand | `FieldWorkerId` / `ids.fieldWorkerId` — ALREADY exists (13.2). ⛔ mint a second one |
| Guard session var | `app.field_worker_state_writer` |
| Trigger fn / trigger | `field_workers_reject_unguarded_state_write()` / `field_workers_state_write_guard` (BEFORE INSERT OR UPDATE … FOR EACH ROW) |
| Delete / truncate guard (I10) | `field_workers_reject_delete()` / `field_workers_no_delete` (BEFORE DELETE FOR EACH ROW) and `field_workers_no_truncate` (BEFORE TRUNCATE FOR EACH STATEMENT) — P0001 with the direct-write prefix |
| Direct-write error | `FieldWorkerStateDirectWriteError`, `FIELD_WORKER_STATE_DIRECT_WRITE_CODE = 'field_worker.state_direct_write_rejected'`, `…_MESSAGE_PREFIX = 'field_workers direct write rejected'`, SQLSTATE `P0001` |
| RLS policies | `field_workers_tenant_isolation_{select,insert,update}` (per-command, ⛔ `FOR ALL`) |
| Named constraints | `field_workers_pariwar_worker_uq` (the FK target, C1), `field_workers_pariwar_mobile_live_uq` (partial), `_state_reason_pair`, `_state_reason_subset`, `_active_needs_kyc`, `_registered_by_display_nonblank`, `_district_nonblank`, `_ended_on_pair` |
| New composite FK (on 13.2's table) | `field_worker_attribution_codes_worker_fk` — `(pariwar_id, field_worker_id)` → `field_workers`, `ON DELETE NO ACTION` |
| Events (single-dot snake_case) | `field_worker.registered`, `.kyc_completed`, `.activated`, `.suspended`, `.reactivated`, `.terminated`, `.posted` (the seventh — a move to another district, QE17; ⛔ the epic's `kyc-completed`, QE6) |
| Projector fns (the only writers; not re-exported) | `projectFieldWorkerGenesis`, `projectFieldWorkerTransition` (`field-worker/project.ts`) |
| Commands | `registerFieldWorker`, `recordFieldWorkerKycCompleted`, `activateFieldWorker`, `suspendFieldWorker`, `reactivateFieldWorker`, `terminateFieldWorker`, `postFieldWorker` (`field-worker/commands.ts`) |
| FR-85 contract for callers | `acceptsNewAttributions(state)` (pure) · `getFieldWorker` · `listFieldWorkersForPariwar` (both return `FieldWorkerView` — ⛔ the three PII columns) · `getFieldWorkerStateAt` |
| Duplicate-mobile accessor and constants | `findLiveFieldWorkerByMobileIndex` (`field-worker/read.ts`; filters `current_state <> 'terminated'` — the partial index's predicate — with an explicit `pariwar_id`) · `FIELD_WORKER_PKEY_CONSTRAINT = 'field_workers_pkey'` · `FIELD_WORKER_MOBILE_LIVE_CONSTRAINT = 'field_workers_pariwar_mobile_live_uq'` (Task 6) |
| District (QE17 — approved: the REPORTING district — whose District Admin manages the worker, NOT a work area; changed only by `field_worker.posted`, which carries a required reason) | `field_workers.district` — text NOT NULL, a LISTED district; CHECK `field_workers_district_nonblank`; `assertDistrictRecorded` (`field-worker/read.ts`); `FieldWorkerDistrictUnknownError` → 422 `field_worker.district_unknown` |
| Authorization snapshot in the log (QE18, approved) | event payload key `authorization` = `{ permission_key, role, grant: { dimension, value /* null iff global */, grant_id? }, target: { dimension, value }, catalog_version }` on `registered` and `posted`; produced ONLY by the RBAC check (`rbac.requirePermission` → `VerifiedAuthorization`), carried on `request.authorizations[key]`, never recomputed |
| Tier-2 field class (new) | `FIELD_WORKER_MOBILE_FIELD_CLASS = 'field_worker_mobile'`; Tier-1 class `FIELD_WORKER_FIELD_CLASS = 'field_worker'` (`encryption/field-classes.ts`) |
| Route | `POST /api/v1/p/:pariwarId/field-workers` — handlers/routes in `apps/api/src/modules/field-worker/` |
| Permission key (QE10 approved; holders RATIFIED by the Panel, `-441`) | `field_worker.register` — `district` dimension (value = the worker's district, QE17); held by `district_admin` (own district) and `pariwar_admin` (any district in its Pariwar — the fill-in) (+ `super_admin` derived). No other field-worker key is minted here: every other per-act key is minted by the story that builds its route — approval and the code read by 13.1a (C9); the direct move, suspend, reactivate and terminate by 13.1c (terminate waits on 13.6's C4); opening and answering a move request by 13.1d (C10). 13.6 adds only the labelling reason values. ⚠ `field_worker.register` is also the genesis event's `trigger` string (QE6) — two different things (a permission key vs an event-payload value); never conflate them in a test or a grep |
| Gate | `scripts/field-worker-state-invariant/` · scripts `field-worker-state:{check,test}` |
| Migration | `packages/domain/migrations/NNNN_field-workers.sql` (NNNN ≥ `0200`, re-grep) |

## Story

As **Solo Builder authoring the field-worker primitive**,
I want **a field-worker identity + lifecycle state machine consuming Story 1.3's event log**,
so that **field-worker state is event-derived and audit-replayable — and the registry from 13.2 finally has someone to belong to.**

## 📜 Policy meaning (AI-10-1)

**This story introduces ONE predicate that gates a benefit, and the benefit is the field worker's, ⛔ a member's:** *"is this
field worker currently allowed to be credited with new members?"* (FR-85). It fixes the states that predicate reads and the
sentence every later reader must use — ⚠ **AS BUILT INTO THE PREDICATE** (`acceptsNewAttributions` and `getFieldWorkerStateAt`):
the worker sentence below carries QE5 and the Q-5 (A) rule, which BigDev settled for the build on 2026-11-03 (QE11) and the Panel
CONFIRMED (Question 2 A, decision `-441`). ⚠ 13.1 records no credit: the sentence becomes true only when Story 13.8 (and 13.5's
backfill) apply the predicate AS OF THE CAPTURE (C2). One clock edge is stated in AC10 (8): a transition counts from the moment its
transaction BEGAN, so a signup that starts while an activation is still committing reads as active.

*In the field worker's terms (AS BUILT INTO THE PREDICATE — Q-5 (A), CONFIRMED by the Panel, `-441`):* **"You are credited with new members only while the Trust has verified
you and you are active; while you are suspended you are not credited with new members, and you are again once you are
reinstated — but a signup made while you were not active is not credited to you afterwards; once you are terminated you are not
credited with new members again — and the members already credited to you stay credited."** These states
control CREDITING only: they revoke no access and gate no dispatch (C8).

*In the member's terms:* **"Who introduced you never changes what you are covered for — if your introducer is no longer active,
you are a member in full; only the credit to them is not recorded."** (Whether a member is told anything at all when a code is
not credited is a Panel question — it discloses a third person's status — raised by Story 13.8 (C2); it must never block or
delay a signup.)

⚠ **What this sentence does NOT say — deliberately.** Whether money a worker has already earned is still paid after a
suspension or termination is **not decided here**: no PRD, architecture or epic text answers it (PRD FR-85 says only "existing
attributions preserved"), 13.6 says only that "commission rights withholding requires audit-attributable human decision". It is
the Panel's question (§0 edge 6) and it belongs to 13.5 / 13.6. The lifecycle state this story stores does ⛔ move any commission
right (I12).

⚠ **Terminated is final for that registration** (QE5). The AI-10-1 rationale — Story 10.10 made every suspension a de-facto
permanent ban — is the reason `suspended` has a way back (`reactivated`) and `terminated` has a stated, separate meaning: a
terminated worker who is taken back is a NEW registration with a new id and a new code, never a reversal. The cost is real and
recorded: a worker terminated in error has no restore path in this story (C4 hands the question to 13.6, before any
termination route exists).

**Checked against the Niyamavali** (the git-ignored private copies in the main checkout, grepped 2026-11-03):
- `docs/legal/niyamavali.md` for `field.?worker|commission|referr|attribution|introduc|recruit|agent|representative|volunteer|remunerat|honorari|stipend|payee|employee|staff`.
- `docs/legal/niyamavali.hi.md` for प्रेरक|कमीशन|संदर्भ|परिचय|भर्ती|एजेंट|प्रतिनिधि|स्वयंसेवक|मानदेय|पारिश्रमिक|कर्मचारी.

**Result: SILENT.** The only hits are unrelated: the DPDPA-rights row, moderation ground 5 (about abuse toward people connected with
the Trust — not field workers) and the reason-code paragraph. (Cited by section only: `ulanzi1/twt` is public and the legal corpus
is kept out of it on purpose — [[project_legal_corpus_private_repo_split]] — so no text from it is pasted into this file.) No clause covers field workers, commission or referral credit. The
Niyamavali is a rulebook, ⛔ a ratified spec ([[feedback_niyamavali_rulebook_not_spec]]) — so "silent" is a finding, not a blocker.

**Checked against the Privacy Policy** (private copy, same date): §1 names the Data Fiduciary's scope as the personal data of
Members, nominees and claimants (stated here as coverage, not quoted). **A field worker is none of the three.** No row of §3 (what
we collect) or §8 (retention) names a field worker's name, mobile, PAN or bank account. ⇒ the legal basis and the notice for the
data this story stores are **unaddressed by any RATIFIED text** — but the physical form and the terms a worker accepts at recruitment
may already carry them — BigDev confirmed on 2026-11-03 that the form tells the worker the Trust keeps their name and mobile number
electronically while they are employed and removes them 8 years after the date of termination (the session has NOT seen the form) —
§0 edge 5, ASK Q-3.

## The rulings and sources this story builds on (quoted, never paraphrased)

| Source | Verbatim | Status |
|---|---|---|
| epics.md Story 13.1 AC | "field worker schema carries: `field_worker_id`, `pariwar_id`, `name`, `mobile`, `kyc_status`, `attribution_code` (Pariwar-scoped 6-digit; FK to Story 13.2 codes table), `state` (`pending_kyc \| active \| suspended \| terminated`), `created_at`, `audit_id`" · "state transitions emit events: `field_worker.registered`, `field_worker.kyc-completed`, `field_worker.activated`, `field_worker.suspended`, `field_worker.reactivated`, `field_worker.terminated`" · "persisted state column never directly UPDATEd" | epic text — ⚠ SUPERSEDED in part (QE1, QE6, G2) |
| epics.md "INHERITED FROM 13.2" under 13.1, C1 | "`field_workers` carries ⛔ **no** `attribution_code` column … This story's migration adds `FOREIGN KEY (pariwar_id, field_worker_id) REFERENCES field_workers (pariwar_id, field_worker_id) ON DELETE NO ACTION` on `field_worker_attribution_codes` (needs `UNIQUE (pariwar_id, field_worker_id)` on `field_workers`). A field worker holding a code is ⛔ never deleted — erasure anonymizes" | landed with 13.2 — binding |
| same, C1 (cont.) | "Call `allocateAttributionCodeForRequest` … in the SAME tx as the worker insert. On `AttributionCodeAllocationExhaustedError`, the catch calls `flagAllocationExhaustedForRequest` … and rethrows … Resolve the admin's `users.display_name` FIRST … `AdminDisplayNameMissingError` (⛔ fallback) … AUTHORIZATION is this story's route: `requireAdminSession` → `scopeResolutionHook` → `requirePermissionHook(<the field-worker key, Panel-ratified under `2026-06-21-059` amendment B(3)>)` BEFORE either call." | binding |
| same, C2 / C6 / C7 | C2: "`resolveAttribution` returns the code's HOLDER, ⛔ the holder's eligibility. FR-85's *'new attributions on deactivated code rejected'* is a check on THIS story's lifecycle state, made by whoever records an attribution." · C6: "Task 0 re-asks BigDev *'has any code been handed out by hand?'*" · C7: "Story 13.1's route review checks: ⛔ re-export of a door wrapper; ⛔ relative import of `apps/api/src` from `apps/public` / `apps/jobs`; ⛔ a new writer of the request context's Pariwar." | binding |
| PRD FR-81 / FR-85 | FR-81: "Code generated on admin 'Add Field Worker.' Unique per Pariwar." · FR-85: "Field worker can be deactivated; existing attributions preserved; new attributions on deactivated code rejected." | PRD |
| PRD §2.4 (Vikram) | "he gets a 6-digit attribution code, an admin-app login, and a target list … Comp gates on (a) full KYC, (b) ₹110 paid, (c) first valid contribution" | PRD — the "full KYC" gates the RECRUITED member, ⛔ Vikram |
| PRD §4.14 (statutory) | "field workers are **independent contractors**, not employees, but TDS still applies … PAN required from field worker" | PRD |
| Decision `2026-06-21-059` amendment B (3) (Trustee-ratified) | "Future permission additions for Finance Officer, Media/Comms, Field Worker, and Helpline Operator are to be ratified when their feature sets ship." | ratified — see §0 edge 4 (⚠ its reading is OPEN) |
| Decision `2026-09-08-210` cl.2 (Trustee-ratified) | NOT delegated: "anything touching `PERMISSION_CATALOG_VERSION`, a role, or a permission key · … · ⛔ any status whose meaning reaches a **member**." | ratified — a key is never a silent mint |
| Decision `2026-11-01-433` QE2; `2026-10-30-421` QE6 / QE14 (A) | `module.manage` was recorded by an AUTHOR-COMMIT (BigDev) — "the key `module.manage` is the author's, RECORDED here"; `-421` built the re-homed-actor calls on the recommendation and put them to the Panel as a NON-BLOCKING confirm | author-commit precedents |
| Decision `2026-10-30-422` Consequence 1; `2026-11-01-438` DL6 | `-422`: "`-421` QE5 (A), QE6 (A) and QE7 (a) are CONFIRMED by the Panel as built — ⛔ change to the build." `-438` DL6: "Two permission keys MINTED here (outside `-210`'s delegated mint …; the `-421` QE6 / `-433` QE2 precedent): `claim.flag_fraud` (dimension pariwar; seeded `helpline_operator` …) and `claim.record_fraud_finding` (dimension district; seeded `district_admin` …)" | the Panel once confirmed an author-commit key "as built"; `-438` minted a key for a B(3) role (`helpline_operator`) the same way — evidence for Q-1 |
| Decision `2026-11-03-441` (Trustee-ratified) — Q1 / Q2 | "by DR and KB / Q1 - Go with option A and also  District Admin may add a field worker. The goal is District Admin will manage field workers, however if District Admin is unable to discharge his duties for any reason, including District Admin is yet to Join, Pariwar Admin will fill in. Keep the full log of field worker. / Q2 A" | RULED — §0 edges 4 and 11, QE10, QE17, QE18, I15 |
| Decision `2026-11-03-442` (author-commit, `6a3172e4`) | QE1–QE22 and Q-2 / Q-3 / Q-4 as recorded; §0 (3): the key's HOLDERS are ratified by `-441`, its `district` dimension is the author's; **Supersedes** `-441` build reading item 2 ("later acts gate against the current district") for a MOVE only | committed — the build record |
| Decision `2026-11-03-443` (Trustee-ratified, `7cd400f2`) — Q1…Q4 of the follow-up note | "by DR and KB / Q1 A, Q2 C, Q3 A, Q4 A" | RULED — Q-6 A (QE17), Q-7 C (QE19, C11), Q-8 A (QE18), Q-9 A (QE21) |
| Decision `2026-09-29-270` (Story 6.19b) | `rbac.matchingGrantRole` — the role of the grant that authorised an act: most specific scope first (`district` → `state` → `pariwar`), `global` last | built — QE18's `authorize` uses its order (TR13) |
| Trust Deed Cl. 20(h) (draft, NOT executed, binds nothing — private repo `twt-legal`, cited by clause only); PRD §11 and OQ-5 | Deed: the clause is the Trustees' power over the Trust's service providers (appointing, paying and removing them) — read it in the private copy before relying on it. PRD §11: Trust Staff own "field-worker dispatch coordination"; OQ-5 (the recruitment plan) — *Owner:* "Trustee Panel + Solo Builder" | evidence for Q-1 and §0 edge 4 — who may add / remove the people the Trust pays |
| Privacy Policy §1 (private copy, cited by section only) | §1 scopes the Data Fiduciary's duty to Members, nominees and claimants | draft policy — field workers are outside it |
| architecture §2.7 / §2.12 | Tier 1: "Mobile, email, Aadhaar number, DOB, address, nominee bank account …"; Tier 2: "eHRMS ID, member name (for search and dedup)"; "new PII fields declare their tier at schema definition"; retention matrix names "field-worker payout records" (no horizon; the matrix "does ⛔ NOT live in this repo") | architecture |
| Story 3.6b D2 (done) | the Reference Code is a capture-and-defer seam: "NO validation against an allocation registry … Epic 13 backfill/consume `attribution_source`" | done — ⛔ touched here |

### §0 — whose decision is this (`trustee-panel-routing-note-TEMPLATE.md` §0, per edge)

| # | Edge — stripped of citations | Verdict |
|---|---|---|
| 1 | Where the code lives (domain folder, not a package) | **Yours** — QE1. |
| 2 | Event spellings, state labels, column names | **Yours** — QE6, QE16. |
| 3 | Which lifecycle routes exist in this story | **BigDev's sprint scoping**, ⛔ the Panel's — ASK Q-2, ANSWERED: Stories 13.1a, 13.1c and 13.1d own the other routes. |
| 4 | *"Who in the Trust may add the people it pays to bring in members — and must the Panel ratify the permission for it?"* | ⚠ **Possibly the Panel's.** `-059` B(3) says field-worker permission additions "are to be ratified when their feature sets ship"; `-210` cl.2 forbids a silent mint; yet `-433` / `-421` / 10.3 minted keys by author-commit (10.3 for a B(3) role). The narrower reading — "B(3) governs keys held BY the field-worker role; this key is held by `pariwar_admin`" — is a **reading**, and a ratified clause is never re-read to fit ([[feedback_supersede_never_reinterpret]]). ⇒ ASK **Q-1** — **RULED by the Panel, decision `-441` (2026-11-03): option A, widened — a District Admin may add, the Pariwar Admin fills in; the key's shape is QE10 (the per-act `field_worker.register`); the full log is kept.** |
| 5 | *"On what footing may the Trust hold a field worker's name and phone number — and what must it tell them?"* | **Counsel's (Story 0.13), a go-live gate — ⛔ 13.1's, and ⛔ a Panel note** (the roster Row 19 precedent: *"S — counsel, Story 0.13, go-live gate, never a Panel note"*). A LEGAL / consent BASIS for someone's data. Nothing ratified covers a non-member contractor (Privacy Policy §1) — but workers submit a physical form and accept the organization's terms BEFORE they are registered, and BigDev CONFIRMED (2026-11-03) that the form ("Application for Field Worker", version 1) states the purposes, records the worker's agreement and states the retention — on BigDev's word, the form unseen (Q-3); and the contractor classification itself is open with counsel (`docs/legal-counsel-engagement/review-scope-charter.md` §4: "Independent-contractor vs employment classification"). 13.1 builds the minimum (name + mobile, encrypted, in no event payload), sends nothing anywhere, and carries a GO-LIVE fence (merge ≠ go-live, [[project_not_in_production_merge_is_not_golive]]) — ASK **Q-3**. |
| 6 | *"If a worker is suspended or terminated, is money they already earned still paid?"* | **Panel's — ⛔ 13.1's.** What the Trust OWES a person. Stored nowhere here; carried to 13.5 / 13.6 (C3, C4). |
| 7 | Terminated is final; re-engaging = a new registration | **Yours, cost recorded** — QE5. The additive direction is cheap (a `restored` event later); the reverse is not. ⭐ It is yours because NO production writer of `terminated` exists (Q-2): for MEMBERS the Trust has `member.restore_terminated` plus an appeal, and 13.6's AC says a field-worker termination is "analogous to Story 10.10 moderation pattern" — C4 hands reversibility and appeal to 13.6 BEFORE any termination route exists, and C5 says to build none until C4 is recorded. |
| 8 | The reason-code vocabulary | **Yours, as an AUTHOR-COMMIT — ⛔ under `-210` cl.2's delegation.** That delegation needs ALL THREE conditions (an enum ADDITION to a TRACKING vocabulary; no member-facing change; no governance authority). A brand-new product enum is not an addition to a tracking vocabulary, so the delegation is ⛔ claimed; BigDev records the values in the Task 0.3 entry (QE12). (Only condition (a) fails — (b) and (c) hold — but a delegation needs all three.) BigDev chose the NEUTRAL values (QE12, approved): `conduct_concern`, `conduct` and `fraud_confirmed` would label a person in an append-only stream that survives erasure, no production writer exists yet (Q-2), and a pgEnum value is not cheaply removed. 13.6 adds the labelling values with the writer that uses them, under its own governance check. |
| 9 | What `kyc_completed` attests for a worker | **Yours, cost recorded** — QE8. It is an operator's recorded act; nothing is disclosed by it. It GATES activation (`activated` requires it), and activation gates crediting and so, later, pay — so what "verified" requires is 13.5's decision, made with the Panel's money rules (C3). |
| 10 | Whether a terminated worker's mobile may register again | **Yours** within one Pariwar (QE4); a cross-Pariwar block is a trustee decision per 13.6 and is ⛔ built. |
| 11 | *"A worker who is registered but not yet activated — are signups under their code credited to them?"* | ⚠ **BigDev's, possibly the Panel's.** It decides who is credited and so, later, paid; FR-85 says only "deactivated" and `pending_kyc` is not that ⇒ ASK **Q-5**, the one place the question, the deciding fact and the costs are written. **BUILD RULE SETTLED by BigDev, 2026-11-03 (QE11), then CONFIRMED by the Panel (Question 2 A, decision `-441`).** |

## FOUND FACTS (G) — traced at `268d86b5`, 2026-11-03

- **G1 — Home and twin.** All six prior primitives live in `packages/domain/src/<area>/`; there is no per-primitive package
  (3.1 refused `packages/member-lifecycle`; 12.1 QE1; 13.2 AT1). Domain owns schema, reducer and projector because the drizzle
  globs, every `*-state-invariant` gate's scan root and `domain-accessor-invariants` read only `packages/domain/src`, and
  `@twt/events` depends on `@twt/domain` (a reverse import is a cyclic turbo graph). `packages/field-worker-lifecycle` does not
  exist. **The closest twin is `packages/domain/src/marketplace/` as it stands at HEAD (12.1 + 12.2, ~3,000 lines) — copy the
  SHIPPED code, ⛔ the 12.1 story text: four review rounds changed `commands.ts` (SAVEPOINT before the row lock, READ COMMITTED
  requirement, typed conflict errors).** Its gate is `scripts/marketplace-module-state-invariant/`.
- **G2 — What 13.2 built (the thing this story attaches to).** Table `field_worker_attribution_codes` (migration `0199`: `UNIQUE
  (pariwar_id, code)`, `UNIQUE (field_worker_id)`, append-only for every role by trigger, `GRANT SELECT, INSERT`, per-command RLS,
  ⛔ FK on `field_worker_id`), table `attribution_code_allocation_flags` (`actor_id`, `actor_display NOT NULL`), domain module
  `packages/domain/src/attribution-code/` (`attributionCode` namespace), brand `FieldWorkerId` in `ids/index.ts`, and the API
  door `apps/api/src/modules/field-worker/attribution-code-access.ts`. A repo-wide **reach fence**
  (`apps/api/tests/unit/attribution-code-reach-fence.test.ts`) fails any file outside the module and an ALLOWED list that names
  `attributionCode`, the two tables, `resolveAttribution`, `allocateAttributionCode`, `readAttributionCodeForFieldWorker`,
  `flagAllocationExhausted` or `listAllocationFlags` — as an identifier OR as string text — or imports a path containing
  `attribution-code` (the door, imported from `apps/api/src`, is exempt).
- **G3 — The door.** Eleven pinned exports: five wrappers — `resolveAttributionForRequest`, `readAttributionCodeForRequest`,
  `allocateAttributionCodeForRequest(request, scopeTx, { fieldWorkerId }, opts?)`, `listAllocationFlagsForRequest`,
  `flagAllocationExhaustedForRequest(deps, request, { attempts })` — and six error classes re-exported BY NAME. It takes the
  Pariwar ONLY from `request.requestContext.pariwarId`, checks the caller's `ScopeTx` is scoped to the same Pariwar, and the
  domain re-proves it on the connection. It does **not** authorize. `flagAllocationExhaustedForRequest` resolves
  `users.display_name` itself and opens/commits its OWN scope tx (the registration's tx rolls back around it).
- **G4 — 13.2's tests that this story BREAKS (the new FK).** Every one fabricates a `field_worker_id` with `randomUUID()`:
  `packages/domain/tests/integration/attribution-code/{_fixtures.ts (seedCode), allocate.spec.ts, resolve.spec.ts,
  allocate-concurrency.spec.ts, handle.spec.ts}`, `…/rls/field-worker-attribution-codes-policy-regression.spec.ts` (⚠ it PINS
  "no FK": its AC1 test asserts `contype IN ('u','f')` returns exactly the two UNIQUEs), the
  `…/multi-tenant/cross-pariwar-leak.spec.ts` block, and `apps/api/tests/integration/attribution-code-access.spec.ts`.
  ⚠ `allocate-concurrency.spec.ts` COMMITS code rows to a fresh Pariwar and removes them in `afterAll` under
  `session_replication_role = 'replica'` — an aborted run leaves ORPHAN rows, and a plain FK add then fails with 23503 (TR2).
- **G5 — The principal model: a field worker is not, and has no, login.** `users` (`identity_type` enum has ONE value, `'admin'`;
  `display_name` plaintext by a ratified decision, Story 6.11 R5) + `admin_credentials` (email ciphertext + blind index +
  password hash; passkey second factor) + `role_grants` (`user_id` FK, `role` text, `scope_dimension`, `scope_value` — "for
  `self` it is the owner id"). `users` has no `member_id`. **No route creates a `users` row or a `role_grants` row**: the only
  writers are `createAdminAccount` (called, outside tests, only by `scripts/provision-admin.ts`) and that script's raw INSERT.
  Member login keys on `member_identities` and needs a `members` row. ⇒ a non-member field worker can use neither login path
  today. The `field_worker` role bundle is `permissions: []`, `scopeCeiling: 'self'`. ARCH §2.3 puts "Vikram-class field-worker
  dispatch" on the admin login (email + password + WebAuthn passkey, "mandatory"). *INFERENCE (labelled):* the existing `self`
  scope already links a principal to a worker without a column — a grant `(user_id, role='field_worker', scope_dimension='self',
  scope_value=<field_worker_id>)` — so `field_workers` needs no `user_id` (QE3).
- **G6 — PII storage conventions.** Mobile = Tier-1 ciphertext + Tier-2 HMAC blind index (`member_identities`:
  `mobile_ciphertext`, `mobile_blind_index`, `UNIQUE (pariwar_id, mobile_blind_index)`). Name = Tier-1 ciphertext
  (`member_kyc_profiles.name_ciphertext`, `piiColumn(1, …)`); **no name blind index exists anywhere** (ARCH's Tier-2 "member
  name (for search and dedup)" is unbuilt). `blindIndex(fieldClass, plaintext, { pariwarId }, kms, hmacKeyRef)` fires a KMS audit
  hook and writes one system audit row PER HMAC (`blindIndexMany` batches). ⚠ `mobileBlindIndex()` is hard-wired to the member
  login key space (`member_mobile` under `MEMBER_IDENTITY_NAMESPACE`) — reusing it makes a worker row joinable to a member's
  login hash. The disjoint-space precedent is `CLAIM_CONTACT_MOBILE_FIELD_CLASS = 'claim_contact_mobile'` ("a distinct class
  under a real tenant keeps the two hash spaces disjoint"). Non-member Tier-1 name + mobile precedents: `member_nominees`,
  `claim_contacts`. **Encryption runs in the API layer BEFORE the domain writer** (the domain takes ciphertext strings).
  `normalizeMobile` (`encryption/member-fields.ts`) canonicalises to E.164 `+91XXXXXXXXXX` or `null`.
- **G7 — KYC: nothing to reuse.** There is no `kyc_status` column or enum anywhere (re-grepped; the only hit is an unrelated
  client method named `kycStatus()`). Member KYC is DERIVED from `member_kyc_profiles` (PK = FK to `members`); the event is
  `member.kyc_completed`, ⛔ `kyc.completed` (13.5's AC names two events that do not exist). DigiLocker transport is fenced to
  one directory by the `kyc-provider-boundary` gate. **PAN capture: none** (the only hits are the custom-fields PII-marker deny-list in `custom-fields/frozen-governance.ts` and the 13.5 AC text). **Payee bank
  table: none** (`claim_nominee_bank_accounts` is claim-scoped). The PRD never says a field worker is KYC'd — the "KYC" in PRD
  §2.4 / FR-84 is the recruited MEMBER's.
- **G8 — Event registry.** `packages/events/src/registry.ts` holds 93 entries; the domain import line is `import { alert, claim,
  contribution, helpdesk, marketplace, member, pool, reconciliation } from '@twt/domain'`. ⛔ test asserts a count — the
  coverage tests assert SET EQUALITY (`packages/events/tests/module-registry-coverage.test.ts` is the 52-line twin to clone).
  Spelling: the four newest primitives (pool, alert, helpdesk, module) use single-dot snake_case, and `marketplace/events.ts`
  carries a "PINNED SEAM" block overriding the epic's hyphen. Nine older registry entries use a hyphen after the dot (e.g.
  `contribution.utr-attested`, `member.moderation.appeal-filed`). ARCH §Naming: "dotted resource.action". ⇒ `field_worker.kyc_completed`.
- **G9 — Gate wiring, exactly.** A new `*-state-invariant` gate touches: `scripts/<name>/{README.md,check.ts,lib.ts,lib.test.ts}`;
  root `package.json` (two scripts); `scripts/ci-local.sh` (one `run` line, after the marketplace one); `.github/workflows/ci.yml`
  (one standalone job, `needs: install`, 5-minute timeout); and the paired DB trigger in the migration. There is no central
  gate inventory and no aggregator `needs:` list. After this story `ci:local` runs one job more than the current count.
- **G10 — The admin route template (Story 12.2, shipped).** `apps/api/src/modules/marketplace/{routes,handlers,errors,index}.ts`:
  guard = `[requireAdminSession(deps), scopeResolutionHook(deps), requirePermissionHook(deps, KEY, { dimension: 'pariwar' })]` (12.2's key is `pariwar`-gated; THIS story's is `district`-gated with a `resolveValue` — QE9, G12);
  every route declares its 200/201 response schema (the forced-pagination gate examines only routes that do); writes follow
  `requireIdempotencyKey` → `releaseHookTx` → `withIdempotency` → mint ids INSIDE the claim → `openScopeTx` → `try` immediately
  → pre-checks (no audit line on a refusal) → `audit.withCompensatingAudit(servicePool, …)` whose `mutate` runs the domain
  command on `scopeTx.client` and COMMITS (`closeScopeTx(scopeTx, true)`) inside → `finally { closeScopeTx(scopeTx, false) }` →
  `mapModuleError`. The compensating-audit gate (g) scans `MARKETPLACE_ROOTS` in `scripts/access-wrapper-invariants/check.ts`;
  adding a surface is a reviewed edit to that array, the gate README and `docs/access-wrapper-invariants.md`. The domain
  primitive NEVER calls `withCompensatingAudit` (pinned by `tests/marketplace/no-audit-wrapper-in-domain.test.ts`).
- **G11 — Display-name rule.** 6.11 R5: `users.display_name` is plaintext staff attribution; an absent name BLOCKS with
  `AdminDisplayNameMissingError` (409 `admin.display_name_missing`) — 13.2's flag path and C1 require ⛔ a fallback. (12.2 used a
  fallback LABEL for display-only reads; this story's snapshot is a stored attribution, so the stricter rule applies.)
- **G12 — A permission key's footprint** (the `module.manage` commit): `rbac/permissions.ts` (catalog entry + version),
  `rbac/roles.ts` (the grant), `tests/rbac/{permissions,roles}.test.ts` (version + key count + holders + inert-grant legs),
  the routes, `server.ts` registration, `packages/contracts` DTOs + `emit-openapi.ts` + the regenerated `openapi/v1.yaml`,
  `docs/access-wrapper-invariants.md`. A narrower grant (`district_admin`, `state_trustee`) is INERT against a `pariwar`-dimension key — which is why THIS key is gated at `dimension: 'district'`, the Panel's ruling (`-441`) naming the District Admin: by `scopeContains` rule 5 a `pariwar` grant covers every in-tenant geo target and a `district` grant covers ONLY its own district (`check.test.ts` pins the Patna case); a `state` grant would defer to the geo-tree resolver (default deny) and is not granted.
- **G13 — Privacy Policy and retention.** See "Policy meaning". ARCH §2.12's retention matrix is "a governed policy artifact"
  that does not live in this repo, so there is no in-repo target for a field-worker row and this story cannot discharge one.
- **G14 — Migration house style.** Hand-authored, "never regenerate" header; statement order `referenced-UNIQUE → CREATE → FK →
  CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → trigger`; every statement ends `--> statement-breakpoint`; per-command
  policies `TO "twt_app"` on `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`; ⛔ `FOR ALL`; the journal
  entry is added by hand with a trailing newline. A single-column FK check bypasses RLS, which is why 13.2 specified the
  COMPOSITE FK (the `0178` precedent). There is no `pariwars` table (`pariwar_id` is an unconstrained uuid everywhere).
- **G15 — Stale comments are not this story's to fix.** `rbac/roles.ts` ("Dispatch keys land Epic 12"), and two comments in
  `rbac/permissions.ts` ("DEFERRED to Epic 12") record Decision `2026-08-13-104`'s follow-up — a deferral of ground-inspection
  DISPATCH, ⛔ of Epic 13's attribution. 13.2's G3 ruled: do NOT rewrite them ([[feedback_supersede_never_reinterpret]]).
- **G16 — Nothing owns the rest.** No Epic-13 story builds an admin "Add Field Worker" screen, the other five lifecycle routes,
  or names the permission key; the key in 13.2's C1 is a placeholder ("<the field-worker key, Panel-ratified …>"). ARCH reserves
  an empty `apps/admin/modules/field-worker-dispatch/` and `apps/api/src/modules/field-worker/`; ARCH §4.1 says the field-worker
  surface placement is "Scope deferred". Story 13.6 says termination routes "via Story 10.10", which is member-scoped
  (`member.moderate`, events on the member stream). Story 5.1 (the notification primitive 13.5 will call) requires a `member_id`.
- **G17 — A field worker's second job.** The recruiter is not the worker's only role. The UX spec routes failures to "Field worker
  will visit you" and its flow schedules "next available worker in claimant's district";
  `docs/fallback-handler-ledger/loop-nodes/ground-inspection.md` has the dispatch system "select nearest field-worker per
  geographic / Pariwar locality" and cross-cuts Story 13.3; Story 6.7 and Decision `2026-08-13-104`'s follow-up deferred
  ground-inspection DISPATCH "to Epic 12" — which is now the Module Shelf, so that deferral has no owner; 13.4's AC shows "field
  workers by Pariwar/district". `field_workers` had NO geo column and I2 makes any later column immutable by default; the Panel's ruling (`-441`) names the District Admin, so QE17 adds `district` now (a block, or anything finer: still none). ⇒ C8. The
  lifecycle state this story stores revokes nothing and gates no dispatch.

## ⚖️ Build decisions QE1–QE22 — APPROVED by BigDev 2026-11-03; recorded in author-commit `2026-11-03-442`

**Status of the approval — read before relying on it.** BigDev's words (2026-11-03): *"My recommendation is to approve the sixteen QE
decisions as listed, with QE10 choosing the per-act registration key and QE12 choosing neutral reason codes."* So every ⭐ below is the build
decision, **except** QE10 (the per-act key `field_worker.register`, not `field_worker.manage`) and QE12 (the neutral reason
values — five at approval, a sixth, `reassigned`, added for `posted` on 2026-11-03 — not the starter list). The answers are recorded
in decision `2026-11-03-442` (committed alone, `6a3172e4`); `-441` is the Panel's ruling (`93b7e419`). ✅ QE11 (`active`-only)
is SETTLED (BigDev, 2026-11-03: *"approved and settled — the implementation rule is active only"*) and the Panel CONFIRMED it
(Question 2 A, `-441`). ✅ The Panel RULED on Q-1 (`-441`, by DR and KB): a District Admin may add a field worker (the intended manager)
and the Pariwar Admin fills in; the full log is kept. That changes QE10 (holders and dimension, applied below) and adds QE17 (the
worker's district) and QE18 (the acting role in the log). BigDev then APPROVED QE17 — REVISED the same day because workers rotate
between districts — and QE19 (a Pariwar move is a new registration); QE18 (the authorization snapshot in the log) was APPROVED too, with two conditions — see QE18. A follow-up Panel note (Q-6 who may change the District Admin a
worker reports to, Q-7 the same person across Pariwars, Q-8 whether the fill-in is enforced, Q-9 who approves) was SENT and RULED —
decision `2026-11-03-443`: Q1 A, Q2 C, Q3 A, Q4 A. Q-2, Q-3 and Q-4 are ANSWERED (v1.12).

- **QE1 — Home. ⭐ `packages/domain/src/field-worker/`, ⛔ `packages/field-worker-lifecycle`.** The epic names the package; 13.2's C1
  asks to "re-weigh" it against [[feedback_no_premature_package]]. There is no second consumer, and G1's reasons (globs, gates,
  the events→domain import direction) make a separate package strictly worse. Tables in `schema/`, RLS in `policies/`; no
  `@twt/contracts` content except the one route's DTOs (QE9).
- **QE2 — Scope. ⭐ (A) primitive + the ONE registration route (C1) + commands for the other six events, called by tests only.**
  (B) also an admin route per transition under one key; (C) primitive only, registration route left to a sibling.
  Cost of (A): after this story an admin can register a worker but **nothing in production can activate, suspend, reactivate,
  terminate or move one** — FR-85's deactivation is unreachable until Stories 13.1a / 13.1c / 13.1d build those routes (Q-2). Cost of (B): five more
  audited routes whose semantics (who attests KYC? who may terminate? a reason-code UI?) are exactly what 13.6 and the Panel
  have not settled. (C) breaks 13.2's carried C1 and leaves the registry without a caller.
- **QE3 — Identity. ⭐ A standalone Pariwar-scoped record: ⛔ a `members` row, ⛔ a `users` row, ⛔ a `user_id` column, no login created.**
  `field_worker_id` is caller-minted (`ids.fieldWorkerId`). The worker's login and `field_worker_self` grant are 13.3's (C1);
  G5's inference shows the link needs no column. Cost: until 13.3, a registered worker cannot see their own code — the admin tells them.
- **QE4 — PII and uniqueness. ⭐** `name_ciphertext` and `mobile_ciphertext` are Tier-1 (`piiColumn(1, 'field_worker')`);
  `mobile_blind_index` is Tier-2 under the NEW class `field_worker_mobile` (a real tenant, disjoint from `member_mobile` — G6);
  ⛔ a name blind index (none exists; ARCH's is unbuilt); ⛔ plaintext of either value in any column, event payload, audit line
  or log. Uniqueness: `UNIQUE (pariwar_id, mobile_blind_index) WHERE current_state <> 'terminated'` — one live worker per
  mobile per Pariwar (a duplicate registration would otherwise split credit across two codes). A terminated worker's mobile may
  register again (a new id, a new code); a UNIQUE over ALL rows would be a permanent ban by index. Cost: a typo cannot be fixed
  (QE15); a re-registered terminated worker is not flagged to the registering admin (C4); and the 409
  `field_worker.mobile_already_registered` tells a District Admin that a live worker with that mobile exists somewhere in the
  Pariwar, possibly in another district — an ACCEPTED disclosure (without the refusal, credit splits across two codes). The Tier-1 encrypt and the HMAC run
  in the API layer BEFORE the writer (G6, deferred-work T10).

  **The columns (the one place they are defined — AC1 points here).** ⭐ The DB enforces ONLY the named CHECKs below; every content
  rule (name length, NFC, mobile shape) is Zod-only, in the API layer.

  | Column | Type | Rule |
  |---|---|---|
  | `field_worker_id` | uuid PK, ⛔ default | caller-minted (`ids.fieldWorkerId`); `UNIQUE (pariwar_id, field_worker_id)` `field_workers_pariwar_worker_uq` is 13.2's FK target |
  | `pariwar_id` | uuid NOT NULL, ⛔ FK | there is no `pariwars` table (G14) |
  | `name_ciphertext` | text NOT NULL | Tier-1, `piiColumn(1, 'field_worker')` |
  | `mobile_ciphertext` | text NOT NULL | Tier-1, same class |
  | `mobile_blind_index` | text NOT NULL | Tier-2, class `field_worker_mobile`; partial unique `field_workers_pariwar_mobile_live_uq (pariwar_id, mobile_blind_index) WHERE current_state <> 'terminated'` |
  | `registered_by_user_id` | uuid NOT NULL, ⛔ FK | the Story 6.11 R5 attribution snapshot (who pressed "Add Field Worker"); ⛔ FK so the attribution outlives a user row (the 13.2 flags table's `actor_id` precedent); equals the genesis event's `events_log.actor_id` — the projector writes both from ONE input |
  | `registered_by_display` | text NOT NULL | `CHECK (length(btrim(registered_by_display)) > 0)` `field_workers_registered_by_display_nonblank`; the admin's `users.display_name` at registration, plaintext by the 6.11 R5 decision (G11) |
  | `ended_on` | date NULL — **projected** | QE20: the ACTUAL LAST DAY of the engagement, supplied by the admin at termination; `CHECK ((current_state = 'terminated') = (ended_on IS NOT NULL))` `field_workers_ended_on_pair`; the clock of the 8-year removal (C5); not personal data. Drizzle `date('ended_on', { mode: 'string' })`; every raw read selects `ended_on::text` (no `pg` type parser is set, so a raw `date` arrives as a JS `Date` at local midnight and `toISOString()` shifts it a day in IST) |
  | `district` | text NOT NULL | QE17: the worker's REPORTING district — the district whose District Admin manages them (the Panel's District Admin manages by district, `-441`), NOT a work area (a code works anywhere in the Pariwar); the gate's TARGET for registration, suspend, reactivate and terminate (a MOVE gates on EITHER end — the destination or the current district, AC5); `CHECK (length(btrim(district)) > 0)` `field_workers_district_nonblank`; one of the Pariwar's LISTED districts, checked in the API layer by `assertDistrictRecorded` (the list is data, so not by the database); **projected**: changed only by `field_worker.posted` (QE17; the guard's projected-column list gains `district`); not personal data |
  | `created_at` | timestamptz NOT NULL default `now()` | immutable |
  | `current_state` | `field_worker_state` NOT NULL — **projected** | |
  | `state_event_version` | bigint NOT NULL (`mode: 'number'`) — **projected** | |
  | `kyc_status` | `field_worker_kyc_status` NOT NULL — **projected** | `CHECK (current_state <> 'active' OR kyc_status = 'completed')` `field_workers_active_needs_kyc` |
  | `state_reason_code` | `field_worker_reason_code` NULL — **projected** | `CHECK ((current_state IN ('suspended','terminated')) = (state_reason_code IS NOT NULL))` `field_workers_state_reason_pair`; `CHECK ((current_state <> 'suspended' OR state_reason_code IN ('under_review','at_worker_request')) AND (current_state <> 'terminated' OR state_reason_code IN ('left_voluntarily','inactive','registered_in_error')))` `field_workers_state_reason_subset` (13.6 replaces it, QE12) |
  | `audit_id` | uuid NOT NULL, ⛔ FK — **projected** | the audit line of the MOST RECENT transition |
  | `updated_at` | timestamptz NOT NULL default `now()` — **projected** | SET to `now()` on every transition |

  Index: `field_workers_pariwar_state_idx (pariwar_id, current_state)` (the list read). The `(pariwar_id, field_worker_id)` UNIQUE
  already serves per-worker lookups.
- **QE5 — Lifecycle. ⭐**

  | From | Event | To | Guard (under the row lock) |
  |---|---|---|---|
  | — | `field_worker.registered` | `pending_kyc` (`kyc_status = pending`) | stream empty; inputs valid |
  | `pending_kyc` | `field_worker.kyc_completed` | `pending_kyc` (same state; `kyc_status = completed`) | `kyc_status = pending` |
  | `pending_kyc` | `field_worker.activated` | `active` | `kyc_status = completed` |
  | `active` | `field_worker.suspended` | `suspended` | reason ∈ suspend list |
  | `suspended` | `field_worker.reactivated` | `active` | — |
  | `pending_kyc` / `active` / `suspended` | `field_worker.posted` | the SAME state (the worker is moved to another reporting district) | the new district differs from the current one (the CALLER has checked it is a listed district — QE17); reason ∈ post list |
  | `pending_kyc` / `active` / `suspended` | `field_worker.terminated` | `terminated` | reason ∈ terminate list |

  `terminated` is TERMINAL (no event leaves it — `posted` included: a worker who is ended is not moved). `posted` is a same-state legal
  event like `kyc_completed` (a non-transition marker — the `member.posting_updated` shape). `kyc_completed` and `activated` are separate events because activation is a
  human sign-off, not a side effect of a flag. `suspended` is reachable only from `active` (a worker who was never activated is
  terminated, reason `registered_in_error`). Pre-genesis `initial: 'pending_kyc'`; `registered` is never legal through
  `projectFieldWorkerTransition`. `kyc_completed` is a same-state legal event, so legality is `nextFieldWorkerState(...) !== null`,
  ⛔ `to !== from` (12.1 TR1). A DB CHECK `field_workers_active_needs_kyc` says `current_state <> 'active' OR kyc_status = 'completed'`.

  **Guard order in EVERY command (pinned by a test).** (0) The actor and `actorId`, and — on `register` and `post` — the
  authorization's provenance (`isVerifiedAuthorization`), its Pariwar and actor (equal to the command's), its dimension, and — for
  `register` only — its permission key and target — pure, BEFORE the row lock — else `FieldWorkerProjectorInputError`; (0b) for
  `terminated`, `ended_on` is present, matches `^\d{4}-\d{2}-\d{2}$` and is a real calendar date — pure, BEFORE the lock, else
  `FieldWorkerEndedOnInvalidError` (never `FieldWorkerProjectorInputError`, and never sent to SQL). Then, under the lock: (1) the row exists in this Pariwar — else `FieldWorkerGenesisMissingError`;
  (2) the (state, event) pair is legal per this table — else `FieldWorkerIllegalTransitionError` (this covers anything out of
  `terminated` AND a repeated `kyc_completed` on an `active` worker); (3) the KYC guard — `FieldWorkerKycAlreadyCompletedError`
  (reachable only from `pending_kyc`) or `FieldWorkerKycNotCompletedError`; (3b) for `posted`, the new district differs from the current one — else
  `FieldWorkerDistrictUnchangedError`; (3c) for `posted`, the authorization's district `target` is `toDistrict` or the LOCKED row's
  `district` — else `FieldWorkerAuthorizationStaleError` (a concurrent move, or a caller bug — the command cannot tell which); (4) the
  reason (suspend, terminate AND post) — else `FieldWorkerReasonInvalidError`; (5) for `terminated`, the IST bounds (QE20) — else
  `FieldWorkerEndedOnInvalidError`.
  So `terminate` with a bad reason on a terminated worker is an illegal transition, not a bad reason.
- **QE6 — Events. ⭐** SEVEN names — the epic's six plus `field_worker.posted` (QE17, approved 2026-11-03) — single-dot snake_case (G8); ⛔ the epic's `kyc-completed`. Payloads are `.strict()` Zod, snake_case,
  and carry NO PII: genesis `{ from_state: null, to_state, trigger, actor, authorization, district }` (`authorization`: the QE18 snapshot; `district`: QE17 — the stream must
  carry the first district or I4 cannot fold it); transitions `{ from_state,
  to_state, trigger, actor, reason_code? }` (`terminated` also carries `ended_on`, QE20); `field_worker.posted` `{ from_state, to_state, trigger, actor, authorization, from_district,
  to_district, reason_code }` (district names are not personal data; `reason_code` is QE12's post list). AR-14's `pariwar_id` / `timestamp`, the stream id (= `field_worker_id`) and the actor's
  id are the `events_log` columns (`pariwar_id`, `occurred_at`, `stream_id`, `actor_id`) and are ⛔ duplicated in payloads (the 12.1
  convention — a duplicate could disagree with its column); the actor KIND is the payload key `actor`, validated by Zod — `events_log`
  has ⛔ `actor` column, so no `events_log` change is needed. Commands COMPUTE
  `trigger` (`field_worker.register`, `.kyc_complete`, `.activate`, `.suspend:<reason>`, `.reactivate`, `.terminate:<reason>`, `.post`).
  Audit action = the event-type string (`writeAuditEntry` rejects any action outside `^[a-z0-9_]+(\.[a-z0-9_]+)+$`, so a hyphenated
  `field_worker.kyc-completed` would also fail as an audit action — a second reason for the underscore). **The genesis payload does NOT carry `attributionCodeId`** (13.2 said "may"): the
  composite FK forces the worker row to exist before the code row, so the id cannot be known at genesis; the append-only codes
  table is itself the record of the allocation (13.2 AT10). Registry: add `fieldWorker` to the import, seven entries whose
  `schema` is the SAME object as the domain's, plus a set-equality coverage test cloned from `module-registry-coverage.test.ts`.
- **QE7 — Actors. ⭐ Human only: `actor ∈ { 'operator', 'trustee' }`, `actorId` non-null, for ALL seven events. `system` is refused.**
  Nothing automated touches a worker's lifecycle in this story, and 13.6's load-bearing commitment ("heuristics … do not
  independently terminate field-worker eligibility") is cheapest to keep if the primitive CANNOT record a machine as the author
  of a suspension or termination. Enforced in the command, the payload schema and the projector (three places, as 12.1's I11).
  A later automated actor is a new decision, not a quiet enum value.
- **QE8 — KYC. ⭐ An operator-recorded attestation only: `kyc_status ∈ {pending, completed}`; `kyc_completed` means "an operator
  confirms they have verified this person".** No document, ID number, PAN or bank detail is captured, and no provider is called.
  What "verified" requires — and whether PAN / bank are gathered here or at payout — is 13.5's decision (C3), made with the
  Q-3 basis. Cost: the flag attests nothing about method; until 13.5 a `completed` status may mean different things to different
  admins. Alternatives rejected: reuse DigiLocker (member-bound, fenced); drop `kyc_status` (the epic's AC wants it and `activated` is guarded by it; 13.5's own AC (a) is the recruited MEMBER's KYC, G7). ⚠ BigDev (2026-11-03): a worker submits a form, is interviewed and is recruited BEFORE registration, and the IDENTITY CHECK is PERFORMED IN THE INTERVIEW. So `kyc_completed` records something that has already happened — see QE21 (ANSWERED: registration stays `pending_kyc`; the Pariwar Admin's approval — Story 13.1a — records it).
- **QE9 — The registration route. ⭐** `POST /api/v1/p/:pariwarId/field-workers`, guard chain per G10 but `district`-gated:
  `requirePermissionHook(deps, 'field_worker.register', { dimension: 'district', resolveValue })` where `resolveValue` returns the
  body's `district` when it is a string and `null` otherwise — it is SYNCHRONOUS (reads the already-validated body, never the
  database), a `null` fails closed, and a District Admin's grant is compared by EXACT bytes (QE10, TR12). Body
  `{ name, mobile, district }` (snake_case). The DTO is SHAPE ONLY and `.strict()`: `name: z.string().max(1000)`, `mobile:
  z.string().max(64)`, `district: z.string().max(200)`. A Zod failure is 400 `request.validation`, raised in the validation phase BEFORE the preHandler hooks
  (12.2 `routes.ts`), so a content rule in the DTO would answer an unauthenticated caller with 400 instead of 401 / 403 / 404. The
  CONTENT rules run in the HANDLER — after the guards, inside the idempotency claim, before any KMS call — and throw typed errors
  mapped to 422: `name` NFC-normalised, trimmed, 1–120 characters, no control characters, no NUL or unpaired surrogate, no INVISIBLE character — no line or paragraph separator, no private-use code point, no default-ignorable code point (zero-width and filler characters, bidi controls, the word joiner, the soft hyphen, the BOM, tag characters, variation selectors) EXCEPT ZWNJ, ZWJ, LRM and RLM, which real names carry — and at least one letter (⚠ amended by review R6 and again by R2-1, 2026-11-04 — see the Review Findings; ⚠ amended a THIRD time by review round 3, R3-1 / R3-10, 2026-11-04: ALSO no format (`Cf`) or unassigned (`Cn`) code point, no U+2800 or U+FFFD, no combining mark at the start or after whitespace, no run of 8 or more combining marks (BigDev, R3-DN1); ALM (U+061C) joins the allowed four; ⚠ amended a FOURTH time by review round 4, 2026-11-04: also no U+FFFC (R4-3); the two mark rules are judged with the five allowed invisibles REMOVED, so one between marks or before a mark no longer hides them (R4-2); and each allowed invisible sits BETWEEN two other characters — never first, never last, never next to another (BigDev, R4-DN1 "1"; R4-15), with ONE exception found while building it: a final ZWJ right after a virama is allowed (the legacy encodings of the Malayalam chillu and the Bengali khanda ta end a word that way — option 1 as written would have refused those real names; BigDev may overrule)) (422
  `field_worker.name_invalid`); `mobile` through `normalizeMobile` (null ⇒ 422 `field_worker.mobile_invalid`); `district` must be a LISTED district of the Pariwar
  (`assertDistrictRecorded`, QE17 ⇒ 422 `field_worker.district_unknown`) — a Pariwar Admin's grant covers ANY string the gate is
  given, so this check is the only thing that stops a junk district. Required
  `Idempotency-Key` (missing, empty or over 200 characters ⇒ 400 `field_worker.idempotency_key_required`; the same key still in
  flight ⇒ 409 `field_worker.idempotency_in_progress` — rename every `module.*` literal in the helpers copied from 12.2).
  12.2's `tenantWrite` (`marketplace/handlers.ts`) opens the scope transaction BEFORE it calls `run`, inside `withIdempotency`, and
  wraps `run` in its `try` / `finally closeScopeTx(false)` — copy it UNCHANGED (⚠ ONE variance since review R3, 2026-11-04: a `prepare` step before `openScopeTx`) (renaming `module.*` and the mapper). The `prepare` step (inside the claim,
  BEFORE the transaction opens), in order: content-validate `name` and `mobile` (422) → resolve the admin's `display_name` (absent ⇒
  `AdminDisplayNameMissingError`, no fallback, BEFORE any write or audit line). Then the `run` body, in order: mint `fieldWorkerId` →
  `assertDistrictRecorded(ctx.scopeTx.tx, pariwarId, district, at)` with
  `at` = `SELECT now()` on `ctx.scopeTx.client` (as 12.2's `assertScopeValuesRecorded` caller does; compared byte for byte; 422
  `field_worker.district_unknown`) — BEFORE any KMS call, so an unlisted district costs no encrypt → encrypt name + mobile, compute
  the mobile HMAC (the KMS calls run with the transaction open and idle — accepted, one short round trip each) → duplicate-mobile
  pre-check on that tx — `fieldWorker.findLiveFieldWorkerByMobileIndex(db, pariwarId, mobileBlindIndex)` → id or null, with an
  explicit `pariwar_id` predicate (409 `field_worker.mobile_already_registered`, no audit line) → every write is `actor: 'operator'`,
  `actorId` = the session's `users` id (as 12.2 QE14) → `audit.withCompensatingAudit` whose `mutate`
  runs `registerFieldWorker` (genesis) THEN `allocateAttributionCodeForRequest(request, scopeTx, { fieldWorkerId })` on the
  SAME tx, then COMMITS. On `AttributionCodeAllocationExhaustedError` (caught by `instanceof` on the class the DOOR re-exports,
  reading `.attempts` from it): `try { await flagAllocationExhaustedForRequest(deps, request, { attempts }) } catch (flagErr) {
  console.error('[field-worker] exhaustion flag failed', { code: marketplace.pgSqlstateOf(flagErr) }) }` (`marketplace` from `@twt/domain` — nothing in `apps/api/src` imports it yet) then rethrow the ORIGINAL exhaustion
  error — a failing flag write (a DB error, a display name removed meanwhile) never replaces the 503 ⇒ the
  compensating audit writes `field_worker.registered_rolled_back`, the tx rolls back, the response is 503
  `field_worker.code_allocation_exhausted`. Response 201: `{ field_worker_id, district, current_state, kyc_status }` — NO code (QE22, APPROVED 2026-11-03): the code is
  allocated here, in the same transaction, but is read only after approval — by 13.1b's SMS and 13.1a's audited read — so no
  copy tells anyone a code before the worker is approved and the allocation has committed (C9; 13.2's C6). Do not wire `maxAttempts` from env (default 8; YAGNI).
  The transaction is open, and idle, during the district check and the KMS calls — accepted (the content rules and the display-name read run in `prepare`, BEFORE it opens — review R3). Copy
  `requireIdempotencyKey`, `releaseHookTx` and `namespace(pariwarId, actorId)` as they are.
  Do NOT trim or NFC-normalise `district` in the handler: the gate compared the raw body bytes, and the command refuses a genesis
  whose district differs from `authorization.target.value` (AC5) — a normalised value would turn a valid request into a 500.
  `allocateAttributionCodeForRequest` returns `{ attributionCodeId, code, allocatedAt, attempts }` (the handler never copies `code` or
  `allocatedAt` into the response, a log or an audit field) and throws
  `FieldWorkerAlreadyHasAttributionCodeError` before any draw if the worker already holds a code. The 201's `current_state` and
  `kyc_status` come from the genesis RETURN value (12.2 RB1), not literals (the 201 DTO is
  `.strict()` and PARSED by the serializer, so its shape must match exactly). Every refusal BEFORE `withCompensatingAudit` — the
  422s, the display-name 409, the duplicate-mobile 409 — writes no `field_worker.registered*` audit line; only a refusal INSIDE
  `mutate` writes the intent and `_rolled_back` pair: a concurrent same-mobile loser fails there, so its intent line and its
  `field_worker.registered_rolled_back` line exist. (The KMS calls write their own system audit rows asynchronously — TR5; they are
  not this route's audit line and are never counted.)
  The audit `resourceLocator` — the only free-text audit field — is `field_worker/<field_worker_id>`; never put a name or a mobile in it.
  The intent sets `actorRole: authorization.role` (`AuditIntentArgs.actorRole`, `string | null`, max 128 — decision `-105` D4: "the
  grant that actually authorized") and `hashShape: { field_worker_id, district }` — no name, mobile or blind index (a SHA-256 of a
  10-digit mobile can be brute-forced).
  ⛔ GET routes (the lost-201 residual is TR11), ⛔ screen (Story 13.1a).
- **QE10 — Permission key. APPROVED (BigDev 2026-11-03): the PER-ACT key `field_worker.register`, and only it; its HOLDERS are
  RATIFIED by the Panel (`-441`).** Gated at `dimension: 'district'` (value = the worker's district, QE17); held by `district_admin`
  (the Panel's primary manager — its own district only), `pariwar_admin` (the fill-in — every district in its Pariwar) and
  `super_admin` (derived). Why `district` and not `pariwar`: a narrower grant is INERT against a broader gate, so a
  `pariwar`-dimension key would have left the District Admin's grant authorizing no one; a `district` gate lets BOTH pass
  (`scopeContains` rule 5 — a `pariwar` grant covers every in-tenant district, a `district` grant its own; G12). NOT granted to
  `state_trustee` (it is refused because its bundle LACKS the key — not because its grant is inert: with a geo tree in force a state
  grant CAN reach a district target, `scopeContains` rule 5) or to `trustee_panel` (not ruled); NOT granted to the `field_worker` role (13.3's own-read key is a separate, B(3)-literal decision, C1).
  Catalog 58 → 59. The house style splits keys by act (`member.moderate` /
  `.suspend` / `.restore_terminated`, `claim.flag_fraud` / `.record_fraud_finding`, `questionnaire.propose` / `.approve` /
  `.publish`), and this story builds only the ADD: every other per-act key is minted by the story that builds its route — approval and
  the code read by 13.1a (C9); the direct move, suspend, reactivate and terminate by 13.1c (terminate waits on 13.6's C4); opening
  and answering a move request by 13.1d (C10). Each is a `-059` B(3) field-worker permission and goes to the Panel with its work
  (`-441`: "ratified when their feature sets ship" still applies). Rejected: ONE `field_worker.manage` — it would be minted
  before 13.6 says what removal means, and would cover acts nothing builds. Cost of the per-act key: each later act gets its own
  key and its own look by the Panel. ⚠ The string `field_worker.register` is ALSO the genesis event's `trigger` payload value (QE6):
  a permission key and an event-payload value — keep them apart.
  REUSE CHECK — no existing key fits: `pariwar.provision` provisions a Pariwar; `member.moderate` / `member.suspend` act on members;
  `module.manage` is the partner-module surface; `workplace.manage` and `known_people.run_campaign` are unrelated lists. (The
  catalog was listed 2026-11-03; re-check at Task 0.1.)
- **QE11 — The FR-85 contract for callers. ⭐ `acceptsNewAttributions(state)` is `state === 'active'`**, exported pure from the
  domain alongside `getFieldWorker(db, pariwarId, id)` and `getFieldWorkerStateAt(db, pariwarId, id, asOf)`. ⚠ NOT the 12.1
  `getModuleStateAt` signature: that takes a JS `Date` (millisecond precision), and 13.2's binding rule (AT4 (c), C4, TR10) is "never
  read `captured_at` into JS; compare in SQL at microsecond precision", and its AT4 (c) says "the instant is NAMED, ⛔ passed". So
  `asOf` follows `resolveAttribution`'s: `{ captureId: MemberAttributionId } | 'now'` — there is NO `{ instant }` arm (a caller-passed
  instant is the thing AT4 (c) forbids) — and the `captureId` arm joins `member_attribution`
  and compares the event's `occurred_at` to the stored `captured_at` IN SQL; it replays the longest PREFIX of the stream, in
  `event_version` order, whose events ALL have `occurred_at` at or before that instant — ⛔ every event that individually does (the
  full ordering contract — prefix not filter, ties, `'now'`, the clock domains — is AC10's, the one place it is written). An unknown worker id returns `null` (the twin returns the initial state for an unknown id —
  this is new work: an existence check). One predicate, so 13.8 and 13.5's backfill cannot each re-derive "deactivated" and recreate
  the 10.10 shape; `…StateAt` so a backfill (13.2 C4) can ask what the worker's state was WHEN the member typed the code.
  ✅ `active`-only is SETTLED (BigDev 2026-11-03: "approved and settled — the implementation rule is active only"). Q-5 (§0 edge 11)
  holds the alternative (B), its costs and the deciding fact ONCE, and the Panel CONFIRMED the rule (Question 2 A, `-441`); a
  sibling block that repeats it calls it the ruled rule. The mitigation the recommendation leans on — "activate, then
  tell them the code" (C1, 13.3's runbook; now also QE22) — needs a production path to `activated`, which does not exist until
  Story 13.1a builds the approval (Task 0.4 (h)).
- **QE12 — Reason codes. APPROVED (BigDev 2026-11-03): the NEUTRAL values only (an author-commit, ⛔ a `-210` delegation — §0 edge 8).**
  Suspend: `under_review`, `at_worker_request`. Terminate: `left_voluntarily`, `inactive`, `registered_in_error`. Post (added
  2026-11-03 with QE17's second revision): `at_worker_request`, `reassigned` — six values in all, `at_worker_request` shared by suspend and
  post. Required on `suspended` / `terminated` / `posted`, absent elsewhere; for suspended and terminated it is stored as the projected
  `state_reason_code` (non-null iff the state is suspended or terminated — CHECK `field_workers_state_reason_pair`), cleared on
  `reactivated`; a `posted` reason lives in the event only and never touches `state_reason_code`. ⛔ free text anywhere (it would carry names into an
  immutable stream). The values the earlier starter list also had — `conduct_concern`, `conduct`, `fraud_confirmed` — are 13.6's to
  ADD together with the writer that uses them (its AC: "reviewer can confirm fraud"), by `ALTER TYPE … ADD VALUE` in its own
  migration with the domain tuple, the Zod schemas and the reason lists in the same commit, under its own governance check (§0
  edge 8). ⚠ For 13.6: a value added by `ALTER TYPE … ADD VALUE` cannot be USED in the same transaction (55P04), and the migrator
  applies pending migrations in one transaction — so a CHECK or seed that uses the new value ships in a LATER migration run, and
  the reason-subset CHECK (Task 2.2) is replaced there too. Why neutral: those three label a person in an append-only stream that survives erasure, no production writer exists yet
  (Q-2), and a pgEnum value is not cheaply removed while an addition is. Cost: until 13.6, an operator cannot record a conduct-based
  suspension or termination honestly — intended (no route exists, and C5 forbids building a terminate route before C4); the nearest
  neutral value (`under_review`, `inactive`) must not stand in for one.
- **QE13 — Concurrency and lock order. ⭐ As 12.1 I10:** every transition first takes `SELECT … FROM field_workers WHERE
  field_worker_id = $1 AND pariwar_id = $2 FOR UPDATE`, then checks guards against the locked row, then calls `projectFieldWorkerTransition`,
  passing the locked row in as `lockedRow { currentState, stateEventVersion, kycStatus, stateReasonCode, district, endedOn,
  registeredOn }` — ONE `FIELD_WORKER_GUARD_COLUMNS` list read `FOR UPDATE` (the twin's `MODULE_GUARD_COLUMNS` shape; the lock's
  SELECT list — NOT the gate's `GUARDED_COLUMNS`, AC11), with
  `registeredOn` = `(created_at AT TIME ZONE 'Asia/Kolkata')::date::text` and `endedOn` = `ended_on::text`: the guards read
  `district` (3b, 3c) and the registration day (QE20), and `posted`, `kyc_completed` and `activated` carry `state_reason_code`
  forward unchanged. The projector cross-validates `from_state` / `to_state` against `lockedRow` AND, for `posted`,
  `from_district = lockedRow.district` — else `FieldWorkerProjectorInputError`. ⚠ The SHIPPED projector does ⛔ replay the
  stream (12.1 rejected the helpdesk replay-then-append order because it deadlocks, TR12 there): it checks that the stream head
  equals `lockedRow.stateEventVersion` (a mismatch is DRIFT ⇒ `FieldWorkerStreamConcurrencyError`), appends at version + 1, then
  does the guarded UPDATE. One lock order everywhere (row lock → `events_log` append → row UPDATE) prevents the 40P01 deadlock.
  I4 is proven by a TEST that folds the stream, not by the projector replaying. No cross-stream `events_log` index is needed (the
  per-row lock already serialises `kyc_completed`). The caller's transaction must be READ COMMITTED (under REPEATABLE READ a lock
  waiter gets an untyped 40001). Genesis wraps itself in a SAVEPOINT (as 12.1) so a refused genesis leaves the transaction usable.
- **QE14 — Audit pairing is the CALLER's.** Domain commands take `client: pg.PoolClient` and a REQUIRED `auditId`; no domain
  function calls `withCompensatingAudit` (12.1 QE15). `audit_id` is the MOST RECENT transition's audit line.
- **QE15 — Immutability and profile correction. ⭐ Name and mobile are immutable after genesis; a typo is corrected by terminating
  (`registered_in_error`) and registering again.** Cost: the corrected worker gets a NEW id and a NEW code, and a code already
  said aloud is dead. Alternative: an eighth event `field_worker.profile_corrected` (ciphertext in, no PII in the payload; the
  guard allows the three columns to change only under the writer var). Not recommended now — the epic fixes six events (a seventh,
  `posted`, was added for moves, QE17) and the correction authority is unsettled; revisit with 13.3 (the worker's own surface) — C5.
- **QE16 — State labels. ⭐ `pending_kyc` (underscore), as the epic's AC writes it** — ⚠ the member lifecycle spells its states with
  hyphens (`pending-kyc`); a pgEnum label cannot be renamed cheaply, so the choice is made once, here.

- **QE17 — The worker's REPORTING district. APPROVED by BigDev 2026-11-03, REVISED twice the same day (the second revision: what the
  district MEANS, who may change it, and a required reason).** The first version stored a district ONCE, immutably, with a move as an
  ending plus a new registration. BigDev corrected it: field workers ROTATE — the work in a district completes within a few months and
  the worker moves on instead of the Trust hiring and training someone new — and will also move between Pariwars. A move would have
  marked the person "ended" and issued a new code every few months, so that version is WITHDRAWN.
  **What the district is (second revision).** BigDev (verbatim, as recorded in `-442`): "well, I don't want to restrict worker
  movement because a school may sits near another district boundary and visiting that school would cost money and time again, so we
  have to figure out." So `district` is the worker's REPORTING district — the
  district whose District Admin manages them (the Panel's rule, `-441`). It is NOT a work area: nothing in the system ties where a worker
  recruits to it — a code works anywhere in the Pariwar, and credit follows the worker's lifecycle state only (13.2's registry and
  `acceptsNewAttributions` never read it). The identifier stays `district` (the gate's dimension and the geo tree's word); every comment,
  DTO description and screen label says "reporting district".
  **Shape.** `field_workers.district` (text NOT NULL) is a PROJECTED column like `current_state` — set at genesis from the registration,
  then changed ONLY by a seventh event, `field_worker.posted` (payload `{ from_state, to_state, trigger, actor, authorization,
  from_district, to_district, reason_code }`, a non-transition marker like `kyc_completed`: legal in `pending_kyc`, `active` and
  `suspended`, never in `terminated`). The history of postings IS the stream — the full log the Panel asked for (I15) — and I4 covers
  it. The member-posting shape (an append-only `member_postings` table plus `member.posting_updated`) is the alternative: a second
  table for the same history; the projected column is simpler for a primitive whose other attributes are already stream-derived. A
  command `postFieldWorker` exists (tests call it; its routes are 13.1c's — a Pariwar Admin's direct move — and 13.1d's — the request flow). Validation: a LISTED district of the Pariwar (the geo tree's
  `district` nodes when a tree is in force, else the listed workplace districts — the same two reads 12.2's
  `assertScopeValuesRecorded` makes, `geoTreeVersionInForce` and `findListedWorkplaceDistricts`); write `assertDistrictRecorded(db,
  pariwarId, district, at)` from them, do NOT call `assertScopeValuesRecorded` or import marketplace's `ModuleScopeValueUnknownError`;
  throw `FieldWorkerDistrictUnknownError`.
  **A required reason (new).** `reason_code` is `at_worker_request` (the worker asked to report to another District Admin) or
  `reassigned` (the Trust moves the worker: their District Admin has gone, the district is restructured, they are needed elsewhere) —
  QE12's post list. It lives in the EVENT only: it is NOT projected into `state_reason_code` (which stays non-null iff the state is
  suspended or terminated), and the fold's `reasonCode` ignores `posted`, so a suspended worker who is moved keeps their suspension
  reason.
  **Who may move (the routes' — 13.1c and 13.1d; the Panel's — Q-6, RULED A by `-443`: this rule, as built).** BigDev's rule, settled in steps on
  2026-11-03: a worker's reporting district changes only (a) by CONSENT between the two District Admins, or (b) by a Pariwar Admin
  directly. (a) The District Admin at EITHER end — the one the worker is leaving or the one they are joining — OPENS a request, at
  the worker's request (the only reason a District Admin may give); the District Admin at the OTHER end ACCEPTS it or REFUSES it
  with a reason from a fixed list. The worker stays where they are until it is accepted; the opener may withdraw it while it is
  pending; one left unanswered for 7 days goes to the Pariwar Admin and is NEVER accepted by default. The move itself is
  `postFieldWorker`, called in the same transaction as the acceptance under the ACCEPTING District Admin's verified authorization
  — target the destination district when the receiving District Admin accepts, the current district when the sending one does — and
  it fails cleanly if the worker has been moved meanwhile. The request lifecycle is a primitive of its own (Story 13.1d); this
  story builds only the move. (b) A Pariwar Admin moves a worker directly with either reason (`at_worker_request` or `reassigned`),
  with no acceptance — they are not blocked from either — and settles a refused or unanswered request (Story 13.1c). Per-act keys
  (their owners' to mint; 13.1 mints none): open a request and respond to one (13.1d), and a direct move held by `pariwar_admin`
  only (13.1c); the snapshot (QE18) records which. The domain command refuses an authorization whose `target` is neither
  `{ district, toDistrict }` nor `{ district, the worker's current district }` (AC5) and does not know the keys. ⚠ Until those keys
  exist, `postFieldWorker` accepts any verified authorization checked at `dimension: 'district'` (its tests use
  `field_worker.register`, the only field-worker key); the story that mints a move key (13.1c / 13.1d) makes `postFieldWorker`
  REFUSE every key outside the minted move-key list — `field_worker.register` explicitly — in the same commit (C5, C10). The other lifecycle
  acts — suspend, reactivate, terminate — still gate on the worker's CURRENT district, read server-side from the row; registration
  checks the BODY's district. This supersedes the build reading in `-441` ("later acts gate against the current district") for the
  MOVE only — decision `-442`'s **Supersedes** line says so; the Panel's words are untouched.
  **Costs, recorded.** "At the worker's request" is the admin's attestation: the system cannot see that the worker asked (a worker
  can ask directly only once 13.3 gives them a login). A move changes WHO manages the worker at once: the old District Admin loses
  the gate, the new one gains it. Each move by consent takes two admin actions, and disputes land on the Pariwar Admin. The route
  reads the current district BEFORE the gate, so a concurrent move can leave a stale target; the command then refuses it with
  `FieldWorkerAuthorizationStaleError` (409 `field_worker.authorization_stale` — a business race, never the 500 of a programming
  error; QE5 guard 3c), and 13.1c / 13.1d decide what the caller is told.
  **Decisions (BigDev, 2026-11-03), in order.** (1) The Pariwar Admin is NOT blocked from `at_worker_request`: the worker's request
  may be placed with a District Admin or a Pariwar Admin. (2) "Yes, widen it to the current District Admin" (v1.15): the District
  Admin the worker is leaving may act too — which is why AC5 accepts EITHER end as the target. (3) REPLACED the same day (v1.16: "well I
  think request should be made by sending District Admin to receiving District Admin. There should be mechanism to accept to refuse
  with reason. What do you say?" — then "Yes to all four, mint 13-1d"): a District Admin no longer records a move ALONE; one opens a request and
  the other accepts or refuses. Four settled points: either District Admin may open (so a worker who asks the receiving District
  Admin is not sent away); the refusal reason is from a FIXED list, never free text — the record is permanent; an unanswered
  request goes to the Pariwar Admin after 7 days; and Story 13.1d is minted. (4) Notices go by BOTH email AND in-app: the
  counterpart District Admin is told of a request, the opener of the answer and its reason, the Pariwar Admin of an escalation, and
  BOTH District Admins of a move a Pariwar Admin makes (not the one who made it) — none ⇒ nothing is sent, and a failed send never
  undoes anything. They are CONSUMERS of the events, so they cover a move whichever route made it, and they are built in 13.1d, not
  here: this story's `posted` payload already carries what they need. Traced 2026-11-03 — the platform has NO notice to a District
  Admin by either channel. EMAIL: Story 6.25's staff-email child mails Pariwar Admins, decrypting the Tier-1 admin email under a
  fenced allowlist (`apps/jobs/tests/staff-email-identity-read-fence.test.ts`, ADR-0040) — a District Admin notice needs a
  recipient resolver, a template, an outbox row per event and recipient, and a new fence entry. IN-APP: no admin notice list or
  unread marker exists in `apps/admin`; the precedent is Story 6.20 D14's Pariwar Admin refusal READ surface
  (`/p/$pariwarId/nominee-refusals` — "a notification, never an approval step"). Whether a notice names the worker (a
  purpose-limited, audited decrypt of the name) is 13.1d's. Plus the seventh event (the epic named six; AC3 and the registry
  coverage test move to seven) and the guard's projected-column list gains `district`.
- **QE18 — The authorization that passed goes in the log, as a VERIFIED SNAPSHOT. APPROVED by BigDev 2026-11-03 with two conditions:
  (1) the role recorded is a verified authorization RESULT, not a handler's assertion; (2) it is recorded as an authorization
  SNAPSHOT.** The Panel's rule (`-441`) has a District Admin primary and a Pariwar Admin fill-in "for any reason"; the system cannot
  know a District Admin is "unable", so BOTH roles hold the permission always and the fill-in is NOT enforced (Q-8). To keep a fill-in
  visible rather than silent, `registered` and `posted` carry `authorization = { permission_key, role, grant: { dimension, value,
  grant_id? }, target: { dimension, value }, catalog_version }` — a snapshot of what authorised THAT act at THAT moment, so it does
  not change when the grant is later revoked, the role renamed or the catalog bumped. The actor is `events_log.actor_id` and the
  Pariwar `events_log.pariwar_id` (not duplicated); the object is `.strict()` and holds no personal data.
  **How it is verified (the author's mechanism for the two conditions).** (a) ONE predicate: in the RBAC core
  (`packages/domain/src/rbac/check.ts`) the per-grant test is extracted out of `hasPermission` into ONE private predicate that
  `hasPermission` and a new PURE helper `authorizingGrant(grants, key, resource, ctx?): EffectiveGrant | null` both call, so
  "allowed" and "which grant" cannot disagree. (b) `authorizingGrant` picks the authorizing grant — when several pass, the MOST
  SPECIFIC in the order the repo ALREADY uses: `rbac.matchingGrantRole` (`rbac/matching-grant.ts`, Story 6.19b, `-270`; six callers
  in `apps/api/src/modules/claims/`) sorts by the reverse of `SCOPE_DIMENSIONS` — `district` before `state` before `pariwar`,
  `global` last. It keeps that order and adds a deterministic tie-break ONLY among grants of the same dimension (role, scope value,
  grant id), so the answer is the same whichever order the grants were loaded in. `matchingGrantRole` is re-pointed to
  `authorizingGrant(grants, key, resource, ctx)?.role ?? null` — its signature unchanged, so its six callers are untouched — and the
  repo keeps ONE answer to "which grant authorized" (TR13). `authorize(params: RequirePermissionParams, ctx?):
  VerifiedAuthorization | null` takes `requirePermission`'s own `{ actorId, grants, key, resource }`, calls `authorizingGrant` and
  builds the result — `actorId` from `params.actorId`, `pariwarId` from `params.resource.pariwarId`. `matchingGrantRole` has no actor,
  so it never mints a `VerifiedAuthorization`. The result is a
  `VerifiedAuthorization` issued only inside `check.ts`, DEEP-FROZEN (`Object.freeze` on it, its `grant` and its `target` — a WeakSet
  proves identity, not contents, so an unfrozen object could be edited after the check and still pass) and registered in a
  module-private WeakSet (`isVerifiedAuthorization`), so an object literal with the same fields is NOT verified. Its shape:
  `{ readonly permissionKey; readonly role; readonly pariwarId /* the RESOURCE's Pariwar — never the grant's: a global grant carries its
  home Pariwar */; readonly actorId; readonly grant: { dimension, value: string | null /* null iff global */, grantId?: string };
  readonly target: { dimension, value: string | null /* null iff the gate is global — requireGlobalPermission */ }; readonly
  catalogVersion }` (the EVENT snapshot's `target.value` stays a non-null string — AC3 — because both field-worker acts are
  district-gated). The command maps it to the snake_case payload snapshot;
  `pariwarId` and `actorId` are NOT written to the payload (they are `events_log.pariwar_id` / `actor_id`). (c) `requirePermission`
  returns it (it returned nothing) and `requirePermissionHook` stores it with `(request.authorizations ??= {})[key] = result` — a fresh
  object per request; never `decorateRequest('authorizations', {})`, which Fastify 5 rejects for a reference default and which would share
  one object across requests. `checkPermission` is NOT changed (no caller needs the grant, and `check.test.ts` pins
  `toEqual({ ok: true })`). The handler passes THAT stored result to the domain and NEVER recomputes it from `request.scopeGrants`.
  (d) The domain commands that carry it refuse (`FieldWorkerProjectorInputError`) anything that is not a verified result, whose
  `pariwarId` or `actorId` differs from the command's, or whose key / dimension (or, for `register`, target) is not this act's
  (AC5); a `posted` target is judged UNDER THE LOCK (QE5 guard 3c) and any mismatch is `FieldWorkerAuthorizationStaleError`. (e) `EffectiveGrant` gains an optional `grantId`
  (`role_grants.id`) so the record can point at the row; `loadActorGrants` and `loadGlobalActorGrants`
  (`apps/api/src/modules/rbac/index.ts`) select `id`. ⚠ `authorize` is PURE over the grants it is given — a caller could pass
  fabricated grants: a source-fence unit test pins that `authorize(` is called only from `check.ts` (`requirePermission`),
  `apps/api/tests/integration/_field-worker-fixture.ts` and `*.test.ts` / `*.spec.ts` files (⚠ VARIANCE, review R10: AND `packages/domain/tests/integration/field-worker/_fixtures.ts`, by exact path — Debug Log (c); review R7: the fence flags EVERY reference to `authorize` — an alias, a property read, element access, a destructured binding — not only a call) (⚠ AMENDED by review round 3, R3-29 — BigDev, 2026-11-04, R3-DN2 "1": `requirePermission` RETURNS the same result and is just as pure, so a SECOND fence flags every USE of its return value outside `check.ts` and the rbac hook `apps/api/src/modules/rbac/index.ts` (and test files) — its other callers drop it; both fences walk `apps/`, `packages/` and the ROOT `scripts/` / `tests/` (R3-25) and recognise an assignment destructuring and a literal `Reflect.get` (R3-26); a drift guard, ⛔ a security boundary) [⚠ CORRECTED by review round 4, R4-4: as written at R3-29 the SECOND fence did NOT recognise those forms, nor an import alias, `.call` / `.apply` / `.bind`, a literal element access or the function passed as a value — it does now; both fences also see a for-of assignment pattern and a `Reflect` reached through `globalThis` or `['get']` (R4-6), skip an absent root and build output (R4-11), and the second's floor counts DISCARDED CALLS in the AST, the four real guard callers named (R4-5)]. The precedent is decision `2026-08-13-105` D4: "the
  grant that actually authorized", not "the first grant in the tenant". `posted` carries it from day one (QE17); the other five events
  when their routes are built (C5).
  **Costs, recorded.** The snapshot records the role and grant that PASSED, not the role's permission list then in force (the Super
  Admin can edit bundles — FR-44 — and that edit is not traced here). A `grant_id` may point at a row later deleted, so the tuple, not
  the id, is the record. An actor holding both a district and a pariwar grant is logged as the District Admin even if they meant to
  fill in (most specific wins). The RBAC core is a governance-boundary root: this is a reviewed, strictly ADDITIVE edit (every existing
  RBAC test passes unchanged, `matching-grant.test.ts` included — none of its cases ties within one dimension) [⚠ CORRECTED by review round 4, R4-12: except the version / count pins Task 8 bumps (`permissions.test.ts` 58 → 59, 77 → 78) and one assertion added inside an existing `roles.test.ts` `it`]. It is
  behaviour-preserving, not "untouched": every `requirePermissionHook` caller (132 calls in 62 files at `268d86b5` — re-count at
  Task 0.1) now also records its result, and `hasPermission`'s 29 callers in 20 files outside `rbac/` run the extracted predicate. Whether a Pariwar Admin should be BLOCKED while a District Admin is in
  post was the Panel's: RULED — Q-8 A (`-443`): not blocked; both can always act and the log records which authorisation allowed
  each act — this snapshot, as built.

- **QE19 — A worker who moves to another Pariwar is a NEW registration there. APPROVED by BigDev 2026-11-03; the Panel RULED
  Q-7 C (`-443`): a new registration NOW, plus a link between the person's records LATER (not our suggestion, A).** So this
  decision stands as built and is the first half of the Panel's answer; the link is carried as C11 (no row) — build nothing that
  forecloses it, and nothing that builds it. BigDev (2026-11-03): workers will also move between Pariwars. The landed foundation makes the Pariwar the unit of
  a worker's record, not a column to edit: 13.2's registry gives a worker ONE permanent code (`UNIQUE (field_worker_id)`), codes are
  unique only WITHIN a Pariwar (`UNIQUE (pariwar_id, code)`), a member enters a code in their OWN Pariwar and the lookup is
  tenant-scoped, every table is per-Pariwar RLS-isolated, and the mobile blind index is keyed per Pariwar so two Pariwars cannot even
  match the same person. The member-posting precedent took the same line: its header calls a move across tenants "a distinct, much
  larger capability" and leaves it out. So here too: a worker who moves is registered afresh by the new Pariwar's District Admin or
  Pariwar Admin (a new id, a new code, a first district), and the old record is left as it is — active, or ended by its own
  Pariwar's admins for a reason that fits. Nothing in this story links the two. Cost, recorded: two records and two codes for one
  person; no single history; a person-level view or one commission statement across records (13.5 pays by PAN) needs the LATER link
  the Panel chose (Q-7 C) — when it is built and what it joins are BigDev's to schedule; what may be shared between Pariwars returns
  to the Panel with that work (C11). Nothing here forecloses it.

- **QE20 — The date of termination is the ACTUAL LAST DAY, supplied by the admin. APPROVED by BigDev 2026-11-03 ("actual last day is
  fine").** Shape (the author's): the `terminated` payload carries `ended_on`, and it is PROJECTED into a nullable `date` column
  `ended_on` with `CHECK ((current_state = 'terminated') = (ended_on IS NOT NULL))` (`field_workers_ended_on_pair`), so the 8-year
  removal is a plain query on a column; the command refuses an `ended_on` that is missing, in the future, or before the day the worker
  was registered (`FieldWorkerEndedOnInvalidError`, command-only). ⭐ Both bounds are IST DAYS computed IN SQL: the NOW step is
  `SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS ist_today` (the TRANSACTION-START clock, the same as `occurred_at` — the
  `IST_TODAY` idea from `member/known-people.ts`, but NOT that constant, which uses `clock_timestamp()`; do not import it), and
  `lockedRow.registeredOn` is `(created_at AT TIME ZONE 'Asia/Kolkata')::date::text` (QE13). The guard compares the validated
  `ended_on` with them as `YYYY-MM-DD` strings (string order = calendar order): `endedOn <= istToday && endedOn >= registeredOn`. No
  JS `Date` is involved; a UTC "today" would make a same-day termination impossible between 00:00 and 05:30 IST. A missing or
  malformed `ended_on` (`z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` plus a calendar check) is refused in guard (0b), BEFORE any SQL;
  the column is read as text (QE4). `terminateFieldWorker`'s statement order is therefore SAVEPOINT → LOCK → NOW → HEAD → APPEND (the
  twin's RP4 shape). PROOF: the UPPER bound at 00:30 IST in the stub-client unit test (the NOW step returns an `ist_today` one day
  ahead of the UTC date; `ended_on` = that IST date is accepted); the LOWER bound live — register through `registerFieldWorker`, then
  under `session_replication_role = 'replica'` UPDATE that row's `created_at` to 00:30 IST of an IST day D (19:00 UTC of D−1), then
  `terminate` with `ended_on` = D−1 ⇒ `FieldWorkerEndedOnInvalidError` and `ended_on` = D ⇒ accepted (an owner-INSERTed row has no
  genesis event, so `terminate` would fail its HEAD check). The original reasoning follows. The recruitment form
  promises the worker that their name and mobile number are removed 8 years after the DATE OF TERMINATION (BigDev, 2026-11-03). The
  `terminated` event's `occurred_at` is when the admin RECORDED it, not when the engagement ended: a termination recorded two months
  late would delete two months late — past the promise. So the `terminated` payload would carry `ended_on` (a date; not in the
  future, not before the registration; supplied by the admin at termination, defaulting to the day it is recorded) and the 8-year
  clock runs from it. *Question for BigDev:* is "the date of termination" the day it is recorded here, or the actual last day, which
  can be earlier? — ANSWERED: the actual last day. Cost: one more field on one event, one projected column, and one more thing for the
  admin to enter; the terminate route is Story 13.1c's, so only the command, the payload and the column are built here.
- **QE21 — Registration and the interview's identity check. ANSWERED by BigDev 2026-11-03 — see ANSWER at the end; option (C) is OUT.** BigDev
  (2026-11-03): the identity check is PERFORMED IN THE INTERVIEW, before anyone registers the worker. So `kyc_completed` (QE8) would
  record something that has already happened, and `pending_kyc` would be a state a registered worker has no reason to sit in.
  *Options.* **(A)** as built: registration → `pending_kyc`; `kyc_completed` and `activated` are separate acts by routes Q-2 has not
  assigned — cost: the interview's check is re-attested in the system, and no worker can be credited until two more routes exist.
  **(B)** registration also records `kyc_completed`, in the same transaction (two events; the registering admin attests the identity
  check was done at interview) — cost: activation is still a separate route. **(C) ⭐** registration records `registered`,
  `kyc_completed` AND `activated` in one transaction, so a recruited, interviewed, identity-checked worker is `active` and creditable
  at once — cost: activation stops being a separate sign-off (the registration IS the sign-off, by the same admin), and a
  mis-registration is credited immediately. Under (C) the Panel's rule stands unchanged (credit only once active) and its fear —
  crediting someone the Trust has not checked — is met by the interview. The fact that decides between (B) and (C): WHO interviews and
  who decides to recruit (the District Admin?) — if the person who registers is not the person who recruited, keep (B). Panel-adjacent
  (it decides who is credited, and when): if BigDev chooses (C), put it to the Panel as a non-blocking confirm. 
  **ANSWER (BigDev, 2026-11-03): the District Admin REGISTERS and the Pariwar Admin APPROVES; if the District Admin is not available
  the Pariwar Admin does both.** So activation is a separate sign-off by a different officer — (C) is OUT — and this story's
  registration stays as built (`pending_kyc`, `kyc_status = pending`): `pending_kyc` now means "registered, awaiting the Pariwar
  Admin's approval". Left to Story 13.1a's create-story (`-442` QE21): whether the APPROVAL records `kyc_completed` AND
  `activated` in ONE transaction (B2 — the approver confirms the interview's identity check and activates) rather than the registrar
  attesting identity (B1). The approval route, its per-act key (suggested `field_worker.approve`, held by `pariwar_admin`, gated on
  the worker's CURRENT district) and the screens are Story 13.1a's; the commands exist here and are called by tests. BigDev's words
  are "if the District Admin is not available" — wider than "no District Admin holds the district", which is all the system can
  detect (Q-8). When the Pariwar Admin does both, the system does not stop the same person registering and approving (Q-8,
  default A). Who may approve was Panel-adjacent — it decides who is credited — and the Panel RULED Q-9 A (`-443`): the District Admin
  registers, the Pariwar Admin approves, and does both if the District Admin is not available — BigDev's process, as built. No AC or
  Task changes.
- **QE22 — The registration response does NOT show the code. APPROVED by BigDev 2026-11-03 ("Approve QE22 - yes"), option (B).** BigDev (2026-11-03): the code reaches
  the worker BY SMS once they are in the system, and an admin gives it by hand only on the worker's request. As built (QE9) the 201
  shows the code to the registering admin, who could tell the worker BEFORE approval — the very gap QE11 warns of (a signup before
  activation is never credited). *Options.* **(A)** keep it as built and rely on the runbook — cost: the gap is a rule, not a guard.
  **(B) ⭐** WITHHOLD the code from the 201: allocate it at registration (same transaction, as built), return `field_worker_id`,
  `district`, `current_state` and `kyc_status`, and let the code be read only after approval — by the SMS and by the audited read an
  admin makes on the worker's request. Cost: QE9 and AC8 change; an admin cannot see the code at registration; and the lost-201
  residual (TR11) loses its secret — a lost 201 now costs the admin the worker's id, not a code. APPLIED 2026-11-03: QE9, AC8, Task 7
  and TR11 follow; 13.1a's audited read is the ONLY way an admin sees the code, and it refuses a worker who is not yet active.

### Errors and their HTTP mapping (QE9, QE13) — the domain classes live in `field-worker/errors.ts`; the route maps them in `field-worker/errors.ts` (API)

| Class / condition | When | HTTP + code |
|---|---|---|
| `FieldWorkerIllegalTransitionError` | the (state, event) pair is not in QE5's table, incl. anything out of `terminated` | 409 `field_worker.illegal_transition` |
| `FieldWorkerKycAlreadyCompletedError` | `kyc_completed` when `kyc_status = completed` | 409 `field_worker.kyc_already_completed` |
| `FieldWorkerKycNotCompletedError` | `activated` while `kyc_status = pending` | 409 `field_worker.kyc_not_completed` |
| `FieldWorkerReasonInvalidError` | a reason missing, unknown, or from the wrong list for the event (suspend, terminate or post) | 422 `field_worker.reason_invalid` |
| `FieldWorkerGenesisMissingError` | a command on an id with no row in this Pariwar | 404 `field_worker.not_found` |
| `FieldWorkerGenesisAlreadyExistsError` | genesis on a non-empty stream / the pkey, `field_workers_pariwar_worker_uq` or the stream-version unique fires (a same-id race may trip the composite unique first — map all three, never a `PersistError` 500) | 409 `field_worker.already_exists` |
| `FieldWorkerMobileAlreadyRegisteredError` | the pre-check, or the partial unique `field_workers_pariwar_mobile_live_uq` (mapped by CONSTRAINT NAME in the genesis row-INSERT catch) | 409 `field_worker.mobile_already_registered` |
| `FieldWorkerStreamConcurrencyError` | the stream head ≠ the locked row's version (drift) — never expected under the lock | 409 `field_worker.stream_conflict` |
| `FieldWorkerProjectorInputError` | a `system` / `member` actor or null `actorId`; a payload that fails its schema; an `authorization` that is missing, not a verified result of the RBAC check, for another Pariwar or actor, or for the wrong key / dimension / (register) target (QE18); a `posted` whose `from_district` ≠ the locked row's | 500 (a programming error — the route never builds one) |
| `FieldWorkerAuthorizationStaleError` | a `posted` whose VERIFIED authorization targets neither `toDistrict` nor the locked row's `district` — a concurrent move changed it after the gate (QE5 guard 3c, QE17) | 409 `field_worker.authorization_stale` (no route yet — 13.1c / 13.1d) |
| `FieldWorkerPersistError`, `FieldWorkerStateDirectWriteError` | the row write failed / the guard trigger fired | 500 |
| route: name not valid | handler content rule (QE9) | 422 `field_worker.name_invalid` |
| route: mobile not valid | `normalizeMobile` returns null | 422 `field_worker.mobile_invalid` |
| `FieldWorkerDistrictUnknownError` | `assertDistrictRecorded`: not a listed district of the Pariwar | 422 `field_worker.district_unknown` |
| `FieldWorkerDistrictUnchangedError` | `posted` to the district the worker is already in | 409 `field_worker.district_unchanged` (no route yet — 13.1c / 13.1d) |
| `FieldWorkerEndedOnInvalidError` | `terminated` with an `ended_on` that is missing, in the future, or before the registration day — IST days, in SQL (QE20) | 422 `field_worker.ended_on_invalid` (no route yet — 13.1c) |
| route: body shape wrong (type, unknown key, over-long) | the DTO (shape only) | 400 `request.validation` (the existing envelope) |
| route: `Idempotency-Key` missing, empty or over 200 characters | the handler | 400 `field_worker.idempotency_key_required` |
| route: the same key still in flight | `withIdempotency` | 409 `field_worker.idempotency_in_progress` |
| `FieldWorkerCaptureNotFoundError` | `getFieldWorkerStateAt` given an unknown `captureId`, or another Pariwar's | none — a domain read with no route in this story; its first caller (13.8 / 13.5) maps it |
| `AdminDisplayNameMissingError` (existing) | the admin has no `display_name` | 409 `admin.display_name_missing` |
| `AttributionCodeAllocationExhaustedError` (re-exported by the door) | after the flag call (whether or not the flag write itself succeeded — QE9) | 503 `field_worker.code_allocation_exhausted` |
| `FieldWorkerAlreadyHasAttributionCodeError`, `AttributionPariwarScopeMismatchError`, `AttributionCodeRequiresTransactionError` (door re-exports) | programming errors: the id is server-minted in the same transaction, and the handler passes the request's own `ScopeTx` | rethrown UNMAPPED ⇒ 500 |
| KMS encrypt / HMAC failure | `encryptDek` or `computeHmac` throws | rethrown UNMAPPED ⇒ 500; nothing is written (the transaction rolls back and no `mutate` ran) and `withIdempotency` releases the key, so a retry is safe |

No message, in any row, carries a worker's name or mobile (I8). The pre-check accessor and the genesis catch are the only places the
mobile-unique constraint is named.

The rows only a COMMAND can raise — `illegal_transition`, `kyc_already_completed`, `kyc_not_completed`, `reason_invalid`,
`not_found`, `stream_conflict`, `already_exists`, `district_unchanged`, `authorization_stale`, `ended_on_invalid` (and `FieldWorkerCaptureNotFoundError`) — have NO route under QE2 (A), and
`already_exists` is unreachable with server-minted ids; they are asserted in a mapper unit test (AC8), marked "no route yet — 13.1a / 13.1c / 13.1d".

### ASKs — BigDev's (or the Panel's), asked at Task 0.2

- **Q-1 — The permission key (§0 edge 4). ✅ DISCHARGED — RULED by the Panel, decision `2026-11-03-441` (by DR and KB): option A,
  WIDENED — a District Admin may add a field worker (the intended manager), the Pariwar Admin fills in; the full log is kept.** The
  text below is the ask as it stood (kept, not deleted); the note went to the Panel as its Question 1.
  *Plain question (for the note):* "Who in the Trust may add a person the Trust will pay
  to bring in members?" (This story builds only the ADD, and QE10 is approved as the per-act key `field_worker.register`; suspending or removing a worker
  is a different act with a different key — 13.6's. What this ask decides is whether the Panel must ratify the key, not its shape.) *The one deciding fact:* whether `-059` B(3) was meant to cover a key
  held by `pariwar_admin` that lets it add a field worker. *Options.* **(A)** write a Panel routing note (template §0 → plain
  question → the ONE deciding fact → options with honest costs → evidence last) and build the route + key only after the ruling;
  **(B) ⭐** record the key by author-commit (`-433` QE2 / `-421` QE6 / 10.3 precedent) and put it to the Panel as a NON-BLOCKING
  confirm in the same shape as `-421` QE14 (A) — built on the recommendation; a different answer changes the grant before go-live.
  Cost of (B): if the Panel meant the literal wording, the key was minted ahead of its ratification (merge ≠ go-live; nothing is
  live). Cost of (A): the registration route — and with it the registry's only caller — waits on a Panel sitting. *Evidence (last):*
  the Sources-table rows for `-059` B(3), `-210` cl.2, `-433`, `-421`, `-422` Consequence 1 (the Panel confirmed an author-commit
  key "as built"), `-438` DL6 (a key minted for a B(3) role), Trust Deed Cl. 20(h) and PRD §11 / OQ-5 — the Deed and PRD lines were
  read on 2026-11-03; re-read them before the note is sent. ⚠ (B) SUPERSEDES the wording of 13.2's C1 ("Panel-ratified under `2026-06-21-059` amendment B(3)") — never re-reads it — so Task 0.3 adds a dated supersede
  line under Story 13.1 in `epics.md` naming the decision. The note is DRAFTED for BigDev to send (the `-421` QE14 precedent: "drafted,
  ⛔ sent by the session"); under (B) it is the non-blocking confirm, under (A) it is the question.
- **Q-2 — Who owns the rest of the lifecycle? (observation, escalated — [[feedback_gap_analysis_observational]])** No Epic-13
  story builds an admin screen to register a worker, the routes that activate / suspend / reactivate / terminate one, or a
  list/detail read. With QE2 (A), FR-85's deactivation cannot happen in production, and an admin whose registration 201 was lost
  (TR11) cannot find the worker to approve it. Nor can anyone ACTIVATE a worker, which QE11's mitigation and Q-5 (A) both lean on (Task 0.4 (h)).
  **RECOMMENDATION (the author, 2026-11-03) — ADOPTED by BigDev the same day; see the ANSWER at the end of this ask.** BigDev's process is now
  known: the District Admin REGISTERS, the Pariwar Admin APPROVES (the Pariwar Admin does both if the District Admin is not available),
  the code goes to the worker BY SMS once they are in the system, and an admin gives it BY HAND on the worker's request. That is
  three pieces of work, in this order. **13-1a — onboarding completion (the CRITICAL PATH to go-live):** the approval route
  (`kyc_completed` + `activated`, QE21), the audited code read for the by-hand case, and the admin screens (register, approve, view the
  code). Without it no worker can be credited (Q-5 A), so 13.8's first signup would credit nobody. **13-1b — the SMS of the code
  (parallel, NOT on the critical path):** the by-hand path is already sanctioned by the process, so go-live need not wait for it; but
  DLT approval of a new template is an external wait, so START THE TEMPLATE REGISTRATION NOW. **13-1c — moving and ending workers
  (soon after go-live):** the move route (`posted`; who may change a worker's reporting district is Q-6 — since RULED A, `-443`), suspend and reactivate, terminate with the actual last day
  (`ended_on`, QE20) — which waits for 13.6's reversibility and appeal decision (C4) — and the READ of the full log; the 8-year removal
  is later still (the first is due 8 years after the first termination) and needs an owner, not yet a row. *Why not fold it all into
  13.1:* the primitive and the registration route are the foundation the rest build on; the SMS carries an external wait; and 13.1 is
  already the largest story in the epic. *Why not leave it to 13.3 / 13.4 / 13.6:* 13.3 is the worker's own mobile app, 13.4 a
  dashboard, 13.6 anti-fraud — none is an admin onboarding surface — and 13.8, the first consumer, needs workers to be active. See C9.
  The Panel has now ruled (`-441`) that the District Admin is the intended MANAGER of field workers with the Pariwar Admin filling
  in, and to "keep the full log": so the owner of the other lifecycle routes gates each one on the worker's STORED district (QE17),
  mints a key per act, and gives the log a READ (nothing lets anyone see it today). **ANSWER (BigDev, 2026-11-03: "mint 13-1a, 13-1b, 13-1c") — DISCHARGED; a FOURTH row, `13-1d-field-worker-move-requests-and-notices`, was minted the same day (v1.16) for the District-Admin-to-District-Admin move request and the notices.** The three rows are minted in `sprint-status.yaml`, `backlog`, in this order after this story's row, each with an entry in `epics.md` (`### Story 13.1a` / `13.1b` / `13.1c`): `13-1a-field-worker-approval-and-code-hand-over` (approval, the audited by-hand code read, the admin screens — the critical path), `13-1b-field-worker-code-by-sms` (the SMS — parallel) and `13-1c-field-worker-moves-suspension-and-termination` (move, suspend, reactivate, terminate, the full log's read). THROUGHOUT THIS STORY, "Q-2's owner", "the owner Q-2 names" and "the owner of the other lifecycle routes" mean those FOUR stories: 13.1a for the approval, the code read and the admin screens; 13.1b for the SMS; 13.1c for a Pariwar Admin's direct move, suspend, reactivate, terminate and the log's read; 13.1d for the District-Admin-to-District-Admin move request and every notice. Each mints the per-act keys of the routes it builds (QE10). 13.1 builds none of their routes and waits for none of them to LAND — they need 13.1 landed, not the reverse. NOT homed in any row: the 8-year removal (C5), which is due eight years after the first termination and needs an owner named before the first terminate route reaches a real worker (13.1c's entry carries it).
- **Q-3 — The footing and notice for a field worker's name and mobile (§0 edge 5; counsel's, Story 0.13 — REWRITTEN 2026-11-03).**
  BigDev: a worker SUBMITS A PHYSICAL FORM, is interviewed and is recruited after ACCEPTING THE ORGANIZATION'S TERMS, before anyone
  registers them here. So this is not a stranger whose details an administrator types in unseen: the person has applied and agreed
  terms. *Plain question:* "Do the form a worker submits and the terms they accept already give the Trust the footing and the notice
  to hold their name and phone number in the platform — and if not, what must they say?" *The one deciding fact:* what the form and
  the terms actually say — BigDev holds them; the session has NOT seen them. *Options.* **(A) ⭐** BigDev checks the form and terms:
  if they tell the worker that the Trust will hold their details electronically, for what, and for how long, and record their
  agreement, the footing and the notice are MET by them (record the form's version in the go-live row), and counsel is asked only the
  legal points that remain (classification, retention, erasure — the first is already on counsel's list, PRD §4.14.1 and the charter
  §4). **(B)** counsel REVIEWS the form and terms (a short review, not a fresh opinion) before registration goes live. **(C)** hold
  registration. *Cost of (A):* the check is BigDev's, not a lawyer's; if the form is silent, (B) follows. *Evidence (last):* the
  Privacy Policy covers Members, nominees and claimants only (§1; draft, private copy) — it does not decide this; the worker's own
  form may. [[project_dpdpa_counsel_engaged_but_unrecorded]]: counsel is engaged but their answers are not recorded — ⛔ assume one;
  record it un-attested if unanswered ([[feedback_record_unattested_no_backfill]]). **GO-LIVE FENCE, not a merge blocker:**
  registration must not go live until the footing and notice are confirmed; the fence is a Row in the roster at Task 0.4. The
  counsel question (`counsel-question-2026-11-03-field-worker-data-basis.md`) asks THREE questions — the classification, whether
  8 years is sound, and erasure before them; the footing and notice are NOT asked (the form settles them — UPDATE below). WRITTEN,
  not sent. An optional addition (not specified; say if wanted): record a non-personal reference to the physical form at registration, so
  the digital record points to the paper.
  **RESULT (BigDev, 2026-11-03).** The form tells the worker that the Trust keeps their name and mobile number ELECTRONICALLY, for as
  long as they are employed, and REMOVES them 8 years after the date of termination. Option (A) is therefore MET for the electronic
  keeping and the retention period. NOT YET STATED at that point (ANSWERED below) — UN-ATTESTED, never assumed: the PURPOSES the form gives and whether the worker's
  agreement is recorded on it. The form is "Application for Field Worker", version 1 (BigDev, 2026-11-03) — for the roster row. Counsel's remaining questions are narrower than
  before: the classification (the form says "employed"; the PRD says contractors), a worker's request for erasure BEFORE the 8 years
  are up, and — only if the form is silent — the purposes (see the revised counsel question).
  **UPDATE (BigDev, 2026-11-03: "Q-3 - yes it states").** Asked whether the form states the purposes the Trust uses the name and
  number for AND records the worker's agreement, BigDev answered yes. Recorded as CONFIRMED for both parts, on BigDev's word (the
  session has not seen the form, and the WORDING of the purposes is not recorded here). Option (A) is therefore MET: the footing
  and the notice are the form's, and counsel's first question falls away. Counsel keeps three: the classification, whether 8 years
  is sound, and erasure before them. NOT thereby known: whether the stated purposes reach (i) issuing and tracking the code, (ii)
  contacting the worker about work, (iii) texting the worker their code (13.1b) and (iv) paying them (13.5) — the roster row records
  the purposes as BigDev reads them, and 13.1b and 13.5 re-check their own use.
- **Q-4 — C6, the one human premise left. ANSWERED — NO (BigDev, 2026-11-03).** 13.2's Q-S5 was *"no"* on 2026-11-01. Re-ask: "Has any attribution code been handed
  out by hand, or any signup gone live with a code, since then?" If yes, 13.2's AT4 / as-of rule are re-decided before registration goes live.
  ⭐ WHAT THE CODE SAYS (traced 2026-11-03 at `268d86b5`, asked by BigDev as "what's the way to hand out code at present?"): NOTHING in
  the system can issue a code today — no route, screen or script calls the allocator (only the door wrapper and the domain function
  define it) — and a member's typed Reference Code is stored as unchecked text (`attribution_source`, Story 3.6b). So any code a worker
  holds now was made OUTSIDE the system; it credits no one, and 13.2's as-of rule will not credit a signup made before a code was
  allocated. Registration through this story is the FIRST way to issue one.
  **ANSWER (BigDev, 2026-11-03): "Q-4 - No"** — no attribution code has been handed out by hand, and no signup has gone live with one,
  since 13.2's Q-S5 ("no", 2026-11-01). So 13.2's AT4 and its as-of rule stand as built. This rests on BigDev's word: nothing in the
  repo can see a code made outside the system. Roster leg (c) is MET on it.
- **Q-5 — Credit while `pending_kyc` (§0 edge 11; QE11).** ✅ DISCHARGED — BUILD RULE SETTLED by BigDev, 2026-11-03 (QE11:
  `active` only), then CONFIRMED by the Panel as option A (Question 2 of the same note as Q-1; decision `2026-11-03-441`). The text
  below is the ask as it stood (kept, not deleted).
  *Plain question:* "A worker has been registered and given a code but
  is not yet verified and activated — are signups under their code credited to them?" *The one deciding fact:* whether the Trust
  would rather lose an early signup's credit or credit an unverified worker. *Options.* **(A) ⭐** credit `active` only — a clean
  rule, but signups under a not-yet-activated worker's code are not credited and are not recovered later (13.2's as-of rule); the
  cost is borne by the worker, permanently, and — until Q-2 gives "activate" a production owner — by EVERY registered worker.
  **(B)** credit `pending_kyc` too — nothing is lost, the Trust credits a person it has not yet verified (payout is gated
  elsewhere); the cost is borne by the Trust's assurance. If the Panel answers (B) (or BigDev changes the rule), `acceptsNewAttributions` is
  `state === 'active' || state === 'pending_kyc'`, QE11's mitigation falls away, and a records commit amends AC10, the
  Policy-meaning sentence and 13.8's C2 block before go-live. *Evidence (last):* PRD FR-85 says only "new attributions on deactivated code rejected"; `pending_kyc` is not
  "deactivated".

- **Q-6 — Who may change the District Admin a field worker reports to (the Panel's; NON-BLOCKING for the build — added 2026-11-03,
  REWRITTEN three times the same day after BigDev's corrections). DRAFTED as Question 1 of
  `trustee-panel-routing-note-2026-11-03-story-13-1-moving-workers-and-fill-in.md`. ✅ DISCHARGED — SENT and RULED A by the Panel,
  decision `2026-11-03-443` (by DR and KB): by consent, or a Pariwar Admin directly — the build default, as built.** The text below
  is the ask as it stood (kept, not deleted).
  BigDev: workers are NOT to be restricted to a district (a school near a boundary should not cost a second trip), so the district is
  who the worker REPORTS to; it changes only when the worker asks, by consent between the two District Admins — or directly by a
  Pariwar Admin when the Trust needs it — without loading the Pariwar Admin with routine moves. *Plain question:* "Who may change
  which District Admin a field worker reports to?" *The one deciding fact:* whether the District Admin at the other end of a move
  must agree. *Options.* **(A) ⭐** BY CONSENT — one District Admin opens a request at the worker's request, the other accepts or
  refuses it with a reason from a fixed list, and the Pariwar Admin may also move a worker directly, for either reason, and settles
  a refused or unanswered (7 days) request; both District Admins are told by email and in the admin console; **(B)** only the
  Pariwar Admin changes it, whatever the reason — tight, but every move waits on the Pariwar Admin and the District Admins
  "manage" workers they cannot move; **(C)** either District Admin may record a move ALONE at the worker's request — fast, but one
  District Admin can send a worker to, or take one from, another without agreement (the earlier suggestion, now superseded by (A)).
  No route calls the move command until 13.1c / 13.1d build theirs, so nothing goes live unruled; the build waits for no answer and
  proceeds on (A).
- **Q-7 — A worker who moves to another Pariwar (the Panel's; NON-BLOCKING for the build — added 2026-11-03). Question 2 of the same note. ✅ DISCHARGED — RULED C (`-443`): a new registration now, plus a link between the person's records
  later — NOT our suggestion (A). The build is QE19 as built; the link is C11 (no row). The text below is the ask as it stood.** *Plain question:* "A
  field worker who has worked for one Pariwar moves to another: is that the same worker, with the same code and history, or a new
  registration in the new Pariwar?" *The one deciding fact:* whether the Trust treats the person as ONE across Pariwars — which
  would let one Pariwar's record of them be seen from another's, and decides whether they hold one code or one per Pariwar.
  *Options.* **(A) ⭐** a new registration in the new Pariwar (QE19) — how the system is built and how members' postings work; two
  records, two codes, no link; cost: their work is split and a person-level view needs a later link. **(B)** one worker across
  Pariwars — the code registry and the Pariwar data boundary would change (landed work; a worker record visible to several
  tenants). **(C)** a new registration PLUS a Trust-level link between the records — a later, narrower form of B. *Evidence (last):*
  QE19.

- **Q-8 — Is the Pariwar Admin's fill-in enforced? (the Panel's; NON-BLOCKING for the build — added 2026-11-03; QE18). DRAFTED as
  Question 3 of the same note. ✅ DISCHARGED — RULED A (`-443`): both can always act and the log records which authorisation allowed
  each act (QE18, as built). The text below is the ask as it stood.** *Plain question:* "You said the Pariwar Admin fills in when the District Admin cannot do the
  job, for any reason. Should the system stop a Pariwar Admin from adding or managing field workers while a District Admin is in
  post — or trust them and record who did what?" *The one deciding fact:* whether the system can know a District Admin is "unable"
  — it cannot, except that none has joined. *Options.* **(A) ⭐** both can always act and the log records the authorization that passed (QE18) —
  cost: nothing stops a Pariwar Admin acting when the District Admin is perfectly able. **(B)** a Pariwar Admin may act only where no
  District Admin holds the district — cost: only "not yet joined" is detectable, so illness or leave would block the Pariwar Admin
  until a Super Admin steps in. **(C)** a Pariwar Admin acts after recording a reason, which the log keeps — cost: friction, and the
  reason is the Pariwar Admin's own word.

- **Q-9 — Who approves a registered field worker? (the Panel's; NON-BLOCKING for the build — added 2026-11-03).** Question 4
  of `trustee-panel-routing-note-2026-11-03-story-13-1-moving-workers-and-fill-in.md`. ✅ DISCHARGED — RULED A (`-443`, on the
  "not available" wording — BigDev confirmed that version was put): the District Admin registers, the Pariwar Admin approves, and
  does both if the District Admin is not available (QE21; Story 13.1a builds the approval). The text below is the ask as it stood. BigDev's process: the District Admin
  REGISTERS, the Pariwar Admin APPROVES, and the Pariwar Admin does both "if District Admin is not available" (BigDev's words — the
  system can detect only that no District Admin holds the district, Q-8). `-441` named the
  District Admin as the manager and the Pariwar Admin as the fill-in; a Pariwar Admin who APPROVES the District Admin's registrations
  is a different role (a check on them), and approval decides who is credited and so, later, paid. Options and costs are in the note.

## Invariants (I)

- **I1** — The projected columns `current_state`, `state_event_version`, `kyc_status`, `state_reason_code`, `district`, `ended_on`, `audit_id` and
  `updated_at` are written ONLY by `projectFieldWorkerGenesis` / `projectFieldWorkerTransition`. Two mechanisms: the DB trigger
  rejects any unguarded INSERT or UPDATE; the AST gate (`field-worker-state-invariant`) fails any write outside the projector.
- **I2** — Every other column is immutable after INSERT, even with the guard on (the trigger compares the whole row minus the I1
  columns, so a column added later is immutable by default).
- **I3** — On INSERT: `current_state = 'pending_kyc'`, `kyc_status = 'pending'`, `state_event_version = 1`, `state_reason_code IS
  NULL`, `ended_on IS NULL`, `audit_id` non-null, `district` non-blank. With the guard on, `state_event_version` strictly
  increases, `kyc_status` never goes `completed → pending`, and `district` changes only in an UPDATE that changes none of
  `current_state`, `kyc_status`, `state_reason_code` or `ended_on` (only `posted` moves it).
- **I4** — After every projector call the row equals `foldFieldWorkerProjection(loadEvents(field_worker_id))` on `{ state, version,
  kycStatus, reasonCode, district, endedOn }`.
- **I5** — A worker is `active` only with `kyc_status = 'completed'` (CHECK + the activation guard).
- **I6** — `terminated` is terminal: no event leaves it, in the reducer, the commands or the trigger (the trigger rule is Task 2.2's
  OWN — 0193 has none — and a resurrected row would re-enter the partial unique index and could collide with a live
  re-registration of the same mobile).
- **I7** — All seven events are authored by a human actor (`operator` / `trustee`) with a non-null `actorId`; no event is ever
  recorded with actor `system` or `member`.
- **I8** — No event payload, audit line, log line, error message or response carries a worker's name or mobile in any form, and
  no response of this story carries the attribution code (QE22); `events_log` is append-only and survives erasure.
- **I9** — `field_workers` has no `attribution_code` column; the code is read only through the door; no file in
  `packages/domain/src/field-worker/` imports `attribution-code`, and no file outside the door and the module names the registry.
- **I10** — A worker row is never deleted, by ANY role: `twt_app` has no DELETE grant; a row-level `BEFORE DELETE` and a
  statement-level `BEFORE TRUNCATE` trigger on `field_workers` refuse every role (only `session_replication_role = 'replica'`, the
  fixture cleanup, bypasses them — Task 2.2); and the composite FK is `ON DELETE NO ACTION`. Erasure is an UPDATE (C5), never a DELETE.
  (⚠ NARROWED by review round 3, R3-18: every role's DML — the table OWNER can still `ALTER TABLE … DISABLE TRIGGER` without superuser, and
  Postgres forbids that only with event triggers; DDL is outside I10. The `0200` header comment says "EVERY role" too — left unedited, the
  migration is applied on the story DB, so this record carries the correction.)
- **I11** — Registration creates the worker row AND the code in ONE transaction; if either step fails neither survives; an
  exhaustion flag is committed on its own and the registration still rolls back.
- **I12** — This story changes no member-facing behaviour and moves no commission right: no member state, no `account-frozen`
  source, no change to `member_attribution`, no payout field.
- **I13** — One lock order for every transition: row lock → `events_log` append → row UPDATE.
- **I14** — `PERMISSION_CATALOG_VERSION` moves by exactly one — for the single key `field_worker.register` (QE10) — the Panel having ruled (`-441`); no role other than `district_admin` and
  `pariwar_admin` (+ derived `super_admin`) gains it; the `field_worker` bundle stays `permissions: []`.
- **I15** — The full log of a field worker is kept (the Panel: "Keep the full log of field worker", `-441`). Nothing in this story
  deletes, truncates or rewrites any part of it: the lifecycle events (append-only `events_log`, which survives erasure), the audit
  lines — including the `_rolled_back` ones — and the worker row (I10). A worker who is ended keeps all of it. ⚠ Nothing yet lets
  anyone READ the full log (Story 13.1c).

## Acceptance Criteria

0. **AC0 — governance first. MET 2026-11-03 except Task 0.1 and Task 0.4.** `-441` (`93b7e419`), `-442` (`6a3172e4`), `-443`
   (`7cd400f2`) and `-444` (`86274245`) are committed, each ALONE, before any code; the story, `epics.md` and `deferred-work.md` are
   amended to them (`9c0050fc` v1.16, `88243907` v1.17, `7fefe8dc` v1.18, then v1.19). Before code: Task 0.1's re-verification is in the Debug Log (STOP if any recorded answer has since changed),
   and the go-live roster row exists (Task 0.4). No AC may still state a value an answer changed; the `epics.md` INHERITED / VARIANCE
   blocks and the `deferred-work.md` C-items are re-read and still true.
1. **AC1 — table.** Given the new migration is applied, then `field_workers` has exactly the columns, types, NOT NULLs, defaults, named
   CHECKs and index in **QE4's column table**, with pgEnums sourced from the domain tuples; `twt_app` has SELECT, INSERT, UPDATE (no
   DELETE, no TRUNCATE); RLS is ENABLE + FORCE with the three per-command policies; `UNIQUE (pariwar_id, field_worker_id)` exists as
   the FK target; the partial unique mobile index exists — asserted through a NORMALISED `pg_get_indexdef` (strip whitespace and redundant
   parentheses, then compare the column list and the predicate; Postgres adds a `::field_worker_state` cast to the literal, so an
   exact-string assert on the source text fails — do not hard-code the rendered string).
2. **AC2 — guarded state (I1–I3).** Each of these is rejected with P0001 and the message prefix: an unguarded INSERT; an unguarded
   UPDATE of ANY column (including `audit_id` alone); a guarded UPDATE that changes an I2 column (at least `name_ciphertext`,
   `mobile_blind_index`, `pariwar_id`, `registered_by_display`, `created_at`); a guarded INSERT violating I3; a guarded UPDATE with a
   non-increasing version; a guarded UPDATE of ANY column on a `terminated` row (I6 — the trigger's own rule, Task 2.2); a guarded
   UPDATE taking `kyc_status` from `completed` to `pending`; a guarded UPDATE changing `district` together with `current_state`,
   `kyc_status`, `state_reason_code` or `ended_on` (I3); and a `DELETE` of a `field_workers` row as the OWNER (I10). The CHECKs are
   asserted separately (23514): `_active_needs_kyc`, `_state_reason_pair`, `_state_reason_subset` (e.g. `reassigned` stored as a
   suspension reason), `_ended_on_pair` (a guarded transition to `terminated` without `ended_on`), `_district_nonblank`,
   `_registered_by_display_nonblank`.
3. **AC3 — events.** The SEVEN payload schemas (the epic's six plus `posted`, QE17) are exported with `FIELD_WORKER_EVENT_TYPES` and a
   `satisfies Record<…>` payload map; all seven are registered in `packages/events/src/registry.ts` with the same schema objects; a set-equality coverage test exists;
   existing count assertions are checked by grep, do NOT assume them (re-run the 12.1 AC3 greps and update any that move, in the same
   commit). Payloads are `.strict()` and a unit test proves none can carry a name or mobile key; the genesis payload is `{ from_state:
   null, to_state, trigger, actor, authorization, district }` (QE6, QE17, QE18); the `posted` payload is `{ from_state, to_state, trigger, actor,
   authorization, from_district, to_district, reason_code }` (`reason_code` required, QE12's post list); the `authorization` schema is `.strict()` and a unit test proves it carries no personal data. In it `grant.value` is `z.string().nullable()`, refined to null IFF `grant.dimension === 'global'` (a `super_admin` grant — else AC8's super_admin leg is a 500); `target.value` is a non-null string; `grant_id` is `z.string().uuid()`, optional only for test-built grants (a registration through the route always carries it); there is no Pariwar or actor key.
4. **AC4 — reducer.** `field-worker/state.ts` uses `defineStateMachine` with `initial: 'pending_kyc'` and exactly QE5's arms (no
   `registered` row); `nextFieldWorkerState` returns the arm's `to` or `null`; a test asserts table / reducer agreement for EVERY
   (state × event type) pair; `foldFieldWorkerProjection` is pure, never throws, and derives `kycStatus`, `reasonCode` (a `posted` event NEVER changes it — a suspended worker who is moved keeps their suspension reason), `district` (the last `posted` event wins) and `endedOn`.
5. **AC5 — commands (QE5, QE7, QE13, QE14, QE17).** The seven commands (`postFieldWorker` included) write only through the projector, take the row lock first, and enforce
   QE5's guards and QE7's actor rule; each failed guard throws its typed error with no event and the row unchanged, and the caller's
   transaction stays usable. `kyc_completed` twice ⇒ `FieldWorkerKycAlreadyCompletedError`; `activated` before KYC ⇒
   `FieldWorkerKycNotCompletedError`; anything out of a terminated worker (`posted` included) ⇒ `FieldWorkerIllegalTransitionError`; `posted` to the district the worker
   is already in ⇒ `FieldWorkerDistrictUnchangedError`; a `system` or
   `member` actor, or a null `actorId`, on any command ⇒ `FieldWorkerProjectorInputError`. I4 holds after every command. No domain
   function calls `withCompensatingAudit` (a test pins it). QE5's guard ORDER is pinned by a test: `kyc_completed` on an `active`
   worker ⇒ `FieldWorkerIllegalTransitionError` (not `FieldWorkerKycAlreadyCompletedError`); `terminate` with an invalid reason on
   a terminated worker ⇒ `FieldWorkerIllegalTransitionError`. `registerFieldWorker` and `postFieldWorker` REFUSE
   (`FieldWorkerProjectorInputError`, no event, the transaction usable) an `authorization` that is missing, is not a verified result of
   the RBAC check (an object literal carrying the same fields is refused, and assigning to any field of a verified result throws in
   strict mode — it is frozen), whose `pariwarId` (the RESOURCE's) or `actorId` differs from the command's, or whose key, dimension or
   `target` is not this act's — `register`: key `field_worker.register`, dimension `district` and target `{ district, the genesis
   district }` (byte-equal); `post`: dimension `district` (checked at guard 0). A `post`'s TARGET is judged ONLY under the lock (QE5
   guard 3c): a target equal to `toDistrict` or to the LOCKED row's `district` is accepted — either end of the move, whichever the
   gate passed (QE17); ANY other target ⇒ `FieldWorkerAuthorizationStaleError`, no event (a concurrent move, or a caller bug — the
   command cannot tell which). Until 13.1c / 13.1d mint the move keys, `post` accepts any verified district-dimension key (its tests use
   `field_worker.register`); the minting story makes it refuse every key outside the move-key list in the same commit (QE17, C5, C10).
   The projector refuses a `posted` whose `from_district` differs from the locked row's (`FieldWorkerProjectorInputError`). `posted`
   with a reason missing or outside QE12's post list ⇒ `FieldWorkerReasonInvalidError`
   (after the district-unchanged and stale-target guards, QE5's order); a `posted` on a suspended worker leaves `state_reason_code` as it was (the pair
   CHECK stays valid). `terminateFieldWorker` REFUSES (`FieldWorkerEndedOnInvalidError`,
   command-only) an `ended_on` that is missing or malformed (guard 0b, before any SQL), after today, or before the day the worker was
   registered — both IST days, computed in SQL (QE20; the 00:30 IST proofs are QE20's); the terminated row's `ended_on` equals the event's.
6. **AC6 — concurrency (I13).** Twin: `module-stream-concurrency.spec.ts`. Own pool and REAL commits (a race needs real concurrent
   COMMITs); cleanup by the ids the suite created, under `session_replication_role = 'replica'` (`events_log` is append-only). The
   lock-order races (a, b, d, e) run at READ COMMITTED — under REPEATABLE READ a lock waiter gets an untyped 40001 (QE13),
   which is not the behaviour under test; ONLY the genesis race (c) runs at REPEATABLE READ, with the snapshot pinned BEFORE the
   barrier so both racers see an empty stream. Read every error code as `err.code ?? err.cause?.code`; no race may end in 40P01
   or 40001.
   (a) `suspendFieldWorker` vs `terminateFieldWorker`, from `active`, 6 rounds behind a barrier: `terminate` ALWAYS fulfils (it is
   legal from `active` and from `suspended`); `suspend` either runs first — the stream is [`suspended`, `terminated`] — or rejects
   with `FieldWorkerIllegalTransitionError` once the terminate has won — the stream is [`terminated`]. Either way the final state is
   `terminated`, the last event is `field_worker.terminated`, versions run 1…n with no gap, and the row equals
   `foldFieldWorkerProjection` of the stream (I4).
   (b) `recordFieldWorkerKycCompleted` vs itself, from `pending_kyc`: one fulfils, the other rejects with
   `FieldWorkerKycAlreadyCompletedError`; exactly ONE `field_worker.kyc_completed` event exists; the state stays `pending_kyc` with
   `kyc_status = completed`.
   (c) the GENESIS race: the SAME `fieldWorkerId` with two DIFFERENT mobile indexes (so only the stream / primary key can
   conflict): exactly one stream, holding one `field_worker.registered` event, and the loser gets
   `FieldWorkerGenesisAlreadyExistsError`.
   (d) the SAME-MOBILE race: two DIFFERENT ids with the SAME mobile index in one Pariwar (so only the partial unique can
   conflict): one worker row; the loser gets `FieldWorkerMobileAlreadyRegisteredError`, mapped by the CONSTRAINT NAME
   `field_workers_pariwar_mobile_live_uq`, not by any 23505; the loser's transaction is STILL USABLE afterwards (its SAVEPOINT
   rolled back) and NO event exists for the loser's id.
   (e) `postFieldWorker` vs `terminateFieldWorker`, from `active`, 6 rounds behind a barrier: `terminate` ALWAYS fulfils; `post` either
   runs first — the stream is [`posted`, `terminated`] and the terminated row keeps the new district — or rejects with
   `FieldWorkerIllegalTransitionError`; and two `post`s to DIFFERENT districts at once — each racer's authorization targeting its
   own DESTINATION — both fulfil, in some order, with the second's `from_district` equal to the first's `to_district` and the row's
   `district` equal to the last event's `to_district` (the row lock serialises them); a racer whose authorization targets the
   CURRENT district instead loses with `FieldWorkerAuthorizationStaleError` when the other wins first.
   Honest scope: (a) is a probabilistic SMOKE — the interleaving is not forced (the twin says so too). I13's ORDER is pinned
   DETERMINISTICALLY by a unit test per command — a stub client records the statements and asserts SAVEPOINT → LOCK → HEAD →
   APPEND (`terminate`: SAVEPOINT → LOCK → NOW → HEAD → APPEND, for QE20's IST bounds), then the guarded UPDATE (the twin: `tests/marketplace/commands-guards.test.ts`, RP4) — and that test carries a RED proof
   (swap the lock and the append, watch it fail, revert; recorded in the Debug Log) (⚠ VARIANCE, review round 3, R3-24: the recorded proof PLANTS an
   `events_log` read before the row lock in `runLockedTransition` — 6 legs fail, Debug Log (c) — rather than swapping the two; it proves the same
   property, "the lock comes before ANY `events_log` statement", at least as strongly).
7. **AC7 — composite FK and 13.2 interop (C1).** The same migration adds `field_worker_attribution_codes_worker_fk`
   `FOREIGN KEY (pariwar_id, field_worker_id) REFERENCES field_workers (pariwar_id, field_worker_id) ON DELETE NO ACTION`
   (`pg_get_constraintdef` omits `ON DELETE NO ACTION`, so assert `confdeltype = 'a'` from `pg_constraint` separately).
   A code for a worker that does not exist in that Pariwar is refused (23503); a code for a worker in ANOTHER Pariwar is refused;
   NO leg runs under `session_replication_role = 'replica'` (replica disables the FK's RI trigger). Deletion, by role: as `twt_app`,
   a DELETE and a TRUNCATE of `field_workers` ⇒ 42501 (no grant; TRUNCATE is refused before any lock, DELETE after a
   RowExclusiveLock); as the OWNER, a DELETE ⇒ P0001 from this
   story's `BEFORE DELETE` trigger (I10); a plain `TRUNCATE field_workers` ⇒ 0A000 (referenced by a foreign key — checked before any
   trigger); and `TRUNCATE field_workers CASCADE` ⇒ P0001 from this story's `BEFORE TRUNCATE` trigger (the named table's trigger fires
   before the cascaded child's; record the actual SQLSTATE in the Debug Log). ⚠ The CASCADE leg MUST lock first, inside `BEGIN … ROLLBACK` on one PoolClient (the helper issues a SAVEPOINT):
   `await client.query('BEGIN'); await lockTruncateSetNowait(client, 'field_workers'); <TRUNCATE … CASCADE ⇒ P0001>; ROLLBACK` (`tests/integration/_helpers.ts` — one `LOCK … NOWAIT` over the whole FK
   set, with retry), never a bare TRUNCATE: a CASCADE locks parent then child, while 13.2's specs in parallel forks insert into the
   child and then take the parent through the FK check — the opposite order, a deadlock on every full domain run (TR14). Every 13.2 spec listed in G4
   is updated to seed a real worker (a shared fixture) and is green; the policy-regression pin is rewritten to expect two UNIQUEs
   plus the named FK; nothing in 13.2's behaviour changes.
8. **AC8 — registration route (QE9; C1, C2, C6, C7) — UNCONDITIONAL, the Panel having ruled (`-441`).** Each leg below is asserted
   over HTTP unless it says otherwise. "Nothing written", in every refusal leg, means no `field_workers` row, no `field_worker.*`
   event, no code row and no `field_worker.registered*` audit line for the attempt — the KMS system audit rows are never asserted
   (TR5). Every 401 / 403 / 404 leg sends a VALID body (a bad body gets 400 `request.validation` before the guards run).
   - (a) **Success.** Given a `pariwar_admin` with a display name and a listed `district`: a valid request returns 201 with
     `{ field_worker_id, district, current_state, kyc_status }` (`pending_kyc` / `pending`) and NO code (QE22); the worker row, the
     `field_worker.registered` event, the audit line and the code row all exist after commit.
   - (b) **Replay.** The same `Idempotency-Key` returns the recorded response — which also carries no `code` key or value — and
     creates nothing.
   - (c) **Duplicate mobile, sequential.** The same mobile again (the pre-check) ⇒ 409 `field_worker.mobile_already_registered`
     with no `field_worker.registered*` audit line.
   - (d) **Duplicate mobile, concurrent loser — FORCED deterministically.** A loser that fails inside the transaction leaves its
     intent line and a `field_worker.registered_rolled_back` line. The test opens its own owner-role transaction (writer var on) and
     INSERTs an UNCOMMITTED live row with the same `(pariwar_id, mobile_blind_index)` (same field class and HMAC key), fires the
     request (its pre-check cannot see the uncommitted row, so it blocks on the partial unique index), waits until
     `pg_stat_activity` shows the request waiting on a lock, then COMMITs. Assert 409 `field_worker.mobile_already_registered`, the
     intent row and its `_rolled_back` row — found by `pariwar_id` = the test's fresh Pariwar and `action` IN
     (`field_worker.registered`, `field_worker.registered_rolled_back`), each exactly one, with the same `field_worker/<id>`
     `resource_locator` (the id is minted server-side and the 409 carries none) — and no `field_worker.*` event in that Pariwar
     except the seeded row's.
   - (e) **Guards.** No session ⇒ 401; no grant in the Pariwar ⇒ 404; a grant without the key (and a `state_trustee` grant) ⇒ 403;
     a `district_admin` of the SAME district ⇒ 201 with genesis `authorization.role = 'district_admin'`; a `district_admin` of
     ANOTHER district ⇒ 403; a `pariwar_admin` for any listed district ⇒ 201 with `authorization.role = 'pariwar_admin'` (the
     fill-in).
   - (f) **The snapshot.** In EVERY 201 the genesis event's `authorization` EQUALS `{ permission_key: 'field_worker.register', role,
     grant: { dimension, value, grant_id }, target: { dimension: 'district', value: <the body's district> }, catalog_version:
     PERMISSION_CATALOG_VERSION }`, with role, dimension, value and `grant_id` read back from the `role_grants` row the TEST seeded
     (its `id` included). An actor holding BOTH a `district_admin` grant at that district and a `pariwar_admin` grant is recorded as
     `district_admin` (the most specific), and a global `super_admin` as `super_admin` (its `role_grants` row seeded with
     `pariwar_id` = the test Pariwar — the scope hook loads grants under RLS — and `scope_dimension = 'global'`; its snapshot's
     `grant.value` is null).
   - (g) **Handler identity (a unit test, domain command stubbed).** The object passed to `registerFieldWorker` is IDENTICAL (`toBe`)
     to `request.authorizations['field_worker.register']` — an `app.inject` test cannot read the request.
   - (h) **Content and request errors.** An unlisted district ⇒ 422 `field_worker.district_unknown`, nothing written and no KMS call
     made (the district check precedes the encrypt — QE9); a missing or non-string `district` ⇒ 400 `request.validation`; a missing
     `Idempotency-Key` ⇒ 400 `field_worker.idempotency_key_required`; an admin with no display name ⇒ 409
     `admin.display_name_missing`, nothing written; an invalid mobile ⇒ 422 `field_worker.mobile_invalid`, an invalid name ⇒ 422
     `field_worker.name_invalid`, nothing written.
   - (i) **Exhaustion.** The door's `allocateAttributionCodeForRequest` mocked to throw the re-exported class; the flag wrapper a SPY
     over the real one (`vi.fn(actual.flagAllocationExhaustedForRequest)`) ⇒ the flag wrapper is called once with the thrown
     `.attempts`, exactly ONE flag row is committed (append-only — clean it up) and no worker, event or code row is, the response is
     503, and `field_worker.registered_rolled_back` exists. A second leg makes the flag wrapper REJECT and still gets 503 (QE9).
   - (j) **Coverage of the error table.** Every error row the REGISTRATION route can raise (the 409 mobile / display-name /
     in-progress, the 400 key and validation, the 422s, the 503) is asserted over HTTP at least once; the rows only a command can
     raise are asserted in a mapper unit test (`apps/api/tests/unit/field-worker-errors.test.ts`, twin: `marketplace-errors.test.ts`),
     marked "no route yet — 13.1a / 13.1c / 13.1d".
   - (k) **No code, no PII.** The response contains no key named `attributionCode` and no `code`, and the allocated code's VALUE is
     nowhere in its body (the test reads the code through the door and asserts the serialized body does not contain it — ⚠ VARIANCE, review R2-11: the spec reads it by raw SQL, `written()`, not through the door; the assertion's strength is unchanged); the
     plaintext name / mobile appear in no audit row, log or event — on the success path AND on every refusal path (409 / 422 / 503
     bodies and messages included).
9. **AC9 — RBAC (I14).** Catalog version and key count move by exactly one (the key is `field_worker.register`, QE10: `district`
   dimension, held by `district_admin`, `pariwar_admin` + the derived `super_admin`); the grant list, the non-holder legs
   (`state_trustee` is refused because its bundle lacks the key — asserted 403 both WITH and WITHOUT a geo tree in force, since with
   a tree a state grant can reach a district target), the POSITIVE legs (a `district_admin` grant AUTHORIZES at its own district and FAILS
   at another; a `pariwar_admin` grant authorizes at any district — `check.test.ts` pins that a seeded grant must actually authorize)
   and the "`field_worker` bundle stays empty" assertion are in `tests/rbac/{permissions,roles}.test.ts` (there is NO separate
   contracts permission mirror: `packages/contracts/src/rbac/permissions.ts` is a schema only, and the key appears in
   `emit-openapi.ts` as prose); `openapi/v1.yaml` is regenerated by the repo script (`pnpm contracts:emit-openapi`), never edited
   by hand; the route is registered in `server.ts`. The RBAC CORE change (QE18) is tested in `tests/rbac/check.test.ts`: `hasPermission` and
   `authorize` AGREE on every case in the existing matrix (⚠ CORRECTED, review round 3, R3-28: a REPRESENTATIVE matrix — 18 re-typed existing-style
   cases + 5 new — not the existing 71 calls; agreement holds BY CONSTRUCTION, one shared predicate `grantAuthorizes`) (allowed ⇔ a result, denied ⇔ none); with two satisfying grants the MORE
   SPECIFIC is returned whichever order they are loaded in; `matchingGrantRole` (re-pointed to `authorizingGrant`) and
   `authorizingGrant(...)?.role` AGREE on every case in `tests/rbac/matching-grant.test.ts` and `check.test.ts` (⚠ CORRECTED, R3-28: `matchingGrantRole` IS
   `authorizingGrant(...)?.role ?? null`, so that agreement leg cannot fail — by construction; `matching-grant.test.ts` passing unchanged is the real regression half), and `matching-grant.test.ts` passes unchanged; the
   result passes `isVerifiedAuthorization`, an object literal with the same fields does NOT, and assigning to any field of the result
   (or of its `grant` / `target`) throws in strict mode; a global grant's result has `grant.value === null` and `pariwarId` = the
   resource's; `requirePermission` still fires the denial seam and throws exactly as before; `checkPermission` is unchanged
   (`toEqual({ ok: true })` still passes); the result's `actorId` equals the params' and its `target.value` is null for a global
   gate; a source-fence unit test pins that `authorize(` is called only from `check.ts`,
   `apps/api/tests/integration/_field-worker-fixture.ts` and `*.test.ts` / `*.spec.ts` files (⚠ VARIANCE, review R10 / R7 — see QE18 (e) above). The HOOK storing the result on `request.authorizations[key]` (a fresh object per request) is
   asserted in `apps/api/tests/unit/rbac-hook-authorizations.test.ts` — the hook lives in `apps/api/src/modules/rbac/index.ts`, which
   `packages/domain/tests` cannot import (a fake request with `scopeTx` / `scopeGrants` set, the real hook, the real check).
10. **AC10 — FR-85 contract (QE11).** `acceptsNewAttributions` is true for `active` only (all four states asserted) — QE11's
    settled build rule, CONFIRMED by the Panel (Question 2 A, `-441`). `getFieldWorkerStateAt(db,
    pariwarId, id, asOf)` takes a LOCAL
    `asOf: FieldWorkerAsOf = { captureId: MemberAttributionId } | 'now'` (QE11 — 13.2 AT4 (c): the instant is NAMED, never
    passed, so there is NO `{ instant }` arm and no JS `Date`; do NOT import 13.2's `AttributionAsOf` or
    `AttributionCaptureMismatchError` — I9, and the reach fence flags a `path:` hit even for `import type`). Validate as 13.2's
    `parseAsOf` does: exactly `'now'`, or an object with the ONE key `captureId` whose value passes `UUID_REGEX` (`../db.js`) — else
    `TypeError` BEFORE any SQL (unguarded, a malformed id reaches Postgres as a raw 22P02 and a route would answer 500). An unknown
    `captureId`, or one that belongs to another Pariwar, throws a typed `FieldWorkerCaptureNotFoundError` (domain `errors.ts`), NEVER
    `null` — `null` already means "unknown worker". Write the capture cut with explicit aliases — `ma.captured_at`, and
    `ma.pariwar_id = $pariwarId` bound as a PARAMETER, never a Column-to-Column correlation (`events_log` and `member_attribution`
    both have a `pariwar_id`; a same-named outer column turns a Drizzle correlated subquery into a tautology —
    [[project_epic6_drizzle_correlated_subquery_bug]]); the OWNER-role leg seeds a DECOY capture with the same id shape in another
    Pariwar.
    **THE ORDERING CONTRACT of `getFieldWorkerStateAt`** (copy the SHIPPED `getModuleStateAt` in `marketplace/read.ts`, not 12.1's
    story text). (1) Events are ORDERED by `event_version`, never by `occurred_at`. (2) The answer is the fold of the longest PREFIX
    — in `event_version` order — whose events ALL have `occurred_at <= asOf`: cut at the FIRST event stamped after the instant and
    drop it and everything after it; do NOT keep every event that individually satisfies `occurred_at <= asOf`. `occurred_at` is
    `now()`, the TRANSACTION START, so a transaction that BEGAN first but won the row lock second appends the HIGHER version with
    the LOWER timestamp; a per-event filter would replay {v1, v3} and skip v2 — for registered → kyc_completed → activated that is
    `active` with `kyc_status = pending`, a state I5 forbids and the worker never had. (3) A TIE counts: an event stamped exactly AT
    the instant is included (13.2's rule runs the same way round — `allocated_at <= captured_at`), so a suspension stamped at the
    capture's instant means the worker was suspended. (4) Every comparison is made IN the database at microsecond precision —
    `occurred_at > ma.captured_at` in SQL — the capture's `captured_at` is read in the SAME statement (a join), never into JS (a
    JS `Date` keeps milliseconds). (5) `'now'` applies NO timestamp cut — it is the whole
    stream, the latest committed state (equal to the stored projection, I4); a `<= now()` cut would drop an event committed by a
    transaction that started after the reader did. (6) An empty prefix (the first event is stamped after the instant) is the
    initial `pending_kyc` — the worker exists; `null` only when no `field_workers` row exists for (pariwar, id). (7) All seven event
    types are replayed (a stream is one event per transition — small), through the pure `foldFieldWorkerProjection`. (8) ⚠ CLOCK
    DOMAINS: `events_log.occurred_at` and `member_attribution.captured_at` are both `now()` — the TRANSACTION START — but 13.2's
    `field_worker_attribution_codes.allocated_at` is `clock_timestamp()`; they are not one domain. A transition therefore counts
    from the moment its transaction BEGAN, at BOTH edges: a signup whose transaction starts inside a SUSPENSION's own window (the
    milliseconds before it commits) is read as already-suspended by this as-of replay, while a live read of the row at that moment
    still says `active`; and a signup starting inside an ACTIVATION's window reads as `active` although the activation had not
    committed — so at that edge a signup made before activation committed IS credited (the Policy-meaning note says so). The replay is the event-sourced, replayable answer (I4): say so in the doc comment, copy
    `getModuleStateAt`'s CLOCK DOMAIN caveat, and do NOT "fix" it with `clock_timestamp()`.
    The spec (own-committing, TR10) proves each rule, every instant carried by a CAPTURE: the test seeds `member_attribution`
    rows as the OWNER role with an explicit `captured_at` literal computed IN SQL from the events' own stamps (13.2's
    `seedCapture(tx, client, pariwarId, code, capturedAt?)` in `tests/integration/attribution-code/_fixtures.ts` — compute the stamp IN
    SQL, e.g. `SELECT (occurred_at + interval '1 microsecond')::text …`, and pass that text as `capturedAt`) and passes `{ captureId }`. (a) the INVERSION, the twin's RV1 shape — register; open a `slow`
    transaction FIRST; commit `kyc_completed` (v2, the later stamp) from another connection; then `activated` on `slow` (v3, the
    EARLIER stamp); a capture at just past v3's own stamp answers `pending_kyc` (the prefix {v1}), NOT `active`, and one at just past
    v2's answers `active` — with the precondition asserted (v3's stamp is earlier than v2's); (b) the TIE and the microsecond order —
    a capture stamped exactly at an event's `occurred_at` (included) and one at that stamp minus 1 µs, computed in SQL (excluded);
    (c) `'now'` equals the stored projection in every state; (d) a capture stamped before the genesis gives `pending_kyc`, an unknown
    id gives `null`, an unknown or foreign `captureId` gives the typed error, and a malformed `captureId` throws `TypeError` before
    any SQL. Every read carries an explicit `pariwar_id`
    predicate, is isolated from a second tenant (one leg runs as the OWNER role, where RLS is NOT the filter — 13.2 TR3), and
    `listFieldWorkersForPariwar` is capped (`clampLimit`, inline `.limit()`) with a `Number.isInteger` guard that throws
    `RangeError` on a non-integer `limit` (13.2 deferred D1: `clampLimit(NaN)` is NaN and Drizzle then drops the LIMIT).
    `getFieldWorker` and `listFieldWorkersForPariwar`
    return a `FieldWorkerView` that OMITS `name_ciphertext`, `mobile_ciphertext` and `mobile_blind_index` and carries `district` (not personal data) (a type-level and a
    runtime assertion); no function in this story decrypts a worker's data — decrypt-on-read is 13.3's / 13.4's decision (C1, C6).
11. **AC11 — gate (G9).** `scripts/field-worker-state-invariant/` exists and is wired in `package.json`, `scripts/ci-local.sh` and
    `.github/workflows/ci.yml` (`ci:local` then runs 38 jobs — 37 at `268d86b5`; re-count); `GUARDED_COLUMNS` = the eight I1
    columns (`currentState`, `stateEventVersion`, `kycStatus`, `stateReasonCode`, `district`, `endedOn`, `auditId`, `updatedAt`), and
    `lib.test.ts` has a FLAGGED leg for EACH outside the allowlist (`field-worker/project.ts` → the two projector functions) —
    `district` in each of the twin's write forms — and zero findings for the legitimate projector writes; a revert-sanity check is
    recorded. The compensating-audit gate gains a separate `FIELD_WORKER_ROOTS` const (`apps/api/src/modules/field-worker`,
    `packages/domain/src/field-worker`) — not an edit of `MARKETPLACE_ROOTS` — with BOTH label strings in
    `scripts/access-wrapper-invariants/check.ts` `main` updated (the `runInvariant` label and the success line), plus its README and `docs/access-wrapper-invariants.md`.
12. **AC12 — route review of the door (C7).** A recorded manual review (the commands AND their output in
    the Debug Log — an "is empty" test would be red at the baseline, see the hits below) shows, at the PR head: (a) no `apps/*/src`
    or `packages/*/src` file re-exports a door wrapper — `grep -rnE "export .* from '.*attribution-code-access" apps/*/src
    packages/*/src --include='*.ts' --include='*.tsx'` is empty (reach-fence rule (ii) already enforces it; run over the whole of
    `apps packages` the grep returns two fixture STRINGS inside `apps/api/tests/unit/attribution-code-reach-fence.test.ts`, which
    are expected, not a failure — and add `--exclude-dir=node_modules` if you run it wider), and no door wrapper is bound to a name
    that is exported in a second statement; (b) no `apps/public` / `apps/jobs` file imports `apps/api/src` by a short relative
    path — `grep -rnE "from '(\.\./)+api/src" apps/public apps/jobs` is empty; (c) `grep -rn
    "requestContextStorage\|enterWith\|AsyncLocalStorage" apps/api/src` lists only `middleware/request-context/index.ts` plus a
    COMMENT in `apps/api/src/types.ts` (both present at the baseline), and no `.pariwarId =` and no `Object.assign(…, { pariwarId })`
    appears on any object in field-worker code, the Task 1 helper included (the 13.2 writer pin sees `.pariwarId =` on any receiver
    and `Object.assign` with a `pariwarId` key on any target, but NOT the carriers C7 (c) names). The reach fence passes WITHOUT any
    edit to its ALLOWED list.
13. **AC13 — privacy and logging (I8).** A unit test proves the `field_worker_mobile` and `member_mobile` field classes give
    DIFFERENT blind indexes for the same number (the disjoint hash spaces, Task 1). A test registers a worker with a recognisable name and mobile and
    asserts neither appears in `events_log.payload`, any `audit_log` row, the idempotency record's stored result, or the captured
    logger output (`buildServer(deps, { logStream })` — test-only, honoured only when `nodeEnv === 'test'`, the 6.19b precedent —
    plus a `console.error` spy) — and repeats the assertion for each refusal (409 duplicate, 422, 503 exhaustion): the response body,
    the error message and the `_rolled_back` audit row carry neither value. Assert reasons and values, never audit-row COUNTS (TR5).
14. **AC14 — full gate.** `pnpm ci:local` is green on a FRESH Postgres container (with `DATABASE_URL` set to the story's port), and
    the result is recorded; `pnpm typecheck` and the OpenAPI drift check (`pnpm turbo run contracts:check-openapi-determinism`,
    the ci-local job `contracts-determinism`) are green.

## Tasks / Subtasks

- [x] **Task 0 — governance first (AC0).** ⭐ **0.1 runs FIRST in `bmad-dev-story`. Write no code before 0.1's greps are in the Debug Log.**
  - [x] 0.1 `git fetch origin`; rebase on `origin/main` if it moved. Re-grep NUMBERS (decision id, migration + journal `when`, ADR,
        `PERMISSION_CATALOG_VERSION`, ledger letter in BOTH ledgers) across every ref and worktree. Re-verify G2, G3, G4, G5, G7, G8.
        Run this query on the story's DB and record the count: `SELECT count(*) FROM field_worker_attribution_codes` — if > 0, list the
        orphans (TR2) before the migration is written. Confirm the actor model: `events_log` has NO `actor` column — only `actor_id uuid`
        (NULL = system); the actor KIND is a Zod-validated payload key, so `operator` / `trustee` need no `events_log` change.
  - [x] 0.2 **HALT — LIFTED 2026-11-03.** Every answer this story waited on is in: Q-2 (BigDev minted rows 13-1a / 13-1b / 13-1c / 13-1d), Q-3
        (the form "Application for Field Worker", version 1, states the purposes and records the worker's agreement — BigDev's word, the form
        unseen), Q-4 (No), QE17–QE20 and QE22 (APPROVED) and QE21 (ANSWERED: the District Admin registers, the Pariwar Admin approves; the B2
        nod is 13.1a's). Still do Task 0.1's re-verification, and STOP if any of those has since changed. The Panel's follow-up note
        (Q-6…Q-9) is RULED (`-443`: Q1 A, Q3 A, Q4 A — the build defaults; Q2 C — the build as it stands plus a later link, C11); the counsel question is NOT a gate for this
        build; it gates go-live legs. QE1–QE16 are ALREADY answered (2026-11-03, in session: as listed ⭐, with QE10 =
        `field_worker.register`, QE11 = `active` only and QE12 = the neutral reason values), and Q-1 and Q-5 are RULED by the Panel
        (`-441`) — this task does not re-ask them.
  - [x] 0.3 **DONE 2026-11-03 — do NOT re-commit or re-write any of the four entries.** The Panel's ruling is decision `2026-11-03-441`,
        committed ALONE with its note's ruling block in `93b7e419`. The author-commit is decision `2026-11-03-442` (QE1–QE22, Q-2, Q-3,
        Q-4; Q-1 and Q-5 cited to `-441`; its **Supersedes** line replaces `-441` build-reading item 2 for a MOVE only), committed ALONE in
        `6a3172e4`. The story amendment (v1.16), `epics.md` 13.1a–13.1d, `deferred-work.md` C1–C10 and ledger `2026-11-03h` are in
        `9c0050fc`. The Panel's ruling on the follow-up note (Q-6…Q-9) is decision `2026-11-03-443`, committed ALONE in `7cd400f2`; the
        author-commit amending `-442`'s QEs is decision `2026-11-03-444`, committed ALONE in `86274245`. The later story amendments are
        `88243907` (v1.17), `7fefe8dc` (v1.18) and the v1.19 records commit. At Task 0.1, RE-READ all four entries: if any recorded
        answer has since changed, STOP and ask BigDev. Any later governance entry takes ≥ `-445` (re-grep every ref first). A recorded answer that
        the ACs contradict is a silent override by the dev agent ([[feedback_spec_edits_must_propagate_to_tasks]]).
  - [x] 0.4 Go-live fence. Add ONE row to `docs/launch-gate-inventory/inventory-roster.md` (`### Row N — <slug>`, bullet format;
        re-grep the number: the highest on main is 47 and 46 is reserved by 6.39 and 14.3 — take ≥ 48 unless 46 is confirmed free;
        `owner`: "Trustee Panel (gate); counsel (Story 0.13)", the Row 19 shape). Its closure legs, each marked open or met with the
        decision id that met it: (a) the Panel's ruling on the key — MET by `2026-11-03-441` (B(3) says additions are "ratified
        when their feature sets ship"; the Row 45 (a) precedent); (b) the footing and notice for the worker's name and mobile (Q-3) — MET by BigDev's confirmation, 2026-11-03: the form ("Application for Field Worker", version 1) states the purposes, records the worker's agreement, and tells the worker the Trust keeps the name and mobile electronically while they are employed and removes them 8 years after termination — on BigDev's word, the form unseen; record the form's version and the purposes as BigDev reads them in the row, and note that 13.1b (the SMS) and 13.5 (payment) re-check their own use; (c) MET — BigDev answered No to Q-4 (2026-11-03): no code has been handed out by hand; (d) the Panel's confirm of Q-5 — MET by `-441` (A, as built); (e) retention — for name and mobile CONFIRMED by BigDev 2026-11-03 from the form: kept while the person is employed, removed 8 years
        after the date of termination. Tell the owner of ARCH §2.12's retention matrix (it lives outside this repo and names
        "field-worker payout records", not name / mobile); payout records (13.5) and the paper form are NOT covered by this; (f) the erasure path — now with a dated trigger, the 8-year removal, which has NO owner row (carried in 13.1c's entry, C5; DPDPA rights apply; a request BEFORE the 8 years is counsel's question 3); (g) the
        contractor-vs-employment classification (`docs/legal-counsel-engagement/review-scope-charter.md` §4 lists it open — and the form says "employed" while the PRD says contractors); (h) ⭐ a
        PRODUCTION PATH TO `activated` exists (Story 13.1a, row `13-1a-field-worker-approval-and-code-hand-over`) — without it QE11's mitigation ("activate, then tell them the code") cannot be
        carried out and, under Q-5 (A), no registered worker can be credited at all. The counsel question is DRAFTED and REVISED (2026-11-03, a third time) to the classification, the 8 years and erasure before them — (b) is settled by BigDev's confirmation, so its first question has fallen away:
        `_bmad-output/planning-artifacts/counsel-question-2026-11-03-field-worker-data-basis.md`, in the shape of
        `counsel-question-2026-10-18-nominee-contact-basis.md` ("WRITTEN, not sent") — re-read it before BigDev sends it. The owner rows are minted (13-1a…13-1d): record `13-1a` as
        leg (h)'s owner. Add one more leg: (i) the Panel's confirm of each field-worker permission key 13.1a / 13.1c / 13.1d mint
        (`-059` B(3) via `-441` — each added by its own story). Re-read the `deferred-work.md` "Deferred from: story 13-1-…" section,
        the Story 13.1a–13.1d entries and the INHERITED blocks under 13.3 / 13.4 / 13.5 / 13.6 / 13.8 in `epics.md`.
- [x] **Task 1 — encryption classes (AC13).** Add `FIELD_WORKER_FIELD_CLASS = 'field_worker'` and `FIELD_WORKER_MOBILE_FIELD_CLASS =
      'field_worker_mobile'` to `encryption/field-classes.ts` with a doc comment in the `CLAIM_CONTACT_MOBILE_FIELD_CLASS` style (the
      disjoint-space reason), exported through `encryption/index.ts` AND re-exported from `apps/api/src/context.ts` beside the other
      field classes (the claim-contact crypto helper imports them from there). Add the API-side helper that normalises, encrypts and
      indexes a field worker's name and mobile, at `apps/api/src/modules/field-worker/field-worker-crypto.ts`. Twins: `apps/api/src/modules/claims/claim-contact-crypto.ts` for the Tier-1 encrypt (it
      has no blind index and no normalise) and `packages/domain/src/claim/correction-crypto.ts` (`correctionNumberHash`, the
      `claim_contact_mobile` class) for the HMAC — the helper is a hybrid of the two.
- [x] **Task 2 — schema, policies, migration (AC1, AC2, AC7).**
  - [x] 2.1 `schema/field_workers.ts` (+ `schema/index.ts`), `policies/field-workers-rls.ts` (+ `policies/index.ts`). No `$type` on the
        branded id except `FieldWorkerId`; `ended_on` is `date('ended_on', { mode: 'string' })` (QE4). Do not write the literals `fieldWorkerAttributionCodes` or `field_worker_attribution_codes`
        as an identifier or a string in any `.ts` here — run the reach fence (TR3). ALSO declare the composite FK in the Drizzle table
        `schema/field_worker_attribution_codes.ts` with `foreignKey({ name: 'field_worker_attribution_codes_worker_fk', columns: [t.pariwarId, t.fieldWorkerId], foreignColumns:
        [fieldWorkers.pariwarId, fieldWorkers.fieldWorkerId] }).onDelete('no action')` (the house style: `member_wa_opt_in_codes.ts`,
        `marketplace_modules.ts`); that file is already in the fence's ALLOWED list.
  - [x] 2.2 Hand-author `NNNN_field-workers.sql` in the G14 order: header ("never regenerate"; ⚠ the FK add scans 13.2's table — TR2);
        pgEnums; `field_workers` (incl. `district`, QE17, and the nullable `ended_on`, QE20); CHECKs (incl. `field_workers_district_nonblank` and `field_workers_ended_on_pair`); the FK-target UNIQUE; GRANT SELECT, INSERT, UPDATE; ENABLE/FORCE RLS; the three policies; the
        partial unique index; the guard trigger function and trigger — COPY `0193_marketplace-modules.sql`'s
        `marketplace_modules_reject_unguarded_state_write` (genesis-shape check on INSERT; the strictly-increasing version rule;
        whole-row comparison minus the projected columns — which now include `district`, changeable only under the writer var — and a genesis shape that also
        requires a non-blank `district`), DROP its slot rules (d) / (e), rely on the reason-pair CHECK, and ADD one rule of your own — an UPDATE of a row whose
        `OLD.current_state` is `terminated` is rejected P0001 with the same message prefix, guard on or off (I6: 0193 has no
        terminal-state rule, so a copy alone leaves I6's trigger leg unbuilt); and, in place of 0193's slot rules, two of your own
        (I3): (d′) `kyc_status` never goes `completed → pending`; (e′) a `district` change never coincides with a change of
        `current_state`, `kyc_status`, `state_reason_code` or `ended_on`. ADD the CHECK `field_workers_state_reason_subset`:
        `(current_state <> 'suspended' OR state_reason_code IN ('under_review','at_worker_request')) AND (current_state <>
        'terminated' OR state_reason_code IN ('left_voluntarily','inactive','registered_in_error'))` (13.6 replaces it with its new
        values — QE12). ADD a row-level `BEFORE DELETE` and a statement-level `BEFORE TRUNCATE` trigger on `field_workers` (their OWN
        function, 13.2's `attribution_code_reject_mutation` shape) that refuse EVERY role with P0001 and the message prefix (I10);
        only `session_replication_role = 'replica'` bypasses them;
        THEN `ALTER TABLE field_worker_attribution_codes ADD CONSTRAINT … FOREIGN KEY … ON DELETE NO ACTION`. Add the journal entry by
        hand with a trailing newline and a `when` above every sibling's.
- [x] ⭐ **ORDER: do Task 8 (the RBAC core + the key) NEXT, right after Task 2 and BEFORE Tasks 3–7 and 10 (2).** The event
      payload's `authorization` schema (Task 3), the commands that refuse an unverified authorization (Tasks 5 / 6), their tests, the
      route (Task 7) and the `apps/api` fixture (Task 10 (2)) all need `rbac.authorize` / `VerifiedAuthorization` and a catalog that
      contains `field_worker.register` (`hasPermission` refuses a key outside the catalog).
- [x] **Task 3 — events + registry (AC3).** `field-worker/events.ts` with the "PINNED SEAM" delimiter comment; payload schemas (SEVEN events: the genesis payload carries the `authorization` snapshot and `district`, the `posted` payload the snapshot and both districts — QE17, QE18; the snapshot's schema is `.strict()`); the
      registry entries; the coverage test (clone `module-registry-coverage.test.ts`, but define the clone's OWN description template —
      the twin also asserts description strings that name the MODULE stream and Story 12.1, and fails on the first run otherwise); run
      the AC3 greps.
- [x] **Task 4 — reducer (AC4).** `field-worker/state.ts`, `nextFieldWorkerState`, `foldFieldWorkerProjection`, `toFieldWorkerEvent`; the `posted` arms (same-state, from `pending_kyc` / `active` / `suspended`, never `terminated`); the fold also derives `district` and `endedOn`.
- [x] **Task 5 — projector (AC2, AC5).** `field-worker/project.ts`: `projectFieldWorkerGenesis`, `projectFieldWorkerTransition` (copy the
      SHIPPED `marketplace/project.ts`: the transition takes `lockedRow` from its command, checks the stream HEAD equals
      `lockedRow.stateEventVersion` (else `FieldWorkerStreamConcurrencyError`), cross-validates `from_state` / `to_state` and, for
      `posted`, `from_district` against `lockedRow` (QE13), appends at version + 1, then the guarded UPDATE with
      `SET LOCAL app.field_worker_state_writer` — NOT a whole-stream replay; a `posted` event writes `district` in that same guarded UPDATE; the genesis wraps itself in a SAVEPOINT and maps the
      partial-unique 23505 BY CONSTRAINT NAME in its row-INSERT catch — the PK, `field_workers_pariwar_worker_uq` and the stream-version
      unique all map to `FieldWorkerGenesisAlreadyExistsError`).
- [x] **Task 6 — commands, reads, errors (AC5, AC6, AC10).** `field-worker/{commands,read,errors,index}.ts` (the reads project the row to
      `FieldWorkerView` — drop the three PII columns in the SELECT list, not after the fetch); copy the SHIPPED
      `marketplace/commands.ts` lock / SAVEPOINT shape. There is NO retry loop (the module's is lead-specific): do not copy it. IMPORT
      the shared helpers — `uniqueViolationConstraint`, `pgMessageOf`, `pgSqlstateOf`, `STREAM_VERSION_CONSTRAINT` from
      `../marketplace/errors.js` and `rollbackToSavepoint` from `../marketplace/project.js` (13.2's `allocate.ts` / `tx-guard.ts`
      import the two they use). `findPgError` and the P0001 constant are module-private there, so write
      `isFieldWorkerStateDirectWriteError` as `pgSqlstateOf(err) === 'P0001' &&
      pgMessageOf(err).startsWith(FIELD_WORKER_STATE_DIRECT_WRITE_MESSAGE_PREFIX)` with a local `'P0001'` const — a copy of the walker
      forks it a sixth time. The mobile-unique error is mapped by CONSTRAINT NAME (`FIELD_WORKER_MOBILE_LIVE_CONSTRAINT`; the PK as
      `FIELD_WORKER_PKEY_CONSTRAINT` — copy the twin's `MODULE_PKEY_CONSTRAINT` note: the PK check ignores RLS, so a server-minted id
      keeps it non-oracular). `read.ts` also holds `findLiveFieldWorkerByMobileIndex(db, pariwarId, mobileBlindIndex)` (filters
      `current_state <> 'terminated'`, the partial index's predicate; explicit `pariwar_id`) and `getFieldWorkerStateAt` (AC10;
      `FieldWorkerCaptureNotFoundError` and `FieldWorkerAuthorizationStaleError` live in `errors.ts`). The guard order of every
      command is QE5's; the locked row is read through ONE `FIELD_WORKER_GUARD_COLUMNS` list (QE13); `terminateFieldWorker` judges
      `ended_on` in SQL in IST (QE20). Export only the direct-write set at the top level of `domain/src/index.ts`
      (`FieldWorkerStateDirectWriteError`, `FIELD_WORKER_STATE_DIRECT_WRITE_CODE`, `FIELD_WORKER_STATE_DIRECT_WRITE_MESSAGE_PREFIX`,
      `isFieldWorkerStateDirectWriteError`), everything else through the `fieldWorker` namespace. `registerFieldWorker`'s input carries `district` (QE17) and `authorization` (QE18, a `VerifiedAuthorization`) — written at genesis;
      `district` is later changed only by `postFieldWorker(client, { …, toDistrict, reasonCode, authorization })`, which checks the district DIFFERS (whether it
      is LISTED is the caller's, via `assertDistrictRecorded`); `read.ts` also holds `assertDistrictRecorded` (QE17).
- [x] **Task 7 — contracts, route, handlers (AC8, AC12, AC13) — UNCONDITIONAL, the Panel having ruled (`-441`).** ⭐ Task 8
      (the key and the RBAC core) is already done — see the ORDER line after Task 2. Contracts: DTOs under `packages/contracts/src/field-workers/` (shape only,
      QE9); RE-DECLARE `FIELD_WORKER_STATES` / `FIELD_WORKER_KYC_STATUSES` in `packages/contracts/src/field-workers/enums.ts` and
      NEVER import `@twt/domain` there (a domain import leaks `pg` into the browser / Metro bundles —
      [[project_contracts_domain_bundle_boundary]]), with a TEST-ONLY sync guard in `packages/contracts/tests/` that imports both
      and asserts equality (twin: `modules.test.ts`); `.openapi('…')` component names; the barrel edit in
      `packages/contracts/src/index.ts`; the `emit-openapi.ts` entry, then regenerate `openapi/v1.yaml` with `pnpm
      contracts:emit-openapi`. API: `apps/api/src/modules/field-worker/{routes,handlers,errors,index}.ts`; register in `server.ts`; the gate is
      `requirePermissionHook(deps, 'field_worker.register', { dimension: 'district', resolveValue })` (QE9, TR12) and the handler passes
      `request.authorizations['field_worker.register']` — the VERIFIED result the gate stored (QE18) — to `registerFieldWorker` and never
      recomputes it from `request.scopeGrants`; the compensating-audit intent sets `actorRole: authorization.role` and
      `hashShape: { field_worker_id, district }` (QE9), never a second computation (decision `2026-08-13-105` D4: "the grant that
      actually authorized"); copy 12.2's `tenantWrite` (it opens the transaction before `run`) PLUS a `prepare` step that runs before it opens — review R3, 2026-11-04 — with QE9's `prepare` body (the content rules, the display name) and `run` body (district check before the KMS calls);
      rename every `module.*` literal in the helpers copied from 12.2. The route's `registerPath` lists its responses (the 12.2
      `/modules` POST shape): 201; 400 `request.validation` · `field_worker.idempotency_key_required`; 401; 403 "Missing
      field_worker.register"; 404 `pariwar.not_found`; 409 `field_worker.mobile_already_registered` · `admin.display_name_missing` ·
      `field_worker.idempotency_in_progress`; 422 `field_worker.name_invalid` · `field_worker.mobile_invalid` ·
      `field_worker.district_unknown`; 503 `field_worker.code_allocation_exhausted`. Import the door's error classes FROM THE DOOR. Write the
      "Errors and their HTTP mapping" table's API half, with its mapper unit test
      (`apps/api/tests/unit/field-worker-errors.test.ts`). The exhaustion leg is tested with the door MODULE mocked — in its OWN spec
      file (`vi.mock` is file-wide and would also hit the success legs), or through a `vi.mock` factory using `importActual` and
      `mockRejectedValueOnce(new AttributionCodeAllocationExhaustedError(…))`, with `flagAllocationExhaustedForRequest:
      vi.fn(actual.flagAllocationExhaustedForRequest)` — a SPY over the real wrapper, which COMMITS one append-only flag row (clean
      `attribution_code_allocation_flags` up in `afterAll`); the mock path from `apps/api/tests` is
      `../../src/modules/field-worker/attribution-code-access.js`, which the fence does not scan — the door forwards no `generate`
      seam, by design. Run the AC12 review before opening the PR.
- [x] **Task 8 — RBAC (AC9); do it right after Task 2 (the ORDER line).** `rbac/permissions.ts` (append
      `'field_worker.register'` to `SEED_PERMISSION_KEYS` — catalog entries are bare strings; the `district` dimension lives in the
      route's `requirePermissionHook` option, so write it and the holders in a comment, the `claim.record_fraud_finding` comment
      shape — `PERMISSION_CATALOG_VERSION` N → N+1 (58 → 59 at the pin; re-grep, 14.3 contends) and its version-history comment), `rbac/roles.ts` (a const + the `district_admin` list AND the `pariwar_admin` list),
      `tests/rbac/permissions.test.ts` (`toBe(N)` → N+1 and `toHaveLength(K)` → K+1 — 58 / 77 at the pin), a `tests/rbac/roles.test.ts` block (twin: the
      `Story 12.2 — module.manage…` `describe`), and the key's prose mention in `packages/contracts/scripts/emit-openapi.ts`. There
      is no contracts permission mirror to update (AC9). Do not touch the stale "Epic 12" comments (G15).
      **THE RBAC CORE (QE18)** — in `packages/domain/src/rbac/check.ts` extract the per-grant test out of `hasPermission` into ONE
      private predicate that `hasPermission` uses, plus an exported PURE `authorizingGrant(grants, key, resource, ctx?):
      EffectiveGrant | null` (most specific dimension first, `global` last; ties within one dimension by role, scope value, then grant
      id). Add `authorize(params: RequirePermissionParams, ctx?): VerifiedAuthorization | null`, which calls `authorizingGrant` and
      builds the DEEP-FROZEN `VerifiedAuthorization` of QE18 (b)'s shape — `actorId` from `params.actorId`, `pariwarId` from
      `params.resource.pariwarId` — issued only inside `check.ts` and registered in a module-private WeakSet
      (`isVerifiedAuthorization`); RE-POINT `rbac/matching-grant.ts` `matchingGrantRole` to `authorizingGrant(grants, key, resource,
      ctx)?.role ?? null` (its signature is unchanged) and run `tests/rbac/matching-grant.test.ts` plus the six claims callers'
      specs; `requirePermission` calls `authorize(params, resolved)` and returns the result (it returned nothing; its 6 direct
      callers ignore the return); `checkPermission` is NOT changed; `EffectiveGrant` gains an optional
      `grantId`, and `loadActorGrants` and `loadGlobalActorGrants` (`apps/api/src/modules/rbac/index.ts`) select `id`;
      `requirePermissionHook` stores the result with `(request.authorizations ??= {})[key] = result` (typed in
      `apps/api/src/types.ts`; never `decorateRequest` with an object default), tested in
      `apps/api/tests/unit/rbac-hook-authorizations.test.ts`; plus the source-fence unit test on `authorize(` callers (AC9). Strictly
      ADDITIVE: every existing RBAC test passes unchanged (⚠ CORRECTED, review round 3, R3-28: except the version / count pins this task bumps —
      `permissions.test.ts` 58 → 59 and 77 → 78 — and one assertion added inside an existing `roles.test.ts` `it`). `packages/domain/src/rbac` and `apps/api/src/modules/rbac` are governance-boundary
      roots — a reviewed edit, no feature flag. Tests build a real context and call the real check; there is no test-only way to mint a
      verified result.
- [x] **Task 9 — gate (AC11).** Copy `scripts/marketplace-module-state-invariant/` → `scripts/field-worker-state-invariant/`; rename
      the table and the allowlist, and set `GUARDED_COLUMNS` to the eight I1 columns (`currentState`, `stateEventVersion`,
      `kycStatus`, `stateReasonCode`, `district`, `endedOn`, `auditId`, `updatedAt` — the twin's set is table-specific); wire
      `package.json`, `ci-local.sh`, `ci.yml`; add a `FIELD_WORKER_ROOTS` const to the compensating-audit gate (and its `main` label
      string) + README + `docs/access-wrapper-invariants.md`; record the revert-sanity check.
- [x] **Task 10 — repair 13.2's specs (AC7).** ⭐ Land the DOMAIN-side repairs
      in the same commit as Task 2's migration, so no commit leaves 13.2's live-DB suites red; the `apps/api` repair needs
      `registerFieldWorker` and lands with Task 6 (until then do not push — the pre-push hook runs `ci:local`). (1) Domain: add
      `seedFieldWorker` to the shared attribution-code fixtures UNDER `packages/domain/tests/` — NEVER `packages/domain/src/test-utils/`,
      which the state-invariant gate scans (its `currentState` / `auditId` keys would be flagged). It generates a FRESH unique
      `mobile_blind_index` per call (a constant collides on `field_workers_pariwar_mobile_live_uq` when one Pariwar is seeded with many
      workers — `allocate-concurrency.spec.ts` and the exhaustion legs do) and is an OWNER-role INSERT under `SET LOCAL
      app.field_worker_state_writer = 'on'` with the genesis shape (`pending_kyc`, `pending`, version 1, reason NULL, a non-blank `district`).
      EVERY `seedCode` call — the `session_replication_role = 'replica'` arm (`seedCode({ allocatedAt })`) included — passes a REAL
      `seedFieldWorker` id: replica mode also disables the new FK's RI trigger, so a repaired spec could keep passing with a fake id.
      (2) `apps/api`:
      tests there cannot import `packages/domain/tests`, and `attribution-code-access.spec.ts` seeds inside `openScopeTx` (role
      `twt_app`, so no owner-role seed) — add `apps/api/tests/integration/_field-worker-fixture.ts` calling
      `fieldWorker.registerFieldWorker(client, …)` with dummy ciphertext strings, a random `auditId` and `actorId`, a non-blank
      `registeredByDisplay` and `district`, and an `authorization` minted by the REAL check (AC5 refuses anything else; there is no
      test-only mint): `rbac.authorize({ actorId: <the fixture's actorId>, grants: [{ pariwarId: P, role: 'pariwar_admin',
      scopeDimension: 'pariwar', scopeValue: P }], key: 'field_worker.register', resource: { dimension: 'district', value:
      <district>, pariwarId: P } })` (non-null asserted; pass the SAME `actorId` to `registerFieldWorker`, or AC5 refuses it) —
      check the exact signature Task 8 produced; the cross-Pariwar leak block needs a
      worker — and an authorization — in BOTH PARIWAR_A and PARIWAR_B. The domain `seedFieldWorker` (owner INSERT) needs none of this. Update every spec in G4; in `allocate-concurrency.spec.ts` seed COMMITTED workers and clean both tables
      in `afterAll` under replica mode, codes first.
- [x] **Task 11 — tests (AC2–AC13).** Unit: state, events, errors, no-audit-wrapper-in-domain, acceptsNewAttributions, commands-guards (I13's
      statement order, with its RED proof — AC6). Live-DB: commands, projector-trigger, concurrency (AC6), reads incl. the AC10
      ordering contract (own-committing: the inversion, the tie, µs order, `'now'`), composite FK, RLS regression, cross-Pariwar-leak
      block. API: the registration spec incl.
      the privacy leg. The `posted` legs live in the commands and projector-trigger specs (a move with each of the two reasons; a move with no reason or an unknown one ⇒ `FieldWorkerReasonInvalidError`; a repeat;
      a move after the worker is ended; a move of a SUSPENDED worker leaves `state_reason_code` untouched; a verified authorization
      whose target is the destination district, or the current district, is accepted, and one whose target is any OTHER district — or is made stale by a
      committed concurrent move — ⇒ `FieldWorkerAuthorizationStaleError`; the row's `district` equals the last event's
      `to_district`) and AC6 (e). Also: the delete / truncate trigger legs (AC2, AC7), the IST `ended_on` bounds (QE20's two proofs) and the malformed-date guard (0b),
      and the `authorize` source-fence and freeze legs (AC9). Every guard gets a RED proof; every scan a non-vacuity floor.
      ⚠ CORRECTED by review R8 (2026-11-04): RED proofs exist for the guards listed in Debug Log (b)–(c) and (e); the others are covered by a green
      test only — see Debug Log (e) and Change Log v1.21. "Every guard" overclaimed.
- [x] **Task 12 — records and full gate (AC14).** Dev Agent Record, File List, Change Log; the story's completion ledger entry (the next
      free letter after `k`, re-grepped across every ref) prepended to BOTH ledgers in `sprint-status.yaml` — the top comment block and the `last_updated: >-` key
      block — by the safe-prepend pattern (read first, size guard, verify the YAML afterwards); `pnpm ci:local` on a fresh container (done once, at `ce80bd64`).
- [ ] **Task 12, last clause (split out by review R9) — run the `decision-flow-sync` skill when decisions `-441`…`-444` LAND on `main`.** NOT done:
      they are on this branch only; the checked box above does not cover it.
- [ ] **Re-run `pnpm ci:local` on a FRESH container before push (review round 1).** The 38 / 38 in Debug Log (d) is for `ce80bd64`; R1–R10 changed
      code and tests after it.
- [ ] **Before `db:migrate` runs `0200` on any SHARED developer DB (`:5432`, `:5433`, … — review round 3, R3-19), count the orphans there:**
      `SELECT count(*) FROM field_worker_attribution_codes c WHERE NOT EXISTS (SELECT 1 FROM field_workers w WHERE w.field_worker_id = c.field_worker_id)`
      — before `0200` the table does not exist, so in practice: `SELECT count(*) FROM field_worker_attribution_codes`. If > 0, the composite FK refuses
      the migration; apply the `0200` header's remedy first. UN-ATTESTED today (Debug Log (a)'s 0 was a fresh container).

### Review Findings

**2026-11-04 — full code review, baseline `268d86b5`, HEAD `e4f88150`** (`story/13-1-field-worker-identity-lifecycle-state-machine`, its own
worktree; ONE pass over the whole diff, not chunked — BigDev). Three independent layers, all read-only, launched in parallel: Blind Hunter (the
code diff only), Edge Case Hunter (the diff + the repo), Acceptance Auditor (the diff + this story + decisions `-441`…`-444` + the AI-6-5
checklist). No layer failed. 30 raw findings → 27 after de-duplication; every claim that carried weight was then re-checked against the tree and
this story before it was classified. **0 decision-needed, 10 patch, 2 defer, 15 dismissed.** Engineering and record-keeping only: the Panel-routing
§0 gate sends nothing to trustees (the one disclosure-shaped candidate — the 409 across districts — is this story's own ACCEPTED disclosure; see X9).
Findings are OPEN; this review changed no production code, test or migration (it edited this section and `deferred-work.md` only).

**How much to trust this.** The Auditor found no violation of an AC in the code itself: the guard order, the IST bounds in SQL, the prefix-cut as-of read,
the frozen `VerifiedAuthorization`, the district gate, no code in the 201 and the 13.2 repairs all match the amended QE5 / QE10 / QE11 / QE13 / QE18 /
QE20. What it and the other layers found is test and evidence gaps, one runtime failure mode (R3), one reachable 500 (R4) and closure wording. Not
established by me: whether 12.2's twin shares R3's shape; whether the catalog key the Auditor names in R2 is held at the district dimension (confirm
before using it); the Auditor's list of guards with no recorded RED proof (R8) — it is the Auditor's read of Debug Log (b)–(c).

**AI-6-5 checklist families the diff touches** (the Auditor's verdicts, with my adjustments): 1 state-machine totality, 4 payload completeness, 5 DB-level
backstops, 11 policy meaning, 12 cross-member ownership — covered-by-test or by construction. 2 concurrency / idempotency — covered, **REAL GAP: R1**.
3 tenant and actor boundary — covered, **except the authorization KEY half of `registerFieldWorker`: REAL GAP, R2** (my adjustment of the Auditor's
"covered"). 6 projection discipline — runtime half covered, type-level half vacuous (R5). 8 audit-after-mutation — covered (registration by test; the six
other commands take a REQUIRED `auditId`). 9 deliberate-vs-oversight — covered (the cross-tenant PK signal has its DELIBERATE block); R10 is wording.
10 closure honesty — **REAL GAP (low): R8, R9**. Families 7 and 13 are untouched.

- [x] [Review][Patch] **R1 — The 409 `field_worker.idempotency_in_progress` row and the over-200-character `Idempotency-Key` 400 are asserted nowhere.**
  [`apps/api/src/modules/field-worker/handlers.ts:113-119`, `:95-100`] — Auditor; re-grepped: no `in_progress` / `idempotency_in` literal in any
  field-worker file under `apps/api/tests`, and `field-worker-handler-identity.test.ts` stubs `claim` as `'claimed'` only. AC8 (j) requires every error row
  the registration route can raise — it names "the 409 mobile / display-name / in-progress" — to be asserted over HTTP at least once; QE9 names both rows.
  Deleting the `already_claimed` branch, or mis-spelling its code, turns no test red. Checklist family 2 **REAL GAP**. Fix: a handler-level leg (stub
  `claim → 'already_claimed'` with `getResult → null` ⇒ 409 with that code; with a stored result ⇒ it replays) and an over-200-character key leg ⇒ 400
  `field_worker.idempotency_key_required`; RED-prove by deleting the branch.
- [x] [Review][Patch] **R2 — `registerFieldWorker`'s authorization KEY guard has no test that can fail.**
  [`packages/domain/src/field-worker/commands.ts:155-157`; `packages/domain/tests/field-worker/commands-guards.test.ts:46-51`, `:312`] — Auditor; re-checked
  in the source. AC5: the command refuses an authorization "whose key, dimension or target is not this act's". The only wrong-key leg passes
  `module.manage`, which `authAt` forces to the PARIWAR dimension (`:51`), so it is refused by the dimension check at `commands.ts:152` and the key check at
  `:155` is never reached; no leg passes a different district-dimension key, and `registration` / `commands.spec` use only `field_worker.register`.
  Deleting `:155-157` turns nothing red, and the leg's label ("the wrong key") is misleading. Family 3 **REAL GAP** (the authorization half). Fix: a leg
  with a district-dimension key that is not `field_worker.register` (the Auditor suggests `claim.record_fraud_finding`, held by `district_admin` — confirm
  it) ⇒ `FieldWorkerProjectorInputError` naming the key; relabel the `module.manage` leg "wrong dimension"; RED-prove by deleting `:155-157`.
- [x] [Review][Patch] **R3 — Registration holds one pool connection while it waits for a second from the same pool.**
  [`apps/api/src/modules/field-worker/handlers.ts:155`, `:189`, `:232`] — Blind + Edge; confirmed in the code. `openScopeTx` takes `deps.pool.connect()`
  (`scope-tx.ts:36`); `run` then calls `getDisplayName(deps.pool, …)` (`:189`) — a SECOND connection from the SAME pool (max 10, connect timeout 10 s,
  `packages/domain/src/db.ts:68`) while the first is held. As many concurrent registrations as the pool has connections each hold one and wait for another:
  nothing progresses until the connect timeout, then every in-flight registration is a 500 (the key is released, so a retry is safe). Partial saturation by
  other routes degrades the same way in a smaller form. QE9 accepts the transaction being open and idle during the display-name read and the KMS calls; it does
  not say the read takes a second connection, and "accepted idle" does not cover hold-and-wait. Reachability is low (an admin-only, low-volume route); the failure
  mode is not. Fix: resolve `registeredByDisplay` BEFORE `openScopeTx`, inside the idempotency claim, with the content rules first so QE9's error order is
  unchanged (422 name, 422 mobile, 409 no display name, then 422 district inside the transaction) — or read it on `ctx.scopeTx.client` if `twt_app` may read
  `users.display_name`. The exhaustion-flag path (`:232`: its own committed transaction, up to two more connections) is rare and stays as specified; say so in
  its comment. Keep leg (h) (no display name ⇒ 409, nothing written). The KMS-calls-while-idle half of the Blind finding is the story's accepted cost (QE9).
- [x] [Review][Patch] **R4 — A `district` containing U+0000 is a 500, not the 422 QE9 promises, when the Pariwar has no geo tree.**
  [`apps/api/src/modules/field-worker/handlers.ts:192-194`; `packages/domain/src/field-worker/read.ts:132-139`; `packages/contracts/src/field-workers/dto.ts:30`]
  — Edge; reachability confirmed. The DTO is shape only (`z.string().max(200)`, QE9) and a `pariwar_admin` / global grant passes the gate with ANY string. With no
  geo tree in force, `assertDistrictRecorded` falls to `findListedWorkplaceDistricts` (`marketplace/scope-options.ts:117-134`), which binds the district as an
  `IN` parameter; a string holding the NUL character makes Postgres refuse the parameter (22021) ⇒ an unmapped 500, a rolled-back transaction, a released
  key. QE9: "this check is the only thing that stops a junk district". A District Admin cannot reach it (the gate compares exact bytes); the name path already
  refuses NUL. Fix: before `assertDistrictRecorded`, a district holding NUL throws `FieldWorkerDistrictUnknownError` (422 `field_worker.district_unknown`);
  a live-DB leg — a Pariwar with no geo tree, a `pariwar_admin`, a district with NUL ⇒ 422, nothing written; RED-prove by removing the guard.
- [x] [Review][Patch] **R5 — Two AC10 assertions cannot fail.**
  [`packages/domain/tests/integration/field-worker/read.spec.ts:221-224`, `:241-248`] — Auditor; confirmed by reading. AC10: the view omits the PII columns
  ("a type-level and a runtime assertion") and `listFieldWorkersForPariwar` is capped. (a) `const none: NoPii[] = []; expect(none).toEqual([])` passes
  whatever `FieldWorkerView` holds — an empty array is assignable to any array type. (b) "is capped (200)" seeds 3 rows, so `limit: 100_000` returning 3 is true
  with no clamp at all and `limit: 2` returns 2 either way. The runtime half of (a) (`Object.keys` + no `enc:v1:`) and the `domain-accessor-invariants` gate
  (which requires `clampLimit`) are real, so nothing is unprotected today — but both tests claim more than they prove (family 6, type-level half). Fix: (a) an
  assertion that fails to COMPILE when a PII key appears (e.g. `expectTypeOf<NoPii>().toBeNever()`) — first confirm `packages/domain/tests` is type-checked
  (contracts tests are not: `project_contracts_tests_outside_tsc`), else drop the claim; (b) prove the clamp (more than 200 rows by direct insert, or a unit test
  of the clamp the accessor calls) or retitle the leg to what it asserts.
- [x] [Review][Patch] **R6 — The name rule accepts a name nobody can read and a direction-spoofed one, and the registry has no rename.**
  [`apps/api/src/modules/field-worker/handlers.ts:72-79`] — Blind + Edge. The code follows QE9 exactly (NFC, trim, 1–120 code points, no `\p{Cc}`, no unpaired
  surrogate), so this is a gap in QE9, not a deviation from it. A name made only of zero-width or filler characters (U+200B, U+3164) passes as 1–120
  "characters", and the bidi-override controls (U+202A–U+202E, U+2066–U+2069) are accepted. None of the seven events renames a worker and `terminated` is final,
  so a blank-looking or spoofed name is sealed for good and shown to operators by 13.1a's screens. Reachability: any admin pasting a name. Fix: require at
  least one `\p{L}` and refuse the bidi controls. ⚠ Do NOT refuse all `\p{Cf}`, as the Blind layer suggests: U+200D (ZWJ) and U+200C (ZWNJ) are legitimate
  inside Indic and Persian names. Amend QE9's rule text in this story in the same change (QE9 is a BigDev-approved build decision recorded in `-442`; log the
  amendment as an author-commit if BigDev wants it in the decision log). Tests: each refusal, plus a control — a name containing ZWJ registers.
- [x] [Review][Patch] **R7 — The `authorize(` source fence is bypassed by an alias.**
  [`packages/domain/tests/rbac/check.test.ts:1007-1019`] — Blind; confirmed. QE18 (e) / AC9 say `authorize(` "is called only from" `check.ts` and test files.
  The fence matches a CALL whose callee is the identifier `authorize` or a property access ending `.authorize`; `import { authorize as mint }`,
  `const a = rbac.authorize; a(…)` and `rbac['authorize'](…)` are not seen. `authorize` is pure over caller-supplied grants and exported, so this fence is the
  only barrier to minting a `VerifiedAuthorization` from fabricated grants. Reachability is low (a deliberate rename) but the fence claims "only". Fix: also
  flag an import specifier whose IMPORTED name is `authorize` (an alias included), any non-call read of a `.authorize` property, and element access with the
  string `authorize`; RED-prove each with a planted file. The Blind finding's other points (the `> 1500` floor; a second module instance) are dismissed:
  the floor holds on a full checkout, the second instance is hypothetical.
- [x] [Review][Patch] **R8 — "Every guard RED-proved" overclaims.**
  [this story: Task 11 (`[x]`); Change Log v1.20] — Auditor; family 10 **REAL GAP** (low). Task 11 says "Every guard gets a RED proof" and the Change Log says
  "Every guard RED-proved (Debug Log (b)–(c))". Debug Log (b)–(c) records about thirteen proofs (I13 order, AC10 prefix and tie, the crypto class, trigger rules,
  the `authorize(` fence, freeze, the `authorizingGrant` sort, the hook store, handler identity, two gate reverts). Per the Auditor it records none for trigger
  rules (c) and (d′), guards (0b), 3b, 3c, 4 and 5, `verifiedSnapshot`'s Pariwar / actor / key checks, the projector's `from_district` check, the QE7 checks or
  `resolveValue`'s fail-closed leg — and R2 shows one of those guards has no test at all. Fix: rewrite the sentence to the exact list that was RED-proved, name the
  guards covered by a green test only, and add the proofs R1, R2, R4 and R7 bring.
- [x] [Review][Patch] **R9 — Task 12 is `[x]` with one clause not done.**
  [this story: Task 12] — Auditor. The last clause, "run the `decision-flow-sync` skill after the decision lands", is described in the Completion Notes as for when
  `-441`…`-444` LAND on `main` — they are on this branch. The checkbox reads complete. Fix: split that clause onto its own unchecked line ("on landing") so a reader
  of the checkbox does not read it as done (closure language: done vs deferred vs not addressed).
- [x] [Review][Patch] **R10 — AC9 / QE18 (e) still state the old fence set.**
  [this story: AC9 and QE18 (e); `packages/domain/tests/rbac/check.test.ts:1025-1030`] — Auditor. The built allowed set also names
  `packages/domain/tests/integration/field-worker/_fixtures.ts` (the domain twin of the apps/api fixture), by exact path. It is disclosed as a VARIANCE in Debug
  Log (c) and Change Log v1.20, but AC9 / QE18 (e) and decisions `-442` / `-444` still list the old set. Engineering — a test fence's allow-list is not the
  Panel's, and a new decision for it would be over-governance: the decisions are history and the VARIANCE note is the supersession. Fix: one pointer sentence in
  AC9 and in QE18 (e) — "+ the domain fixture, VARIANCE, Debug Log (c)".
- [x] [Review][Defer] **D1 — `listFieldWorkersForPariwar` has no cursor, and its ordering is not served by an index.**
  [`packages/domain/src/field-worker/read.ts`; migration `0200`, `field_workers_pariwar_state_idx`] — Blind. Capped at 200 (`clampLimit`, as AC10 specifies)
  with no offset or cursor, so a Pariwar with more than 200 workers cannot be enumerated through it; `ORDER BY created_at DESC, field_worker_id DESC` is not
  served by the `(pariwar_id, current_state)` index. Deferred — no consumer until Story 13.1a's screens; owned by 13.1a (keyset paging and the matching index
  with the first screen that lists workers). Written to `deferred-work.md`.
- [x] [Review][Defer] **D2 — The primitive imports marketplace's savepoint, constraint and district helpers.**
  [`packages/domain/src/field-worker/{commands,project,errors,read}.ts`; `apps/api/src/modules/field-worker/handlers.ts:234`] — Blind. It imports
  `rollbackToSavepoint`, `STREAM_VERSION_CONSTRAINT`, `findListedWorkplaceDistricts` and `pgSqlstateOf` from `marketplace`; a refactor there breaks this module.
  Not a defect: QE1 rules ⛔ a package and 13.2's `allocate.ts` / `tx-guard.ts` already set the precedent. The `feedback_no_premature_package` trigger ("extract
  once a 2nd consumer exists") has arguably fired (13.2's registry and this primitive). Deferred — extraction is a refactor for its own change; no behaviour
  changes. Written to `deferred-work.md`.

**Dismissed (15)** — listed so the triage can be audited; none is in the findings above:

- X1 — Blind: commit-then-`recordResult` window in the idempotency flow. The ratified idempotent-write shape (`personal-event-handlers`); the residual — a lost
  201 costs the worker id, not a code — is TR11, and a retry meets the mobile pre-check / index (409), never a duplicate.
- X2 — Blind: the writer GUC and the static gate are bypassable. The gate is the copied twin of `marketplace-module-state-invariant` (same `SCAN_ROOT`, same
  detection); `lib.ts` itself says it is the STATIC guard and the trigger is the independent runtime guard — "different layers". The GUC protects against
  accident, not malice.
- X3 — Blind: `postFieldWorker` accepts any verified district-dimension key; "either end" of a move. No caller outside tests (grep); carried in
  `deferred-work.md` C5 / C10 to 13.1c / 13.1d; the "either end" target is ratified (AC5; `-443` Q-6 A — consent is 13.1d).
- X4 — Blind: `grantId` is optional; the snapshot can be stale. Both production grant loaders set `grantId: r.id` (`apps/api/src/modules/rbac/index.ts:52`,
  `:208`); the snapshot is the gate-time truth — the same window every gated route has.
- X5 — Blind + Edge: a reused `Idempotency-Key` with a different body replays the first 201. TR15 — an accepted residual "as in 12.2" (a plain hash of a 10-digit
  mobile can be brute-forced), homed in 13.1a (one key per submission; show the returned id).
- X6 — Blind: the race tests are probabilistic. AC6 says so ("(a) is a probabilistic SMOKE"); I13's order is pinned by the deterministic per-command unit test.
- X7 — Blind: the `pg_stat_activity` lock probe could match another session. The repo runs tests with `--concurrency=1`; a false match would weaken the proof
  (the pre-check would 409 anyway), not fail it. Optional hardening: `datname = current_database()`.
- X8 — Blind: the fold, a duplicate `registered`, the corrupt-stream test. Unreachable: genesis is "the stream is empty" (`projectFieldWorkerGenesis`) plus the
  unique stream version; the corrupt-stream leg is checklist family 1's "reducer stays TOTAL"; the table's CHECK fails closed.
- X9 — Blind: the 409 `mobile_already_registered` tells a District Admin a live worker with that mobile exists elsewhere in the Pariwar. This story's own
  ACCEPTED disclosure (QE4's text: without the refusal, credit splits across two codes). §0, citations stripped: a yes/no "already registered" to staff of the
  same Trust, with no name, district or id. The reviewer's own call, not the Panel's.
- X10 — Blind: the direct-write error is mapped to a 500 with its code; `console.error`. The 12.2 twin maps `ModuleStateDirectWriteError` identically
  (`marketplace/errors.ts:82-86`); the `console.error` line is QE9's verbatim text (SQLSTATE only).
- X11 — Blind: OpenAPI omits the `Idempotency-Key` header parameter. House convention: `openapi/v1.yaml` declares no `in: header` parameter anywhere; every route
  describes the header in prose.
- X12 — Blind: the grant comparator is not antisymmetric for null vs ''. `isGrantScopeWellFormed` (`check.ts:143-148`) rejects a null scope for every non-global
  grant and a non-null scope for a global one, so the two never both pass the predicate within a dimension; the comparator only orders, it never grants.
- X13 — Blind: the migration adds the cross-table FK with a full validating scan. Documented in the migration header; Task 0.1 re-verified 0 orphan code rows;
  nothing is live.
- X14 — Blind: the new CI job may not be in an aggregate required check. No aggregate job exists: all 14 invariant gates are standalone `needs: install` jobs
  and the new one matches; required-check settings live outside the repo.
- X15 — Auditor: AC8 (k) reads the code by raw SQL, not "through the door". The assertion's strength is unchanged; the wording differs.

**Resolution (2026-11-04) — BigDev chose "1 — Apply every patch"; the text above is the review as written.** R1–R10 are applied and checked
off; D1 and D2 stay deferred and X1–X15 stand. ⚠ **UNCOMMITTED and UNPUSHED**: the patch is in this worktree's working tree. ⚠ **`ci:local` has NOT
been re-run** — the 38 / 38 in Debug Log (d) is for `ce80bd64`, before these edits. What each patch BUILT, where it differs from the finding as
written, and how it was proved (every RED proof restored from a saved copy and re-run green; live legs on `twt-131-pg`, `:5470`):

- **R1** — unit legs in `field-worker-handler-identity.test.ts` (a controllable store stub: in flight ⇒ 409; a CONTROL replays the recorded result;
  a missing / empty / blank / 201-character key ⇒ 400 before any claim; 200 is the boundary) AND the HTTP leg `(j)` in `registration.spec.ts` (a real
  claim with no result ⇒ 409; the control replays it; 201 characters ⇒ 400; 200 ⇒ 201). The store's fresh-claim value is `'acquired'` — the original
  stub said `'claimed'`, which the handler never compares to. RED: a typo in the code plus the bound at 2000 ⇒ the in-flight and the 201-character legs
  fail; the no-result throw deleted ⇒ the in-flight leg fails.
- **R2** — one leg in `commands-guards.test.ts`: a VERIFIED district-dimension authorization for `claim.record_fraud_finding` (a real `district_admin`
  result; control: not null, the genesis's Pariwar, actor and target) ⇒ `FieldWorkerProjectorInputError` "is for 'claim.record_fraud_finding', not this
  act"; the old `module.manage` leg is relabelled "wrong DIMENSION". RED: with the key check deleted the command did not throw — it REGISTERED the worker.
- **R3** — `tenantWrite` gained a `prepare` step that runs inside the claim BEFORE `openScopeTx`; the content rules and the display-name read moved into
  it (QE9's error order is unchanged: 422 name, 422 mobile, 409 no display name, then 422 district inside the transaction). ⚠ A VARIANCE from "copy 12.2's
  `tenantWrite` UNCHANGED" (QE9, Task 7), recorded in the handler's header. A refused body now opens no scope transaction. The exhaustion-flag path is
  unchanged (its own committed transaction) — ⚠ NARROWED by round 2 (R2-2): only THIS handler's display-name read left the transaction; the 503 flag path and, in dev / CI, `withCompensatingAudit` (`servicePool` IS `pool`) still take a second connection from the same pool — deferred, D3. Legs: the display name is read BEFORE `openScopeTx` (call order, both asserted to have run); a bad name,
  a bad mobile and a missing display name open none; a bad name never costs the read. RED: the old order fails all four.
- **R4** — the guard went into the DOMAIN function `assertDistrictRecorded` (`read.ts`), not the handler, so the 13.1c / 13.1d move routes inherit it: a
  district holding NUL ⇒ `FieldWorkerDistrictUnknownError` before any read. Legs: a DB-free test whose `db` is a Proxy that throws on any use (plus a
  control that a normal district reaches it), and the live (h) loop gains the NUL district on the no-geo-tree path ⇒ 422. RED: both fail without it.
- **R5** — (a) a conditional-type annotation that stops COMPILING if a PII key joins `FieldWorkerView` (RED: adding `nameCiphertext` ⇒ `TS2322` in
  `read.spec.ts`); (b) the cap leg seeds 201 rows with one set-based insert and asserts 200 / the default 50 / 2. RED: with the clamp removed it fails
  with "expected a length of 200 but got 201".
- **R6** — `normalizeFieldWorkerName`: no bidi embedding / override / isolate (U+202A–U+202E, U+2066–U+2069) and at least one VISIBLE letter.
  ⚠ **CORRECTION to R6 as written:** U+3164 and the other Hangul fillers (U+115F, U+1160, U+FFA0) are LETTERS by Unicode category, so "at least one
  `\p{L}`" would have let a filler-only name through — the first draft of the fix did, and the new tests caught it. The built rule strips the
  default-ignorable code points (`\p{Default_Ignorable_Code_Point}`) before the letter test: ZWJ / ZWNJ inside a real name stay legal, the directional
  marks stay legal, and a name of zero-width or filler characters is refused. QE9's rule text is amended to match (in QE9 itself; amended again by R2-1). ⛔ No decision-log entry was
  written — QE9 is the build decision recorded in `-442`; BigDev can have one. Tests: a new DB-free `field-worker-name.test.ts` (35 legs, every special
  character BUILT from its code point) and the (h) HTTP loop. RED: without the rule 20 legs fail; with plain `\p{L}` the four filler legs fail.
- **R7** — the fence scan is now a pure function, `reachesAuthorize`, that also flags an import specifier whose IMPORTED name is `authorize` (an alias
  included), a `.authorize` property read that is not a call, element access with the string and a destructured binding; ten new legs pin each form and
  three negatives (a comment, a string, a different identifier). It found NO new hit in the real repo. RED (call-only detection): four legs fail — the
  alias, the property read, element access and the renamed destructure; the plain call, the namespace call and the un-renamed destructure are caught by a
  call-only scan too, because they call `authorize` by name.
- **R8** — Task 11 carries the correction; Change Log v1.21 supersedes v1.20's sentence; Debug Log (e) lists what was RED-proved.
- **R9** — Task 12's last clause is split onto its own unchecked line, and an unchecked line is added for the fresh-container `ci:local` this patch still owes.
- **R10** — AC9 and QE18 (e) now point at the widened fence set (the domain fixture, and every reference to `authorize`, not only a call).

#### Review Findings — round 2: the FIX DIFF (2026-11-04)

**2026-11-04 — code review of the patch, baseline `e4f88150` + the uncommitted working tree** (BigDev: "re-run code review", then "go, launch all three").
Three FRESH layers, read-only, in parallel, on the code and test diff only (9 files, 774 lines; the records went to the Auditor alone): Blind Hunter (the
diff only), Edge Case Hunter (the diff + the repo; it never saw round 1's findings), Acceptance Auditor (the diff + this story + its Resolution block as
CLAIMS to falsify + the checklist). No layer failed. 29 raw findings → 21 unique; the claims that carried weight were re-checked before classifying (the
rule and the fence were REPLAYED on the reviewers' cases with `node`; the flag path, the stale story lines and `epics.md` were read). **0 decision-needed,
11 patch, 1 defer, 9 dismissed.** The Panel-routing §0 gate sends nothing to trustees. The patch is still UNCOMMITTED.

**What round 2 found, in one breath.** The code does what the Resolution says for R1–R7 and breaks no AC, QE, TR or invariant (the Auditor re-derived R1–R7 and
the counts: 35 name legs, 10 fence legs, 7 unit + 1 HTTP idempotency legs). Three things are bigger than a nit: R6's rule is only HALF the hygiene it set out to
give (P1); R3 is narrower than its record says (P2); R7's fence is not "every reference" (P3). The rest is closure wording that I wrote and the records now
contradict (P8, P10, P11), one deferral that was never homed (P9), and small test hygiene. Not established by me: the Auditor's remark that the HTTP leg
`(j)` proves the in-flight branch does not release the claim "because a later `recordResult` would throw" — I did not read `recordResult`; P4 makes it moot.

**Checklist families touched** (the Auditor's verdicts): 2 concurrency / idempotency, 3 tenant and actor boundary, 5 DB-level backstops, 6 projection
discipline, 8 audit-after-mutation — covered-by-test (3 with the fence hole, P3; 2 with R3's residual, P2). 10 closure honesty — **REAL GAP (low): P8, P9,
P10** (the Auditor's F6 is dismissed: Y8).

- [x] [Review][Patch] **R2-1 (P1) — The name rule still accepts every invisible character inside a name that has a letter.**
  [`apps/api/src/modules/field-worker/handlers.ts:94-95`, `apps/api/tests/unit/field-worker-name.test.ts`] — Blind + Edge; REPLAYED. With the shipped rule these are ALL
  ACCEPTED: U+2028 / U+2029 between letters (line / paragraph separators — `\p{Zl}` / `\p{Zp}`, not `\p{Cc}`, and `trim()` strips only the edges); ZWSP between
  letters and trailing (`trim()` does not strip it); the word joiner U+2060, the soft hyphen U+00AD, the BOM U+FEFF inside; the TAG characters U+E0020–U+E007F
  (invisible — they can carry hidden ASCII); private-use code points; and ONE letter plus 119 invisible characters (the 120 limit counts them). R6 refused only
  the name made of nothing else. A name is sealed for good (no rename event), shown to operators by 13.1a, and a hidden payload rides in it. Reachability: any
  admin pasting a name. Fix (my defaults — BigDev may widen or narrow the allowance): refuse `\p{Zl}`, `\p{Zp}`, `\p{Co}` and EVERY default-ignorable code point
  EXCEPT U+200C (ZWNJ), U+200D (ZWJ), U+200E (LRM) and U+200F (RLM), which real Indic, Persian and Urdu names carry; keep "at least one `\p{L}`". That subsumes the
  bidi range and the strip-before-letter-test (a Hangul filler is default-ignorable, so it is refused outright) — `BIDI_CONTROL` and the `.replace` go. The
  variation selectors (U+FE00–U+FE0F) become refused: say so in the comment. Amend QE9's text again; tests: one leg per class above, the four allowed marks
  as controls, the HTTP loop gains U+2028 and a ZWSP-between-letters name; RED-prove each.
- [x] [Review][Patch] **R2-2 (P2) — R3 is narrower than its record says, and the comment R3 promised was never written.**
  [`apps/api/src/modules/field-worker/handlers.ts:265-274`, `field-worker-handler-identity.test.ts` (the R3 `describe` title), the Resolution R3 bullet, ledger
  `2026-11-04a`, Change Log v1.21] — Blind + Edge + Auditor; confirmed. Only the DISPLAY-NAME read left the transaction. On the exhaustion path
  `flagAllocationExhaustedForRequest` still reads the display name (`getDisplayName(deps.pool, …)`) and opens a SECOND scope transaction
  (`attribution-code-access.ts:123,125`) while the registration's scope transaction is held; and in dev / CI `servicePool` IS `pool` (`context.ts`), so
  `withCompensatingAudit(deps.servicePool, …)` draws a second connection from the same pool on EVERY registration there. Round 1's R3 said "say so in its
  comment" — no comment exists. The test title says "no second pool connection while the scope transaction holds one" but asserts only the CALL ORDER of one read,
  and the ledger says "pool hold-and-wait removed". True for the display-name read in a production config with a separate service pool; not true on the 503
  path or in a single-pool config. Fix: the comment at the flag path (what holds a connection and why it stays — QE9 gives the flag its OWN committed
  transaction, and the door file is 13.2's, not edited here — D3); retitle the test to what it asserts ("the display-name read opens before / outside the scope
  transaction"); reword the Resolution R3 bullet, the ledger and v1.21 to "removed for the display-name read; the 503 flag path and a single-pool dev / CI keep it".
- [x] [Review][Patch] **R2-3 (P3) — The `authorize` fence is not "every reference", and a bare local call is not pinned.**
  [`packages/domain/tests/rbac/check.test.ts` (`reachesAuthorize` and its `describe`), the AC9 / QE18 (e) pointers] — Blind + Edge + Auditor; REPLAYED. NOT flagged:
  `export { authorize as mint } from './check.js'` and the plain `export { authorize } from`; `const { 'authorize': mint } = rbac`; `const { ['authorize']: m } = rbac`; and
  a dynamic key `rbac[k]`. The barrel never names `authorize` (it `export *`s), so an `ExportSpecifier` rule flags no existing file. Separately, every positive leg that
  has a bare `authorize({})` also has an import specifier or binding that matches first, so deleting the call-expression branch fails no leg (that branch is what
  catches a local function named `authorize`). Reachability is low (a deliberate rename) but the title, the comment and R10's pointer claim completeness. Fix: flag an
  `ExportSpecifier` whose imported name is `authorize`, and a binding element whose key is a string literal or a computed literal `authorize`; add legs for each and
  a bare-local-function leg; NAME what no static fence can see (a dynamic key); reword the title, the comment and the AC9 / QE18 (e) pointers to "every STATICALLY
  visible reference"; RED-prove each new leg.
- [x] [Review][Patch] **R2-4 (P4) — The in-flight unit leg never asserts the claim was not released.**
  [`apps/api/tests/unit/field-worker-handler-identity.test.ts`, "a key still IN FLIGHT"] — Blind. A request that did not win the claim must not release it, or a duplicate runs
  while the first is in flight. The leg asserts `recordResult` was not called, not `release`. Fix: `expect(calls.store.release).not.toHaveBeenCalled()` in the in-flight
  leg and in the replay control; RED-prove by making the `already_claimed` branch release.
- [x] [Review][Patch] **R2-5 (P5) — The bidi assertion label prints `U+41`.**
  [`apps/api/tests/integration/field-worker/registration.spec.ts`, the `blankOrSpoofed` loop] — Blind. The label is the FIRST code point of the name, which for
  the `Asha…Rani` case is `A`, so a failure would not identify the bidi leg. Fix: explicit labels for the three names.
- [x] [Review][Patch] **R2-6 (P6) — A queued `mockResolvedValueOnce(null)` can leak into the next test.**
  [`apps/api/tests/unit/field-worker-handler-identity.test.ts`, "QE9’s order is kept"] — Blind + Auditor. The leg queues a `null` the passing path never consumes
  (`getDisplayName` is correctly not called) and drains it only on its last line; if an assertion above fails, the line is skipped and the `null` becomes the next
  test's display name (`afterEach` uses `mockClear`, which does not drain a once-queue). The restore also hard-codes `'Asha Verma'`. Fix: reset `getDisplayName` to
  its default in `afterEach` and drop the manual restore.
- [x] [Review][Patch] **R2-7 (P7) — The list-cap leg checks the constants against themselves.**
  [`packages/domain/tests/integration/field-worker/read.spec.ts`, the cap leg] — Blind. The title says 200 and 50; the assertions use `LIST_FIELD_WORKERS_MAX_LIMIT` and
  `…_DEFAULT_LIMIT`, so a cap drifting to 2000 passes (it seeds one more than whatever the constant is). Fix: assert the literal values 200 and 50 (and seed 201).
- [x] [Review][Patch] **R2-8 (P8) — QE9, Task 7 and the Resolution still describe the pre-R3 shape.**
  [this story: QE9's `run`-body order (lines 527-528) and its "The transaction is open, and idle, during the validation, the display-name read and the KMS calls"
  (line 544); Task 7 ("copy 12.2's `tenantWrite` UNCHANGED … with QE9's `run` body", line 1429); the Resolution R6 bullet's "(below)"] — Auditor; confirmed. Only a parenthetical
  was added at line 526. A sibling copying the shape from the story gets the order R3 removed, and a spec that says the transaction is idle during the display-name
  read is no longer true. Family 10 **REAL GAP** (low). Fix: move the content rules and the display-name read to a `prepare` step in QE9's order list; the idle sentence
  names only the district check and the KMS calls; Task 7 names the `prepare` step; "(below)" → "(QE9)".
- [x] [Review][Patch] **R2-9 (P9) — D1 is "owned by 13.1a" but not homed where 13.1a's author reads.**
  [`_bmad-output/planning-artifacts/epics.md`, under Story 13.1a] — Auditor; confirmed. The story's own convention writes a carried item to `deferred-work.md` AND under the sibling in
  `epics.md`, and 13.2's review homed its defers there (`72c8543a`). 13.1a already carries dated "INHERITED FROM 13.1" blocks; D1 has none. Family 10 **REAL GAP** (low). Fix: one
  dated "INHERITED FROM 13.1 (code review, 2026-11-04)" block under 13.1a for D1 (keyset paging and the matching index with the first listing screen).
- [x] [Review][Patch] **R2-10 (P10) — The ledger and the Completion Notes claim a RED proof for R8–R10.**
  [`sprint-status.yaml` (both `2026-11-04a` lines), this story's Completion Notes] — Auditor; confirmed, and mine. Both say "R1–R10 APPLIED, each … RED-proved then green" / "ten patches are
  applied and proved". R8–R10 are record edits and cannot be RED-proved; Debug Log (e) lists proofs for R1–R7 only — the same overclaim R8 corrected one line earlier. Family 10 **REAL GAP**
  (low). Fix: "R1–R7 each RED-proved then green; R8–R10 are record edits" in both ledger lines, the Completion Notes and the Resolution; also the ledger's "hold-and-wait removed" (R2-2).
- [x] [Review][Patch] **R2-11 (P11) — AC8 (k) says the test reads the code "through the door"; it reads it by raw SQL, with no VARIANCE note.**
  [this story: AC8 (k); `registration.spec.ts` `written()`] — Auditor's DISAGREEMENT with round 1's X15, accepted. I dismissed it as wording; R10 patched a comparable test-wording drift one finding
  later, so the treatment is inconsistent. The assertion's strength is unchanged. Fix: a one-line VARIANCE pointer in AC8 (k), as R10 did.
- [x] [Review][Defer] **D3 — The 503 exhaustion path holds the registration's scope-transaction connection while the flag write takes two more.**
  [`apps/api/src/modules/field-worker/handlers.ts:265-274`; `attribution-code-access.ts:123,125`] — Blind + Edge + Auditor. `flagAllocationExhaustedForRequest` resolves the display name and opens its own
  scope transaction from the same pool while the request's is held; under pool saturation the flag write can time out, is swallowed (`console.error`, QE9) and the trustee never sees the flag. Rare:
  it needs a Pariwar's 6-digit space exhausted AND a saturated pool at the same moment. Deferred, not fixed here: QE9 prescribes the flag in its OWN committed transaction, and
  `attribution-code-access.ts` is Story 13.2's door file (its export list is pinned) — the fix is to pass a pre-read display name in, or to flag after the registration's transaction closes, in a story
  that owns that file. Written to `deferred-work.md`; the comment R2-2 adds names it.

**Dismissed (9)** — listed so the triage can be audited:

- Y1 — Blind: a too-long key reports `field_worker.idempotency_key_required`. QE9 specifies exactly that: "missing, empty or over 200 characters ⇒ 400 `field_worker.idempotency_key_required`".
- Y2 — Blind: the `.astro` claim has no test. The walk treated `.astro` as TS text before the patch; R7 moved that behaviour into a function unchanged.
- Y3 — Blind: the NUL guard sits at one call site, not the command boundary. The documented caller contract (`RegisterFieldWorkerInput.district`: "LISTED — the caller ran `assertDistrictRecorded`") makes it the one
  place a route validates a district, and it is the place 13.1c / 13.1d inherit; the Auditor confirmed no LISTED district can hold NUL (Postgres text and JSONB cannot store it).
- Y4 — Blind: the type-level PII assertion cannot fail at runtime and names three columns. It fails under `tsc` (the domain tsconfig includes `tests/**`, verified); the SELECT list is explicit
  ("listed one by one so a column added later is NOT read by default"), which is the structural protection; the runtime half covers values.
- Y5 — Blind: the `post` wrong-key leg is really a dimension leg. Its title says "non-district"; `post` accepts any verified district-dimension key until 13.1c / 13.1d mint the move keys (X3; `deferred-work.md` C5 / C10).
- Y6 — Blind: leg `(j)` copies the claim-key format. Coupling, not vacuity: a namespace change makes the 409 leg fail loudly.
- Y7 — Auditor: `dto.ts:25` states the old name rule. It never listed the control-character rule ("NFC, trimmed, 1–120 characters") and does not contradict the amended rule.
- Y8 — Auditor: defers are ticked `[x]` like done items, and the section opens with "Findings are OPEN". `[x] … [Defer]` is the format this review skill mandates for a deferral, and the opening line follows 13.2's pattern with a Resolution block after it.
- Y9 — Auditor: R6's "a name containing ZWJ registers" control is unit-level only. The unit control proves the rule's narrowness; the HTTP success path is leg (a); a ZWJ-specific HTTP leg adds no code path.

Round 1's X1–X14 and D2: no disagreement (the Auditor re-checked X4, X10, X11, X12, X14 against the tree). X15 is re-opened as R2-11; D1's deferral stands and its homing is R2-9.

**Resolution of round 2 (2026-11-04) — BigDev chose "1 — Apply every patch"; the text above is round 2 as written.** R2-1…R2-11 are applied and checked
off; D3 and Y1–Y9 stand. ⚠ **STILL UNCOMMITTED and UNPUSHED**, ⚠ **`ci:local` STILL not re-run** since `ce80bd64`. What each patch BUILT, where it differs from the
finding as written, and how it was proved (every RED proof restored from a saved copy and re-run green; live legs on `twt-131-pg`, `:5470`):

- **R2-1** — the rule is now: no control character, no unpaired surrogate, NO INVISIBLE CHARACTER — `\p{Zl}`, `\p{Zp}`, `\p{Co}` and every default-ignorable code point
  EXCEPT ZWNJ, ZWJ, LRM and RLM (the allow-list is the numbers 0x200c–0x200f, built, ⛔ written as escapes) — and at least one `\p{L}`. `BIDI_CONTROL` and the
  strip-before-the-letter-test are GONE: the bidi controls and the Hangul fillers are default-ignorable, so the one rule refuses them. QE9's text is amended again. The
  variation selectors are now refused (a one-line allowance if a real name ever needs one). ⚠ **A mistake of mine, caught by the first run:** my first test claimed a
  TRAILING U+2028, U+2029 or U+FEFF "survives `trim()`" — `trim()` strips all three at the edge, so the stored name is the bare name; the legs now say that, and the other
  eleven classes are refused trailing. Tests: `field-worker-name.test.ts` 35 → 68 legs (one per class, between and trailing, the tag-character hidden payload, one letter + 119
  invisibles, the four allowed marks as controls); the (h) HTTP loop is six labelled hidden names. RED: round 1's rule fails 28 legs; no `Zl` / `Zp` / `Co` fails 4; an empty
  allow-list fails 5; live, round 1's rule lets the new names through with a 201.
- **R2-2** — the comment at the flag path now names the residual (the flag wrapper's second connection, `servicePool` IS `pool` in dev / CI, the door file is 13.2's — D3); the
  test `describe` is retitled to what it asserts (the ORDER of the display-name read) with a comment saying what it does not prove; the Resolution R3 bullet carries a NARROWED
  note; both ledger `2026-11-04a` lines carry a CORRECTED note. No code behaviour changed.
- **R2-3** — the fence also flags an `ExportSpecifier` named `authorize` and a binding whose key is a string or computed literal `authorize`; the doc comment, the `describe`
  title and the AC9 / QE18 (e) wording say "STATICALLY visible", and a dynamic key (`rbac[k]`) is named as the blind spot and pinned by its own leg. 82 → 90 legs: five new flags (one of them
  the bare-local-function leg), two negatives (`export *`, a local variable bound from another key) and the blind-spot leg. It found NO new hit in the real repo. RED: no export branch
  fails 2; bare-identifier-only binding keys fails 2; the call-expression branch deleted fails the bare-call leg AND the repo scan's "sees the real caller" assertion — that
  branch was load-bearing and, until now, pinned by nothing.
- **R2-4** — the in-flight leg and the replay control assert `release` was not called. RED: releasing in the `already_claimed` branch fails both.
- **R2-5** — the (h) hidden-name loop is labelled by case, not by the first code point.
- **R2-6** — `afterEach` resets the display-name mock to its default and the manual restore is gone. The leak is LATENT with today's leg order (the next leg queues its own
  `null`), so I made it observable with two throwaway legs: with the old `afterEach` the next leg sees `null`, with the new one it sees the default; the legs are removed.
- **R2-7** — the cap leg asserts the literal 200 and 50 and seeds 201. RED: with the cap at 2000 and the default at 500 it fails with "a length of 200 but got 201".
- **R2-8** — QE9's order list names a `prepare` step and a `run` body, the idle sentence names only the district check and the KMS calls, Task 7 names the `prepare` step, and
  "(below)" now says where.
- **R2-9** — `epics.md` carries a dated "INHERITED FROM 13.1 (2026-11-04)" block for D1 at the end of 13.1a's section — the first one under 13.1a itself.
- **R2-10** — the Completion Notes say R1–R7 were RED-proved and R8–R10 are record edits; the ledger carries a CORRECTED note.
- **R2-11** — AC8 (k) carries a VARIANCE pointer (the spec reads the code by raw SQL).

#### Review Findings — round 3: the WHOLE BRANCH, chunked — chunk G3 (the API route + contracts) (2026-11-04)

**2026-11-04 — full-branch review, baseline `268d86b5` → the working tree (HEAD `e4f88150` + the uncommitted round-1 / round-2 patches)**
(BigDev: "B: full branch, chunked", first chunk "G3 API route", then "go, launch all three"). The branch is ~7,000 code + test lines, so it is reviewed in
four groups — **G3** API route + contracts (THIS section), **G2** commands + reads, **G1** persistence + primitive, **G4** RBAC core + gates — each a later run,
numbered on from here (`R3-n`; ⚠ not round 1's `R3`, the `prepare` variance). G3 = 23 files, +1,810 lines (the `apps/api` field-worker module, `context` /
`server` / `types`, contracts `field-workers/*`, the OpenAPI emitter + `openapi/v1.yaml`, and their tests). Three FRESH layers, read-only, in parallel: Blind
Hunter (the diff only), Edge Case Hunter (the diff + the repo, ⛔ the story), Acceptance Auditor (the diff + this story + `-441`…`-444` + the AI-6-5 checklist; the
round-1 / round-2 Resolution blocks as CLAIMS to falsify). No layer failed. 29 raw → 23 unique; the load-bearing claims were re-checked before classifying
(the name rule REPLAYED with my own `node` probe; `closeScopeTx`, the keyed store's `getResult`, the global rate limit, the 12.2 twin's accepted residuals,
`registrationDistrict`'s callers and the OpenAPI header convention were READ). **1 decision-needed, 9 patch, 1 defer, 12 dismissed.** The Panel-routing §0
gate sends nothing to trustees (the decision is an engineering threshold — BigDev's). Findings are OPEN.

**How much to trust this.** The Auditor tried to falsify R1, R3, R4, R2-1, R2-2, R2-4, R2-6 and QE18 (c) / QE22 / TR7 / TR8 / TR12 against the code and
every one HELD; it found no code deviation from QE9, QE17, QE18, QE22 or the Errors table. What is left is the name rule's third gap (R3-1, R3-DN1), one
TRAP with no test (R3-2, TR9), AC8 / AC13 legs that assert less than the AC says, two fragile test legs, and one closure sentence. Not established by me: the
Edge Hunter's claim that U+FFF9–U+FFFB HIDE text in "many renderers" (they are refused either way by R3-1); the Auditor's "regenerated, never hand-edited"
OpenAPI check was NOT run (it rewrites `openapi/v1.yaml` in place — a read-only reviewer may not).

**AI-6-5 checklist families G3 touches** (the Auditor's verdicts, confirmed): 3 tenant and actor boundary, 6 projection discipline, 8 audit-after-mutation, 9
deliberate-vs-oversight, 12 cross-member ownership — covered-by-test or by construction. 2 concurrency / idempotency — covered, **REAL GAP: R3-2** (TR9).
4 payload completeness — covered for `district_admin`, partial for the other holders and by construction through the domain's guard 0 (R3-3). 5 DB-level
backstops — not constructible for the name / mobile content rules (Tier-1 ciphertext carries no CHECK). 10 closure honesty — **REAL GAP (low): R3-7.**
Families 1, 7, 11, 13 — not in this chunk.

- [x] [Review][Decision] **R3-DN1 — Should the name rule cap stacked combining marks?** ⭐ **RESOLVED 2026-11-04 — BigDev: "1" = cap at 8 or more CONSECUTIVE
  combining marks (refuse `\p{M}{8,}`) ⇒ becomes patch R3-10.** Edge + Blind; REPLAYED: `A` followed by 119 × U+0301 (a "Zalgo"
  name that overdraws the rows above and below it on 13.1a's screens) is ACCEPTED, and it is sealed for good (no rename event). A cap on CONSECUTIVE marks
  (`\p{M}{N,}`) fixes it, but `N` is a threshold the rule's stated intent does not settle: real orthographies stack marks — Devanagari a nukta + a vowel sign + a
  chandrabindu (3), Vietnamese 2, and Tibetan's subjoined consonants are `Mn`, so a Tibetan stack plus its vowel can reach 4–5 (names from Sikkim and Ladakh). Too low a
  cap refuses a real name; none leaves the overdraw. Engineering, not the Panel's (§0: no change to what anyone is told or owed). Options in the summary to BigDev.
- [x] [Review][Patch] **R3-1 (Medium) — The name rule still accepts characters that draw nothing or corrupt the name: `Cf` outside Default_Ignorable, U+2800, unassigned
  code points and noncharacters, U+FFFD, a leading or orphaned combining mark — and refuses ALM, the Arabic twin of the allowed LRM / RLM.**
  [`apps/api/src/modules/field-worker/handlers.ts:65`, `:71`, `:102-111`; `apps/api/tests/unit/field-worker-name.test.ts`] — Edge + Blind; REPLAYED by me (`scratchpad/13-1-r3/verify-name.mjs`).
  ACCEPTED today: `Asha` + U+2800 U+2800 (BRAILLE PATTERN BLANK, `So` — the classic filler bypass); `Asha` + U+FFF9 … U+FFFA … U+FFFB (interlinear annotation
  controls, `Cf` but not default-ignorable); `Asha` + U+0600 (an Arabic number sign, `Cf`); `Asha` + U+FFFD (the replacement character — what a client sends after
  mis-decoding a Devanagari name); `Asha` + U+FFFE and `Asha` + U+0378 (`Cn`); a name that starts with, or has after a space, a combining mark. REFUSED today: `Asha` + U+061C
  (ALM — default-ignorable, not on the allow-list, although the comment's own reason for LRM / RLM, "right-to-left names", is its reason too). The handler's doc says
  "nothing invisible". Reachability: any admin pasting a name; nothing upstream blocks it (the DTO is `max(1000)` only). Fix: refuse `\p{Cf}` (the allow-list still
  applies — ZWNJ, ZWJ, LRM and RLM are `Cf`), `\p{Cn}`, U+FFFD and U+2800 (BUILT with `String.fromCodePoint`, ⛔ written as escapes — memory: escapes land raw);
  refuse a combining mark at the start of the trimmed name or after whitespace (`^\p{M}`, `\s\p{M}`); add U+061C to `NAME_ALLOWED_INVISIBLE`; amend QE9's name
  text (the third amendment — the record already says the decision-log entry is BigDev's call). Tests: one leg per class, ALM as a control with the four existing
  marks, the HTTP (h) loop gains U+2800 and U+FFFD; RED-prove against the round-2 rule.
- [x] [Review][Patch] **R3-2 (Medium) — TR9 has no test: a failed registration RELEASES the key, and a failure is never RECORDED as the replayable result.**
  [`apps/api/src/modules/field-worker/handlers.ts:152-160`; `apps/api/tests/unit/field-worker-handler-identity.test.ts`; `apps/api/tests/integration/field-worker/registration-exhaustion.spec.ts`]
  — Auditor; confirmed by grep: `release` appears in the G3 tests only as `expect(calls.store.release).not.toHaveBeenCalled()` (`:172`, `:184`); every refusal leg and every
  exhaustion leg uses a FRESH `randomUUID()` key, and no leg re-sends a key after a 422 / 409 / 503. TR9: *"A rolled-back registration must also roll back the idempotency
  claim. `withIdempotency` releases the key on failure; do not record a failed (503) response as the replayable result."* Deleting the `finally` release, or recording
  before `run` resolves, turns nothing red. Family 2 **REAL GAP**. Fix: unit — on a 422 (prepare throws) and on a `run` throw, `release` called ONCE with the claim key
  and `recordResult` NOT called; HTTP — after the 503, the SAME key with the door un-mocked ⇒ 201 (it ran again, not a replayed 503). RED-prove by deleting the release.
- [x] [Review][Patch] **R3-3 (Low) — AC8 legs assert less than AC8 says.**
  [`apps/api/tests/integration/field-worker/registration.spec.ts:164`, `:195`, `:215`, `:249`] — Auditor; confirmed by reading. AC8 (f): *"In EVERY 201 the genesis event's
  `authorization` EQUALS `{ permission_key: 'field_worker.register', role, grant: {…}, target: { dimension: 'district', value: <the body's district> }, catalog_version:
  PERMISSION_CATALOG_VERSION }`"*; the preamble: *"'Nothing written', in every refusal leg"*. Only the `district_admin` leg asserts the whole object; the `pariwar_admin`,
  both-grants and `super_admin` legs `toMatchObject({ dimension: 'district' })` on `target` (`:215`) — `target.value`, `permission_key` and `catalog_version` unasserted.
  The cross-district 403 (`:195`) asserts the status only — no nothing-written, no code; the 404 (`:164`) does not assert `pariwar.not_found`; the non-string district 400
  (`:249`) does not assert `request.validation`. Correct by construction today (the domain's guard 0 refuses a wrong key / target), so this is a test gap. Fix: full
  `toEqual` in every 201 leg; nothing-written + the code in the three refusal legs.
- [x] [Review][Patch] **R3-4 (Low) — The AC13 PII sweep misses the concurrent loser's `_rolled_back` row and the 503's logs.**
  [`registration.spec.ts` legs (d), (k); `registration-exhaustion.spec.ts:76`] — Auditor; confirmed. AC13: *"repeats the assertion for each refusal (409 duplicate, 422, 503
  exhaustion): the response body, the error message and the `_rolled_back` audit row carry neither value"*. The only 409 that WRITES a `_rolled_back` row is the
  concurrent loser (d), and (d) never sweeps it; (k) sweeps the sequential 409, which writes none. The 503 leg sweeps the body and audit rows, not `console.error` /
  the server log. Low risk (every message is static). Fix: sweep (d)'s two audit rows; spy `console.error` + capture the log in the 503 leg.
- [x] [Review][Patch] **R3-5 (Low) — The (h) "NO KMS call" leg has no positive control.**
  [`registration.spec.ts:220-241`] — Blind + Edge + Auditor. The spies on `encryptDek` / `computeHmac` DO intercept today (`envelope.ts:64`, `blind-index.ts:36` call those
  methods on the same `deps.encryption.kms`), but nothing shows them firing, so a KMS wrapper or a batched HMAC (memory: KMS audit per HMAC) leaves the leg green whatever the
  order. Fix: in the same `try`, a listed district ⇒ 201 with `encryptDek` called twice and `computeHmac` once.
- [x] [Review][Patch] **R3-6 (Low) — Leg (d)'s lock-wait probe matches ANY session in the cluster.**
  [`registration.spec.ts:131-140`] — Blind + Edge; confirmed. `wait_event_type = 'Lock' AND query ILIKE 'insert into "field_workers"%'` has no `datname` and no blocker
  filter; under a parallel `ci:local` a domain field-worker spec's blocked insert satisfies it, the owner COMMITs before this request reaches its insert, the pre-check
  sees the row and answers 409 with NO audit lines ⇒ the leg fails intermittently (memory: parallel-load flakes). Fix: `AND datname = current_database() AND $1 =
  ANY(pg_blocking_pids(pid))` with `$1` the owner's `pg_backend_pid()`.
- [x] [Review][Patch] **R3-7 (Low) — Change Log v1.21 says `resolveValue`'s fail-closed leg is "covered by green tests"; no test calls it.**
  [`apps/api/src/modules/field-worker/routes.ts:31`; this story, Change Log v1.21] — Auditor; confirmed by grep: `registrationDistrict` is referenced only at `routes.ts:47`
  (and `dist/`). What protects it is the core null-deny (`check.ts:138`, green in `check.test.ts`) and the DTO (a non-string district is a 400 before the hooks) — by
  construction. Family 10 **REAL GAP** (low). Fix: a two-line unit test (`registrationDistrict` of a string ⇒ it; of a number / missing body ⇒ `null`) and the v1.21 sentence
  corrected by a dated note (⛔ rewritten).
- [x] [Review][Patch] **R3-8 (Low) — A name leg's title claims it tests the length bound; it cannot reach it.**
  [`apps/api/tests/unit/field-worker-name.test.ts:123-125`] — Blind; confirmed. "ONE letter plus 119 invisible characters (the 120 limit counts them) is refused" sends exactly 120
  code points — inside the bound — so the ZWSP rule refuses it; the bound itself is pinned at `:59-64`. Fix: retitle to what it proves (a name that is all but one letter invisible
  is refused by the invisible rule), or send 121 to make it a bound leg.
- [x] [Review][Patch] **R3-9 (Nit) — The OpenAPI description does not say "reporting district".**
  [`packages/contracts/scripts/emit-openapi.ts:5323`; `openapi/v1.yaml` (regenerated)] — Auditor. QE17: *"every comment, DTO description and screen label says 'reporting district'"*;
  the route description says "`district` must be a LISTED district of the Pariwar". Fix: "the worker's REPORTING district — it must be a LISTED district…", then regenerate (⛔ hand-edit).
- [x] [Review][Patch] **R3-10 (Low; from R3-DN1, BigDev "1") — Refuse a name with 8 or more CONSECUTIVE combining marks.**
  [`apps/api/src/modules/field-worker/handlers.ts:102-111`; `field-worker-name.test.ts`] — `\p{M}{8,}` on the NFC-normalised, trimmed name ⇒ `null` (422
  `field_worker.name_invalid`). 8 is above every real orthography's stack (Devanagari ~3, Vietnamese 2, Tibetan subjoined consonant + vowel ~4–5). Folds into R3-1's QE9
  amendment. Tests: 7 marks after a letter ACCEPTED, 8 REFUSED, a real Tibetan stacked syllable and a Devanagari nukta + vowel + chandrabindu ACCEPTED as controls; RED-prove.
- [x] [Review][Defer] **D4 — A replay after the 24 h TTL answers 409 "in progress — wait and retry" for a request that COMPLETED.**
  [`packages/domain/src/idempotency/keyed-store.ts:21-23` vs `:240-254`; `handlers.ts:147-150`] — deferred, pre-existing. Edge; confirmed by reading: `claim` leaves a completed-but-expired row
  in place ("still readable by getResult until the vacuum runs" ⇒ `already_claimed`), but `getResult` filters `expires_at >= now` ⇒ `null` ⇒ 409 `field_worker.idempotency_in_progress`,
  whose advice cannot work. The store's own comment contradicts its code; every keyed-store caller has it (12.2's twin's RB8 / RD3 and the drive-target "pass-2 softening" are the same
  family). Not 13.1's file; `takeOver` / `inspect` are RD3's owner's remedy. Written to `deferred-work.md`.

**Dismissed (12)** — listed so the triage can be audited:

- Z1 — Blind: a `recordResult` failure after COMMIT releases the key and loses the 201. The accepted residual: TR11 (a lost 201 costs the worker's id, not a code), 12.2's RB8.
- Z2 — Blind: the key is not bound to the body. RD2 (`deferred-work.md`, no owner) and 13.1 C9's "13.1a's screen MUST mint one key per submission".
- Z3 — Blind + Edge: a crash between claim and settle wedges the key. It self-heals at the TTL (`claim` path (b)); the false copy is RD3's (the drive-target pass-2 softening).
- Z4 — Blind: the duplicate-mobile 409 crosses districts, unaudited. QE4's ACCEPTED disclosure (round 1's X9); the probe costs KMS calls and the global rate limit applies.
- Z5 — Blind: the transaction is idle across three KMS calls. QE9: "the KMS calls run with the transaction open and idle — accepted".
- Z6 — Blind: `releaseHookTx` clears `scopeSet` first, so `closeScopeTx` might no-op. It is keyed on `closed`, ⛔ `scopeSet` — and its comment names this exact helper shape (`scope-tx.ts:58-65`).
- Z7 — Blind: the `state_trustee` "with a tree" leg proves no containment. AC8 (e) specifies exactly that leg ("refused because its bundle LACKS the key … asserted 403 both WITH and WITHOUT a geo tree").
- Z8 — Blind: `requestPayloadHash` covers a random id. QE9's `hashShape` is `{ field_worker_id, district }` by design (a mobile's SHA-256 is brute-forceable).
- Z9 — Blind: OpenAPI does not declare the `Idempotency-Key` header, nor the direct-write 500. No route in `openapi/v1.yaml` declares it as a parameter (the convention is the description); 500s are the central mapper's.
- Z10 — Blind: the direct-write 500 logs only the code. The 12.2 twin's shape; the code-only log is the PII-safe choice and the class is a BUG signal.
- Z11 — Blind: the exhaustion flag runs while the request's connection is held. D3 (round 2), unchanged.
- Z12 — Blind: no rate limit on the route. `@fastify/rate-limit` is registered `global: true` (`plugins/rate-limit/index.ts:121-122`).

**Resolution of round 3, chunk G3 (2026-11-04) — BigDev resolved R3-DN1 with "1" (cap at 8+) and chose "1 — Apply every patch"; the text above is the review as written.** R3-1…R3-10 are
applied and checked off; D4 and Z1–Z12 stand. ⚠ **STILL UNCOMMITTED and UNPUSHED**, ⚠ **`ci:local` STILL not re-run** since `ce80bd64`, ⚠ **G2, G1, G4 not yet reviewed**. How each was
proved (every RED file restored from a saved copy and `cmp`-checked; live legs on `twt-131-pg`, `:5470` — Debug Log (g)):

- **R3-1 + R3-10** — `NAME_INVISIBLE` gains `\p{Cf}` and `\p{Cn}`; `NAME_REFUSED` (U+2800, U+FFFD, numbers); ALM added to `NAME_ALLOWED_INVISIBLE`; `NAME_ORPHAN_MARK` (`(?:^|\s)\p{M}`) and
  `NAME_MARK_RUN_TOO_LONG` (built from `FIELD_WORKER_NAME_MAX_MARK_RUN = 7`). ⚠ `\p{Cn}` follows the running Node's Unicode version (said in the comment). QE9's text amended a third time. Tests: 68 → 93
  name legs (nine refused classes between letters and trailing, the hiding annotation, orphan marks, the 7 / 8 / 119 boundary with the 7 pinned as a literal, four real-name controls — ALM,
  a Tibetan stack, a Devanagari three-mark stack, a decomposed Vietnamese name); the HTTP (h) loop gains a Braille blank, a U+FFFD and 8 stacked marks. RED: round 2's rule fails 22 unit legs and the live leg.
- **R3-2** — unit: a failure in `prepare` (422) and in `run` (the pre-check 409) each RELEASE once by the claim key and record nothing; a success control records and releases nothing. Live: after the
  503 the SAME key registers (201). RED: no release ⇒ both unit legs and the live retry; recording a failure ⇒ both unit legs.
- **R3-3** — every 201 in (f) asserts the WHOLE snapshot; the cross-district 403 asserts `authz.forbidden` and that only the Patna registration exists; the 404 asserts `pariwar.not_found`; the
  non-string 400 `request.validation`. Green; not RED-proved.
- **R3-4** — (d) sweeps its body and everything the Pariwar wrote, its `_rolled_back` row included; the 503 leg sweeps `console.error` and the server log. Green; not RED-proved. [⚠ CORRECTED by review round 4, R4-1: the 503 leg's `console.error` half could NOT fail — the spy was read after `mockRestore`, which resets it in vitest 2; the calls are now copied first, and the flag-fails leg (where `console.error` fires) is swept too.]
- **R3-5** — the (h) unlisted-district leg ends with a listed district: 201, `encryptDek` ×2, `computeHmac` ×1 on the same spies. RED: a deaf spy fails it.
- **R3-6** — the probe: `datname = current_database() AND <owner pid> = ANY(pg_blocking_pids(pid))`. Green; a flake fix cannot be RED-proved on demand.
- **R3-7** — `registrationDistrict`: four unit legs (a string verbatim, a number, no district, no body). RED: passing a number through fails 1. Change Log v1.21 carries a dated CORRECTED note.
- **R3-8** — the leg is retitled to what it proves (inside the bound; the invisible rule refuses it).
- **R3-9** — the route description says "REPORTING district"; `openapi/v1.yaml` regenerated (one line), the determinism check green.

#### Review Findings — round 3: chunks G2 (commands + reads), G1 (persistence + primitive), G4 (RBAC core + gates) (2026-11-04)

**2026-11-04 — the remaining three chunks of the full-branch review, launched together** (BigDev: "go, launch all three and remaining chunk all at once"). Baseline
`268d86b5` → the working tree (incl. the round-1 / round-2 / round-3-G3 patches). Nine FRESH read-only layers in parallel, three per chunk: **G2** 11 files, 2,495 lines
(`field-worker/{commands,read,errors,index}.ts` + tests); **G1** 30 files, 3,001 lines (migration `0200`, schema, RLS, `events` / `state` / `project`, the registry, field classes,
the 13.2 spec repairs); **G4** 20 files, 1,635 lines (the RBAC core, the rbac hook, the `field-worker-state-invariant` gate, the access-wrapper change, CI wiring, Row 48, the RBAC
tests and the `authorize` fence). The four chunks cover every code / test file on the branch exactly once (checked). Every layer ran with `DATABASE_URL` unset (no DB). No layer
failed. 68 raw → 50 unique; the weighty claims were READ against the tree before classifying (`requirePermission`'s return and QE18 (c) / (e); pino's `err` logging and the
twin `ModulePersistError`; the projector's insert columns; `state.test`'s agreement leg; the trigger RAISE texts; the fixtures' guard use). **1 decision-needed, 18 patch, 4 defer,
27 dismissed.** §0: nothing to trustees — the one decision is QE18's engineering contract (BigDev's); the Auditor confirmed `field_worker.register`'s holders match `-441` verbatim.

**How much to trust this.** The three Auditors found NO AC, QE, TR, invariant or ratified-decision violation in G1, G2 or G4's code, and confirmed (by reading or by running
DB-free suites) R2, R4, R5, R2-3 (82 → 90 fence legs, no repo hit), R2-7, the 38-job `ci:local`, Row 48 (a)–(d), the trigger's eight columns and v1.21's "covered by green tests"
list for rules (c) / (d′) and the G2 guards. The two Edge Case Hunters for G1 and G2 found NO production-reachable edge. What is left: ONE design gap in QE18 (R3-DN2), test
legs that cannot fail or assert less than they claim, the static gate's and the fence's blind spots, the trigger field's free text, and closure wording. Not established by me:
the G1 Auditor's "PLAUSIBLE" on Debug Log (b)'s RED proofs for (t) / (e′) (not re-run); remote sibling journals (no layer ran `git fetch`).

**AI-6-5 checklist families** (the Auditors' verdicts, confirmed): 1 state-machine totality — covered (but R3-13: the table test is tautological). 2 concurrency — covered (G2's
probabilistic legs have deterministic twins). 3 tenant / actor — covered, **REAL GAP (low): R3-15, R3-21**. 4 payload completeness — covered, **REAL GAP (low): R3-16**. 5 DB
backstops — covered (transition legality is NOT in the DB, by design — Task 2.2). 6 projection — covered. 8 audit — covered. 9 deliberate-vs-oversight — covered, **REAL GAP
(low): R3-25, R3-26** (and R3-DN2). 10 closure honesty — **REAL GAP (low): R3-18, R3-19, R3-22, R3-24, R3-28**. 11 policy meaning, 12 cross-member — covered. 7, 13 untouched.

- [x] [Review][Decision] **R3-DN2 (G4, Medium) — `requirePermission` now RETURNS a `VerifiedAuthorization` minted from whatever grants it is given, and nothing fences it.** ⭐ **RESOLVED 2026-11-04 — BigDev: "1" = fence the RESULT ⇒ patch R3-29.** — Blind +
  Edge (G4); confirmed by reading. QE18 (c): *"`requirePermission` returns it (it returned nothing)"*; QE18 (e): *"`authorize` is PURE over the grants it is given — a caller could pass
  fabricated grants: a source-fence unit test pins that `authorize(` is called only from `check.ts` (`requirePermission`) …"*. The fence pins `authorize` — but `requirePermission` is
  the same purity one call up, public (`rbac.requirePermission`, exported from `@twt/domain`), called today by six production files with caller-supplied grants (e.g.
  `packages/validity-service/src/redaction.ts:65`, `apps/api/src/modules/rules/index.ts:129` — all ignore the return), and its result passes `isVerifiedAuthorization`, which
  `registerFieldWorker` / `postFieldWorker` accept (`commands.ts:143`). So `rbac.requirePermission({ actorId, grants: [<a made-up super_admin grant>], key: 'field_worker.register',
  resource })` mints a genuine-looking record. No src file does it; it is a drift-guard hole the spec's own fence design left (`check.ts:261`, `:297` say "produced only by the RBAC
  check"). Engineering (§0: the snapshot's MEANING to an auditor does not change; the question is which code may mint it). Options in the summary.
- [x] [Review][Patch] **R3-11 (G1, Low) — Two "nothing survived" assertions run AFTER a `ROLLBACK TO SAVEPOINT` and cannot fail.**
  [`packages/domain/tests/integration/field-worker/projector-trigger.spec.ts:74-75`; `schema-trigger.spec.ts:165-166`] — Blind + Edge (G1); confirmed (memory: post-savepoint
  assertion vacuous). The drift leg reads the stream after `ROLLBACK TO SAVEPOINT drift`; the I10 DELETE leg checks the row after `expectDirectWrite` rolled back. Fix: read the
  stream BEFORE the rollback (the drift throws before any SQL error, so the transaction is usable); drop the row line (the P0001 assertion is the proof) or assert it without a savepoint.
- [x] [Review][Patch] **R3-12 (G1, Medium) — Every trigger leg matches only the SHARED message prefix, so no leg can tell which rule refused it.**
  [`schema-trigger.spec.ts:35` (`expectDirectWrite`)] — Blind (G1); confirmed against the RAISE texts in `0200`: all start "field_workers direct write rejected —", four rules share
  "(Story 13.1 I3)". If the writer flag stopped taking effect, rule (a) would refuse every guarded leg with the same prefix and the (b), (c), (d′), (e′) and I3-genesis legs would stay
  green without exercising their rule. Fix: `expectDirectWrite(…, fragment)` asserting each rule's distinguishing text ("must strictly increase", "never goes completed -> pending",
  "must not coincide", "identity is immutable", "a genesis INSERT must be", "never updated", "never deleted"); RED-prove one by switching the flag off in a guarded leg.
- [x] [Review][Patch] **R3-13 (G1, Low) — The "table and reducer AGREE" test compares the transition list with itself.**
  [`packages/domain/tests/field-worker/state.test.ts:37-49`; `state.ts:80-92`] — Blind (G1); confirmed: `FIELD_WORKER_TRANSITION_TABLE` and `nextFieldWorkerState` both read
  `FIELD_WORKER_TRANSITIONS`; only `legal === 10` and four named pairs can fail, so a wrong arm (e.g. `reactivated` → `pending_kyc`) with the count kept passes. AC4's "agree" is
  untested. Fix: a LITERAL expected list of the ten arms (QE5) `toEqual` the table; fix the "inapplicable" comment in the never-throws leg (it is applied). RED: one arm's `to` changed.
- [x] [Review][Patch] **R3-14 (G1, Low) — The projector's `from_state` / `to_state` cross-check has no test that can fail.**
  [`packages/domain/src/field-worker/project.ts` (the `p['from_state'] !== fromState` check); `projector-trigger.spec.ts`] — Auditor (G1); confirmed. QE13: *"The projector
  cross-validates `from_state` / `to_state` against `lockedRow` … — else `FieldWorkerProjectorInputError`"*. The only leg (`kyc_completed` with `from_state: 'active'`) is refused by
  the payload schema's literal first [⚠ CORRECTED by review round 4, R4-14: wrong — in `project.ts` the cross-check runs BEFORE the schema parse, so the old leg reached it; the gap was that DELETING the check left it green, the schema refusing next]. Fix: a mismatch the schema accepts (`terminated { from_state: 'active' }` on a `pending_kyc` row) ⇒ `FieldWorkerProjectorInputError`, nothing
  appended (read before any rollback — R3-11); RED-prove by deleting the check.
- [x] [Review][Patch] **R3-15 (G1, Low) — The projector's own human-actor check is reached by no test — and v1.21 lists "the QE7 checks" as green-tested.**
  [`project.ts` (`assertFieldWorkerActor`, genesis and transition); `projector-trigger.spec.ts`] — Auditor (G1); confirmed: every non-human-actor leg goes through a command, which calls the
  same check first. For a transition, `actorId: null` is caught ONLY here (`events_log.actor_id` NULL means "system"). Family 3 **REAL GAP** (low). Fix: projector-direct legs (`actor:
  'system'`; `operator` with `actorId: null`) ⇒ `FieldWorkerProjectorInputError`, nothing appended; a dated CORRECTED note on v1.21; RED-prove.
- [x] [Review][Patch] **R3-16 (G1 + G2, Low) — The events' `trigger` field is free text, and none of the six transition triggers is pinned.**
  [`packages/domain/src/field-worker/events.ts:60`; `commands.ts:284`, `:299`, `:314`, `:321`, `:350`, `:388`] — Blind (G1) + Auditor (G2); confirmed. `triggerSchema =
  z.string().min(1).max(200)` contradicts the header's I8 ("free text is ⛔ allowed anywhere"); QE6's computed values (`field_worker.kyc_complete`, `.activate`, `.suspend:<reason>`,
  `.reactivate`, `.terminate:<reason>`, `.post`) are asserted nowhere but the genesis's. Unreachable with free text today (the projector is not exported; commands compute it), but a
  name in a `trigger` would sit in an append-only stream that survives erasure. Family 4 **REAL GAP** (low). Fix: a per-event-type pattern (the reason part limited to that event's reason
  enum); assert `payload.trigger` in the I13 `it.each` and the terminate leg; RED-prove with a typo'd trigger.
- [x] [Review][Patch] **R3-17 (G1, Nit) — The AC1 index checks match only the START of the column list.**
  [`packages/domain/tests/integration/rls/field-workers-policy-regression.spec.ts` (`toContain('using btree pariwar_id, mobile_blind_index')` and the list index)] — Auditor (G1). AC1:
  *"compare the column list and the predicate"*. A third column passes. Fix: compare the normalised text between `btree` and `where` exactly.
- [x] [Review][Patch] **R3-18 (G1, records) — Debug Log (b) says the policy spec has 12 legs (it has 11 and never had 12); "refused for EVERY role" overstates I10.**
  [this story: Debug Log (b), I10, Completion Notes; the `0200` header comment] — Auditor (G1). The owner can `ALTER TABLE … DISABLE TRIGGER` without superuser; nothing in Postgres
  forbids that short of event triggers. Fix: dated corrections — "11"; "every role's DML (an owner can still disable the trigger — DDL is outside I10)"; the migration comment reworded (a
  comment, so no checksum risk on the story DB — re-check that drizzle hashes the file and, if it does, leave the SQL file alone and correct the record only).
- [x] [Review][Patch] **R3-19 (G1, records) — "0 orphan code rows" was measured on a fresh container that could not hold any; the real exposure is unmeasured.**
  [this story: Debug Log (a), v1.20, round 1's X13] — Auditor (G1); confirmed. TR2's risk is a SHARED developer DB that ever ran `allocate-concurrency.spec.ts` to a crash. Carried as an
  UN-ATTESTED risk (memory: record, never back-fill): a dated note on Debug Log (a) and a new unchecked Task line — count `field_worker_attribution_codes` rows with no worker on EACH
  shared DB before `db:migrate` runs `0200` there (the migration header's remedy applies).
- [x] [Review][Patch] **R3-20 (G2, Low) — `FieldWorkerReasonInvalidError` echoes the raw, caller-supplied reason in its message, and the trigger is built from it before validation.**
  [`packages/domain/src/field-worker/errors.ts` (the `JSON.stringify(reasonCode …)` constructor); `commands.ts:314`, `:350`] — Blind + Edge (G2); confirmed. The header (I8) promises
  messages carry "only ids, states, event types, reason codes and districts"; an INVALID reason is by definition not a code (free text — a name, a number). The API maps it to static
  text, so HTTP is safe; a log of the domain error is not. `JSON.stringify(10n)` / `String(Object.create(null))` throw untyped (types forbid them — weaker leg). Fix: no value in the
  message (`typeof` and length at most); build the trigger AFTER `assertReason`; a leg with a long free-text reason asserting the message holds none of it.
- [x] [Review][Patch] **R3-21 (G2, Low) — No test pins the command lock's explicit `AND pariwar_id = $2`.**
  [`commands.ts:106`; `packages/domain/tests/integration/field-worker/commands.spec.ts:162-169`] — Blind + Auditor (G2); confirmed. The only cross-Pariwar command leg runs as
  `twt_app` under A's scope, so RLS alone hides B's row; deleting the predicate leaves it green. `read.ts`'s header: *"RLS is ⛔ the only filter — an owner-role caller bypasses it, 13.2
  TR3"*. Family 3 **REAL GAP** (low). Fix: a leg as the OWNER (`RESET ROLE`) calling `activateFieldWorker` with `pariwarId: A` on B's worker ⇒ `GenesisMissing`; RED-prove by deleting it.
- [x] [Review][Patch] **R3-22 (G2, Low) — `commands.spec.ts` claims more than its legs assert.**
  [`commands.spec.ts:3`, `:131`, `:223-249`; `packages/domain/tests/field-worker/commands-guards.test.ts:200-205`] — Blind + Auditor (G2); confirmed. The header says every refusal
  asserts "its typed error, no event, the row unchanged" — `expectRefusedCleanly` runs in three legs only; the "ANYTHING out of terminated" loop omits `recordFieldWorkerKycCompleted`;
  the QE18 leg's title says "no event, no row" and checks events only; the unit "out of terminated" leg skips `refused(calls)`. Fix: `expectRefusedCleanly` in every refusal leg (or the
  header narrowed), the kyc leg added, the row asserted, `refused(calls)` added.
- [x] [Review][Patch] **R3-23 (G2, Nit) — `_fixtures.ts` has a section banner with nothing under it.** [`packages/domain/tests/integration/field-worker/_fixtures.ts:72-75`] — Blind (G2). Fix: move or drop it.
- [x] [Review][Patch] **R3-24 (G2, records) — The I13 RED proof differs from what AC6 asks for, with no VARIANCE note.** [this story: AC6, Debug Log (c)] — Auditor (G2). AC6 says
  "swap the lock and the append"; Debug Log (c) records a planted `events_log` read before the lock (at least as strong). Fix: one VARIANCE line.
- [x] [Review][Patch] **R3-25 (G4, Low) — The `authorize` fence never scans the root `scripts/` or `tests/` trees — `scripts/provision-admin.ts` (run against production) imports the domain.**
  [`packages/domain/tests/rbac/check.test.ts:1060` (`const roots = ['apps', 'packages']`)] — Auditor + Blind (G4); confirmed. The test's own title says "every tests tree". Family 9 **REAL
  GAP** (low). Fix: add `scripts` and `tests` to the roots, raise the floor, RED-prove with a planted file.
- [x] [Review][Patch] **R3-26 (G4, Low) — The fence misses an ASSIGNMENT destructuring and a literal `Reflect.get(rbac, 'authorize')`.**
  [`check.test.ts:996-1020` (`reachesAuthorize`)] — Edge + Auditor (G4); REPLAYED by both: `({ authorize: m } = rbac)` and `({ 'authorize': m } = rbac)` ⇒ not flagged; the doc says
  "every STATICALLY visible way" and names only the DYNAMIC `Reflect.get` as blind. Fix: flag a `PropertyAssignment` / shorthand keyed `authorize` on the left of `=`, and a `Reflect.get` /
  `Object.getOwnPropertyDescriptor` whose 2nd argument is the literal; legs for each; RED-prove.
- [x] [Review][Patch] **R3-27 (G4, Low) — The `field-worker-state-invariant` gate can lose sight of its own target and stay green.**
  [`scripts/field-worker-state-invariant/{lib,check}.ts`, `README.md`] — Blind + Edge + Auditor (G4); REPLAYED by the Edge Hunter: `.set(patch)`, `.set({ ...patch })`, an import alias
  (`fieldWorkers as fw`), `fieldWorkers as any`, a split chain, a string / shorthand `set` in `onConflictDoUpdate` ⇒ 0 findings; an anonymous callback or object-property arrow inside a
  projector body is allow-listed; the only non-vacuity floor is a file count, so if the projector's own two writes went to a `.set(patch)` shape the gate would see NO write and pass; `.ts`
  only. The DB trigger still refuses at runtime (I1's second half). Fix: unwrap `as` / parentheses / non-null in `tableNameOf`; resolve import aliases; a `.set` / `.values` on a
  `fieldWorkers` chain whose argument is not an object literal or holds a spread is a finding ("unverifiable shape"); stop at EVERY function-like node (anonymous ⇒ `<anonymous>`); FAIL
  unless each allow-listed projector function is seen writing at least once; scan `.mts` / `.cts` / `.tsx` too; the README names what it still cannot see (raw SQL — the trigger's; roots
  outside `packages/domain/src` — house convention, round 1's X2). New `lib.test` legs per shape; RED-prove the non-vacuity floor.
- [x] [Review][Patch] **R3-28 (G4, records) — AC9's "every case in the existing matrix" and "every existing RBAC test passes unchanged" overclaim.**
  [this story: AC9, QE18 Costs, Task 8, Debug Log (b), Completion Notes; `check.test.ts:840`, `:719-723`] — Auditor (G4); confirmed. The agreement MATRIX is a re-typed 18 + 5 subset of
  the 71 existing calls, and the `matchingGrantRole` leg cannot fail (`matchingGrantRole` IS `authorizingGrant(...)?.role ?? null`); `permissions.test.ts` changes two pins (58 → 59,
  77 → 78) and `roles.test.ts` gains an assertion inside an existing `it`. Agreement holds BY CONSTRUCTION (one shared predicate). Fix: dated corrections — "a representative matrix;
  agreement by construction"; "existing RBAC tests pass unchanged except the version / count pins Task 8 bumps"; drop the tautological leg's claim.
- [x] [Review][Patch] **R3-29 (G4, Medium; from R3-DN2, BigDev "1") — Fence the RESULT of `requirePermission`.**
  [`packages/domain/tests/rbac/check.test.ts` (the fence); `packages/domain/src/rbac/check.ts` (the doc); this story QE18 (e)] — a source-fence leg flags every `requirePermission(`
  call whose RETURN VALUE is used (assigned, returned, passed, awaited into a binding, spread, property-read — anything but a bare expression statement or a bare `await`
  statement) outside `packages/domain/src/rbac/check.ts` and `apps/api/src/modules/rbac/index.ts` (the hook), and outside `*.test.ts` / `*.spec.ts`; same roots as R3-25. The six
  existing callers drop it, so the real repo stays clean (asserted: the scan sees them and flags none). Legs: `const a = rbac.requirePermission(…)`, `return requirePermission(…)`,
  `f(requirePermission(…))`, `const a = await …` ⇒ flagged; a bare call / bare `await` ⇒ not. QE18 (e) amended (dated); the `check.ts` doc says what is fenced. RED-prove.
- [x] [Review][Defer] **D5 — A persist / projector error's `cause` holds the driver error — bound params (Tier-1 ciphertext, the mobile blind index) and a 23505 detail — and pino logs it on an
  unhandled 500.** [`packages/domain/src/field-worker/errors.ts` (`FieldWorkerPersistError`, `FieldWorkerProjectorInputError`); `apps/api/src/middleware/error-mapping/index.ts:690`
  (`request.log.error({ err: error }, 'unhandled error')`)] — deferred, pre-existing pattern. Blind (G1, G2); confirmed: `cause` is a public own property, so pino's `err` serializer
  includes it; 12.2's `ModulePersistError` has the identical shape. Not plaintext (Tier-1 is ciphertext), but the blind index is an equality oracle for a mobile. Fix belongs in one
  place for every primitive (a non-enumerable `cause`, or a redacting serializer). Written to `deferred-work.md`.
- [x] [Review][Defer] **D6 — The other `*-state-invariant` gates share R3-27's blind spots.** [`scripts/*-state-invariant/lib.ts` — the marketplace twin and its siblings] — deferred,
  pre-existing. R3-27 fixes 13.1's copy; AC11 made it a faithful copy of the twin, so the twins now diverge until someone ports the fix. Written to `deferred-work.md`.
- [x] [Review][Defer] **D7 — A move (`posted`) has no expected-from-district guard, and takes ANY verified district key at either end — for 13.1c / 13.1d.** [`commands.ts:367-383`] —
  deferred, homed. Blind + Edge (G2). Round 1's X3 and C5 / C10 cover the key; the lost update (a concurrent move changes the SOURCE while the authorization names the destination — both
  fulfil, serialised by the lock, spec (e2)) is NEW: 13.1c / 13.1d mint the move keys and must decide whether a move names its expected source. Written to `deferred-work.md` and under
  13.1c / 13.1d in `epics.md`.
- [x] [Review][Defer] **D8 — Under FORCE RLS with policies only `TO twt_app`, a NON-superuser owner sees zero rows — an owner-run UPDATE (the eight-year scrub, any maintenance job) would
  match nothing, silently.** [`packages/domain/migrations/0200_field-workers.sql:84-87`] — deferred. Blind (G1); the Edge Hunter confirmed the zero-row behaviour (it is what makes an owner
  DELETE harmless). Not reachable in 13.1 (no owner-run writer; the test owner is a superuser). Trigger: the first migration or job that UPDATEs `field_workers` as the owner (the erasure /
  retention work, C-items) must run as a role a policy names, or add one. Written to `deferred-work.md`.

**Dismissed (27)** — listed so the triage can be audited:

- W1 — G1 Blind: the projector trusts `lockedRow`'s non-event columns. `lockedRow` IS the command's own `SELECT … FOR UPDATE` and `project.ts` is not exported (Edge G1 confirmed).
- W2 — G1 Blind: the trigger does not enforce the transition graph or a +1 version step. By design — Task 2.2 puts legality in the reducer; the DB holds the shape (Auditor G1).
- W3 — G1 Blind: the snapshot is not bound to the act's district / key. The command's `verifiedSnapshot` checks key, dimension and (register) target; `posted` judges under the lock (QE5 3c, R2).
- W4 — G1 Blind: a genesis INSERT may backdate `created_at`. The projector's INSERT does not set it (grep: no `created_at` in `project.ts`), so `DEFAULT now()`; only the projector inserts.
- W5 — G1 Blind: the fold accepts streams the DB forbids. "Pure, never throws" is AC4 / I4's contract; the DB and the commands refuse those streams.
- W6 — G1 Blind: `kyc_completed` repeatable. The command refuses it (`FieldWorkerKycAlreadyCompletedError`, guard 3).
- W7 — G1 Blind: `seedFieldWorker` clobbers the caller's guard. No spec seeds after turning the guard on (grep).
- W8 — G1 Blind: the writer flag is a convention. The 0193 precedent, backed by the AST gate; stated in the migration header.
- W9 — G2 Blind: `post` accepts any district key at either end. Round 1's X3 / C5 / C10; the new half is D7.
- W10 — G2 Blind: register / post trust the caller to check the district is listed. The documented caller contract (round 2's Y3).
- W11 — G2 Blind: the list has no cursor. D1 (13.1a).
- W12 — G2 Blind: the as-of read folds every event on the stream id. Genesis refuses a non-empty stream; ids are UUIDs (Edge G2).
- W13 — G2 Blind: a capture before genesis reads `pending_kyc` v0; a NULL `captured_at`. Contract point 6 (and `acceptsNewAttributions` is false); the NULL is unreachable (no hard delete — Edge G2).
- W14 — G2 Blind: READ COMMITTED is a comment. Documented; no REPEATABLE READ caller exists.
- W15 — G2 Blind: a rollback failure replaces the original error. False — `rollbackToSavepoint` swallows its own failure and the original is rethrown (Edge G2).
- W16 — G2 Blind: the probabilistic stale-move race can pass without the stale case. Its deterministic twin (`commands.spec.ts` QE17) pins the outcome; AC6 says so.
- W17 — G2 Blind: "today" computed once for six rounds. A run crossing IST midnight is accepted by the leg's own bounds; not a product bug.
- W18 — G2 Blind: the direct-write error's message reaches the client. The API maps it to a static 500 text (G3, `errors.ts`).
- W19 — G4 Blind: allowed fixtures could re-export `authorize`. No src file imports a test file (grep); one that did would be its own defect.
- W20 — G4 Blind: `isVerifiedAuthorization` is not act-bound. QE18 (d): the commands re-check key, dimension, Pariwar, actor and target (R2 pinned the key).
- W21 — G4 Blind: a second gate for the same key overwrites the first. One gate per key per route; the hook keeps every key (Edge G4).
- W22 — G4 Blind: the fresh-object test runs without Fastify. QE18 (c) forbids `decorateRequest('authorizations', …)` and none exists (grep).
- W23 — G4 Blind: the gate scans only `packages/domain/src`. House convention for every `*-state-invariant` gate (round 1's X2); the README now says so (R3-27).
- W24 — G4 Blind: `matchingGrantRole` answers change for same-dimension ties. QE18 (b) adds the tie-break by design; the old answer was unordered DB rows (Edge G4).
- W25 — G4 Blind: `catalogVersion` 59 could collide with a sibling's. A sibling that rebases onto this adds a key and its own count / version pins fail until it bumps.
- W26 — G4 Blind: the new CI job may not be a required check. No aggregate job exists; it `needs: install` like its siblings (Edge G4).
- W27 — G4 Blind: two copies of `@twt/domain` would split the WeakSet. No `exports` map, one source entry (Edge G4).

**Resolution of round 3, chunks G2 / G1 / G4 (2026-11-04) — BigDev resolved R3-DN2 with "1" (fence the result ⇒ R3-29) and chose "1 — Apply every patch"; the text
above is the review as written.** R3-11…R3-29 are applied and checked off; D5–D8 and W1–W27 stand. ⚠ **STILL UNCOMMITTED and UNPUSHED**, ⚠ **`ci:local` STILL not re-run**
since `ce80bd64` (owed, on a fresh container). The whole branch has now been reviewed (G1–G4). How each was proved — every RED file restored from a saved copy and `cmp`-checked,
every planted probe deleted; live legs on `twt-131-pg` (`:5470`), `DATABASE_URL` set on the command; DB-free legs with it UNSET (Debug Log (h)):

- **R3-11** — the drift leg reads the stream with NO savepoint (the drift throws before any SQL error); the I10 DELETE leg's "row survived" line is gone (comment says why). Not RED-provable (it
  removes a vacuous assertion).
- **R3-12** — `expectDirectWrite(…, rule)` asserts each rule's own RAISE text (`RULE` map: nine fragments). RED: the writer flag OFF in the version leg ⇒ rule (a) answers ⇒ the leg fails.
- **R3-13** — `state.test.ts` pins QE5's ten arms as a LITERAL list; the "inapplicable" comment corrected. RED: `reactivated → pending_kyc` ⇒ the literal leg (and the full-life fold) fail.
- **R3-14** — a `terminated { from_state: 'active' }` on a `pending_kyc` row (the schema accepts it) ⇒ `FieldWorkerProjectorInputError` "disagree with the locked row", nothing
  appended. RED: the cross-check deleted ⇒ fails.
- **R3-15** — projector-direct legs: `actor: 'system'`, `actorId: null`, `actorId: ''` ⇒ `FieldWorkerProjectorInputError` (QE7), nothing appended; v1.21 carries a dated CORRECTED
  note. RED: the transition's `assertFieldWorkerActor` call deleted ⇒ fails.
- **R3-16** — `events.ts`: `trigger` is `triggerOf(<command>)` (a literal) or `triggerWithReason(<command>, <that event's reason list>)` per type — ⛔ free text; `commands-guards`
  asserts every command's computed trigger; `events.test` refuses free text, another type's value, a cross-list reason, a missing suffix; the `state.test` / `events.test` /
  projector fixtures carry real triggers (the fold PARSES payloads, so `'t'` would now fold to nulls). RED: a typo'd `field_worker.activated` trigger ⇒ the guards leg fails; the
  free-text schema back ⇒ the events leg fails.
- **R3-17** — the AC1 index checks compare the EXACT column list. Green; a strengthened assertion, not RED-proved (it would need a schema change).
- **R3-18** — dated corrections: Debug Log (b) "12" ⇒ 11; I10 and the Completion Notes "every role" ⇒ "every role's DML" (the owner can disable the trigger). ⛔ The `0200` SQL comment —
  the migration is applied on the story DB; the record carries the correction instead (as the finding allowed).
- **R3-19** — Debug Log (a)'s "0 orphans" carries an UN-ATTESTED note, and a new unchecked Task line orders the orphan count on every SHARED DB before `0200` runs there.
- **R3-20** — `FieldWorkerReasonInvalidError` keeps NO value — message and fields carry `received: missing | not_a_string | not_in_the_list` only; `runLockedTransition` takes the trigger as a
  constant OR a function of the guard's (validated) payload, so suspend / terminate build it from `reason_code` after `assertReason`. RED: the raw value back in the message ⇒ the new
  leg (a free-text reason with a name and a number; a BigInt; a null-prototype object — both still the typed error) fails.
- **R3-21** — an OWNER-role leg (`RESET ROLE`): Pariwar A's `activate` / `kyc` on B's worker ⇒ `GenesisMissing`, B untouched. RED: the lock's `AND pariwar_id = $2` deleted ⇒ ONLY this
  leg fails (the old twt_app leg stayed green — the finding, shown).
- **R3-22** — `commands.spec.ts`: the header narrowed to what holds; `expectRefusedCleanly` added to the KYC-twice, KYC-on-active and QE17 refusals; `recordFieldWorkerKycCompleted` added to
  the "ANYTHING out of terminated" loop; the QE18 leg asserts no row; the unit "out of terminated" leg asserts `refused(calls)`. Green.
- **R3-23** — the `_fixtures.ts` banner moved to the helpers it names.
- **R3-24** — AC6 carries a VARIANCE line (the planted-read RED proof).
- **R3-25** — both fences walk `FENCE_ROOTS = apps, packages, scripts, tests` (`.cjs` too); a floor of > 20 files in `scripts/` (the root `tests/` holds only READMEs today — walked, no floor).
  RED: a planted `scripts/zz-r3-fence-probe.ts` calling `rbac.authorize` ⇒ the scan fails; the probe deleted.
- **R3-26** — the `authorize` fence flags an ASSIGNMENT destructuring (renamed, string-keyed, nested) and `Reflect.get` / `Object.getOwnPropertyDescriptor` with the literal; five flag
  legs, two negatives; 90 → 97 legs [⚠ R4-14: `check.test.ts`'s TOTAL after R3-26, not the fence's own describe]. RED: the assignment branch removed ⇒ 3 legs fail.
- **R3-27** — the gate: tables matched through parentheses / `as` / `!` / `satisfies`, import and `const` aliases and split chains; a variable / call / spread payload (and a shorthand or
  string-keyed upsert `set`) is an "unverifiable shape" finding; EVERY function-like node is a boundary (`<anonymous>` for a callback, the key for an object-property arrow); `check.ts`
  FAILS unless each allow-listed projector function is seen writing; `.mts` / `.cts` / `.tsx` scanned; README "What it still cannot see". `lib.test` 28 → 46. The real repo: green, both
  projector writes seen. RED: the HEAD scanner ⇒ 17 of the 18 new legs fail; the projector's UPDATE renamed out of sight ⇒ the gate exits 1 ("did NOT see … write").
- **R3-28** — dated corrections on AC9 (a representative matrix; the `matchingGrantRole` leg by construction), Task 8 and the Completion Notes ("except the version / count pins").
- **R3-29** — `usesRequirePermissionResult`: a call whose value is kept (assigned, returned, passed, awaited into a binding, property-read) or a `.requirePermission` alias is flagged
  outside `check.ts`, the rbac hook and test files; seven flag legs, seven negatives (bare / awaited / void / multi-line statements, the hook factory, an import or comment), and a repo
  scan that SEES the hook as the one keeper and the long-standing guard callers (≥ 5, `validity-service/redaction.ts` named) as droppers. QE18 (e) and `check.ts`'s doc amended (dated).
  RED: a planted `scripts/` file keeping `rbac.requirePermission(…)`'s result ⇒ the scan fails; the probe deleted.

#### Review Findings — round 4: the round-3 FIX DIFF (2026-11-04)

**2026-11-04 — code review of the round-3 patches** (BigDev: "2, then open pr"). The fix diff was ISOLATED exactly: each chunk diff recorded its files as the round-3
layers saw them, so `268d86b5` + `g1`…`g4.diff` reconstructs the reviewed tree, and the fix diff is that tree → the working tree — 24 files, 1,873 lines, +793 / −175
(`scratchpad/13-1-r3/fix-r3.diff`; all four chunk diffs applied cleanly; the 24 files are exactly the ones round 3 touched). Three FRESH read-only layers, `DATABASE_URL`
unset: Blind Hunter (the diff only), Edge Case Hunter (the diff + the repo; probes in its own scratch dir), Acceptance Auditor (the diff + v1.24's round-3 Resolutions as
CLAIMS to falsify). No layer failed. 35 raw → 22 unique; the two Mediums were found independently by two and three layers and REPLAYED by me (`scratchpad/13-1-r3/zalgo.mjs`;
the Edge Hunter's vitest 2.1.9 probe for `mockRestore`). **1 decision-needed, 14 patch, 1 defer, 6 dismissed.** §0: nothing to trustees (an engineering threshold).

**How much to trust this.** The Auditor re-ran the counts (93 name legs, domain 3,839, api 1,119, `check.test` 112, `lib.test` 46, the gate's two seen writers, 11 policy legs) — all
match — and found 21 of the round-3 claims HELD (incl. R3-12's nine fragments against the RAISE texts, R3-21's owner leg not vacuous, R3-16's triggers equal to QE6's list). What did
NOT hold: R3-10 / R3-1's mark rules are bypassed through the five ALLOWED invisibles (R4-2); R3-4's 503 `console.error` sweep cannot fail (R4-1 — a mistake of mine: I read the spy
after restoring it); R3-29's fence misses forms the amended QE18 (e) says both fences catch, and its floor is met by comments (R4-4, R4-5); R3-28 was applied to part of what it named
(R4-12). The rest is the gate's and the fences' remaining static gaps, one latent replay coupling R3-16 introduced (R4-10), and closure wording.

**AI-6-5 checklist families the fix diff touches** (the Auditor's verdicts, confirmed): 1, 2, 3, 4 — covered-by-test. 5 DB backstops — no DB backstop is possible for the name (Tier-1
ciphertext); **REAL GAP in the app-layer rule: R4-2**. 6 projection — covered; **latent: R4-10**. 8 audit / PII — **REAL GAP: R4-1**. 9 deliberate-vs-oversight — **REAL GAP: R4-4**
(and R4-6 … R4-9). 10 closure honesty — **REAL GAP: R4-1, R4-5, R4-12, R4-13, R4-14**. 7, 11, 12, 13 untouched.

- [x] [Review][Decision] **R4-DN1 — How far should the five ALLOWED invisibles (ZWNJ, ZWJ, LRM, RLM, ALM) be constrained?** ⭐ **RESOLVED 2026-11-04 — BigDev: "1" = never first or last, never two in a row ⇒ patch R4-15.** — Blind + Auditor; REPLAYED: `'A'` + 119 × ZWJ (or LRM, or ALM)
  is ACCEPTED — a 120-code-point name that reads "A", sealed for good. Round 2 allowed the five ANYWHERE and any number of times because real names carry them (Indic conjuncts:
  virama + ZWJ / ZWNJ; right-to-left names: a directional mark); a constraint must not refuse those. Engineering (§0 — BigDev's, the R3-DN1 kind). Options in the summary.
- [x] [Review][Patch] **R4-1 (Medium) — R3-4's 503 `console.error` sweep cannot fail: the spy is restored before its calls are read.**
  [`apps/api/tests/integration/field-worker/registration-exhaustion.spec.ts:66-85`] — Blind + Edge + Auditor; PROVED by the Edge Hunter on the repo's vitest 2.1.9 (`mockRestore` → `mockReset` →
  `mock.calls` = []). Mine. And the leg where `console.error` actually FIRES (the flag write rejects, `:97-115`) has no PII sweep at all. Fix: copy the calls inside the `try` before
  `mockRestore`; sweep the flag-fails leg too, with a non-vacuity check that it logged; correct the R3-4 Resolution by a dated note.
- [x] [Review][Patch] **R4-2 (Medium) — The 8-mark cap and the orphan-mark rule are bypassed through the allowed invisibles.**
  [`apps/api/src/modules/field-worker/handlers.ts` (`NAME_ORPHAN_MARK`, `NAME_MARK_RUN_TOO_LONG`)] — Blind + Edge + Auditor; REPLAYED: `'x'` + (7 × U+0301 + ZWJ) × 14 (113 code points, 98 marks,
  ONE grapheme) ACCEPTED; `'Asha '` + ZWJ + U+0301 + `'Rani'` and ZWJ + U+0301 + `'Asha'` ACCEPTED. The rules test raw adjacency; an allowed invisible between marks, or before a mark,
  hides it. Fix: run both mark tests on the name with the five allowed invisibles REMOVED (the intent of R3-10 / R3-1 is unambiguous); legs per bypass; RED against the R3 rule.
- [x] [Review][Patch] **R4-3 (Low) — U+FFFC OBJECT REPLACEMENT CHARACTER still passes — the same "corrupt placeholder" class as the refused U+FFFD.** [`handlers.ts` (`NAME_REFUSED`)] — Edge;
  REPLAYED. Fix: add 0xfffc; a leg.
- [x] [Review][Patch] **R4-4 (Low-Medium) — The `requirePermission`-result fence misses forms the amended QE18 (e) says both fences catch.**
  [`packages/domain/tests/rbac/check.test.ts` (`usesRequirePermissionResult`); this story QE18 (e)] — Blind + Edge + Auditor; probed by all three: NOT flagged — an import alias
  (`import { requirePermission as rp } …; const a = rp(p)`), a bare-identifier alias (`const g = requirePermission`), `.call` / `.apply` / `.bind`, `rbac['requirePermission'](p)`,
  `Reflect.get(rbac, 'requirePermission')`, an assignment destructuring, a shorthand `{ requirePermission }` passed on, `(0, requirePermission)(p)`, a renaming re-export, `export default`.
  QE18 (e)'s amendment says "both fences … recognise an assignment destructuring and a literal `Reflect.get`" — false for the second. Fix: flag a renaming import / export specifier,
  `export default`, ANY bare-identifier reference that is not a discarded call's callee / an import / a declaration, the literal element access, the literal `Reflect.get` /
  `getOwnPropertyDescriptor`, an assignment or binding destructuring keyed `requirePermission`; legs per form; the doc's blind-spot list made true.
- [x] [Review][Patch] **R4-5 (Low) — R3-29's non-vacuity floor is met only by matches inside COMMENTS.** [`check.test.ts` (`callers`, `toBeGreaterThanOrEqual(5)`)] — Blind + Edge + Auditor;
  confirmed: three of the seven "callers" are doc comments; the real guard callers are FOUR (`member-moderation/handlers.ts`, `workplaces/routes.ts`, `rules/index.ts`,
  `validity-service/src/redaction.ts`), below the floor, and a regex cannot show the AST saw a DISCARDED call. Fix: count discarded calls in the AST; pin the four files by name; the
  "six" comment corrected.
- [x] [Review][Patch] **R4-6 (Low) — The `authorize` fence still misses four literal-key forms of R3-26's kind.** [`check.test.ts` (`reachesAuthorize`)] — Blind + Edge: `for ({ authorize: m } of [rbac])`,
  `globalThis.Reflect.get(rbac, 'authorize')`, `Reflect['get'](rbac, 'authorize')`, `Reflect.getOwnPropertyDescriptor(rbac, 'authorize')`. Fix: the for-of / for-in initializer pattern; a
  `Reflect` / `Object` callee reached through `globalThis` or a literal element access; `Reflect.getOwnPropertyDescriptor`; legs.
- [x] [Review][Patch] **R4-7 (Low) — The state gate counts a non-literal COMPUTED key, an accessor or a method member as "clean".** [`scripts/field-worker-state-invariant/lib.ts` (`payloadShape`)] —
  Blind + Edge; probed: `.set({ [k]: 'Gaya' })` and `{ get district() {…} }` ⇒ 0 findings, contradicting the README's "an unreadable payload is a finding". Fix: those members ⇒ "unverifiable"; legs.
- [x] [Review][Patch] **R4-8 (Low) — The gate's alias and split-chain tracking sees only declaration initialisers.** [`lib.ts` (`collectTableNames`, `isTableRef`)] — Blind + Edge; probed: a
  reassignment (`q = db.update(fieldWorkers)`), `let t; t = fieldWorkers`, `const { fieldWorkers: fw } = schema`, `db.update(schema['fieldWorkers'])`, `db.update(fieldWorkers)['set'](…)` ⇒ 0
  findings. Fix: collect from `x = …` assignments and binding patterns keyed `fieldWorkers`; treat a literal element access like a property access (table and method); the README's "still
  cannot see" names what remains (a chain returned by a helper, a dynamic key).
- [x] [Review][Patch] **R4-9 (Low) — The gate's non-vacuity floor is satisfied by ANY allowlisted finding — an "unverifiable" one included.** [`scripts/field-worker-state-invariant/check.ts`] —
  Blind. If the projector's guarded `.set({ … })` became `.set(patch)`, its unverifiable finding would be allow-listed AND count as "seen". Fix: only a READABLE guarded write counts as seen;
  an unverifiable shape inside an allowlisted function is reported, not passed.
- [x] [Review][Patch] **R4-10 (Low, latent) — R3-16 made the I4 fold depend on the exact `trigger` text.** [`packages/domain/src/field-worker/state.ts:143`, `:163`, `:170`] — Blind + Edge + Auditor:
  the fold `safeParse`s the WHOLE write schema, so a stored event whose trigger is not today's exact value folds `district` / `reasonCode` / `endedOn` to null — silently (the fold never
  throws) — while the row keeps the real value: an I4 divergence with no signal, reachable on any future trigger rename. Not reachable today (every producer emits the accepted value).
  Fix: the fold parses with `trigger` OMITTED (the write path stays strict — I8); a leg: an off-text trigger still folds its district / reason / last day.
- [x] [Review][Patch] **R4-11 (Low) — The fences error on a missing root and walk build output.** [`check.test.ts` (both walks)] — Blind: a sparse checkout without root `tests/` throws ENOENT;
  `coverage`, `build`, `.next`, `out` are walked (a bundled copy of `check.ts` would be a false hit). Fix: skip a missing root; skip those directories.
- [x] [Review][Patch] **R4-12 (Low, records) — R3-28 corrected AC9, Task 8 and the Completion Notes but not QE18 Costs, Debug Log (b) or the Dev Notes line it also named.** [this story: QE18
  Costs ("every existing RBAC test passes unchanged, `matching-grant.test.ts` included"), Debug Log (b) ("Every existing RBAC test passes UNCHANGED (202 / 202 …"), Dev Notes ("Every existing
  RBAC and claims test passes unchanged")] — Auditor. Fix: the same dated correction in each.
- [x] [Review][Patch] **R4-13 (Low) — `commands.spec.ts`'s narrowed header still claims more than three legs assert.** [`packages/domain/tests/integration/field-worker/commands.spec.ts` (the QE7 leg; the
  stale-after-move refusal; the two `ended_on` legs)] — Auditor. Fix: `expectRefusedCleanly` in each.
- [x] [Review][Patch] **R4-14 (Nit, comments / records) — five wordings.** `events.ts`'s trigger comment ("exactly its command's value" — a suspend / terminate trigger takes ANY reason of its list; the
  commands bind it to `reason_code`); "fence 97 / 90 → 97" is `check.test.ts`'s total after R3-26, not the fence's legs; R3-1's combined control holds four marks, ALM tested apart; R3-14's premise
  ("refused by the payload schema's literal first") was wrong — the cross-check runs FIRST in `project.ts`, so the old leg reached it (the new leg and its RED still hold); `state.test.ts`'s two
  comments on whether the fold reads payloads (it parses `registered` / `terminated` / `posted`, never `activated`). Fix: dated corrections / reworded comments.
- [x] [Review][Patch] **R4-15 (Low; from R4-DN1, BigDev "1") — An allowed invisible is never the first or last character of the name and never next to another.**
  [`apps/api/src/modules/field-worker/handlers.ts`; `field-worker-name.test.ts`] — after NFC + trim, a name whose first or last code point is one of the five, or that holds two of the five
  in a row, is refused (422 `field_worker.name_invalid`). Every real use sits BETWEEN two other characters (a conjunct joiner between a virama and a letter; a directional mark beside the
  text it steers). QE9 amended a FOURTH time. Tests: `A` + 119 × ZWJ / LRM / ALM, a leading and a trailing mark, two in a row ⇒ refused; the existing real-name controls (`Ra`+ZWNJ+`ni`, Hindi with
  virama + ZWJ, the Arabic ALM name, the combined four-mark name) still accepted; RED-prove.
- [x] [Review][Defer] **D9 — Which names `\p{Cn}` refuses depends on the running Node's ICU, and production's Node is unpinned.** [`apps/api/Dockerfile:6` (`FROM node:22-alpine`, floating);
  `.github/workflows/ci.yml:57` (`node-version: 22.12.0`)] — deferred, infra. Edge: Tolong Siki U+11DB0 (Unicode 17; Kurukh, Jharkhand) is accepted on the local 22.22.2 and `Cn` on an older ICU,
  so one deploy can 201 a name the next 422s. Not 13.1's file; pinning the runtime image is a deployment decision. Written to `deferred-work.md`.

**Dismissed (6):**

- V1 — Blind: `projector-trigger.spec.ts`'s fallback `'field_worker.unknown'` trigger could make a leg pass for the wrong reason. Never used — every leg's type is in the map (Edge).
- V2 — Blind: the `actor: 'system'` projector leg may be answered by the schema. `assertFieldWorkerActor` runs FIRST (`project.ts:296`), before the schema parse (Edge); the leg asserts "QE7".
- V3 — Blind: removing `FieldWorkerReasonInvalidError.reasonCode` breaks consumers. None reads it; the API maps by class (Edge).
- V4 — Blind: the leak test copies only enumerable fields. No non-enumerable carrier exists; a `cause` is D5's.
- V5 — Blind: the gate's alias tables are file-wide, so a shadowed name over-approximates. A false POSITIVE fails loud (Edge).
- V6 — Blind: the strict `trigger` freezes command strings into history. Intended on the WRITE path (I8 — no free text in an append-only stream); the replay half is R4-10.

**Resolution of round 4 (2026-11-04) — BigDev resolved R4-DN1 with "1" (⇒ R4-15) and chose "1 — Apply every patch".** R4-1…R4-15 are applied and checked off; D9 and V1–V6
stand. ⚠ **R4-15 departs from option 1 in ONE place, disclosed:** a FINAL ZWJ right after a virama is allowed — building it showed "never last" would refuse real names (the
legacy encodings of the Malayalam chillu and the Bengali khanda ta end a word with virama + ZWJ); the exception is ten viramas, named. BigDev may overrule. ⚠ A thing of mine
caught TWICE in this round (memory: escapes land raw): typing a real-name example put a RAW U+200C into this story and a RAW U+200D into a test label — both found by the
added-line scan and removed. How each was proved (RED files restored from saved copies and `cmp`-checked; the planted `scripts/coverage/` probe deleted; live on `:5470`):

- **R4-1** — the 503 leg copies `console.error`'s calls BEFORE `mockRestore`; the flag-fails leg (where it fires) is swept, with a non-vacuity check that the flag-failed line was
  captured; the R3-4 Resolution carries a dated CORRECTED note. RED: the handler's flag-failure line made to log the name ⇒ the leg fails.
- **R4-2** — `withoutAllowedInvisibles(name)` is what the orphan and run rules judge. RED: the rules on the raw name ⇒ 4 of the 5 new legs fail (the fifth — a LEADING LRM — is now also
  refused by R4-15).
- **R4-3** — U+FFFC joins `NAME_REFUSED`. RED: removed ⇒ 2 legs.
- **R4-4** — `analyseRequirePermission` replaces the R3-29 visitor: a kept result, a renaming import / re-export, `export default`, any bare reference that is not a discarded callee
  (`.call` / `.apply` / `.bind`, a comma call, a value, a shorthand), a literal element access, a literal `Reflect.get`, a renaming or string-keyed destructuring ⇒ flagged; 15 new flag
  legs, 3 new negatives. QE18 (e) carries a dated CORRECTED note. RED: bare references not judged ⇒ 7 legs.
- **R4-5** — the floor counts DISCARDED calls in the AST and names the four real guard callers; a leg shows a comment counts 0. RED: calls not counted ⇒ 2 legs (incl. the repo scan).
- **R4-6** — `assignmentDestructures` (incl. for-of / for-in) and `isLiteralReflectiveRead` (bare / `globalThis` / `window` / `self`, `.get` or `['get']`, `getOwnPropertyDescriptor`)
  are shared by both fences; 4 new legs. RED: no for-of form ⇒ 1.
- **R4-7** — a non-literal computed key, an accessor or a method member ⇒ "unverifiable"; literal computed keys stay readable (a control).
- **R4-8** — aliases and chains from plain assignments and from binding patterns keyed `fieldWorkers`; a literal element access for the table and for the method. The README's "still
  cannot see" names a helper-built chain, a dynamic key and per-file (⛔ per-scope) tracking. R4-7 + R4-8 RED: the round-3 scanner ⇒ 9 of the 9 new legs fail (`lib.test` 46 → 55).
- **R4-9** — an "unverifiable" write inside an allow-listed function is REPORTED and does not count as seen. Shown on the real tree: an unverifiable `.set(patchProbe)` planted in
  `projectFieldWorkerTransition` ⇒ the gate exits 1; with R4-9 reverted the same plant PASSES (the old gate waved it through).
- **R4-10** — the fold reads only `district` / `reason_code` + `ended_on` / `to_district` (`Fold*Schema`), ⛔ the write schemas; a leg folds a stream whose triggers were "renamed later".
  RED: the trigger re-coupled into the fold's posted read ⇒ the leg fails.
- **R4-11** — one `walkFenceTrees` for both fences: an absent root is skipped, `coverage` / `build` / `.next` / `out` are not walked. RED: a probe in `scripts/coverage/` is skipped
  (green); with `coverage` walked ⇒ the scan fails; the probe deleted.
- **R4-12** — QE18 Costs, Debug Log (b) and the Dev Notes line carry the same dated correction as R3-28's.
- **R4-13** — `expectRefusedCleanly` in the QE7 leg, the stale-after-move refusal and both `ended_on` legs. Green.
- **R4-14** — the `events.ts` trigger comment (any reason of the list; the fold ignores it), "90 → 97" labelled as the file total, R3-14's premise corrected, the state.test comments.
- **R4-15** — `misplacedAllowedInvisible`: never first, never last (but a ZWJ after a virama), never two in a row; the combined control's RLM moved inside; 8 refusal legs and three
  real-name controls (a Hindi conjunct, a Malayalam name ending in a legacy chillu, a Bengali legacy khanda ta). QE9 amended a FOURTH time. RED: no placement rule ⇒ 8 legs; no virama
  allowance ⇒ the 2 legacy controls.

## Dev Notes

### Current state (what exists, what this story changes, what it must preserve)

- **`field_worker_attribution_codes` and the door (13.2)** — gain one FK; the door file is NOT edited (its export list is pinned to
  eleven names; the route imports it). The reach fence's ALLOWED list does not change (a door importer under `apps/api/src` is exempt).
  Stale "no FK yet" comments in `schema/field_worker_attribution_codes.ts` and `ids/index.ts` are updated (comment-only; the exports pin
  must stay green; `attribution-code/index.ts` carries no such comment). The door's own header comment ("no route uses it yet") is
  LEFT stale — the door file is not edited; say so in the Debug Log. The Drizzle table also gains the composite `foreignKey()`
  (Task 2.1) so the schema file and the database agree.
- **`member_attribution` and its writer (3.6b)** — READ-ONLY here. The Reference Code stays an unvalidated capture; 13.8 wires the
  lookup into signup.
- **`rbac/roles.ts` `field_worker`** — stays `permissions: []`, `scopeCeiling: 'self'`.
- **`requireMemberSession` / `scopeResolutionHook` / `requestContextHook`** — unchanged; the 13.2 writer pin only reads them.
- **`events_log`** — gains seven event types (the epic's six plus `field_worker.posted`) and no index.
- **The RBAC core** (`rbac/check.ts`, `rbac/matching-grant.ts`, `apps/api/src/modules/rbac/index.ts`) — gains `authorizingGrant`,
  `authorize` and the stored result; `hasPermission`, `requirePermission`'s throw and `checkPermission` are PRESERVED, and
  `matchingGrantRole`'s answers are preserved wherever exactly one grant per dimension holds the key — a same-dimension tie,
  previously resolved by `role_grants` heap order (`loadActorGrants` has no `ORDER BY`), is now deterministic (role, value, id).
  Every existing RBAC and claims test passes unchanged (none ties within one dimension) [⚠ CORRECTED by review round 4, R4-12: except Task 8's version / count pins and one added `roles.test.ts` assertion].
- **`apps/api/src/modules/field-worker/`** — gains routes beside the door.

### ⚠ Traps (TR)

- **TR1 — the same-state legal event.** `kyc_completed` is `pending_kyc → pending_kyc`. A projector that rejects `toState === fromState`
  makes it illegal (12.1 TR1); legality is `nextFieldWorkerState(...) !== null`.
- **TR2 — the FK add scans 13.2's table.** A plain `ADD CONSTRAINT … FOREIGN KEY` validates existing rows. CI and production have none
  (nothing is live); a developer database that ever ran `allocate-concurrency.spec.ts` to a crash holds orphans, and the migration fails
  with 23503. Check at Task 0.1; clear orphans under `session_replication_role = 'replica'`; do NOT edit the migration afterwards
  ([[project_live_db_test_gotchas]] — never regenerate or edit an applied migration). ⚠ Apply this migration ONLY to the story's OWN
  container until it is merged — never `db:migrate` it on the shared `:5432` / `:5433`: 13.2's UNREPAIRED specs in every other
  worktree (and on `main`) seed codes for random worker ids and would then fail 23503 there
  ([[project_sibling_migration_when_order_shared_db]]). After the merge, sibling branches pick up the repaired specs by rebasing.
- **TR3 — the reach fence reads identifiers and strings.** It is a TypeScript-AST scan, so COMMENTS never match. It matches the
  registry's table, schema and function names as whole identifiers OR as string / template text in any `.ts` under `apps/*/src` and
  `packages/*/src`. A constant or string in the new schema that spells `field_worker_attribution_codes` can turn CI red. A response
  key named `attributionCode` is also fatal — use `code`. AT9: a file that imports the door and contains the identifier or string
  `generate` anywhere fails — keep the word out of the route, handlers and errors files. Run
  `apps/api/tests/unit/attribution-code-reach-fence.test.ts` after writing the schema and the route.
- **TR4 — encrypt BEFORE the writer.** Domain commands receive ciphertext and a blind index as opaque strings; if the route lets a
  plaintext name reach `auditIntent`, an error message or a log, I8 is broken. Hash the intent payload from a shape that omits both.
- **TR5 — every HMAC writes a system audit row.** One mobile HMAC per request is fine; a bulk import must use `blindIndexMany`.
  The encrypts fire an `encryptDek` KMS audit line too, all fire-and-forget on the service pool: one registration emits three KMS
  lines (two encrypts + one HMAC) carrying field class and Pariwar only — never plaintext — and they arrive ASYNCHRONOUSLY, so a
  test must not assert audit-row COUNTS per request.
- **TR6 — a made-up worker id no longer works.** Any test in the repo that inserts into `field_worker_attribution_codes` needs a real
  `field_workers` row first (G4). Search the whole tree: `grep -rn "field_worker_attribution_codes\|allocateAttributionCode" packages apps`.
- **TR7 — the hook's read transaction.** `scopeResolutionHook` opens a READ tx; the write path must release it before `openScopeTx`
  (`releaseHookTx`), exactly as 12.2 does, or the compensating audit and the commit interleave wrongly.
- **TR8 — the idempotency key is global.** Namespace it by Pariwar and actor, as 12.2's `namespace(pariwarId, actorId)` does.
- **TR9 — a rolled-back registration must also roll back the idempotency claim.** `withIdempotency` releases the key on failure; do
  not record a failed (503) response as the replayable result.
- **TR10 — the clock.** Three stamps, two clock domains (AC10 (8)): `events_log.occurred_at` and `member_attribution.captured_at` are
  `now()` (the transaction START); 13.2's `allocated_at` is `clock_timestamp()`. Inside ONE test transaction `now()` is constant, so
  two events — or an event and a capture — written there carry the SAME stamp: an ordering spec must COMMIT in separate
  transactions (own pool, like `read.spec.ts` RV1) and read the real stamps back as `::text`, or seed explicit `occurred_at`
  literals as the OWNER role. A JS `Date` keeps milliseconds only, so never take an instant through one; the twin's 5 ms `pad()`
  exists only because its `at` IS a `Date` — this story's instant is always a capture's `captured_at`, compared in SQL, so it
  needs none (13.2 TR10 / TR11).
- **TR11 — a lost 201 loses the worker's id, not a code (QE22).** The 201 carries `field_worker_id` and nothing secret. 12.2's accepted
  residual still applies: an ambiguous COMMIT, or a `recordResult` failure after COMMIT, RELEASES the idempotency key, and the retry
  mints a new id and meets the duplicate-mobile pre-check — 409. The registered worker exists (`pending_kyc`), but until Story
  13.1a's list of workers awaiting approval exists nobody can find it to approve it. A retried registration after an exhaustion also
  writes a second flag (13.2 D3). Accepted residual, homed in Story 13.1a.

- **TR12 — a district gate is only as good as its target value.** This route's gate target is the BODY's `district` (QE9):
  `resolveValue` is synchronous and fail-closed (`null` denies); a District Admin's grant matches by EXACT bytes (`'Patna'` covers
  `'Patna'`, not `'patna'` or `'Patna '`); a Pariwar Admin's grant covers ANY string it is given — so the listed-district 422 (QE17) is
  the only data-quality guard, and the caller must send the spelling from the list. A seeded grant that authorizes no one is the
  recurring failure of district-gated work (`check.test.ts` pins it), so AC9 demands a POSITIVE leg for each holder. Suspend,
  reactivate and terminate gate on the worker's STORED district, never on a request value; a move gates on EITHER end of it (the
  destination or the stored district — AC5, `-442` Supersedes). Never normalise the body's `district` before the gate (QE9).

- **TR13 — the authorization result belongs to the CHECK, not the handler.** The permission checks return a boolean, `void` or
  `{ ok }` — never a grant — but the repo ALREADY answers "which grant authorized": `rbac.matchingGrantRole` (Story 6.19b, `-270`;
  pinned by `tests/rbac/matching-grant.test.ts`; six callers in `apps/api/src/modules/claims/`) re-asks `hasPermission` one grant at
  a time, most specific scope first, `global` last. Do NOT write a second rule: the shared pure `authorizingGrant` uses that order (adding only a
  same-dimension tie-break), `hasPermission` shares its predicate, `authorize` wraps it with the actor, and `matchingGrantRole` is
  re-pointed to it — one answer everywhere. A handler that recomputes the role from `request.scopeGrants` can disagree with the gate (a different
  resolver, a different order) and would write a FALSE record into an append-only log. Pass the stashed `request.authorizations[key]`.
  The snapshot records the role and grant that passed, NOT the role's permission list then in force (bundles are editable, FR-44),
  and a `grant_id` may point at a row later deleted — the tuple is the record. The audit line's `actorRole` (null in most handlers) is
  a second place a role is recorded: where it is set it comes from `authorization.role`, never a second computation.

- **TR14 — the new FK makes `field_workers` the PARENT of an append-only child.** Any owner-role `TRUNCATE field_workers CASCADE`
  (a test leg, a cleanup) locks parent then child, while 13.2's specs in parallel forks insert into the child and then take the
  parent through the FK check — a deadlock on every full domain run ([[project_fk_truncate_cascade_deadlock]]). Lock the whole FK
  set first with `lockTruncateSetNowait` (`tests/integration/_helpers.ts`) — AC7 — and grep the tests for any other
  `TRUNCATE field_workers` before pushing.

- **TR15 — a reused `Idempotency-Key` with a DIFFERENT body registers nothing.** `withIdempotency` stores no request fingerprint
  (`idempotency/keyed-store.ts`), so a key re-sent with another worker's name and mobile replays the FIRST 201, and — the 201
  carrying no name (QE22) — the admin cannot see it. Accepted residual, as in 12.2 (a body fingerprint cannot be a plain hash: a
  SHA-256 of a 10-digit mobile can be brute-forced). Homed in Story 13.1a: its screen MUST mint one key per submission (never per
  form-open) and show the returned `field_worker_id` (C9).

### Carried to sibling stories (C) — written to `deferred-work.md` and under each sibling in `epics.md` by this create-story pass. ⭐ Build NONE of these.

- **C1 → 13.3 (the worker's own surface).** The worker's login principal (a `users` row + a `role_grants` row — no route creates either
  today; ARCH §2.3's email + password + passkey for a part-time seller on a mid-range phone is worth a look), the `field_worker_self`
  scope resolver (the `self` branch in `rbac/scope.ts` has "zero live consumers" and says to raise it WITH a live requirement — this
  is it), and the worker's own-read permission key (B(3)-literal). *Inference, not fact:* the grant's `scope_value` can carry the
  `field_worker_id`, so no `user_id` column is needed on `field_workers`. 13.3 also owns "tell the worker the code only after
  activation" in its runbook (QE11's mitigation).
- **C2 → 13.8 (the first signup consumer).** Apply FR-85 with `fieldWorker.acceptsNewAttributions` against the worker's state, and
  `getFieldWorkerStateAt(…, { captureId })` when resolving a stored capture (in SQL, never a JS `Date`; `asOf` is `{ captureId } |
  'now'` only — no `{ instant }` arm, 13.2 AT4 (c)); a transition counts from the moment its transaction BEGAN, at both edges (AC10
  (8)); a not-credited code must not block or delay a signup.
  Whether and how a member is told a code was not credited is a PANEL question (it discloses a third person's status — template §0),
  raised by 13.8; a known-but-not-credited code must NOT reuse Story 3.6's unknown-code rejection copy ("Please ask your introducer
  for the correct code or skip"), because that delays the member — send nothing, or neutral wording. For 13.5's backfill (named in
  its block too): state-as-of-capture AND code-as-of-capture are two separate checks.
- **C3 → 13.5 (commission).** What "KYC complete" requires of a WORKER for payout (PAN, bank, TDS §194H); a payee-profile table, its
  tier and retention (ARCH §2.12 names the row, the matrix is outside the repo); the basis (Q-3); what a suspension / termination does
  to money already earned (§0 edge 6 — the Panel's). *Observations for its create-story:* its AC cites events `kyc.completed` and
  `vyawastha_shulk.paid`, which do not exist (the real ones are `member.kyc_completed` and a `member.vyawastha_shulk_*` family); Story
  5.1's alert primitive requires a `member_id`, so a worker statement cannot be sent through it as written.
- **C4 → 13.6 (anti-fraud and termination).** There is no worker-scoped moderation pipeline (10.10 is member-scoped); whether
  termination is reversible, and who hears an appeal, BEFORE any termination route exists; growth of the reason vocabulary; whether
  re-registration of a terminated worker's mobile should be SHOWN to the registering admin (information, not a block — a cross-Pariwar
  block is a trustee decision). I7 means a heuristic cannot author a suspension or termination through this primitive.
- **C5 → Story 13.1c (the routes and the log's read); the 8-year removal has NO row yet.** The lifecycle routes other than
  approval (activate + KYC, and the register screen, are 13.1a's — C9): suspend, reactivate, terminate, a Pariwar Admin's DIRECT move
  (ONE per-act key held by `pariwar_admin` only; either reason; the gate's target either end), list/detail reads (a PII-tier
  decrypt-on-read decision), each with its own per-act key (a `-059` B(3) field-worker permission — to the Panel with this work,
  `-441`); the move key's commit makes `postFieldWorker` REFUSE every key outside the move-key list, `field_worker.register` included
  (QE17); the stale-authorization 409 `field_worker.authorization_stale` is surfaced here; the erasure path — the 8-YEAR REMOVAL the recruitment form promises (BigDev, 2026-11-03: name and mobile are kept while the person is
  employed and removed 8 years after the date of termination): an anonymize command for TERMINATED workers only, scrubbing
  `name_ciphertext`, `mobile_ciphertext` and `mobile_blind_index` (a tombstone, unique per row for the NOT NULL index) while the row,
  the code, the introductions and the whole log stay (the log carries no name or mobile — I8, I15); a later migration must `CREATE OR
  REPLACE` the guard function to admit that scrub under its own writer variable
  ([[project_append_only_guard_names_erasure_columns]]); terminated rows sit outside the partial unique index, so a scrubbed row cannot
  collide; the clock starts at the date of termination (QE20) and the first removal is 8 years after the first termination,
  so nothing is due at go-live — but the obligation must have an owner before then,
  and profile correction (QE15). ⚠ Build NO terminate route before 13.6 records C4 — reversibility and appeal (suspend and
  reactivate may ship first). The owner must also give "activate" a production path before go-live (Task 0.4 (h)). Per the Panel
  (`-441`): the District Admin is the intended MANAGER of field workers with the Pariwar Admin filling in — so gate every such route on
  the worker's STORED district (QE17), mint a key per act, carry the `authorization` snapshot (QE18) on the other five events, each from the gate's verified result, and give the full
  log a READ (I15). The MOVE splits: a Pariwar Admin's DIRECT move (either reason) is 13.1c's; the District-Admin-to-District-Admin REQUEST
  and its accept / refuse, and every notice, are Story 13.1d's (C10).
- **C6 → 13.4.** The dashboard reads workers through the domain accessor; per-worker identity is operator-tier; the 13.2 flag list (its
  C3 / D3) is rendered there with `actor_display`.
- **C7 → the first go-live.** The roster row's legs (Task 0.4 (a)–(i)): (a) and (d) are MET by `-441` (the Panel's ruling on the key and its
  confirm of Q-5); also MET — (b) Q-3's footing and notice (BigDev: the form states the purposes and records the agreement) and (c) Q-4's hand-issued-codes premise (No); retention is CONFIRMED from the form; still open — the erasure path, the contractor classification, a production path to `activated` (Story 13.1a), and (i) the Panel's confirm of each key 13.1a / 13.1c / 13.1d mint.
  Also tell 14.3: its breach-readiness story (branch `story/14-3-dpo-breach-reporting-operational-readiness` — re-check when it lands)
  keeps a list of people-holding tables (nominees, known people, claim contacts, workplace requests); `field_workers` is one it does
  not name.
- **C8 → 13.3 and the Epic 6 ground-inspection dispatch owner (G17).** A field worker also visits claimants. (a)
  `acceptsNewAttributions` is the CREDITING predicate only; dispatch needs its own predicate, and this story's lifecycle state
  revokes nothing and gates no dispatch until 13.3 wires it. (b) 13.3 decides whether a worker sees their own state and reason
  code. (c) A worker's DISTRICT is now on the row (QE17, from the Panel's ruling `-441`); a block or anything finer is NOT, and
  I2 makes any later column immutable by default — adding one means `CREATE OR REPLACE` of the guard function (the C5 note).
  13.4's "field workers by Pariwar/district" can read `district` from the row. Mirrored under 13.3 and 13.4 in `epics.md`.

- **C9 → Stories 13.1a (approval, code read, screens — the register screen included) and 13.1b (the SMS) — onboarding completion.** BigDev's process (2026-11-03): the District Admin
  REGISTERS, the Pariwar Admin APPROVES (the Pariwar Admin does both "if District Admin is not available" — the system can detect
  only that no District Admin holds the district, Q-8); the worker's code goes to
  them BY SMS once they are in the system; if they did not get it, a District Admin (own district) or a Pariwar Admin gives it BY HAND
  on the worker's request. Needed: (a) the approval route (QE21, Q-9); (b) an audited code-read route for the by-hand case — the
  door's `readAttributionCodeForRequest`, a per-act key for the District Admin (own district) and the Pariwar Admin, one audit line
  per read; (c) the SMS — traced 2026-11-03: the platform sends SMS for step-up and handover OTPs, but has NO sender for a non-member
  recipient and NO template for a code message, and DLT delivers only approved text, so a new template must be registered and
  approved first (a long-lead item — start it now); the worker's number is Tier-1 ciphertext, so sending needs a purpose-limited,
  audited decrypt (13.1's AC10 forbids any decrypt here), the send happens AFTER the approval commits and never rolls it back, and
  the sender must not log the mobile (I8); (d) the screens. The by-hand path is already sanctioned, so the SMS is NOT on the critical
  path to go-live. QE22 (APPROVED) withholds the code from the registration response, so 13.1a's read is the ONLY way any admin sees it.
  (e) The screen mints ONE `Idempotency-Key` per submission, never per form-open, and shows the returned `field_worker_id` (TR15);
  it also gives the lost-201 worker a way to be found (TR11). Each key 13.1a mints is a `-059` B(3) field-worker permission — to
  the Panel with this work (`-441`).
- **C10 → Story 13.1d (the move request, the refusal reasons and the notices).** BigDev's rule (2026-11-03): a worker's reporting
  district changes by CONSENT — a District Admin at either end OPENS a request at the worker's request, the other ACCEPTS or REFUSES it
  with a reason from a fixed list (never free text; suggested `no_capacity`, `work_not_needed_here`, `request_incomplete`, `other`);
  the worker stays put until it is accepted; the opener may withdraw; unanswered for 7 days ⇒ escalated to the Pariwar Admin, NEVER
  accepted by default; a Pariwar Admin's direct move (13.1c) ends any pending request. The acceptance calls THIS story's
  `postFieldWorker` in the same transaction, under the accepting District Admin's verified authorization (target: either end, AC5),
  and fails cleanly if the worker has been moved meanwhile (`FieldWorkerAuthorizationStaleError`, 409). Its open / answer keys are
  `-059` B(3) field-worker permissions (to the Panel with this work, `-441`), and whichever of 13.1c / 13.1d mints a move key first
  makes `postFieldWorker` refuse every key outside the move-key list (QE17). The notices go by email AND in-app and are CONSUMERS of the events, so
  they cover a Pariwar Admin's direct move too — see QE17 for the trace (neither channel exists for District Admins today). Needs
  this story landed; independent of 13.1c.
- **C11 → NO ROW YET (BigDev, 2026-11-03: carry it, no row) — the link between one person's records in two Pariwars.** The Panel
  ruled Q-7 C (`-443`): a worker who moves to another Pariwar is a new registration there NOW (QE19, the build default here), plus a link
  between the person's records LATER — "a later piece of work and a later decision about what may be shared between Pariwars". Not
  decided: when it is built and who builds it (BigDev's scheduling), what it joins — a person, a PAN (13.5), a mobile (the mobile index is keyed per Pariwar,
  so two Pariwars cannot match the same person today) — and what one Pariwar may see of another's record; the sharing question
  returns to the Panel with that work. Likely first need: Story 13.5's one commission statement across Pariwars (it pays by PAN).
  13.1 builds no link and nothing that forecloses one: a `field_worker_id` is never reused, and a terminated or moved-away
  registration is kept, not deleted (I10, I15 — the row and its id; the name and mobile are still removed 8 years after termination,
  C5). Written "13.1 C11" in cross-file citations (`deferred-work.md` already holds a C11 of Story 12.1's). Mirrored under 13.1 and 13.5 in `epics.md` and in `deferred-work.md`.

### Testing standards

- Unit: `packages/domain/tests/**/*.test.ts`. Live-DB: `packages/domain/tests/integration/**/*.spec.ts`, self-skipping on `!hasDatabase`,
  per-test rolled-back transaction (`setupLiveDb`); `SET LOCAL ROLE twt_app` (`enterAppScope`) before asserting policy behaviour.
  API: `apps/api/tests/integration/`. Prefix EVERY `ci:local` and `git push` with the story's `DATABASE_URL` port (the shell default is
  `:5432`, [[project_prepush_hook_inherits_5432]]) and use a FRESH container for the push gate ([[project_known_livedb_test_failures]]).
- Twin specs to copy: `tests/integration/marketplace/{commands,projector-trigger,module-stream-concurrency,read}.spec.ts` and
  `_fixtures.ts`, `tests/integration/rls/marketplace-modules-policy-regression.spec.ts`, and for the API leg
  `apps/api/tests/integration/marketplace-admin.spec.ts`. ⚠ The registration route COMMITS inside `mutate`, so EVERY 201 leg commits
  append-only rows (`events_log`, the code, audit lines) to the shared DB: use a fresh `randomUUID()` Pariwar per test, assert by your
  own ids (never by counts), and clean up in `afterAll` under `session_replication_role = 'replica'` in this order — codes, then
  `attribution_code_allocation_flags` (the exhaustion leg), then `field_workers`, then `events_log`, then `admin_sessions`,
  `role_grants` and the test `users`, then the seeded listed district (`workplace_districts` / `geo_tree_versions`, which AC8's
  listed-district legs need) — as `marketplace-admin.spec.ts` does (13.2 TR12). A committed `field_workers` seed
  in `allocate-concurrency.spec.ts` is an OWNER-role INSERT under the writer var, ⛔ the projector (a projector call would append to
  `events_log`, which cannot be cleaned without replica mode either — keep the two seeds separate and say which one a leg uses).
- Every guard gets a RED proof; every scan a non-vacuity floor; assertions after a savepoint rollback must assert the reason AND a
  control ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]). A test that names a copy key calls the real `t()`.

### Project Structure Notes

- New: `packages/domain/src/field-worker/{index,events,state,project,commands,read,errors}.ts`; `schema/field_workers.ts`;
  `policies/field-workers-rls.ts`; `migrations/NNNN_field-workers.sql`; `packages/contracts/src/field-workers/`;
  `apps/api/src/modules/field-worker/{routes,handlers,errors,index}.ts`; `scripts/field-worker-state-invariant/`; tests as in Task 11.
  Also new: `apps/api/src/modules/field-worker/field-worker-crypto.ts` (Task 1); `packages/events/tests/field-worker-registry-coverage.test.ts`;
  `apps/api/tests/unit/{field-worker-errors,rbac-hook-authorizations}.test.ts`; `apps/api/tests/integration/_field-worker-fixture.ts`.
- Modified: `packages/domain/src/{index,encryption/field-classes,encryption/index}.ts`; `schema/index.ts`; `policies/index.ts`;
  `migrations/meta/_journal.json`; `packages/events/src/registry.ts`; `packages/domain/src/rbac/{check,permissions,roles,matching-grant}.ts`
  (+ `packages/domain/tests/rbac/{check,permissions,roles}.test.ts`); `apps/api/src/modules/rbac/index.ts` (`requirePermissionHook`,
  `loadActorGrants` / `loadGlobalActorGrants` select `id`); `apps/api/src/types.ts` (`request.authorizations`); `apps/api/src/context.ts`
  (the field-class re-exports); `packages/domain/src/schema/field_worker_attribution_codes.ts` (the `foreignKey()` + comment);
  `packages/domain/src/ids/index.ts` (comment); `apps/api/src/server.ts`;
  `package.json`; `scripts/ci-local.sh`; `.github/workflows/ci.yml`; `scripts/access-wrapper-invariants/{check.ts,README.md}`;
  `docs/access-wrapper-invariants.md`; `packages/contracts/scripts/emit-openapi.ts` and `openapi/v1.yaml` (generated); `packages/contracts/src/index.ts` (the
  barrel) and a sync-guard test under `packages/contracts/tests/`; the 13.2 specs in G4; comment-only edits in two 13.2 files
  (`schema/field_worker_attribution_codes.ts`, `ids/index.ts`); `docs/launch-gate-inventory/inventory-roster.md` (Task 0.4); `sprint-status.yaml`.
- Variance from the epic, with reason: no `attribution_code` column (13.2 AT2); event spelling `kyc_completed` (G8); no package (QE1);
  a registration route the epic's `[PRIMITIVE]` label does not mention (13.2 C1); a seventh event `field_worker.posted` and a
  projected REPORTING `district` (QE17); a projected `ended_on` (QE20); an `authorization` snapshot in the genesis and `posted`
  payloads (QE18); `state` named `current_state`.

### References

- `_bmad-output/planning-artifacts/epics.md` — Epic 13 (summary + body), Stories 13.1 (incl. the INHERITED block), 13.2, 13.3, 13.5, 13.6, 13.8;
  Story 3.6; Story 12.1 / 12.2 for the twin.
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` — §2.4, §4.12, §4.14 (statutory), FR-53, FR-81–FR-87.
- `_bmad-output/planning-artifacts/architecture.md` — §2.3 (admin auth), §2.7 (tiers), §2.12 (retention), §4.1 (field-worker surface), event naming.
- `_bmad-output/implementation-artifacts/13-2-6-digit-attribution-code-generation-per-pariwar.md` (AT1–AT10, C1–C7, TR1–TR14) and
  `12-1-module-manifest-schema-module-lifecycle-state-machine.md` / `12-2-admin-module-targeting-wizard.md` (the twin and the route template).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`.
- `.decision-log.md` — `2026-11-03-441` (the Panel's ruling); `2026-11-03-442` (this story's author-commit); `2026-11-03-443`
  (the Panel's ruling on Q-6…Q-9); `2026-06-21-059`
  amendment B(3); `2026-09-08-210` cl.2; `2026-11-01-433` QE2; `2026-10-30-421` QE6 / QE14; `2026-10-30-422` Consequence 1;
  `2026-11-01-438` DL6; `2026-08-13-105` D4; `2026-09-29-270` (`matchingGrantRole`).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-03-story-13-1-field-worker-key-and-credit.md` (SENT, ruled) and
  `…-moving-workers-and-fill-in.md` (SENT, ruled — `-443`); `counsel-question-2026-11-03-field-worker-data-basis.md` (DRAFT, not sent).
- Code: `apps/api/src/modules/field-worker/attribution-code-access.ts`; `apps/api/tests/unit/attribution-code-reach-fence.test.ts`;
  `packages/domain/src/attribution-code/`; `packages/domain/src/marketplace/`; `apps/api/src/modules/marketplace/{routes,handlers}.ts`;
  `packages/domain/src/rbac/{check,matching-grant,scope}.ts`; `apps/api/src/modules/rbac/index.ts`;
  `packages/domain/tests/integration/_helpers.ts` (`lockTruncateSetNowait`);
  `packages/domain/src/encryption/{field-classes,member-fields,blind-index}.ts`; `packages/domain/src/schema/{users,role_grants,
  member_identities,member_kyc_profiles}.ts`; `scripts/provision-admin.ts`; `scripts/marketplace-module-state-invariant/`;
  `packages/events/src/registry.ts`; `packages/domain/migrations/{0178,0189,0193,0199}_*.sql`.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`) via `bmad-dev-story 13.1`, 2026-11-03; one sub-agent (the six 13.2 spec repairs, Task 10 (1)), reviewed.

### Debug Log References

**(a) Task 0.1 — re-verification, 2026-11-03, BEFORE any code (`bmad-dev-story 13.1`, worktree at `3cff2d4c`).**
- `git fetch origin`: `origin/main` = `268d86b5` = this branch's merge-base ⇒ no rebase needed.
- NUMBERS, every ref + every worktree: migrations — main's highest `0199` (journal idx 199, `when` 1796787600044); `story/6-22b-…`
  holds 0195–0198 (renumbers on rebase), `14-3` / `6-39` hold nothing ≥ 0193 in their trees ⇒ this story takes **`0200`**, `when`
  **`1796874000045`**. Decisions — main `-439`, `6-22b` `-440`, this branch `-441`…`-444` ⇒ any new entry ≥ `-445` (none is
  written). `PERMISSION_CATALOG_VERSION` — main 58, `6-22b` 58, `14-3` / `6-39` 56 ⇒ **58 → 59**. ADR — none proposed. Roster —
  highest Row 47 on main and every branch, Row 46 reserved (6.39 / 14.3) ⇒ **Row 48**. Ledger — `2026-11-03a…g` on main,
  `h…k` on this branch only, no other ref or worktree holds a `2026-11-03*` letter ⇒ the completion entry is **`2026-11-03l`**.
- G2 (the 13.2 module, the door, `FieldWorkerId` in `ids/index.ts`), G3 (eleven door exports — five wrappers + six classes), G4
  (the 13.2 spec list — plus two unit files that only name the module, `tests/attribution-code/{types,exports}.test.ts`, and
  `wa-opt-in-codes.spec.ts` which matches only on `seedCode`, unrelated), G5 (`identity_type` = `['admin']`; `field_worker` bundle
  `permissions: []`), G7 (no `kyc_status` anywhere — only `api-client`'s `kycStatus()`), G8 (93 registry entries; the domain
  import line unchanged) — all RE-VERIFIED. `requirePermissionHook(` = 132 calls in 62 files; `hasPermission(` = 29 calls outside
  `rbac/` — unchanged from the story.
- The four decision entries (`-441`…`-444`) are on this branch, unchanged since their commits; no later entry touches field
  workers ⇒ NO recorded answer has changed; no STOP.
- Story DB: own container `twt-131-pg` (`postgres:16-alpine`, `:5470`, database named `twt_dev`), `pnpm db:migrate` to 0199.
  `SELECT count(*) FROM field_worker_attribution_codes` ⇒ **0** (no orphans — TR2 clear) [⚠ CORRECTED by review round 3, R3-19: measured on a
  container JUST created and migrated to 0199, which cannot hold an orphan — this proves nothing about TR2's real exposure, a SHARED developer DB that
  ever ran `allocate-concurrency.spec.ts` to a crash. UN-ATTESTED; carried as the Task line "count orphans on each shared DB before `0200`"]. `events_log` actor columns ⇒ `actor_id`
  only (no `actor` column) ⇒ the actor KIND is a payload key; no `events_log` change.
- Task 0.4: **Row 48 `field-worker-registration-live`** appended to `docs/launch-gate-inventory/inventory-roster.md` (owner "Trustee
  Panel (gate); counsel (Story 0.13)"; legs (a)–(i): (a), (b), (c), (d) MET; (e) partly — the matrix owner not yet told; (f), (g),
  (h), (i) OPEN; (h)'s owner row `13-1a`).

**(b) Tasks 1, 2, 8 and 10 (1) — 2026-11-03, on `:5470`.**
- Task 1: `FIELD_WORKER_FIELD_CLASS` / `FIELD_WORKER_MOBILE_FIELD_CLASS` in `encryption/field-classes.ts` (+ index, + `context.ts`
  re-exports); `apps/api/src/modules/field-worker/field-worker-crypto.ts`. RED: `fieldWorkerMobileIndex` pointed at
  `mobileBlindIndex` (the member login hash) ⇒ 2 of 4 `field-worker-crypto.test.ts` legs fail; reverted ⇒ 4 / 4.
- Task 2: `schema/field_workers.ts`, `policies/field-workers-rls.ts`, migration `0200_field-workers.sql` (journal idx 200,
  `when` 1796874000045), the Drizzle `foreignKey()` on `schema/field_worker_attribution_codes.ts`, comment-only edits in
  `ids/index.ts`. Applied to the story DB only (TR2). Specs: `rls/field-workers-policy-regression.spec.ts` (AC1, 12 [⚠ CORRECTED by review round 3, R3-18: 11 — the file has one commit and never had 12]),
  `field-worker/schema-trigger.spec.ts` (AC2, 15), `field-worker/composite-fk.spec.ts` (AC7, 7). RED (the guard function
  `CREATE OR REPLACE`d on `:5470` without the rule, then restored from the migration text): without (t) ⇒ the I6 leg fails;
  without (e′) ⇒ the district-coincidence leg fails; restored ⇒ 15 / 15. AC7's recorded SQLSTATEs: owner DELETE ⇒ P0001
  (the row trigger fires before the FK is asked); plain owner TRUNCATE ⇒ 0A000; `TRUNCATE … CASCADE` after
  `lockTruncateSetNowait` ⇒ **P0001** from `field_workers_no_truncate` (this table's trigger fires before the child's 23000).
- Task 8: `rbac/check.ts` — the per-grant test extracted to the private `grantAuthorizes`, shared by `hasPermission` and the
  new `authorizingGrant`; `authorize` issues the deep-frozen, WeakSet-registered `VerifiedAuthorization`; `requirePermission`
  returns it; `checkPermission` untouched. `matchingGrantRole` re-pointed (one line). `field_worker.register` minted (58 → 59,
  77 → 78 keys), granted to `district_admin` + `pariwar_admin`. API: `loadActorGrants` / `loadGlobalActorGrants` select `id` →
  `grantId`; `requirePermissionHook` stores `(request.authorizations ??= {})[key]`; `types.ts` types it. Tests:
  `tests/rbac/check.test.ts` (+11 legs incl. the AST source fence on `authorize(` — 2,000+ files scanned, floor 1,500; a
  first REGEX version flagged two COMMENTS, so the fence reads the TypeScript AST), `permissions.test.ts`, `roles.test.ts` (+5);
  `apps/api/tests/unit/rbac-hook-authorizations.test.ts` (5). Every existing RBAC test passes UNCHANGED [⚠ CORRECTED by review round 4, R4-12: except Task 8's version / count pins and one added assertion] (202 / 202 in
  `tests/rbac`, `matching-grant.test.ts` untouched). RED: a planted `rbac.authorize(` in `apps/api/src` ⇒ the fence fails; an
  unfrozen `grant` ⇒ the freeze leg fails; `authorizingGrant` without the sort ⇒ 4 legs fail (two of them `matching-grant`'s
  own); the hook's store line removed ⇒ 3 of 5 hook legs fail. All restored.
- Task 10 (1): `seedFieldWorker` in `tests/integration/attribution-code/_fixtures.ts` (owner INSERT under the writer var,
  role-aware, fresh blind index); `seedCode` seeds a real holder by default (the replica arm included). The six 13.2 specs
  repaired (delegated to a sub-agent with exact rules, reviewed): 26 failures (23503 and the "no FK" pin) ⇒ 91 / 91, twice in
  a row (`allocate-concurrency.spec.ts` commits and cleans both tables under replica, codes first); 0 rows left in either
  table. The door file is NOT edited — its header's "no route uses it yet" stays stale until Task 7 (the door's export pin).
  Reach fence 122 / 122 with no ALLOWED-list edit.

**(c) Tasks 3–7, 9, 10 (2), 11 — 2026-11-03, on `:5470`.**
- Tasks 3–6 (domain): `field-worker/{events,state,project,commands,read,errors,index}.ts`; `fieldWorker` namespace + the top-level
  direct-write set in `domain/src/index.ts`; seven registry entries + `packages/events/tests/field-worker-registry-coverage.test.ts`
  (its OWN description template). AC3 greps: no test pins the registry COUNT (93 → 100 entries); the only `toHaveLength(100)` hit
  is `peer-mesh-reply.spec.ts`'s answers, unrelated. Unit: `tests/field-worker/{state,events,no-audit-wrapper-in-domain,commands-guards}.test.ts`
  (53). Live: `tests/integration/field-worker/{commands,projector-trigger,read,stream-concurrency}.spec.ts` + the Task 2 specs (108 in all).
- RED proofs (each restored and re-run green): I13 — an `events_log` read planted before the row lock in `runLockedTransition`
  ⇒ 6 of 31 `commands-guards` legs fail; AC10 — the prefix cut replaced by a per-event filter ⇒ the INVERSION leg (a) fails;
  `>` replaced by `>=` ⇒ the TIE leg (b) fails. The inversion's precondition (v3's stamp earlier than v2's) is asserted in the leg.
- AC6: `stream-concurrency.spec.ts` 7 / 7, run twice in a row; 0 `field_workers` rows and 0 `field_worker.*` events left after
  each run. (a) and (e1) are probabilistic smokes (6 rounds); (e3)'s stale ordering was observed (no fallback warning printed).
  No race ended in 40P01 / 40001.
- Task 7 (API): `apps/api/src/modules/field-worker/{routes,handlers,errors,index}.ts`, registered in `server.ts`; contracts
  `packages/contracts/src/field-workers/` (+ the barrel, `tests/field-workers.test.ts`); `emit-openapi.ts` entry, `openapi/v1.yaml`
  regenerated by `pnpm contracts:emit-openapi` (+109 lines), `contracts:check-openapi-determinism` green. Tests:
  `tests/integration/field-worker/registration.spec.ts` (10 — (a)–(h), (k), AC13), `registration-exhaustion.spec.ts` (3 — (i), the
  flag-failure leg and a control), `tests/unit/field-worker-errors.test.ts` (22 — (j)), `tests/unit/field-worker-handler-identity.test.ts`
  (2 — (g); RED: the handler passing `{ ...authorization }` ⇒ the `toBe` leg fails; restored). The (d) concurrent loser is FORCED:
  the request is observed WAITING on a lock in `pg_stat_activity` before the seed commits. The 422 district leg asserts NO
  `encryptDek` / `computeHmac` call.
- ⚠ `String.prototype.isWellFormed` is ES2024 and the lib is ES2022, so the unpaired-surrogate rule is a small code-unit loop
  (`hasUnpairedSurrogate`, numeric literals — no escape can land raw on disk).
- Task 10 (2): `apps/api/tests/integration/_field-worker-fixture.ts` (registers through the public command with a real
  `rbac.authorize` result); only ONE leg of `attribution-code-access.spec.ts` inserts a code — it now registers a real worker in
  the same rolled-back tx; 14 / 14.
- Task 9: `scripts/field-worker-state-invariant/` (copied from the marketplace gate; `GUARDED_COLUMNS` = the eight I1 columns;
  `lib.test.ts` 28 — a FLAGGED `.set` and `.values` leg for EACH of the eight, `district` in every write form); wired in
  `package.json`, `ci-local.sh`, `ci.yml` (`ci.yml` parses). Revert-sanity: a `db.update(fieldWorkers).set({ district })` planted in
  `field-worker/read.ts` ⇒ the check FAILS (1 finding, `read.ts:224`); removed ⇒ passes. `FIELD_WORKER_ROOTS` in
  `scripts/access-wrapper-invariants/check.ts` (both labels), its README and `docs/access-wrapper-invariants.md`; revert-sanity: a
  bare `audit.writeAuditEntry(...)` planted in `apps/api/src/modules/field-worker/` ⇒ RED (1 finding); removed ⇒ green; its own
  tests 34 / 34.
- AC12 — the route review of the door (C7), at the branch head:
  - (a) `grep -rnE "export .* from '.*attribution-code-access" apps/*/src packages/*/src --include='*.ts' --include='*.tsx'` ⇒
    EMPTY (exit 1); over the whole of `apps packages` ⇒ the two expected fixture STRINGS in
    `apps/api/tests/unit/attribution-code-reach-fence.test.ts`. No door wrapper is bound to a name exported in a second statement
    (`grep` of `*ForRequest` outside the door finds only the unrelated `resolvePoolNamePresentationModeForRequest`).
  - (b) `grep -rnE "from '(\.\./)+api/src" apps/public apps/jobs` ⇒ EMPTY.
  - (c) `grep -rn "requestContextStorage\|enterWith\|AsyncLocalStorage" apps/api/src` ⇒ only
    `middleware/request-context/index.ts` (9 lines) and the COMMENT at `apps/api/src/types.ts:5` — both as at the baseline; no
    `.pariwarId =` and no `Object.assign(…, { pariwarId })` in `apps/api/src/modules/field-worker` or the fixture (exit 1).
  - The reach fence passes (122 / 122) with NO edit to its ALLOWED list. The door file is NOT edited, so its header ("⛔ Route
    uses it yet") is now STALE — left so, as the story directs (Dev Notes).
- ⚠ VARIANCE (AC9's source fence): the `authorize(` fence's allowed set names `check.ts`, `apps/api/tests/integration/_field-worker-fixture.ts`
  and `*.test.ts` / `*.spec.ts`. Its first full-suite run flagged `packages/domain/tests/integration/field-worker/_fixtures.ts` —
  the DOMAIN twin of the apps/api fixture (a test-tree file calling `rbac.authorize` for the same reason). It is added to the
  allowed set by EXACT path (⛔ a widened rule) and named in `check.ts`'s doc comment; nothing under `src/` calls `authorize(`
  except `check.ts`.
- Typecheck (20 / 20), lint (20 / 20), `apps/api` unit (959 + 1 skipped), domain unit (3,777 + 1 skipped), contracts (1,701),
  events (43) — green.

**(d) Task 12 — the full gate (AC14), 2026-11-03.**
- Run 1 — fresh container `twt-131-ci-pg` (`:5471`, DB `twt_dev`), code head `ce80bd64`: 37 of 38 jobs green; `integration-tests`
  RED on ONE leg, `packages/domain/tests/integration/claim/peer-mesh-wa-reminder.spec.ts` > "R1 — the marker rechecks WR5's 72-hour
  deadline … a slow decrypt/hash crossing it" (`expected 'marked' to be 'late'` — a fixed 7 s sleep racing a DB-clock deadline
  under full-suite load). Story 6.31's file; 13.1 touches nothing it reads. Alone on the same DB: 36 / 36, twice. Turbo
  `--concurrency=1` then STOPPED, so `@twt/api` and five more packages never ran; re-running those on the same `:5471` DB with
  `--continue`: all green except 2 legs of `apps/api/tests/integration/pool-fixed-amount/fixed-amount.spec.ts`, which pass 16 / 16
  on `:5470` with the same 13.1 code — state committed by run 1 on that container (the [[project_known_livedb_test_failures]]
  class). Not a 13.1 regression; recorded, not hidden.
- Run 2 — a SECOND fresh container `twt-131-ci2-pg` (`:5472`), the same code head `ce80bd64`: **`ci:local PASSED — 38 job(s)
  green`** (37 at `268d86b5` + `field-worker-state-invariant`); integration phase domain 7,835 passed + 1 skipped, api 2,902 + 1
  skipped. Both throwaway containers removed afterwards; `twt-131-pg` (`:5470`) is the story's working DB.
- Typecheck and the OpenAPI determinism job are inside that run (green).

**(e) Code review round 1 — 2026-11-04 — patches R1–R10 applied (BigDev: "apply every patch").**
- Database: `twt-131-pg` (`:5470`, DB `twt_dev`, user `twt_dev_app`) — this story's own container, migrated through `0200`, 0 `field_workers` rows
  before and after. The shell's default `DATABASE_URL` is `:5432` and was OVERRIDDEN on every live command; it was never used.
- RED proofs (each source file restored byte-for-byte from a saved copy, then re-run green): R1 ×3 (a typo in the in-progress code and the bound at
  2000; the no-result throw deleted), R2 (key check deleted ⇒ the command REGISTERED the worker), R3 (the old order ⇒ four legs fail, "expected 33 to
  be less than 32"), R4 (unit ×4 and the live (h) leg), R5a (`TS2322` in `read.spec.ts`), R5b ("expected a length of 200 but got 201" — a first
  attempt with a mistyped replacement did not parse, proved nothing, and was redone), R6 (rule deleted ⇒ 20 legs; plain `\p{L}` ⇒ the four filler
  legs; the live (h) loop), R7 (call-only detection ⇒ four legs). An earlier batch of R1 / R3 runs used a wrong test path and printed nothing — it was
  discarded and redone.
- ⚠ A trap hit and fixed: the bidi range written as backslash-u escapes in an edit landed as RAW bidi control characters in `handlers.ts` —
  typecheck cannot see it; a character scan caught it and the regex is now built from `String.fromCharCode`. Every changed file was re-scanned for
  invisible, bidi and control characters: clean. (`deferred-work.md` holds ONE pre-existing NUL byte, line 13439 — it is at HEAD, not from this
  review; left alone.)
- After the patches: typecheck and lint green for `@twt/domain` and `@twt/api`; gates `field-worker-state:check` and `:test` (28),
  `domain-invariants:check`, `access-wrapper:check` green; unit suites with `DATABASE_URL` unset — `@twt/api` 93 files / 1,054 tests, `@twt/domain`
  213 files / 3,806 tests, no failed file; live on `:5470` — domain `tests/integration/field-worker` plus the two field-worker RLS specs, 8 files /
  77 tests; api `tests/integration/field-worker`, 2 files / 14 tests — all green.
- NOT run: the full `pnpm ci:local` (Task 12's open line). The fix diff has NOT been reviewed by a fresh reader.

**(f) Code review round 2 — 2026-11-04 — the fix diff reviewed, patches R2-1…R2-11 applied (BigDev: "re-run code review", "go, launch all three", "apply every patch").**
- Review: three fresh read-only layers on the 774-line code and test diff (Blind Hunter; Edge Case Hunter, which never saw round 1's findings; Acceptance Auditor, which got the
  Resolution block as claims to falsify). 29 raw → 21 unique: 0 decision-needed, 11 patch, 1 defer, 9 dismissed. I replayed the name rule and the fence on the reviewers' cases
  with `node` before classifying, and read the flag path, the stale story lines and `epics.md`.
- Database: the same `twt-131-pg` (`:5470`), 0 `field_workers` rows before and after; the shell's `:5432` overridden on every live command.
- RED proofs (each file restored byte-for-byte from a saved copy, then re-run green): R2-1 ×4 (round 1's rule ⇒ 28 legs; no `Zl` / `Zp` / `Co` ⇒ 4; empty allow-list ⇒ 5; the live
  HTTP loop against round 1's rule), R2-3 ×3 (export branch ⇒ 2; binding keys ⇒ 2; call branch deleted ⇒ the bare-call leg and the repo scan), R2-4 (a release in the
  `already_claimed` branch ⇒ 2), R2-6 (a leak probe: the old `afterEach` fails it, the new one passes — the probe legs removed), R2-7 (the cap at 2000 ⇒ "a length of 200 but got
  201"). R2-2 is a comment and wording; R2-5 a label; R2-8…R2-11 record edits — none can be RED-proved, and none is claimed to have been.
- ⚠ Two things of mine caught on the way: the first R2-1 test run failed three legs because I had asserted that a TRAILING U+2028, U+2029 or U+FEFF survives `trim()` (it does not; fixed
  in the test, not the rule); and a RED edit I wrote for the fence carried a convoluted `.replace()` that I replaced with the plain string. The Resolution's own count of the
  fence legs was also wrong once (nine for eight) and was corrected against the measured 82 → 90.
- After the patches: typecheck and lint green for `@twt/domain` and `@twt/api`; gates `field-worker-state:check` and `:test` (28), `domain-invariants:check`, `access-wrapper:check`
  green; unit suites with `DATABASE_URL` unset — `@twt/api` 93 files / 1,087 tests (+33: the name legs), `@twt/domain` 213 files / 3,814 tests (+8: the fence legs), no failed file;
  live on `:5470` — domain `tests/integration/field-worker` plus the two field-worker RLS specs, 8 files / 77 tests; api `tests/integration/field-worker`, 2 files / 14 tests — all green.
- NOT run: the full `pnpm ci:local`. The round-2 fix diff has NOT been reviewed by a fresh reader.

**(g) Code review round 3, chunk G3 — 2026-11-04 — the whole branch, chunked; G3 (the API route + contracts) reviewed and its patches applied (BigDev: "B: full branch, chunked", "G3 API route", "go, launch all three", R3-DN1 "1", "apply every patch").**
- Review: three fresh read-only layers on G3's 2,158-line diff (`268d86b5` → the working tree, 23 files). 29 raw → 23 unique: 1 decision-needed (resolved: cap 8+), 9 patch (+1 from the decision), 1 defer,
  12 dismissed. I replayed the name rule (`scratchpad/13-1-r3/verify-name.mjs`) and read `closeScopeTx`, the keyed store's `getResult`, the rate-limit plugin, the 12.2 twin's residuals and the OpenAPI header convention first.
- Database: `twt-131-pg` (`:5470`) for every live leg, `DATABASE_URL` set on the command. ⚠ **A slip of mine:** one `pnpm --filter @twt/api test` ran with the SHELL's `DATABASE_URL` (`:5432`,
  a local Postgres behind on schema — 189 migrations, no `field_workers`): 426 integration legs failed there and the passing ones may have left fresh-UUID test rows in that dev DB.
  Read-only check after: no `field_workers` table, so migration `0200` did NOT reach it (the API vitest config runs no migrations). The memory rule ("every live command names its port") was the one broken.
- RED proofs (each file restored byte-for-byte from a saved copy, `cmp`-checked, then re-run green): R3-1 / R3-10 ×5 unit (round 2's rule ⇒ 22 legs; no `Cf` ⇒ 9; no mark cap ⇒ 1; ALM off the
  allow-list ⇒ 1; no orphan-mark check ⇒ 1) + live (round 2's rule ⇒ the (h) content leg); R3-2 ×3 (no release ⇒ the two unit legs AND the live exhaustion retry; a failure recorded as the
  result ⇒ the two unit legs); R3-5 (a deaf spy ⇒ the live control); R3-7 (`registrationDistrict` passing a number through ⇒ 1). R3-3, R3-4 and R3-6 are STRENGTHENED assertions, green, not
  RED-proved; R3-8 a retitle; R3-9 a description (regenerated, determinism check green).
- After: typecheck + lint green for `@twt/api` and `@twt/contracts`; `@twt/api` with `DATABASE_URL` unset 93 files / 1,119 tests (+32: 25 name legs, 7 handler / `registrationDistrict`
  legs), `@twt/contracts` 96 / 1,701; live on `:5470` api `tests/integration/field-worker` 2 files / 14 tests; the raw-invisible scan of every added line clean. `@twt/domain` untouched by G3.
- NOT run: the full `pnpm ci:local`. Chunks G2, G1 and G4 are NOT yet reviewed. [⚠ Superseded by (h): they are now reviewed and patched.]

**(h) Code review round 3, chunks G2 / G1 / G4 — 2026-11-04 — the rest of the branch reviewed together and its patches applied (BigDev: "go, launch all three and remaining chunk all at once", R3-DN2 "1", "apply every patch").**
- Review: nine fresh read-only layers in parallel (three per chunk), every one with `DATABASE_URL` UNSET (no DB); G2 2,495 / G1 3,001 / G4 1,635 diff lines; the four chunks cover every
  code / test file on the branch exactly once (checked by a set difference). 68 raw → 50 unique: 1 decision-needed (resolved: fence the result), 18 patch (+1 from the decision), 4 defer,
  27 dismissed. I READ `requirePermission`'s return against QE18 (c) / (e), pino's `err` logging and the twin `ModulePersistError`, the projector's insert columns, `state.test`'s
  agreement leg, the trigger RAISE texts and the fixtures' guard use before classifying.
- Database: `twt-131-pg` (`:5470`) for every live leg, `DATABASE_URL` on the command; DB-free legs with it UNSET — no `:5432` slip this time.
- RED proofs (each file restored from a saved copy and `cmp`-checked; each planted probe deleted): R3-12, R3-13, R3-14, R3-15, R3-16 ×2, R3-20, R3-21, R3-25, R3-26, R3-27 ×2, R3-29. Not
  RED-proved, and not claimed: R3-11 (removes vacuous lines), R3-17 and R3-22 (strengthened assertions, green), R3-23 (a banner), R3-18 / R3-19 / R3-24 / R3-28 (record edits).
- After: typecheck + lint green for `@twt/domain` and `@twt/api`; gates `field-worker-state:check` (both projector writes SEEN) and `:test` (46), `domain-invariants:check`,
  `access-wrapper:check`, `governance-boundary:check` green; unit suites with `DATABASE_URL` unset — `@twt/domain` 213 files / 3,839 tests (+25), `@twt/api` 93 / 1,119, `@twt/events`
  6 / 30; live on `:5470` — domain field-worker + both field-worker RLS specs + attribution-code + cross-pariwar-leak, 14 files / 160 tests; api field-worker + attribution-code-access,
  3 files / 28 tests; the raw-invisible scan of every added line clean.
- ⚠ A thing of mine caught on the way: an `it.each` title used a second `%s` that printed the command FUNCTION, not the trigger — retitled.
- NOT run: the full `pnpm ci:local` (owed, on a fresh container).

**(i) Code review round 4 — 2026-11-04 — the round-3 fix diff reviewed and its patches applied (BigDev: "2, then open pr", R4-DN1 "1", "apply every patch").**
- Review: the fix diff ISOLATED by reconstruction (`268d86b5` + the four chunk diffs ⇒ the tree the round-3 layers saw; that tree → the working tree = 24 files, 1,873 lines);
  three fresh read-only layers, `DATABASE_URL` unset; 35 raw → 22 unique: 1 decision-needed (resolved ⇒ R4-15), 14 patch, 1 defer (D9), 6 dismissed. The two Mediums replayed by me
  (`scratchpad/13-1-r3/zalgo.mjs`) and by the Edge Hunter's vitest 2.1.9 probe.
- RED proofs: R4-1, R4-2, R4-3, R4-4, R4-5, R4-6, R4-7 + R4-8 (the round-3 scanner), R4-9 (shown both ways on the real tree), R4-10, R4-11, R4-15 ×2. Not RED-proved: R4-12, R4-14
  (records / comments), R4-13 (strengthened assertions, green).
- After: typecheck + lint (`@twt/domain`, `@twt/api`); gates `field-worker-state:check` / `:test` (55), `domain-invariants`, `access-wrapper`, `governance-boundary` green; unit with
  `DATABASE_URL` unset — domain 3,863 (+24), api 1,137 (+18: the name legs), events 30; live on `:5470` — domain 160, api 28; the added-line scan clean (after the two raw characters
  of mine it caught were removed).
- NOT run yet: the full `pnpm ci:local` on a fresh container — next, before the push.

### Completion Notes List

- Built the SEVENTH event-derived-state primitive, `packages/domain/src/field-worker/` (namespace `fieldWorker`): the
  `field_workers` table (migration `0200` — Tier-1 name + mobile, a Tier-2 mobile index in the disjoint `field_worker_mobile`
  space, eight projected columns behind a whole-row guard trigger with its own terminal / KYC / district rules, row DELETE and
  statement TRUNCATE refused for every role's DML [R3-18: the owner can disable the trigger — DDL], per-command RLS) and 13.2's composite FK onto it; seven `field_worker.*` events
  (human actors only, no PII, the `authorization` snapshot on `registered` / `posted`); the reducer + fold + `acceptsNewAttributions`
  (`active` only); the projector; seven commands with QE5's guard order (IST `ended_on` bounds computed in SQL); PII-free reads,
  the duplicate-mobile pre-check, `assertDistrictRecorded`, and the as-of read `getFieldWorkerStateAt` (prefix cut in SQL, µs).
- The RBAC core gained ONE shared per-grant predicate, `authorizingGrant`, and `authorize` → a deep-frozen, WeakSet-registered
  `VerifiedAuthorization`; `requirePermission` returns it and `requirePermissionHook` stores it per key; `matchingGrantRole` now
  delegates to `authorizingGrant`. `field_worker.register` minted (catalog 58 → 59), held by `district_admin` + `pariwar_admin`.
  Every existing RBAC test passes unchanged (⚠ CORRECTED by review round 3, R3-28: except the version / count pins Task 8 bumps and one added assertion).
- The ONE route, `POST /api/v1/p/:pariwarId/field-workers` (district-gated on the body's reporting district), registers a worker
  and allocates their attribution code through 13.2's door in one transaction; the 201 carries no code (QE22); exhaustion flags
  in its own transaction and answers 503.
- Gates: `field-worker-state-invariant` (new CI job — `ci:local` grows by one), `FIELD_WORKER_ROOTS` in the compensating-audit
  gate. 13.2's specs repaired to seed real workers. Roster Row 48 is the go-live fence (legs (e)–(i) open). Nothing is live.
- Not done here (by design): no screen, no other lifecycle route, no decrypt, no worker login (13.1a–13.1d, 13.3). The
  `decision-flow-sync` skill is for when the decisions LAND on `main` (`-441`…`-444` are on this branch; no new decision was
  written by this run).
- Review round 1 (2026-11-04): the full-diff review's ten patches are applied (R1–R7 each RED-proved then green; R8–R10 are record edits — Debug Log (e)); two items are deferred (D1 → 13.1a, D2 →
  BigDev). QE9's name rule is amended (no bidi controls, at least one VISIBLE letter) and `tenantWrite` gained a `prepare` step — both recorded as
  variances above. Status stays `review`: the patch is uncommitted, `ci:local` is owed, and no fresh reader has seen the fix diff.
- Review round 2 (2026-11-04): the fix diff was reviewed by three fresh layers and its eleven patches are applied (RED-proved: R2-1, R2-3, R2-4, R2-6
  and R2-7; comment, label and record edits that cannot be: R2-2, R2-5 and R2-8…R2-11 — Debug Log (f)); one item is deferred (D3 — the 503 flag path's second connection, in 13.2's door file).
  QE9's name rule is amended a second time (no invisible character); AC8 (k) and AC9 / QE18 (e) carry variance pointers. Status stays `review`.
- Review round 3, chunk G3 (2026-11-04): the whole branch is reviewed in four chunks; G3 (the API route + contracts) found 1 decision (BigDev: refuse 8+ stacked marks), 10 patches — all applied
  (RED-proved: R3-1, R3-2, R3-5, R3-7, R3-10; strengthened assertions: R3-3, R3-4, R3-6; a retitle and a description: R3-8, R3-9 — Debug Log (g)) — and 1 deferral (D4 — the keyed store's
  expired-result "in progress", pre-existing). QE9's name rule is amended a THIRD time. Status stays `review`.
- Review round 3, chunks G2 / G1 / G4 (2026-11-04): 1 decision (BigDev: fence `requirePermission`'s RESULT — R3-29), 19 patches applied (RED-proved: R3-12, 13, 14, 15, 16, 20, 21, 25,
  26, 27, 29; the rest strengthened assertions or record edits — Debug Log (h)), 4 deferrals (D5 error `cause` in logs; D6 the twin gates' blind spots; D7 the move's expected source →
  13.1c / 13.1d; D8 FORCE RLS vs a non-superuser owner). QE18 (e) is amended; the event `trigger` is no longer free text. The WHOLE branch has now had a fresh full review. Status stays
  `review` — `ci:local` on a fresh container and the commits are next.
- Review round 4 (2026-11-04): the round-3 fix diff reviewed — 1 decision (BigDev: allowed invisibles between two characters ⇒ R4-15, with a disclosed virama + ZWJ exception), 15
  patches applied (RED-proved R4-1…R4-11 except R4-12 / R4-13 / R4-14, and R4-15), 1 deferral (D9 — the runtime Node / ICU is unpinned). QE9 amended a FOURTH time; QE18 (e)
  corrected. Status stays `review`.

### File List

apps/api/src/context.ts · apps/api/src/modules/field-worker/{errors,field-worker-crypto,handlers,index,routes}.ts (new) ·
apps/api/src/modules/rbac/index.ts · apps/api/src/server.ts · apps/api/src/types.ts ·
apps/api/tests/integration/_field-worker-fixture.ts (new) · apps/api/tests/integration/attribution-code-access.spec.ts ·
apps/api/tests/integration/field-worker/{_registration-harness.ts,registration.spec.ts,registration-exhaustion.spec.ts} (new) ·
apps/api/tests/unit/{field-worker-crypto,field-worker-errors,field-worker-handler-identity,rbac-hook-authorizations}.test.ts (new) ·
packages/contracts/src/field-workers/{dto,enums,index}.ts (new) · packages/contracts/src/index.ts · packages/contracts/scripts/emit-openapi.ts ·
packages/contracts/tests/field-workers.test.ts (new) · openapi/v1.yaml (generated) ·
packages/domain/migrations/0200_field-workers.sql (new) · packages/domain/migrations/meta/_journal.json ·
packages/domain/src/encryption/{field-classes,index}.ts · packages/domain/src/field-worker/{commands,errors,events,index,project,read,state}.ts (new) ·
packages/domain/src/ids/index.ts (comment) · packages/domain/src/index.ts · packages/domain/src/policies/field-workers-rls.ts (new) ·
packages/domain/src/policies/index.ts · packages/domain/src/rbac/{check,matching-grant,permissions,roles}.ts ·
packages/domain/src/schema/field_workers.ts (new) · packages/domain/src/schema/field_worker_attribution_codes.ts · packages/domain/src/schema/index.ts ·
packages/domain/tests/field-worker/{commands-guards,events,no-audit-wrapper-in-domain,state}.test.ts (new) ·
packages/domain/tests/integration/attribution-code/{_fixtures.ts,allocate-concurrency.spec.ts,allocate.spec.ts,handle.spec.ts,resolve.spec.ts} ·
packages/domain/tests/integration/field-worker/{_fixtures.ts,commands.spec.ts,composite-fk.spec.ts,projector-trigger.spec.ts,read.spec.ts,schema-trigger.spec.ts,stream-concurrency.spec.ts} (new) ·
packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts ·
packages/domain/tests/integration/rls/field-worker-attribution-codes-policy-regression.spec.ts ·
packages/domain/tests/integration/rls/field-workers-policy-regression.spec.ts (new) ·
packages/domain/tests/rbac/{check,permissions,roles}.test.ts · packages/events/src/registry.ts ·
packages/events/tests/field-worker-registry-coverage.test.ts (new) · scripts/field-worker-state-invariant/{README.md,check.ts,lib.ts,lib.test.ts} (new) ·
scripts/access-wrapper-invariants/{check.ts,README.md} · docs/access-wrapper-invariants.md · scripts/ci-local.sh · package.json ·
.github/workflows/ci.yml · docs/launch-gate-inventory/inventory-roster.md (Row 48) ·
_bmad-output/implementation-artifacts/13-1-field-worker-identity-lifecycle-state-machine.md · _bmad-output/implementation-artifacts/sprint-status.yaml

Review round 1 (2026-11-04) also touched: apps/api/src/modules/field-worker/handlers.ts · packages/domain/src/field-worker/read.ts ·
apps/api/tests/integration/field-worker/registration.spec.ts · apps/api/tests/unit/field-worker-handler-identity.test.ts (rewritten) ·
apps/api/tests/unit/field-worker-name.test.ts (new) · packages/domain/tests/field-worker/{commands-guards,district-guard (new)}.test.ts ·
packages/domain/tests/integration/field-worker/read.spec.ts · packages/domain/tests/rbac/check.test.ts ·
_bmad-output/implementation-artifacts/deferred-work.md.
Review round 2 (2026-11-04) also touched: apps/api/src/modules/field-worker/handlers.ts · apps/api/tests/unit/{field-worker-handler-identity,field-worker-name}.test.ts ·
apps/api/tests/integration/field-worker/registration.spec.ts · packages/domain/tests/rbac/check.test.ts · packages/domain/tests/integration/field-worker/read.spec.ts ·
_bmad-output/planning-artifacts/epics.md (13.1a: the D1 block) · _bmad-output/implementation-artifacts/{deferred-work.md (D3),sprint-status.yaml (ledger 2026-11-04b)}.
Review round 3, chunk G3 (2026-11-04) also touched: apps/api/src/modules/field-worker/handlers.ts (the name rule) · packages/contracts/scripts/emit-openapi.ts · openapi/v1.yaml (regenerated) ·
apps/api/tests/unit/{field-worker-name,field-worker-handler-identity}.test.ts · apps/api/tests/integration/field-worker/{registration,registration-exhaustion}.spec.ts ·
_bmad-output/implementation-artifacts/{deferred-work.md (D4),sprint-status.yaml (ledger 2026-11-04c)}.
Review round 4 (2026-11-04) also touched: apps/api/src/modules/field-worker/handlers.ts · apps/api/tests/unit/field-worker-name.test.ts ·
apps/api/tests/integration/field-worker/registration-exhaustion.spec.ts · packages/domain/src/field-worker/{state,events}.ts · packages/domain/tests/field-worker/state.test.ts ·
packages/domain/tests/integration/field-worker/commands.spec.ts · packages/domain/tests/rbac/check.test.ts · scripts/field-worker-state-invariant/{lib.ts,check.ts,lib.test.ts,README.md} ·
_bmad-output/implementation-artifacts/{deferred-work.md (D9),sprint-status.yaml (ledger 2026-11-04e)}.
Review round 3, chunks G2 / G1 / G4 (2026-11-04) also touched: packages/domain/src/field-worker/{commands,errors,events}.ts · packages/domain/src/rbac/check.ts (doc) ·
packages/domain/tests/field-worker/{commands-guards,events,state}.test.ts · packages/domain/tests/integration/field-worker/{_fixtures.ts,commands.spec.ts,projector-trigger.spec.ts,schema-trigger.spec.ts} ·
packages/domain/tests/integration/rls/field-workers-policy-regression.spec.ts · packages/domain/tests/rbac/check.test.ts · scripts/field-worker-state-invariant/{lib.ts,check.ts,lib.test.ts,README.md} ·
_bmad-output/planning-artifacts/epics.md (13.1c / 13.1d: the D7 block) · _bmad-output/implementation-artifacts/{deferred-work.md (D5–D8),sprint-status.yaml (ledger 2026-11-04d)}.

### Change Log

- **v1.25 (2026-11-04) — CODE REVIEW round 4 (the round-3 fix diff), patches applied.** Three fresh layers on the isolated fix diff (24 files): 1 decision-needed, 14 patch, 1 defer, 6
  dismissed; BigDev resolved R4-DN1 ("1" ⇒ R4-15) and chose "apply every patch". R4-1 the 503 `console.error` sweep made real (it read a reset spy — mine) and the flag-fails leg swept;
  R4-2 the mark rules see through the allowed invisibles (a 98-mark name had passed); R4-3 U+FFFC refused; R4-4 / R4-5 / R4-6 / R4-11 both fences — the second's missed forms, an AST
  floor naming the four real guard callers, four more literal forms, a shared walk that skips an absent root and build output; R4-7 / R4-8 / R4-9 the state gate — unreadable members,
  assignment / binding / element-access aliases, an unverifiable projector write reported; R4-10 the fold ignores `trigger`; R4-12 / R4-14 record and comment corrections; R4-13 three
  refusal legs; R4-15 an allowed invisible sits between two characters (one disclosed exception: a final ZWJ after a virama). QE9 amended a FOURTH time; QE18 (e) CORRECTED. D9 in
  `deferred-work.md`. UNCOMMITTED; `ci:local` NOT re-run since `ce80bd64`; Status stays `review`.

- **v1.24 (2026-11-04) — CODE REVIEW round 3, chunks G2 / G1 / G4 (the rest of the full-branch review), patches applied.** Nine fresh layers (three per chunk), 1 decision-needed, 18 patch,
  4 defer, 27 dismissed; BigDev resolved R3-DN2 ("1" — fence `requirePermission`'s result ⇒ R3-29) and chose "apply every patch". The three Auditors found NO AC, QE, invariant or ratified-
  decision violation in G1 / G2 / G4's code. Applied: R3-11 two post-savepoint assertions; R3-12 trigger legs assert the refusing rule; R3-13 the ten arms literal; R3-14 / R3-15 the projector's
  from/to and actor checks reached; R3-16 the event `trigger` per-type, ⛔ free text, and every computed trigger pinned; R3-17 exact index columns; R3-18 / R3-19 record corrections (11 legs;
  "every role's DML"; the orphan count UN-ATTESTED + a Task line); R3-20 no raw reason in the error, the trigger built after validation; R3-21 the lock's `pariwar_id` pinned as the owner;
  R3-22 / R3-23 / R3-24 spec claims, a banner, an AC6 VARIANCE; R3-25 / R3-26 the `authorize` fence's roots and two missed forms; R3-27 the state gate's blind spots and a non-vacuity floor;
  R3-28 AC9 / Task 8 overclaims; R3-29 the second fence. QE18 (e) AMENDED (dated). D5–D8 in `deferred-work.md`; D7 also under 13.1c / 13.1d in `epics.md`. UNCOMMITTED; `ci:local` NOT re-run
  since `ce80bd64`; Status stays `review`.

- **v1.23 (2026-11-04) — CODE REVIEW round 3, chunk G3 (the whole branch, chunked: G3 = the API route + contracts), patches applied.** Three fresh layers on G3's 2,158-line diff: 1
  decision-needed, 9 patch, 1 defer, 12 dismissed; BigDev resolved R3-DN1 ("1" — refuse 8+ consecutive combining marks ⇒ R3-10) and chose "apply every patch". R3-1 + R3-10 QE9's name rule
  AMENDED a THIRD time — also no `Cf` / `Cn`, no U+2800 / U+FFFD, no mark without a base, no run of 8+ marks; ALM allowed (the round-2 rule let U+2800, the interlinear annotation controls,
  U+FFFD, noncharacters and a 119-mark Zalgo name through); R3-2 TR9 tested (release on failure, never record a failure — unit, and the live retry after a 503); R3-3 AC8 (f) whole snapshot in
  every 201, codes and nothing-written on the 403 / 404 / 400 legs; R3-4 the AC13 sweep covers the concurrent loser's rows and the 503's logs; R3-5 the no-KMS leg has a positive control;
  R3-6 leg (d)'s lock probe filtered by database and blocker; R3-7 `registrationDistrict` tested and v1.21's sentence CORRECTED; R3-8 a misleading title; R3-9 "reporting district" in
  the OpenAPI description. D4 (the keyed store's expired-result 409) is in `deferred-work.md`. G2, G1, G4 still to review. UNCOMMITTED; `ci:local` NOT re-run since `ce80bd64`; Status stays `review`.

- **v1.22 (2026-11-04) — CODE REVIEW round 2 (the fix diff), patches applied.** Three fresh layers reviewed the v1.21 patch: 0 decision-needed, 11 patch, 1 defer, 9 dismissed; BigDev
  chose "apply every patch". R2-1 QE9's name rule AMENDED again — no invisible character (line / paragraph separators, private-use, every default-ignorable code point except ZWNJ, ZWJ,
  LRM, RLM) and at least one letter; round 1's bidi regex and strip-then-test are gone (v1.21's R6 rule let U+2028, ZWSP between letters, tag characters and private-use through);
  R2-2 the flag path's residual is commented and the R3 wording NARROWED (only the display-name read left the transaction — v1.21's "pool hold-and-wait removed" overclaimed);
  R2-3 the `authorize` fence flags export specifiers and string / computed-literal binding keys, and says "statically visible"; R2-4 the in-flight leg asserts `release` is not called;
  R2-5 labels; R2-6 the mock reset in `afterEach`; R2-7 the cap leg asserts the literal 200 and 50; R2-8 QE9's order list, its idle sentence and Task 7 describe the `prepare` step;
  R2-9 D1 is homed in `epics.md` under 13.1a; R2-10 v1.21's "each RED-proved" corrected (R1–R7 were; R8–R10 are record edits); R2-11 AC8 (k) carries a VARIANCE pointer. D3 (the 503
  flag path's second connection — Story 13.2's door file) is in `deferred-work.md`. UNCOMMITTED; `ci:local` NOT re-run since `ce80bd64`; Status stays `review`.
- **v1.21 (2026-11-04) — CODE REVIEW round 1, patches applied.** Full-diff review (Blind Hunter, Edge Case Hunter, Acceptance Auditor): 0
  decision-needed, 10 patch, 2 defer, 15 dismissed; BigDev chose "apply every patch". R1 the idempotency in-flight 409 and the key-length bounds
  asserted (unit and HTTP); R2 `registerFieldWorker`'s key guard tested; R3 `tenantWrite` gains a `prepare` step before `openScopeTx` (a VARIANCE
  from "copy 12.2's UNCHANGED"); R4 `assertDistrictRecorded` refuses NUL; R5 the two vacuous AC10 assertions made real; R6 QE9's name rule amended —
  no bidi controls, at least one VISIBLE letter (the Hangul fillers are letters by category); R7 the `authorize` fence flags every reference; R8 the
  "every guard RED-proved" sentence of v1.20 and Task 11 is SUPERSEDED by this one: RED proofs exist for the guards listed in Debug Log (b)–(c) and
  (e), and the Auditor reports none recorded for trigger rules (c) and (d′), guards (0b), 3b, 3c, 4 and 5, `verifiedSnapshot`'s Pariwar / actor checks,
  the projector's `from_district` check, the QE7 checks and `resolveValue`'s fail-closed leg — those are covered by green tests only (the Auditor's
  reading of Debug Log (b)–(c), not independently re-verified) [⚠ CORRECTED 2026-11-04 by review round 3, R3-7: `resolveValue`'s fail-closed leg
  (`registrationDistrict`) had NO test — it was protected by construction (the DTO 400s a non-string district before the hooks; the core denies a
  null target, green in `check.test.ts`); a unit test now exists] [⚠ CORRECTED 2026-11-04 by review round 3, R3-15 / R3-14: "the QE7 checks"
  held for the COMMANDS' copy only — the PROJECTOR's own actor check (QE7's third place; the only guard on a transition's `actorId: null`) and its
  `from_state` / `to_state` cross-check had no test that could fail (every leg went through a command, or the payload schema refused first);
  projector-direct legs now exist]; R9 Task 12's `decision-flow-sync` clause split out, unchecked; R10 AC9 / QE18 (e)
  point at the widened fence. D1 (list cursor and index) is carried to 13.1a and D2 (marketplace helper extraction) is BigDev's to schedule — both in
  `deferred-work.md`. UNCOMMITTED; `ci:local` NOT re-run since `ce80bd64`; Status stays `review`.
- **v1.20 (2026-11-03) — IMPLEMENTED (`bmad-dev-story 13.1`).** Task 0.1 re-verified at `268d86b5` (migration `0200`, catalog 58 →
  59, roster Row 48, ledger `l`; 0 orphan codes; no recorded answer changed); Task 0.4 roster Row 48 `field-worker-registration-live`.
  Built: migration `0200_field-workers.sql` + the `field_workers` schema / RLS + 13.2's composite FK; the `fieldWorker` primitive
  (seven events, reducer, projector, seven commands, reads, as-of read); the RBAC core's `authorizingGrant` / `authorize` /
  `VerifiedAuthorization` and the hook's stored result; `field_worker.register`; the registration route + contracts + OpenAPI; the
  `field-worker-state-invariant` gate and `FIELD_WORKER_ROOTS`; 13.2's specs repaired. Every guard RED-proved (Debug Log (b)–(c)).
  One recorded VARIANCE: the `authorize(` source fence also names the domain field-worker test fixture, by exact path (Debug Log
  (c)). `ci:local` 38 / 38 on a fresh container (Debug Log (d)). Status → review; row `13-1` in-progress → review. Nothing is live
  (Row 48 gates go-live).
- **v1.19 (2026-11-03)** — the v1.17 / v1.18 PATCH (`9c0050fc..7fefe8dc`) and the `-442` fixup were reviewed by three fresh
  read-only reviewers (technical; governance; consistency) — BigDev: "run the review of the fix diff", then "apply all" — ALL
  applied. GOVERNANCE, BEFORE PUSH (autosquashed fixups; each squash left the tree byte-identical): `-441`'s verbatim quote restored to
  "yet to be Join" (the relay's word); `-442` QE18 RESTORED to its v1.16 text — the v1.17 fixup had folded later design into an
  entry whose record is v1.16 — with three missing quotes added and its pre-push corrections disclosed; `-443`'s readings narrowed to
  the options' own words and its citations re-pointed; NEW author-commit `-444` (`86274245`) records the later QE amendments (QE5,
  QE10, QE11, QE13, QE18, QE20). SHAs re-mapped throughout. HIGH: `authorize(params: RequirePermissionParams, ctx?)` takes the actor
  and wraps a shared pure `authorizingGrant`, and `matchingGrantRole` is re-pointed to that helper with its signature unchanged
  (v1.17's `authorize(grants, key, resource)` had no actor, so the fixture could never pass AC5) — QE18, AC9, Task 8, Task 10 (2),
  TR13, Dev Notes; Task 0.3 and AC0 name all four decisions and the next id ≥ `-445`. MEDIUM: a `post` target is judged only under
  the lock and any mismatch is `FieldWorkerAuthorizationStaleError` (QE5, QE18 (d), AC5, Task 11); `ended_on` uses the
  transaction-start IST clock (not the `IST_TODAY` constant, which is `clock_timestamp()`), compared as `YYYY-MM-DD` text, malformed
  refused in guard (0b) before SQL, with an upper-bound stub proof and a lower-bound live proof (QE5, QE20, AC5); QE9 copies
  `tenantWrite` unchanged (it opens the transaction before `run`); AC8's concurrent loser is found by Pariwar and action; the
  snapshot's `target.value` may be null for a global gate; `field_workers_state_reason_subset` in QE4 and Names; Q-7 C is no longer
  called a build default (header, Task 0.2). LOW: ledger letters and roster legs (a)–(i); delete / truncate trigger names; the
  snapshot's nullable `grant.value` in Names; AC6's stray TR6; Task 1 tagged AC13 with a disjoint-hash test; "six callers"; the
  `matchingGrantRole` tie behaviour stated; the DELETE lock wording; `lockTruncateSetNowait` inside `BEGIN … ROLLBACK`;
  `marketplace.pgSqlstateOf`; `seedCapture`'s real file; both label strings; no bare ⛔ in Task 8; the HISTORY line; the
  `GUARD_COLUMNS` homonym; AC8 split into (a)–(k); "13.1 C11" in cross-file citations; C11's 8-year note. Companions: `epics.md`
  (the 13.1a gate's Q-8 / Q-9 attribution; 13.1 C11 marked no owner), `deferred-work.md` (header with `-444`; 13.1 C11), ledger
  `2026-11-03k` (and `i` / `j` corrected). No code.
- **v1.18 (2026-11-03)** — THE PANEL RULED on the follow-up note, relayed by BigDev: *"by DR and KB / Q1 A, Q2 C, Q3 A, Q4 A"* —
  recorded as decision `2026-11-03-443` (committed alone, `7cd400f2`, with the note's ruling block). BigDev confirmed the Panel
  ruled on the note as revised in v1.17 (`88243907`: Question 4 A reads "if the District Admin is not available"). Q-6 A (consent,
  or a Pariwar Admin directly), Q-8 A (the fill-in not enforced; the log records the authorisation) and Q-9 A (the District Admin
  registers, the Pariwar Admin approves) MATCH the build defaults QE17, QE18 and QE21. Q-7 C is NOT our suggestion: a new
  registration now (QE19, as built) plus a link between the person's records later — carried as C11 with no row (BigDev: "Carry it,
  no row"). NO AC requirement or Invariant changed; Task 0.2 was brought up to date. Edited: the header, NUMBERS (next decision ≥ `-444`), the Sources table, the QE
  status paragraph, QE17, QE18, QE19, QE21, Q-6…Q-9 (DISCHARGED, text kept), the Q-2 recommendation line, Task 0.2, C11, References.
  Companions: `epics.md` (13.1 VARIANCE, 13.1a / 13.1c / 13.1d gates MET, 13.5 INHERITED gains C11), `deferred-work.md` (header
  and C11), ledger `2026-11-03j`. No code.
- **v1.17 (2026-11-03)** — VALIDATED a third time (`bmad-create-story validate 13.1`) by four fresh-context read-only verifiers at
  `268d86b5` (code claims; database + domain; governance + consistency; API + RBAC + tests): 1 critical, 9 high, ~20 medium, ~10 low
  after de-duplication, each substantive one re-checked in the repo by the author. BigDev: "apply all findings once the other verifiers
  report" — ALL applied, with the author's recommendation on the three choices (drop `{ instant }`; fix `-442` before push; one owner
  per key). (0) BEFORE this edit, the unpushed decision `-442` was corrected by a fixup squashed into its own commit (now `6a3172e4`;
  the story commit is now `9c0050fc`): §0 (3) said `-441` ratified the key's `district` dimension — the Panel ratified the HOLDERS
  only, the dimension is the author's; BigDev's v1.13 words, missing from its verbatim list, were added from the session record, and
  "What do you say?" restored to the v1.16 quote; QE21's "when there is no District Admin" became BigDev's "if the District Admin is
  not available"; QE18 names `matchingGrantRole`'s order and `checkPermission` unchanged. CRITICAL: Task 0.3 told the dev to commit
  `-441` / `-442` again — now `[x] DONE` with the SHAs; the header, NUMBERS (next decision ≥ `-443`), the QE heading and AC0 say the
  same, and every older version paragraph is marked HISTORY. HIGH: TR13 / QE18 — the repo already has `rbac.matchingGrantRole`
  (`-270`), so `authorize` uses its order and it is re-pointed (one rule, not two); `VerifiedAuthorization` is deep-frozen, carries the
  resource's `pariwarId` and the `actorId`, a nullable `grant.value` for a global grant, and `checkPermission` stays unchanged (its
  test pins `{ ok: true }`); Task 8 now runs right after Task 2 (the commands and the API fixture need it); AC7's `TRUNCATE … CASCADE`
  leg locks the FK set first (TR14 — the parallel-suite deadlock) and states each role's SQLSTATE; the `{ instant }` arm of
  `getFieldWorkerStateAt` is DROPPED (13.2 AT4 (c): the instant is named, never passed; every proof now seeds a capture); key
  ownership is one rule in every place (each per-act key minted by the story that builds its route: 13.1a, 13.1c, 13.1d; 13.6 adds
  only labelling values); I8's code carve-out removed. MEDIUM: `FieldWorkerAuthorizationStaleError` (409) for a move that loses a
  race (QE5 guard 3c, AC5, AC6 (e)); the `lockedRow` shape and the `from_district` cross-check (QE13); `ended_on` as a string date,
  bounds as IST days in SQL, `terminate`'s statement order with NOW (QE4, QE20, AC5, AC6); `postFieldWorker` accepts any verified
  district key until the move keys exist, and the minting story narrows it (QE17, AC5, C5, C10); the gate guards all eight I1
  columns (AC11, Task 9); I10 is true for every role — a `BEFORE DELETE` / `BEFORE TRUNCATE` trigger (Task 2.2, AC2); the
  migration is never applied to the shared `:5432` / `:5433` before merge (TR2); the Policy-meaning label is "AS BUILT INTO THE
  PREDICATE" and the activation clock edge is stated (AC10 (8)); QE9's handler order puts the district check before the KMS calls,
  copies `tenantWrite` with that body, and states what "nothing written" means; AC8's authorization equality is checked against the
  seeded `role_grants` row plus a handler `toBe` test, and its concurrent loser is forced deterministically; the hook's test lives in
  `apps/api`; the API fixture mints its authorization with the real `authorize`; TR15 (a reused idempotency key with a different body)
  homed in 13.1a; QE4 / TR12 say a move gates on either end; QE8, QE11, the Q-2 answer, Q-3, Task 0.4's legs (f) / (h) and tail
  (+ leg (i)) corrected; Dev Notes say seven events; the Project Structure lists the RBAC-core, `types.ts`, `context.ts` and 13.2
  schema files. LOW: Errors-table rows for the door's programming errors, a KMS failure and the composite-unique genesis race; a
  failing flag write never replaces the 503; the exhaustion spy and the full cleanup list; the hook's `??=` and the 132-caller count;
  `actorRole` and `hashShape`; `state_trustee` is a non-holder, not inert; catalog entries carry no dimension; trigger rules (d′) /
  (e′) and the reason-subset CHECK; AC2's full 23514 list; I3 / I6 wording; the capture join's aliases and decoy; replica-mode
  seeds pass real worker ids; 55P04 for 13.6; 38 `ci:local` jobs; a `FIELD_WORKER_ROOTS` const; the OpenAPI response list; the
  replayed 201 carries no code; the 409's cross-district disclosure accepted; the crypto helper's path; no normalising of `district`;
  13.1d in the summary and Task 0.2; QE9's stale Q-1 tail; QE17's supersede pointer; QE19 / QE21 "asked" → drafted; §0 row 5; Sources
  and References gain `-441`, `-442`, `-270`; Q-6 "three times"; the catalog bump written as +1 from `main` (14.3 contends).
  Companions (by a helper, reviewed): `epics.md` (13.1 VARIANCE, 13.1a–13.1d, the five INHERITED blocks), `deferred-work.md` (the
  13-1 section, C2 / C4 / C5 / C7–C10), the DRAFT follow-up Panel note (every earlier version of Question 1 disclosed; the told line
  no longer presents option A as decided; "not available"); ledger `2026-11-03i`. The note and the counsel question stay NOT sent.
  No code.
- **v1.16 (2026-11-03)** — BigDev: "well I think request should be made by sending District Admin to receiving District Admin. There should be
  mechanism to accept to refuse with reason. What do you say?", then "Yes to all four, mint 13-1d". (1) The move rule becomes CONSENT
  (QE17, Q-6): the District Admin at EITHER end opens a request at the worker's request; the other accepts or refuses with a reason from a
  fixed list (no free text); the worker stays put until accepted; the opener may withdraw; unanswered for 7 days ⇒ the Pariwar Admin,
  never accepted by default; a Pariwar Admin may move a worker directly with either reason and settles refused or unanswered requests.
  v1.15's "a District Admin records the move alone" is SUPERSEDED; its either-end gate target stays, because the ACCEPTING District
  Admin may be at either end. (2) Row `13-1d-field-worker-move-requests-and-notices` minted (a small request primitive, the escalation
  sweep, and the notices); `13-1c` is narrowed to the Pariwar Admin's direct move, suspend / reactivate / terminate and the log's read. The
  notices — email AND in-app — are consumers of the events, so they also cover a Pariwar Admin's direct move (both District Admins told,
  not the actor): this settles v1.15's proposal to tell the receiving District Admin. (3) Edited: QE17 (who may move, costs, decisions),
  Q-6, the Q-2 answer, the Which-routes row, `postFieldWorker`'s route sentence, C5 and the new C10; `epics.md` 13.1c and the new 13.1d;
  `deferred-work.md` C5, C9-adjacent counts and the new C10; the unsent Panel note's Question 1; the ledger. NO AC, Task or Invariant of
  13.1 changed — the command, the event, the either-end target and the reason list are as v1.15 left them.
- **v1.15 (2026-11-03)** — BigDev: "Yes, widen it to the current District Admin. For notification both emai and in-pp" (as typed). (1) The move
  rule is WIDENED: at the worker's request the District Admin the worker is leaving, the one they are joining, or a Pariwar Admin
  records it (`reassigned` stays Pariwar-Admin-only). The gate's target is EITHER end of the move — the route tries the destination,
  then the current district — and the snapshot records which passed; AC5 now accepts exactly those two targets and refuses any other.
  A stale current-district target after a concurrent move is refused by the command; how the route tells the caller is 13.1c's. (2) The
  notice to the District Admin who loses a worker goes by BOTH email AND in-app, and not to a District Admin who made the move
  themselves. TRACED: no District Admin notice exists by either channel; email follows 6.25 (the Tier-1 admin email, ADR-0040 fence),
  in-app follows 6.20 D14's admin read surface. (3) PROPOSED, not applied: notify the District Admin who RECEIVES a worker another
  officer moved — the widening makes that officer the one who would not know. Edited: QE17 (who may move, costs, decisions), AC5, the
  Task 11 legs, Q-6; `epics.md` 13.1c; `deferred-work.md` C5; the unsent Panel note's Question 1. No Invariant changed.
- **v1.14 (2026-11-03)** — BigDev: "No, Pariwar Admin should not be blocked. At request by worker can be placed to either District
  Admin or pariwar admin to change the reporting authority. Yes losing district admin should be notified." (1) The two open costs in
  QE17 are DECIDED: the Pariwar Admin may record either reason; the District Admin a worker leaves is notified, not asked. (2)
  TRACED for the notice: the platform has NO general notice to a District Admin — Story 6.25's staff-email child mails Pariwar Admins and
  decrypts the Tier-1 admin email under a fenced allowlist (`apps/jobs/tests/staff-email-identity-read-fence.test.ts`, ADR-0040); so
  the channel, the recipient resolver (District Admin grants at `from_district` when it is sent; none ⇒ nothing sent), the fence
  entry and whether the notice names the worker are 13.1c's create-story decisions. (3) NOTHING IN THIS STORY'S BUILD CHANGES: the
  `posted` payload already carries what the notice needs. Edited: QE17, Q-6, `epics.md` 13.1c (an AC and its open questions),
  `deferred-work.md` C5, the unsent Panel note's Question 1. No AC, Task or Invariant of 13.1 changed.
- **v1.13 (2026-11-03)** — BigDev (verbatim, as recorded in `-442`): "well, I don't want to restrict worker movement because a
  school may sits near another district boundary and visiting that school would cost money and time again, so we have to figure
  out. May be we make reporting authority to District Admin , that can be changed only if worker request themselves that reporting
  is difficult or make the reporting authority Pariwar Admin directly. But I don't want to put a lot of workload on Pariwar Admin as
  well. What comes up your mind ?", then: "Yes, go ahead and rewrite them, but there can be situation when we need to move worker
  under new reporting authority, so apart from Worker request, pariwar admin should be able to move the worker". (1) QE17 REWRITTEN (second revision): `district` is the worker's REPORTING district, not a work area —
  traced, the landed attribution-code module (13.2) never mentions district, and credit follows the lifecycle state only; the
  identifier stays `district`. (2) `posted` gains a REQUIRED `reason_code`: `at_worker_request` (the receiving District Admin or a
  Pariwar Admin) or `reassigned` (a Pariwar Admin only). It lives in the event only: `state_reason_code` is untouched, and the fold's
  `reasonCode` ignores `posted`, so a suspended worker who is moved keeps their suspension reason. (3) A MOVE gates on the DESTINATION
  district (AC5's target); suspend, reactivate and terminate still gate on the CURRENT district. This supersedes `-441`'s build
  reading for the move only — Task 0.3's author-commit says so; `-441` is committed (`93b7e419`) and is NOT edited. (4) 13.1c mints TWO
  per-act keys, one per reason, `reassigned` held by `pariwar_admin` only; the route maps reason to key; 13.1 mints neither. (5) QE12
  gains a sixth neutral value, `reassigned`. (6) Q-6 and Question 1 of the unsent Panel note REWRITTEN; the note's §0, stake, trust,
  plain-English and evidence text follow. (7) Edited: QE5 (row + guard order), QE6, QE12, QE17, AC3, AC4, AC5, the Names enum row and
  district row, the column table, the errors table row, Task 6, the Task 11 posted legs, Task 0.3, Q-6; `epics.md` 13.1c;
  `deferred-work.md` C5. NO Invariant changed. COSTS recorded in QE17: "at the worker's request" is the admin's attestation; the
  District Admin a worker leaves is not told; a Pariwar Admin may record either reason.
- **v1.12 (2026-11-03)** — BigDev: "Approve QE22 - yes. Q-3 - yes it states. Q-4 - No." (1) QE22 APPROVED (B): the registration 201 is
  `{ field_worker_id, district, current_state, kyc_status }` with NO code; the code is still allocated in the same transaction and
  the handler never copies it into the response, a log or an audit field. Edited: QE9, QE22, AC8 (the 201 shape; a body that
  does not contain the code read through the door), Task 7 (via QE9), TR11 (a lost 201 now loses the worker's id, not a code;
  homed in 13.1a), C9, the Q-2 ask. The `epics.md` VARIANCE and 13.1a entry, `deferred-work.md` C9 and the ledger follow. (2) Q-3: "yes
  it states" is recorded as CONFIRMED for both parts of what was asked — the form states the purposes AND records the worker's
  agreement — on BigDev's word. Option (A) is MET; roster leg (b) is met; the counsel question loses its first question and keeps
  three (the classification, the 8 years, erasure before them). The WORDING of the purposes is not recorded; whether they reach
  the SMS (13.1b) and payment (13.5) is theirs to re-check. (3) Q-4: No — no code handed out by hand; roster leg (c) is met on
  BigDev's word. (4) Task 0.2's HALT is LIFTED; Task 0.4's legs (b) and (c) are marked met. NO Invariant changed; the only
  AC change is AC8's response shape.
- **v1.11 (2026-11-03)** — BigDev: "Well District Admin recruits and Pariwar Admin approves, and code can be sent only when the worker is approved. So both cannot be done in 1 step.  mint 13-1a, 13-1b, 13-1c". (1) Q-2 DISCHARGED: the three rows are minted (`13-1a-field-worker-approval-and-code-hand-over`, `13-1b-field-worker-code-by-sms`, `13-1c-field-worker-moves-suspension-and-termination`; `backlog`, directly after this story's row in `sprint-status.yaml`; an `epics.md` entry each, with its gates: 13.1a — Q-9 and Q-8, 13.1b — the DLT template and the roster's purposes leg, 13.1c — Q-6 and 13.6's C4 for the terminate route). (2) QE21 CONFIRMED as answered: registration and approval are two steps by two officers, option C stays out. (3) NOT applied: QE22 — "the code can be sent only once approved" is about SENDING, and whether the registration 201 still shows the code to the registering admin changes this story's route shape (QE9, AC8, TR11, Task 7), so it stays PROPOSED until BigDev says yes; the B2 nod is 13.1a's create-story's. (4) Edits: the Q-2 ask, Task 0.2's HALT (Q-2 removed), the "no owner in Epic 13" and Which-routes lines, the C5 and C9 headings, the header, the `epics.md` VARIANCE bullets, `deferred-work.md` C5 / C9 and the ledger. (5) The 8-year removal (C5) has NO row: it is carried in 13.1c's entry, to be named an owner before the first terminate route reaches a real worker. NO AC, Task or Invariant changed.
- **v1.10 (2026-11-03)** — BigDev described the onboarding process and answered QE20 / QE21. (1) QE20 APPROVED ("actual last
  day"): the `terminated` payload carries `ended_on`; it is projected into a nullable `date` column with
  `CHECK ((current_state = 'terminated') = (ended_on IS NOT NULL))`; the fold derives `endedOn`; `terminate` refuses an `ended_on`
  that is missing, in the future or before the registration day (`FieldWorkerEndedOnInvalidError`, 422, no route yet). Edited: I1,
  I4, QE4, QE6, AC4, AC5, the Errors table, the Names constraint list, Tasks 2.2 and 4. (2) QE21 ANSWERED: the District Admin
  registers, the Pariwar Admin approves, the Pariwar Admin does both when there is no District Admin. Registration stays as built
  (`pending_kyc`, `kyc_status = pending`); approval is a later act by another officer, so option (C) is OUT; the approval route
  (PROPOSED: it records `kyc_completed` and `activated` in one transaction, key `field_worker.approve`, held by `pariwar_admin`, gated
  on the worker's current district) belongs to the owner of Q-2 and awaits BigDev's nod. The system does not stop one person
  registering and approving (Q-8, default A). (3) QE22 PROPOSED: withhold the code from the 201, because the code reaches the worker
  by SMS after approval and an early hand-over is the gap QE11 warns of. (4) Q-3's RESULT carries the form's name and version
  ("Application for Field Worker", version 1); the purposes and the recorded agreement are still not stated. (5) Q-9 (who approves)
  added; drafted as Question 4 of the unsent follow-up Panel note, which now has four questions. (6) C9 carried: the approval route,
  an audited code-read route for the by-hand case, the SMS (TRACED: a sender for non-member recipients and a DLT-approved template
  do not exist; the worker's number is Tier-1 ciphertext, so sending needs a purpose-limited audited decrypt; the send happens after
  the approval commits), and the screens; the SMS is not on the critical path, because the by-hand path is sanctioned. (7) The Q-2
  RECOMMENDATION is written: three stories — 13-1a (approval, code read, screens; the critical path), 13-1b (the SMS; parallel),
  13-1c (move, suspend, reactivate, terminate with `ended_on`, the log's READ; terminate waits on 13.6's C4) — none folded into 13.1;
  BigDev mints the rows. (8) The counsel question carries the form's name and version. NO AC OR TASK beyond item (1) changed.
- **v1.9 (2026-11-03)** — BigDev's answers. (1) THE FORM CHECK (Q-3): the form tells the worker that the Trust keeps their name and
  mobile number electronically, for as long as they are employed, and removes them 8 years after the date of termination. Recorded as
  CONFIRMED by BigDev (the session has not seen the form): the electronic keeping and the retention period. NOT stated, so
  UN-ATTESTED: the purposes, the worker's recorded agreement, the form's name and version. Consequences: the roster legs (b), (e), (f),
  (g) say so (Task 0.4); C5's erasure path becomes a dated obligation — an anonymize command for TERMINATED workers only, scrubbing the
  three PII columns while the row, the code, the introductions and the whole log stay, due 8 years after the first termination; the
  counsel question is narrowed again (the purposes only if the form is silent; the classification, because the form says "employed"
  while the PRD says contractors; whether 8 years is sound; erasure before it). (2) QE20 PROPOSED — the 8 years run from "the date of
  termination", but the event's `occurred_at` is when the admin RECORDED it; the payload would carry an `ended_on` the admin supplies.
  (3) THE IDENTITY CHECK is performed in the interview, before registration: QE8 is updated and QE21 PROPOSED — whether registration
  also records `kyc_completed` and `activated` (A as built, B, or C ⭐), which decides whether any worker can be credited without routes
  nobody owns yet. (4) BigDev asked how a code is handed out today. TRACED: it is not — nothing in the system issues one (no route,
  screen or script calls the allocator) and a member's typed Reference Code is stored as unchecked text; recorded under Q-4. NO AC OR
  TASK CHANGED: QE20 and QE21 await BigDev.
- **v1.8 (2026-11-03)** — BigDev APPROVED QE18 with two conditions: (1) the role recorded must be a VERIFIED authorization RESULT, not
  merely a handler's assertion; (2) it is recorded as an authorization SNAPSHOT. WHAT WAS WRONG: v1.5–v1.7 had the HANDLER compute
  `acting_role` from `request.scopeGrants` with `scopeContains` and pass it in — a second computation that could disagree with the real
  gate, written into an append-only log; and `hasPermission` returns on the FIRST satisfying grant in load order, so "which grant
  passed" was never defined. APPLIED: QE18 rewritten — the RBAC core gets one shared per-grant predicate, `authorize` (the MOST
  SPECIFIC passing grant, deterministic), an unforgeable `VerifiedAuthorization` (module-private WeakSet), `requirePermission`
  returning it, an optional `grantId` on `EffectiveGrant`, and `requirePermissionHook` storing it on `request.authorizations[key]`;
  `acting_role` is replaced everywhere by an `authorization` snapshot `{ permission_key, role, grant, target, catalog_version }`
  (QE6, QE17, AC3, Names); the domain commands refuse a result that is missing, forged, from another Pariwar or not this act's (AC5,
  Errors table); AC8 asserts the stored snapshot EQUALS what the gate returned and pins "most specific wins"; AC9 gains the RBAC-core
  tests (agreement with `hasPermission` over the whole existing matrix, order-independence, unforgeability, the denial path
  unchanged); Task 7 passes the stored result and never recomputes; Task 8 carries the RBAC-core edit; TR13 and C5 follow. PRECEDENT
  found on the way: decision `2026-08-13-105` D4 — "the grant that actually authorized", not "the first grant in the tenant". COSTS
  recorded in QE18: the snapshot does not capture the role's permission list then in force (bundles are editable, FR-44); a grant id
  may point at a deleted row; most-specific-wins logs a dual-grant actor as the District Admin. The unsent Panel note, `-441`'s
  build-reading item 3 and the ledger are updated to match.
- **v1.7 (2026-11-03)** — BigDev APPROVED the v1.6 proposals (the current-district model with a seventh event `field_worker.posted`;
  QE19, a move to another Pariwar is a new registration; the follow-up Panel note) and told us how workers are recruited: a PHYSICAL
  FORM, an INTERVIEW, and acceptance of the ORGANIZATION'S TERMS, all before anyone registers them. APPLIED: the lines v1.6 had left
  superseded are rewritten — events are SEVEN (QE6, QE7, I7, AC3, Names, Task 3); `district` is a PROJECTED column (I1, I3, I4, the QE4
  row, the guard's projected list in Task 2.2); the `posted` arms, the fold, the command `postFieldWorker` and its guard order (QE5,
  AC4, AC5, Tasks 4 / 5 / 6); a district-unchanged error (Errors table, AC5); a race for `post` vs `terminate` (AC6 (e)); the view
  carries `district` (AC10). RECRUITMENT FACT: Q-3 is REWRITTEN — the footing and notice for the worker's name and mobile may already be
  in the form and terms the worker accepted (BigDev checks them; the session has not seen them), so counsel's question is narrowed to
  a review of those documents plus classification, retention and erasure, and is sent only if the check does not settle the footing
  (Task 0.4 (b) follows); the summary, edge 5 and the Privacy-Policy paragraph no longer say the worker is simply told nothing; QE8
  carries a new question — does the interview already verify identity? New asks Q-8 (is the fill-in enforced); Q-6, Q-7 and Q-8 are
  DRAFTED in `trustee-panel-routing-note-2026-11-03-story-13-1-moving-workers-and-fill-in.md`, ⛔ sent. STILL OPEN: QE18 (BigDev has
  not approved it), Q-2, Q-3's form check, Q-4, and whether the interview already verifies identity (QE8). Companion edits: the
  revised counsel question, `epics.md`, `deferred-work.md`, the ledger.
- **v1.6 (2026-11-03)** — BigDev's correction to v1.5: field workers do NOT belong to one district. The work in a district completes
  within a few months and the worker moves to the next district rather than the Trust hiring and training someone new, and workers
  will also move between Pariwars. WITHDRAWN: QE17's immutable district, and its cost line "a move is an ending plus a new registration"
  (which would have ended the person and issued a new code every few months). PROPOSED INSTEAD (nothing approved yet): QE17 REVISED —
  the district is a CURRENT, projected value changed by a seventh event `field_worker.posted` (history = the stream, which is also the
  Panel's "full log"); QE19 — a move to another Pariwar is a NEW registration there (the landed registry and the per-Pariwar tenancy
  allow nothing else; the member-posting precedent took the same line); Q-6 (who may move a worker between districts) and Q-7 (the same
  person across Pariwars) put to the Panel as non-blocking. WHAT STILL STANDS: the Panel's ruling `-441` (its words did not change);
  the key gated at `dimension: 'district'` and held by `district_admin` + `pariwar_admin` — now against the worker's CURRENT district;
  QE18 (`acting_role`). Companion edits: `-441`'s "what follows for the build" item 2 and its trust note (uncommitted, corrected
  before any commit). NOT yet rewritten, pending approval: I2, AC1, AC3, AC8, Tasks 2.2 / 3 / 5 / 6 / 7 / 10 and the registry
  coverage (see the status header).
- **v1.5 (2026-11-03)** — THE PANEL RULED (decision `2026-11-03-441`, by DR and KB, relayed by BigDev): **Q1 — option A, widened:** a
  District Admin may add a field worker (the intended manager of field workers), the Pariwar Admin fills in "if District Admin is
  unable to discharge his duties for any reason, including … yet to Join"; **"Keep the full log of field worker"**; **Q2 — A:**
  credit only once active (as built). Q-1 and Q-5 are DISCHARGED; roster legs (a) and (d) are MET by `-441`; no supersede line is
  needed (13.2's C1 asked for a Panel-ratified key). WHAT CHANGED IN THE BUILD: (1) the key's holders and gate — v1.4 had
  `field_worker.register` at `dimension: 'pariwar'` held by `pariwar_admin` alone; a District Admin's grant would have been INERT
  against that gate, so the key is now gated at `dimension: 'district'` and held by `district_admin` (own district) and `pariwar_admin`
  (every district in its Pariwar), which `scopeContains` rule 5 makes pass for BOTH (Names table, G10, G12, QE9, QE10, AC8, AC9,
  I14, Tasks 7 / 8); (2) QE17 (PROPOSED) — a `district` column, a listed district checked by `assertDistrictRecorded` (the same two
  reads as 12.2's wizard), the body's district as the gate's target (`resolveValue`, TR12), the stored district as the target of
  every later act; (3) QE18 (PROPOSED) — the genesis payload carries `acting_role`, so a Pariwar Admin's fill-in is visible; the
  fill-in itself is NOT enforced (the system cannot know "unable for any reason"); (4) I15 — the full log is kept, with a note that
  nothing yet lets anyone READ it (Q-2's owner); (5) AC8 / AC12 / AC13 / Task 7 / Task 8 are UNCONDITIONAL (they waited on the
  ruling); (6) the district legs in AC8 / AC9 — a District Admin of the same district succeeds, of another is refused, a Pariwar
  Admin succeeds anywhere, an unlisted district is 422; (7) Tasks 0.2 / 0.3 / 0.4, C4 / C5 / C7 / C8 and the Policy-meaning label
  ("AS BUILT … CONFIRMED by the Panel"). NOT covered by the ruling and kept open in `-441`: whether the fill-in is enforced; the
  scope of "the full log"; what "manage" covers beyond adding. Companion edits: `.decision-log.md` (`-441`, uncommitted), the Panel
  note (ruling block), `epics.md`, `deferred-work.md`, `sprint-status.yaml`.
- **v1.4 (2026-11-03)** — QE11 SETTLED by BigDev ("approved and settled — the implementation rule is active only"), so Q-5's BUILD rule
  is settled; Q-5 is no longer open as a build question. Two notes DRAFTED (⛔ sent): the Panel routing note
  `trustee-panel-routing-note-2026-11-03-story-13-1-field-worker-key-and-credit.md` — Question 1 = Q-1 (who may add a field worker;
  written for the non-blocking confirm, option (B)) and Question 2 = a non-blocking confirm of Q-5's rule, put to the Panel because a
  who-is-credited-and-so-paid choice is never filed as an author's call — and the counsel question
  `counsel-question-2026-11-03-field-worker-data-basis.md` for Q-3 (counsel's, never a Panel note — the roster Row 19 precedent).
  Q-2 (who owns the rest of the lifecycle) and Q-4 (any code handed out by hand) are BigDev's own and are not in either note. The §0
  gate was applied to each of Q-1…Q-5 before any note was written. FOUND while preparing the note: this file and the v1.2 pass had
  PASTED text from the private legal corpus (a Trust Deed clause, a Privacy Policy sentence, a Niyamavali phrase) into a tracked file of
  a PUBLIC repo — contrary to [[project_legal_corpus_private_repo_split]] ("cite sections by number; never paste the text"); all three
  are now section citations. Also: `workplace.manage` (adding to the workplace list) is held by the Super Admin alone while Pariwar
  Admins hold `news.manage`, `module.manage` and `known_people.run_campaign` — verified in the role bundles, and the reason the note
  offers "only the Super Admin" as option B; six decisions (not three) mention field workers, none ruling on who adds one.
- **v1.3 (2026-11-03)** — BigDev's answers and two corrections. (1) QE1–QE16 APPROVED as listed ⭐ (BigDev, in session), with QE10 =
  the per-act key `field_worker.register` (`field_worker.manage` rejected; the suspend / terminate keys are 13.6's) and QE12 = the
  five neutral reason values (`conduct_concern`, `conduct`, `fraud_confirmed` are 13.6's to add) — applied to the Names table, §0
  edges 4 and 8, QE9–QE12, Q-1, AC9, I14, Tasks 0.2 / 0.3 / 8, and to the `epics.md`, `deferred-work.md` and ledger text; recorded
  in the story, NOT yet in a decision entry (Task 0.3 writes it, and needs Q-1…Q-5, still open); QE11's approval is the build
  default and Q-5 stays open. (2) AC6 corrected: the isolation level of each race (READ COMMITTED for the lock-order races,
  REPEATABLE READ with a pre-barrier snapshot only for genesis — a lock waiter at RR gets 40001); the exact outcome sets (terminate
  always fulfils; suspend either runs first or rejects with `FieldWorkerIllegalTransitionError`); the KYC race's loser error;
  constraint-disjoint fixtures for the genesis race (same id, different mobile) and the mobile race (different ids, same mobile) —
  v1.2's wording let one fixture trip either constraint; the loser's SAVEPOINT / no-event post-conditions; I4 after every race;
  and an honest split: the race is a probabilistic smoke, I13's order is pinned by a deterministic per-command unit test with a
  RED proof. (3) AC10's ordering contract written once, in AC10: events ordered by `event_version`; the answer is the longest
  PREFIX cut at the first event stamped after the instant — not a per-event filter (a transaction that began first but won the
  lock second gets the higher version and the lower stamp, so a filter replays a state the worker never had: `active` with
  `kyc_status = pending`); ties included; compared in SQL at µs; `'now'` uncut; an empty prefix is `pending_kyc`; the clock
  domains (`occurred_at` and `captured_at` are the transaction-start `now()`, 13.2's `allocated_at` is `clock_timestamp()`) and the
  residual window; and four proofs (the RV1-shape inversion, the tie and µs order, `'now'` = the projection, the edge cases).
  TR10 and Task 11 follow.
- **v1.2 (2026-11-03)** — validated a SECOND time: three read-only verifiers (domain / database / events / gates; API / RBAC / the
  13.2 door; governance / policy / continuity) plus the author's own consistency read; 31 findings, 0 critical, each substantive one
  re-verified against the repo or the decision log before it was applied. The pin is current (`origin/main` = `268d86b5`) and the
  door was shown to work under a real admin route. Applied: (1) the `⛔ HALT` in the header and Task 0.2, and seven bare `⛔`
  negations in ACs / Tasks, rewritten in plain words; (2) AC12's greps corrected to the baseline's hits; (3) the Policy-meaning
  sentence marked AS PROPOSED, with the non-recovery clause and the Q-5 (B) wording; (4) I6's trigger leg made real (Task 2.2's own
  rule, an AC2 leg); (5) QE9 — a shape-only DTO, the content rules in the handler (422), the idempotency rows and codes; (6) the
  Errors table split into HTTP-reachable rows and command-only rows (a mapper unit test); (7) Task 6's helper imports (`pgSqlstateOf`;
  `findPgError` is private) and the duplicate-mobile accessor and constants; (8) contracts re-declare the enums, with a sync guard,
  the barrel and `.openapi` names; (9) Task 10 — a unique `mobile_blind_index` per seed, an `apps/api` fixture of its own, the domain
  repairs in the migration's commit; (10) Q-1 reframed ("add", not "add and remove") with the per-act key `field_worker.register`
  as a documented alternative — the default stayed `field_worker.manage` until BigDev chose the per-act key (v1.3); (11) Task 0.4 / C7 — the go-live row's eight legs (incl.
  a production path to `activated`) and a drafted counsel question; (12) G17 and C8 — a worker's second job; (13) Task 0.3 amends
  the story to the recorded answers; (14) `getFieldWorkerStateAt` — a local `FieldWorkerAsOf`, a `TypeError` before SQL,
  `FieldWorkerCaptureNotFoundError`, the clock-domain note; (15) the guard order of every command; (16) Task 8's real file list;
  (17) `confdeltype = 'a'`, and no hard-coded index-def string; (18) the exhaustion leg in its own spec and the logger-capture
  mechanism; (19) QE9's audit details (a loser's intent line, `resourceLocator`, state fields from the genesis return); (20) no
  audit-row COUNT assertions (asynchronous KMS lines), and the audit-action regex; (21) small pointers (the Drizzle FK name, the HMAC
  twin `correction-crypto.ts`, the drift-check command, RBAC before the route); (22) the 13.8 wording is a Panel question and must
  not reuse 3.6's unknown-code copy; (23) 13.5's block names the state-as-of-capture check; (24) C5 — no terminate route before C4,
  and edge 7's real reason; (25) edge 9 / QE8 corrected; (26) QE12 option (B), neutral reason values, as a documented alternative,
  and F7's wording; (27) edge 5 is counsel's, and Q-3 gains its deciding fact and options; (28) the `-433` quote; (29) Q-1 / Q-3 /
  Q-5 in the template's order; (30) 14.3's people-holding-tables list; (31) Q-5 / QE11 / edge 11 written once. Companion edits:
  `epics.md` (13.1 VARIANCE; the 13.3 / 13.4 / 13.5 / 13.6 / 13.8 INHERITED blocks), `deferred-work.md` (C2, C5, C7, C8),
  `sprint-status.yaml` (ledger `2026-11-03h`, both blocks). The two **[D]** items (QE10's per-act key, QE12's neutral values) went
  in as alternatives; BigDev's answers at Task 0.2 decide.
- **v1.1 (2026-11-03)** — validated by ONE fresh-context read-only checker (0 critical / 2 high / 13 medium / 11 low; no found fact in G1–G16
  materially wrong). Applied: F1 the column table (QE4) and the `registered_by_*` snapshot; F2 AC8 / AC9 / AC12 / AC13 / Task 7 made
  conditional on Q-1 with what ships under (A); F3 the projector does NOT replay (lock → head check → append → UPDATE, `lockedRow`);
  F4 the actor model (`events_log` has no `actor` column); F5 `getFieldWorkerStateAt` takes `{ captureId } | { instant } | 'now'`, SQL µs, and
  `null` for an unknown id; F6 a new §0 edge 11 and ASK Q-5 for crediting during `pending_kyc`, with the sibling blocks marked
  PROPOSED; F7 the reason codes are an author-commit, not a `-210` delegation (its condition (a) — an addition to a tracking vocabulary — is not met; corrected in v1.2); F8 the supersede line,
  "drafted for BigDev to send", and a REUSE CHECK for the key; F9 the testing-standards correction (the route commits; cleanup order);
  F10 TR11, the lost-201 residual; F11 AC12's commands and the writer-pin limit; F12 import the shared helpers, no retry loop; F13 the
  error ↔ HTTP table and the 422 / failure-path privacy legs; F14 the `RangeError` guard and the owner-role isolation leg; F15 copy
  0193's guard; F16 the Drizzle `foreignKey()`; F17 both ledgers; F18 the roster file; F19 plain-word negations in ACs / Traps and the
  AST-not-comments correction; F20 the genesis payload drops the duplicated ids; F21 AT9 in TR3; F22 the coverage test's own
  description template; F23 `context.ts`, `pnpm contracts:emit-openapi` and the top-level export set; F24 the PAN wording and the
  normalised index-def assert; F25 the `state` → `current_state` variance; F26 the HALT at Task 0.2.
- **v1.0 (2026-11-03)** — created by `bmad-create-story 13.1` at `268d86b5`. Companion edits in the same pass:
  `epics.md` (VARIANCE block under 13.1; INHERITED-FROM-13.1 blocks under 13.3, 13.4, 13.5, 13.6, 13.8), `deferred-work.md` ("Deferred
  from: story 13-1-… (create-story, 2026-11-03)", C1–C7), `sprint-status.yaml` (row `backlog` → `ready-for-dev`; ledger `2026-11-03h`).
