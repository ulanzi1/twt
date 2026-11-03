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

STATUS: ready-for-dev (v1.16 — BigDev REPLACED the move rule with CONSENT (2026-11-03): a District Admin no longer records a move alone;
one District Admin (EITHER end) opens a request at the worker's request and the other ACCEPTS or REFUSES it with a reason from a fixed
list; unanswered for 7 days it goes to the Pariwar Admin, never accepted by default; a Pariwar Admin may also move a worker directly,
for either reason. Row `13-1d-field-worker-move-requests-and-notices` MINTED for the request flow and for the notices (email AND
in-app; both District Admins are told of a Pariwar Admin's direct move). QE17 and Q-6 are rewritten; AC5's "either end" target STAYS
(the accepting District Admin may be at either end); C5 splits and C10 is added. No AC or Task of 13.1 changes. v1.15 — BigDev WIDENED the move rule (2026-11-03): the District Admin a worker is LEAVING may also record a move
at the worker's request, so a move gates on EITHER end (the destination or the current district); the notice to the District Admin who
loses the worker goes by BOTH email AND in-app (neither exists for District Admins today — 13.1c builds them). PROPOSED, awaiting
BigDev: tell the receiving District Admin too. Nothing in this story's build changes beyond AC5's target. v1.14 — BigDev DECIDED two points of QE17 (2026-11-03): the Pariwar Admin is NOT blocked from the
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
- Decisions: main holds up to `2026-11-02-439`; `-440` is minted on `story/6-22b-…` (not landed). `-441` is TAKEN by the Panel's ruling on this
  story's Q-1 / Q-5 (recorded 2026-11-03, uncommitted) ⇒ this story's own author-commit takes ≥ `-442`. No decision `-431`…`-440` mentions field workers or attribution.
- RBAC: `PERMISSION_CATALOG_VERSION = 58` at the pin. This story moves it by exactly ONE (⇒ 59): the Panel ruled (`-441`) that a District Admin and a Pariwar Admin may add a field worker, so the key is minted.
- Ledger — TWO ledgers live in `sprint-status.yaml`: the top `# last_updated:` comment block (newest `2026-11-03g`) and the YAML key
  `last_updated: >-` block (newest `2026-11-03e`; 13.2's `f` / `g` went to the top block only). No other ref holds a `2026-11-03*`
  line ⇒ this story's entry is `2026-11-03h`; the create-story pass wrote it to the top block and a short `h` line to the key
  block. Task 12 does the same for its own entry (re-grep the letter first).
- ADR: highest `ADR-0044`; this story proposes none. Roster (`docs/launch-gate-inventory/inventory-roster.md`, highest row on main
  `47` — re-grep the next free number): one go-live-fence row is proposed at Task 0.4 (Q-3 and seven more legs; 46 is reserved by 6.39 / 14.3 — take ≥ 48 unless 46 is confirmed free); Q-2 may ask BigDev to mint a sprint row.

LETTERS: G = found facts · QE = build decisions (APPROVED 2026-11-03) · Q = asks that are BigDev's / the Panel's · I = invariants ·
TR = traps · C = carried to a sibling story.
-->

# Story 13.1: Field Worker Identity + Lifecycle State Machine `[PRIMITIVE]`

Status: ready-for-dev

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

It does ⛔ build: a worker login, any screen, the other five lifecycle routes, commission, KYC machinery, PAN or bank capture,
an erasure flow, or the member-signup wiring. Several of those had **no owner anywhere in Epic 13** until BigDev minted Stories 13.1a, 13.1b and 13.1c (ASK Q-2, discharged
2026-11-03) — that was the story's most important finding.

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
| Direct-write error | `FieldWorkerStateDirectWriteError`, `FIELD_WORKER_STATE_DIRECT_WRITE_CODE = 'field_worker.state_direct_write_rejected'`, `…_MESSAGE_PREFIX = 'field_workers direct write rejected'`, SQLSTATE `P0001` |
| RLS policies | `field_workers_tenant_isolation_{select,insert,update}` (per-command, ⛔ `FOR ALL`) |
| Named constraints | `field_workers_pariwar_worker_uq` (the FK target, C1), `field_workers_pariwar_mobile_live_uq` (partial), `_state_reason_pair`, `_active_needs_kyc`, `_registered_by_display_nonblank`, `_district_nonblank`, `_ended_on_pair` |
| New composite FK (on 13.2's table) | `field_worker_attribution_codes_worker_fk` — `(pariwar_id, field_worker_id)` → `field_workers`, `ON DELETE NO ACTION` |
| Events (single-dot snake_case) | `field_worker.registered`, `.kyc_completed`, `.activated`, `.suspended`, `.reactivated`, `.terminated`, `.posted` (the seventh — a move to another district, QE17; ⛔ the epic's `kyc-completed`, QE6) |
| Projector fns (the only writers; not re-exported) | `projectFieldWorkerGenesis`, `projectFieldWorkerTransition` (`field-worker/project.ts`) |
| Commands | `registerFieldWorker`, `recordFieldWorkerKycCompleted`, `activateFieldWorker`, `suspendFieldWorker`, `reactivateFieldWorker`, `terminateFieldWorker`, `postFieldWorker` (`field-worker/commands.ts`) |
| FR-85 contract for callers | `acceptsNewAttributions(state)` (pure) · `getFieldWorker` · `listFieldWorkersForPariwar` (both return `FieldWorkerView` — ⛔ the three PII columns) · `getFieldWorkerStateAt` |
| Duplicate-mobile accessor and constants | `findLiveFieldWorkerByMobileIndex` (`field-worker/read.ts`; filters `current_state <> 'terminated'` — the partial index's predicate — with an explicit `pariwar_id`) · `FIELD_WORKER_PKEY_CONSTRAINT = 'field_workers_pkey'` · `FIELD_WORKER_MOBILE_LIVE_CONSTRAINT = 'field_workers_pariwar_mobile_live_uq'` (Task 6) |
| District (QE17 — approved: the REPORTING district — whose District Admin manages the worker, NOT a work area; changed only by `field_worker.posted`, which carries a required reason) | `field_workers.district` — text NOT NULL, a LISTED district; CHECK `field_workers_district_nonblank`; `assertDistrictRecorded` (`field-worker/read.ts`); `FieldWorkerDistrictUnknownError` → 422 `field_worker.district_unknown` |
| Authorization snapshot in the log (QE18, approved) | event payload key `authorization` = `{ permission_key, role, grant: { dimension, value, grant_id? }, target: { dimension, value }, catalog_version }` on `registered` and `posted`; produced ONLY by the RBAC check (`rbac.requirePermission` → `VerifiedAuthorization`), carried on `request.authorizations[key]`, never recomputed |
| Tier-2 field class (new) | `FIELD_WORKER_MOBILE_FIELD_CLASS = 'field_worker_mobile'`; Tier-1 class `FIELD_WORKER_FIELD_CLASS = 'field_worker'` (`encryption/field-classes.ts`) |
| Route | `POST /api/v1/p/:pariwarId/field-workers` — handlers/routes in `apps/api/src/modules/field-worker/` |
| Permission key (QE10 approved; holders RATIFIED by the Panel, `-441`) | `field_worker.register` — `district` dimension (value = the worker's district, QE17); held by `district_admin` (own district) and `pariwar_admin` (any district in its Pariwar — the fill-in) (+ `super_admin` derived). No other field-worker key is minted here: the suspend / terminate keys are 13.6's, the activate / KYC / reactivate routes' keys are their owner's (C5). ⚠ `field_worker.register` is also the genesis event's `trigger` string (QE6) — two different things (a permission key vs an event-payload value); never conflate them in a test or a grep |
| Gate | `scripts/field-worker-state-invariant/` · scripts `field-worker-state:{check,test}` |
| Migration | `packages/domain/migrations/NNNN_field-workers.sql` (NNNN ≥ `0200`, re-grep) |

## Story

As **Solo Builder authoring the field-worker primitive**,
I want **a field-worker identity + lifecycle state machine consuming Story 1.3's event log**,
so that **field-worker state is event-derived and audit-replayable — and the registry from 13.2 finally has someone to belong to.**

## 📜 Policy meaning (AI-10-1)

**This story introduces ONE predicate that gates a benefit, and the benefit is the field worker's, ⛔ a member's:** *"is this
field worker currently allowed to be credited with new members?"* (FR-85). It fixes the states that predicate reads and the
sentence every later reader must use — ⚠ **AS BUILT**: the worker sentence below carries QE5 and the Q-5 (A) rule, which BigDev
settled for the build on 2026-11-03 (QE11) and the Panel CONFIRMED (Question 2 A, decision `-441`).

*In the field worker's terms (AS BUILT — Q-5 (A), CONFIRMED by the Panel, `-441`):* **"You are credited with new members only while the Trust has verified
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
| 5 | *"On what footing may the Trust hold a field worker's name and phone number — and what must it tell them?"* | **Counsel's (Story 0.13), a go-live gate — ⛔ 13.1's, and ⛔ a Panel note** (the roster Row 19 precedent: *"S — counsel, Story 0.13, go-live gate, never a Panel note"*). A LEGAL / consent BASIS for someone's data. Nothing ratified covers a non-member contractor (Privacy Policy §1) — but workers submit a physical form and accept the organization's terms BEFORE they are registered (BigDev, 2026-11-03), so the footing and the notice may already be in those documents, which BigDev holds; and the contractor classification itself is open with counsel (`docs/legal-counsel-engagement/review-scope-charter.md` §4: "Independent-contractor vs employment classification"). 13.1 builds the minimum (name + mobile, encrypted, in no event payload), sends nothing anywhere, and carries a GO-LIVE fence (merge ≠ go-live, [[project_not_in_production_merge_is_not_golive]]) — ASK **Q-3**. |
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

## ⚖️ Build decisions QE1–QE16 — APPROVED by BigDev 2026-11-03 (in session), as listed ⭐, with QE10 and QE12 as chosen below

**Status of the approval — read before relying on it.** BigDev's words (2026-11-03, this session): *"approve the sixteen QE decisions
as listed, with QE10 choosing the per-act registration key and QE12 choosing neutral reason codes."* So every ⭐ below is the build
decision, **except** QE10 (the per-act key `field_worker.register`, not `field_worker.manage`) and QE12 (the neutral reason
values — five at approval, a sixth, `reassigned`, added for `posted` on 2026-11-03 — not the starter list). The answer is recorded HERE and is **not yet in a decision entry**: Task 0.3 writes the one
author-commit entry (≥ `-442`; `-441` is the Panel's ruling), and now that Q-2, Q-3 and Q-4 are answered too (2026-11-03). ✅ QE11 (`active`-only)
is SETTLED (BigDev, 2026-11-03: *"approved and settled — the implementation rule is active only"*) and the Panel CONFIRMED it
(Question 2 A, `-441`). ✅ The Panel RULED on Q-1 (`-441`, by DR and KB): a District Admin may add a field worker (the intended manager)
and the Pariwar Admin fills in; the full log is kept. That changes QE10 (holders and dimension, applied below) and adds QE17 (the
worker's district) and QE18 (the acting role in the log). BigDev then APPROVED QE17 — REVISED the same day because workers rotate
between districts — and QE19 (a Pariwar move is a new registration); QE18 (the authorization snapshot in the log) was APPROVED too, with two conditions — see QE18. A follow-up Panel note (Q-6 who may change the District Admin a
worker reports to, Q-7 the same person across Pariwars, Q-8 whether the fill-in is enforced) is DRAFTED, ⛔ sent. Q-2, Q-3 and Q-4 are ANSWERED (v1.12).

- **QE1 — Home. ⭐ `packages/domain/src/field-worker/`, ⛔ `packages/field-worker-lifecycle`.** The epic names the package; 13.2's C1
  asks to "re-weigh" it against [[feedback_no_premature_package]]. There is no second consumer, and G1's reasons (globs, gates,
  the events→domain import direction) make a separate package strictly worse. Tables in `schema/`, RLS in `policies/`; no
  `@twt/contracts` content except the one route's DTOs (QE9).
- **QE2 — Scope. ⭐ (A) primitive + the ONE registration route (C1) + commands for the other five transitions, called by tests only.**
  (B) also an admin route per transition under one key; (C) primitive only, registration route left to a sibling.
  Cost of (A): after this story an admin can register a worker but **nothing in production can activate, suspend, reactivate or
  terminate one** — FR-85's deactivation is unreachable until someone owns those routes (ASK Q-2). Cost of (B): five more
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
  (QE15); a re-registered terminated worker is not flagged to the registering admin (C4). The Tier-1 encrypt and the HMAC run
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
  | `ended_on` | date NULL — **projected** | QE20: the ACTUAL LAST DAY of the engagement, supplied by the admin at termination; `CHECK ((current_state = 'terminated') = (ended_on IS NOT NULL))` `field_workers_ended_on_pair`; the clock of the 8-year removal (C5); not personal data |
  | `district` | text NOT NULL | QE17: the worker's REPORTING district — the district whose District Admin manages them (the Panel's District Admin manages by district, `-441`), NOT a work area (a code works anywhere in the Pariwar); the gate's TARGET for registration, suspend, reactivate and terminate (a MOVE gates on the destination); `CHECK (length(btrim(district)) > 0)` `field_workers_district_nonblank`; one of the Pariwar's LISTED districts, checked in the API layer by `assertDistrictRecorded` (the list is data, so not by the database); **projected**: changed only by `field_worker.posted` (QE17; the guard's projected-column list gains `district`); not personal data |
  | `created_at` | timestamptz NOT NULL default `now()` | immutable |
  | `current_state` | `field_worker_state` NOT NULL — **projected** | |
  | `state_event_version` | bigint NOT NULL (`mode: 'number'`) — **projected** | |
  | `kyc_status` | `field_worker_kyc_status` NOT NULL — **projected** | `CHECK (current_state <> 'active' OR kyc_status = 'completed')` `field_workers_active_needs_kyc` |
  | `state_reason_code` | `field_worker_reason_code` NULL — **projected** | `CHECK ((current_state IN ('suspended','terminated')) = (state_reason_code IS NOT NULL))` `field_workers_state_reason_pair` |
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

  **Guard order in EVERY command (pinned by a test).** (0) The actor and `actorId` — pure, BEFORE the row lock — else
  `FieldWorkerProjectorInputError`. Then, under the lock: (1) the row exists in this Pariwar — else `FieldWorkerGenesisMissingError`;
  (2) the (state, event) pair is legal per this table — else `FieldWorkerIllegalTransitionError` (this covers anything out of
  `terminated` AND a repeated `kyc_completed` on an `active` worker); (3) the KYC guard — `FieldWorkerKycAlreadyCompletedError`
  (reachable only from `pending_kyc`) or `FieldWorkerKycNotCompletedError`; (3b) for `posted`, the new district differs from the current one — else
  `FieldWorkerDistrictUnchangedError`; (4) the reason (suspend, terminate AND post) — else `FieldWorkerReasonInvalidError`.
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
  admins. Alternatives rejected: reuse DigiLocker (member-bound, fenced); drop `kyc_status` (the epic's AC wants it and `activated` is guarded by it; 13.5's own AC (a) is the recruited MEMBER's KYC, G7). ⚠ BigDev (2026-11-03): a worker submits a form, is interviewed and is recruited BEFORE registration, and the IDENTITY CHECK is PERFORMED IN THE INTERVIEW. So `kyc_completed` would record something that has already happened — see QE21 (PROPOSED; BigDev chooses).
- **QE9 — The registration route. ⭐** `POST /api/v1/p/:pariwarId/field-workers`, guard chain per G10 but `district`-gated:
  `requirePermissionHook(deps, 'field_worker.register', { dimension: 'district', resolveValue })` where `resolveValue` returns the
  body's `district` when it is a string and `null` otherwise — it is SYNCHRONOUS (reads the already-validated body, never the
  database), a `null` fails closed, and a District Admin's grant is compared by EXACT bytes (QE10, TR12). Body
  `{ name, mobile, district }` (snake_case). The DTO is SHAPE ONLY and `.strict()`: `name: z.string().max(1000)`, `mobile:
  z.string().max(64)`, `district: z.string().max(200)`. A Zod failure is 400 `request.validation`, raised in the validation phase BEFORE the preHandler hooks
  (12.2 `routes.ts`), so a content rule in the DTO would answer an unauthenticated caller with 400 instead of 401 / 403 / 404. The
  CONTENT rules run in the HANDLER — after the guards, inside the idempotency claim, before any KMS call — and throw typed errors
  mapped to 422: `name` NFC-normalised, trimmed, 1–120 characters, no control characters, no NUL or unpaired surrogate (422
  `field_worker.name_invalid`); `mobile` through `normalizeMobile` (null ⇒ 422 `field_worker.mobile_invalid`); `district` must be a LISTED district of the Pariwar
  (`assertDistrictRecorded`, QE17 ⇒ 422 `field_worker.district_unknown`) — a Pariwar Admin's grant covers ANY string the gate is
  given, so this check is the only thing that stops a junk district. Required
  `Idempotency-Key` (missing, empty or over 200 characters ⇒ 400 `field_worker.idempotency_key_required`; the same key still in
  flight ⇒ 409 `field_worker.idempotency_in_progress` — rename every `module.*` literal in the helpers copied from 12.2).
  Order inside the claim: mint `fieldWorkerId` → content-validate `name` and `mobile` (422) → resolve the admin's `display_name` (absent ⇒ `AdminDisplayNameMissingError`,
  ⛔ fallback, BEFORE any write or audit line) → encrypt name + mobile, compute the mobile HMAC → `openScopeTx` → `assertDistrictRecorded` on that tx (it needs a read, so it runs
  here, before any write; 422 `field_worker.district_unknown`) → duplicate-mobile
  pre-check on that tx — `fieldWorker.findLiveFieldWorkerByMobileIndex(db, pariwarId, mobileBlindIndex)` → id or null, with an
  explicit `pariwar_id` predicate (409 `field_worker.mobile_already_registered`, no audit line) → every write is `actor: 'operator'`,
  `actorId` = the session's `users` id (as 12.2 QE14) → `audit.withCompensatingAudit` whose `mutate`
  runs `registerFieldWorker` (genesis) THEN `allocateAttributionCodeForRequest(request, scopeTx, { fieldWorkerId })` on the
  SAME tx, then COMMITS. On `AttributionCodeAllocationExhaustedError` (caught by `instanceof` on the class the DOOR re-exports,
  reading `.attempts` from it): `await flagAllocationExhaustedForRequest(deps, request, { attempts })` then rethrow ⇒ the
  compensating audit writes `field_worker.registered_rolled_back`, the tx rolls back, the response is 503
  `field_worker.code_allocation_exhausted`. Response 201: `{ field_worker_id, district, current_state, kyc_status }` — NO code (QE22, APPROVED 2026-11-03): the code is
  allocated here, in the same transaction, but is read only after approval — by 13.1b's SMS and 13.1a's audited read — so no
  copy tells anyone a code before the worker is approved and the allocation has committed (C6). Do not wire `maxAttempts` from env (default 8; YAGNI).
  `allocateAttributionCodeForRequest` returns `{ attributionCodeId, code, allocatedAt, attempts }` (the handler never copies `code` or
  `allocatedAt` into the response, a log or an audit field) and throws
  `FieldWorkerAlreadyHasAttributionCodeError` before any draw if the worker already holds a code. The 201's `current_state` and
  `kyc_status` come from the genesis RETURN value (12.2 RB1), not literals (the 201 DTO is
  `.strict()` and PARSED by the serializer, so its shape must match exactly). Only the duplicate-mobile PRE-CHECK is audit-free: a
  concurrent same-mobile loser fails INSIDE `mutate`, so its intent line and its `field_worker.registered_rolled_back` line exist.
  The audit `resourceLocator` — the only free-text audit field — is `field_worker/<field_worker_id>`; never put a name or a mobile in it.
  ⛔ GET routes (the lost-201 residual is TR11), ⛔ screen (Story 13.1a). Under Q-1 (A), BEFORE the ruling, this whole route waits (the
  primitive, the FK, the commands and the gate ship without it — see AC8).
- **QE10 — Permission key. APPROVED (BigDev 2026-11-03): the PER-ACT key `field_worker.register`, and only it; its HOLDERS are
  RATIFIED by the Panel (`-441`).** Gated at `dimension: 'district'` (value = the worker's district, QE17); held by `district_admin`
  (the Panel's primary manager — its own district only), `pariwar_admin` (the fill-in — every district in its Pariwar) and
  `super_admin` (derived). Why `district` and not `pariwar`: a narrower grant is INERT against a broader gate, so a
  `pariwar`-dimension key would have left the District Admin's grant authorizing no one; a `district` gate lets BOTH pass
  (`scopeContains` rule 5 — a `pariwar` grant covers every in-tenant district, a `district` grant its own; G12). NOT granted to
  `state_trustee` (a state grant against a district target defers to the geo-tree resolver, default deny — inert) or to
  `trustee_panel` (not ruled); NOT granted to the `field_worker` role (13.3's own-read key is a separate, B(3)-literal decision, C1).
  Catalog 58 → 59. The house style splits keys by act (`member.moderate` /
  `.suspend` / `.restore_terminated`, `claim.flag_fraud` / `.record_fraud_finding`, `questionnaire.propose` / `.approve` /
  `.publish`), and this story builds only the ADD: the suspend / terminate keys are 13.6's (it builds those acts), and the activate
  / KYC / reactivate routes' keys belong to the owner Q-2 names (C5). Rejected: ONE `field_worker.manage` — it would be minted
  before 13.6 says what removal means, and would cover acts nothing builds. Cost of the per-act key: each later act gets its own
  key and its own look by the Panel. ⚠ The string `field_worker.register` is ALSO the genesis event's `trigger` payload value (QE6):
  a permission key and an event-payload value — keep them apart.
  REUSE CHECK — no existing key fits: `pariwar.provision` provisions a Pariwar; `member.moderate` / `member.suspend` act on members;
  `module.manage` is the partner-module surface; `workplace.manage` and `known_people.run_campaign` are unrelated lists. (The
  catalog was listed 2026-11-03; re-check at Task 0.1.)
- **QE11 — The FR-85 contract for callers. ⭐ `acceptsNewAttributions(state)` is `state === 'active'`**, exported pure from the
  domain alongside `getFieldWorker(db, pariwarId, id)` and `getFieldWorkerStateAt(db, pariwarId, id, asOf)`. ⚠ NOT the 12.1
  `getModuleStateAt` signature: that takes a JS `Date` (millisecond precision), and 13.2's binding rule (AT4 (c), C4, TR10) is "never
  read `captured_at` into JS; compare in SQL at microsecond precision". So `asOf` mirrors `resolveAttribution`'s:
  `{ captureId: MemberAttributionId } | { instant: <timestamptz text> } | 'now'` — the `captureId` arm joins `member_attribution`
  and compares the event's `occurred_at` to the stored `captured_at` IN SQL; it replays the longest PREFIX of the stream, in
  `event_version` order, whose events ALL have `occurred_at` at or before that instant — ⛔ every event that individually does (the
  full ordering contract — prefix not filter, ties, `'now'`, the clock domains — is AC10's, the one place it is written). An unknown worker id returns `null` (the twin returns the initial state for an unknown id —
  this is new work: an existence check). One predicate, so 13.8 and 13.5's backfill cannot each re-derive "deactivated" and recreate
  the 10.10 shape; `…StateAt` so a backfill (13.2 C4) can ask what the worker's state was WHEN the member typed the code.
  ✅ `active`-only is SETTLED (BigDev 2026-11-03: "approved and settled — the implementation rule is active only"). Q-5 (§0 edge 11)
  holds the alternative (B), its costs and the deciding fact ONCE, and the Panel's non-blocking confirm of the rule is drafted (not
  sent); a sibling block that repeats the rule calls it the build rule, confirm pending. The mitigation the recommendation leans on — "activate, then
  tell them the code" (C6, 13.3's runbook) — needs a production path to `activated`, which does not exist until Q-2 gives it an
  owner (Task 0.4 (h)).
- **QE12 — Reason codes. APPROVED (BigDev 2026-11-03): the NEUTRAL values only (an author-commit, ⛔ a `-210` delegation — §0 edge 8).**
  Suspend: `under_review`, `at_worker_request`. Terminate: `left_voluntarily`, `inactive`, `registered_in_error`. Post (added
  2026-11-03 with QE17's second revision): `at_worker_request`, `reassigned` — six values in all, `at_worker_request` shared by suspend and
  post. Required on `suspended` / `terminated` / `posted`, absent elsewhere; for suspended and terminated it is stored as the projected
  `state_reason_code` (non-null iff the state is suspended or terminated — CHECK `field_workers_state_reason_pair`), cleared on
  `reactivated`; a `posted` reason lives in the event only and never touches `state_reason_code`. ⛔ free text anywhere (it would carry names into an
  immutable stream). The values the earlier starter list also had — `conduct_concern`, `conduct`, `fraud_confirmed` — are 13.6's to
  ADD together with the writer that uses them (its AC: "reviewer can confirm fraud"), by `ALTER TYPE … ADD VALUE` in its own
  migration with the domain tuple, the Zod schemas and the reason lists in the same commit, under its own governance check (§0
  edge 8). Why neutral: those three label a person in an append-only stream that survives erasure, no production writer exists yet
  (Q-2), and a pgEnum value is not cheaply removed while an addition is. Cost: until 13.6, an operator cannot record a conduct-based
  suspension or termination honestly — intended (no route exists, and C5 forbids building a terminate route before C4); the nearest
  neutral value (`under_review`, `inactive`) must not stand in for one.
- **QE13 — Concurrency and lock order. ⭐ As 12.1 I10:** every transition first takes `SELECT … FROM field_workers WHERE
  field_worker_id = $1 AND pariwar_id = $2 FOR UPDATE`, then checks guards against the locked row, then calls `projectFieldWorkerTransition`,
  passing the locked row in as `lockedRow { currentState, stateEventVersion, kycStatus }`. ⚠ The SHIPPED projector does ⛔ replay the
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
  **What the district is (second revision).** BigDev: "I don't want to restrict worker movement because a school may sit near another
  district boundary and visiting that school would cost money and time again." So `district` is the worker's REPORTING district — the
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
  **Who may move (the routes' — 13.1c and 13.1d; the Panel's — Q-6, REWRITTEN a third time).** BigDev's rule, settled in steps on
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
  `{ district, toDistrict }` nor `{ district, the worker's current district }` (AC5) and does not know the keys. The other lifecycle
  acts — suspend, reactivate, terminate — still gate on the worker's CURRENT district, read server-side from the row; registration
  checks the BODY's district. This supersedes the build reading in `-441` ("later acts gate against the current district") for the
  MOVE only — Task 0.3's author-commit entry says so; the Panel's words are untouched.
  **Costs, recorded.** "At the worker's request" is the admin's attestation: the system cannot see that the worker asked (a worker
  can ask directly only once 13.3 gives them a login). A move changes WHO manages the worker at once: the old District Admin loses
  the gate, the new one gains it. Each move by consent takes two admin actions, and disputes land on the Pariwar Admin. The route
  reads the current district BEFORE the gate, so a concurrent move can leave a stale target; the command then refuses it (AC5) and
  13.1c / 13.1d decide how that is told to the caller.
  **Decisions (BigDev, 2026-11-03), in order.** (1) The Pariwar Admin is NOT blocked from `at_worker_request`: the worker's request
  may be placed with a District Admin or a Pariwar Admin. (2) "Yes, widen it to the current District Admin" (v1.15): the District
  Admin the worker is leaving may act too — which is why AC5 accepts EITHER end as the target. (3) REPLACED the same day (v1.16: "I
  think request should be made by sending District Admin to receiving District Admin. There should be mechanism to accept or refuse
  with reason" — then "Yes to all four, mint 13-1d"): a District Admin no longer records a move ALONE; one opens a request and
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
  (`packages/domain/src/rbac/check.ts`) the per-grant test is extracted out of `hasPermission` and BOTH `hasPermission` and a new
  `authorize` call it, so "allowed" and "which grant" cannot disagree. (b) `authorize` returns the authorizing grant — when several
  pass, the MOST SPECIFIC (narrowest scope first, then role, scope value, grant id), the same whichever order the grants were loaded
  in — as a `VerifiedAuthorization` issued only inside `check.ts` and registered in a module-private WeakSet
  (`isVerifiedAuthorization`), so an object literal with the same fields is NOT verified. (c) `requirePermission` returns it (it
  returned nothing) and `requirePermissionHook` stores it on `request.authorizations[key]`; the handler passes THAT to the domain and
  NEVER recomputes it from `request.scopeGrants`. (d) The domain commands that carry it refuse (`FieldWorkerProjectorInputError`)
  anything that is not a verified result, names another Pariwar, or whose `target` is not this act's (AC5). (e) `EffectiveGrant` gains
  an optional `grantId` (`role_grants.id`) so the record can point at the row. The precedent is decision `2026-08-13-105` D4: "the
  grant that actually authorized", not "the first grant in the tenant". `posted` carries it from day one (QE17); the other five events
  when their routes are built (C5).
  **Costs, recorded.** The snapshot records the role and grant that PASSED, not the role's permission list then in force (the Super
  Admin can edit bundles — FR-44 — and that edit is not traced here). A `grant_id` may point at a row later deleted, so the tuple, not
  the id, is the record. An actor holding both a district and a pariwar grant is logged as the District Admin even if they meant to
  fill in (most specific wins). The RBAC core is a governance-boundary root: this is a reviewed, strictly ADDITIVE edit (every existing
  RBAC test passes unchanged), and the other authorization call sites ([[project_rbac_geo_scope_containment]]: ten in 2026-08, two
  inside `@twt/domain` — re-count at Task 0.1) are untouched. Whether a Pariwar Admin should be BLOCKED while a District Admin is in
  post is the Panel's and was not ruled (Q-8).

- **QE19 — A worker who moves to another Pariwar is a NEW registration there. APPROVED by BigDev 2026-11-03 (the Panel is
  asked — Q-7).** BigDev (2026-11-03): workers will also move between Pariwars. The landed foundation makes the Pariwar the unit of
  a worker's record, not a column to edit: 13.2's registry gives a worker ONE permanent code (`UNIQUE (field_worker_id)`), codes are
  unique only WITHIN a Pariwar (`UNIQUE (pariwar_id, code)`), a member enters a code in their OWN Pariwar and the lookup is
  tenant-scoped, every table is per-Pariwar RLS-isolated, and the mobile blind index is keyed per Pariwar so two Pariwars cannot even
  match the same person. The member-posting precedent took the same line: its header calls a move across tenants "a distinct, much
  larger capability" and leaves it out. So here too: a worker who moves is registered afresh by the new Pariwar's District Admin or
  Pariwar Admin (a new id, a new code, a first district), and the old record is left as it is — active, or ended by its own
  Pariwar's admins for a reason that fits. Nothing in this story links the two. Cost, recorded: two records and two codes for one
  person; no single history; a person-level view or one commission statement across records (13.5 pays by PAN) needs a LATER link,
  which is a cross-Pariwar identity question and the Panel's (Q-7). Nothing here forecloses it.

- **QE20 — The date of termination is the ACTUAL LAST DAY, supplied by the admin. APPROVED by BigDev 2026-11-03 ("actual last day is
  fine").** Shape (the author's): the `terminated` payload carries `ended_on`, and it is PROJECTED into a nullable `date` column
  `ended_on` with `CHECK ((current_state = 'terminated') = (ended_on IS NOT NULL))` (`field_workers_ended_on_pair`), so the 8-year
  removal is a plain query on a column; the command refuses an `ended_on` that is missing, in the future, or before the day the worker
  was registered (`FieldWorkerEndedOnInvalidError`, command-only). The original reasoning follows. The recruitment form
  promises the worker that their name and mobile number are removed 8 years after the DATE OF TERMINATION (BigDev, 2026-11-03). The
  `terminated` event's `occurred_at` is when the admin RECORDED it, not when the engagement ended: a termination recorded two months
  late would delete two months late — past the promise. So the `terminated` payload would carry `ended_on` (a date; not in the
  future, not before the registration; supplied by the admin at termination, defaulting to the day it is recorded) and the 8-year
  clock runs from it. *Question for BigDev:* is "the date of termination" the day it is recorded here, or the actual last day, which
  can be earlier? — ANSWERED: the actual last day. Cost: one more field on one event, one projected column, and one more thing for the
  admin to enter; the terminate route is Q-2's owner's, so only the command, the payload and the column are built here.
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
  Admin's approval". PROPOSED detail (BigDev nods): the APPROVAL records `kyc_completed` AND `activated` in ONE transaction (B2) — the
  approver confirms the interview's identity check and activates — rather than the registrar attesting identity (B1). The approval
  route, its per-act key (`field_worker.approve`, held by `pariwar_admin`, gated on the worker's CURRENT district) and the screens are
  Q-2's owner's (see its RECOMMENDATION); the commands exist here and are called by tests. When the Pariwar Admin does both, the
  system does not stop the same person registering and approving (Q-8, default A). Who may approve is Panel-adjacent — it decides
  who is credited — and is put to the Panel as Question 4 of the unsent follow-up note (Q-9). No AC or Task changes.
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
| `FieldWorkerGenesisAlreadyExistsError` | genesis on a non-empty stream / the pkey or the stream-version unique fires | 409 `field_worker.already_exists` |
| `FieldWorkerMobileAlreadyRegisteredError` | the pre-check, or the partial unique `field_workers_pariwar_mobile_live_uq` (mapped by CONSTRAINT NAME in the genesis row-INSERT catch) | 409 `field_worker.mobile_already_registered` |
| `FieldWorkerStreamConcurrencyError` | the stream head ≠ the locked row's version (drift) — never expected under the lock | 409 `field_worker.stream_conflict` |
| `FieldWorkerProjectorInputError` | a `system` / `member` actor or null `actorId`; a payload that fails its schema; an `authorization` that is missing, not a verified result of the RBAC check, in another Pariwar, or not this act's (QE18) | 500 (a programming error — the route never builds one) |
| `FieldWorkerPersistError`, `FieldWorkerStateDirectWriteError` | the row write failed / the guard trigger fired | 500 |
| route: name not valid | handler content rule (QE9) | 422 `field_worker.name_invalid` |
| route: mobile not valid | `normalizeMobile` returns null | 422 `field_worker.mobile_invalid` |
| `FieldWorkerDistrictUnknownError` | `assertDistrictRecorded`: not a listed district of the Pariwar | 422 `field_worker.district_unknown` |
| `FieldWorkerDistrictUnchangedError` | `posted` to the district the worker is already in | 409 `field_worker.district_unchanged` (no route yet — Q-2) |
| `FieldWorkerEndedOnInvalidError` | `terminated` with an `ended_on` that is missing, in the future, or before the registration day (QE20) | 422 `field_worker.ended_on_invalid` (no route yet — Q-2) |
| route: body shape wrong (type, unknown key, over-long) | the DTO (shape only) | 400 `request.validation` (the existing envelope) |
| route: `Idempotency-Key` missing, empty or over 200 characters | the handler | 400 `field_worker.idempotency_key_required` |
| route: the same key still in flight | `withIdempotency` | 409 `field_worker.idempotency_in_progress` |
| `FieldWorkerCaptureNotFoundError` | `getFieldWorkerStateAt` given an unknown `captureId`, or another Pariwar's | none — a domain read with no route in this story; its first caller (13.8 / 13.5) maps it |
| `AdminDisplayNameMissingError` (existing) | the admin has no `display_name` | 409 `admin.display_name_missing` |
| `AttributionCodeAllocationExhaustedError` (re-exported by the door) | after the flag is written | 503 `field_worker.code_allocation_exhausted` |

No message, in any row, carries a worker's name or mobile (I8). The pre-check accessor and the genesis catch are the only places the
mobile-unique constraint is named.

The rows only a COMMAND can raise — `illegal_transition`, `kyc_already_completed`, `kyc_not_completed`, `reason_invalid`,
`not_found`, `stream_conflict`, `already_exists`, `district_unchanged`, `ended_on_invalid` (and `FieldWorkerCaptureNotFoundError`) — have NO route under QE2 (A), and
`already_exists` is unreachable with server-minted ids; they are asserted in a mapper unit test (AC8), marked "no route yet — Q-2".

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
  known: the District Admin REGISTERS, the Pariwar Admin APPROVES (the Pariwar Admin does both if the District Admin is unavailable),
  the code goes to the worker BY SMS once they are in the system, and an admin gives it BY HAND on the worker's request. That is
  three pieces of work, in this order. **13-1a — onboarding completion (the CRITICAL PATH to go-live):** the approval route
  (`kyc_completed` + `activated`, QE21), the audited code read for the by-hand case, and the admin screens (register, approve, view the
  code). Without it no worker can be credited (Q-5 A), so 13.8's first signup would credit nobody. **13-1b — the SMS of the code
  (parallel, NOT on the critical path):** the by-hand path is already sanctioned by the process, so go-live need not wait for it; but
  DLT approval of a new template is an external wait, so START THE TEMPLATE REGISTRATION NOW. **13-1c — moving and ending workers
  (soon after go-live):** the move route (`posted`; who may change a worker's reporting district is Q-6), suspend and reactivate, terminate with the actual last day
  (`ended_on`, QE20) — which waits for 13.6's reversibility and appeal decision (C4) — and the READ of the full log; the 8-year removal
  is later still (the first is due 8 years after the first termination) and needs an owner, not yet a row. *Why not fold it all into
  13.1:* the primitive and the registration route are the foundation the rest build on; the SMS carries an external wait; and 13.1 is
  already the largest story in the epic. *Why not leave it to 13.3 / 13.4 / 13.6:* 13.3 is the worker's own mobile app, 13.4 a
  dashboard, 13.6 anti-fraud — none is an admin onboarding surface — and 13.8, the first consumer, needs workers to be active. See C9.
  The Panel has now ruled (`-441`) that the District Admin is the intended MANAGER of field workers with the Pariwar Admin filling
  in, and to "keep the full log": so the owner of the other lifecycle routes gates each one on the worker's STORED district (QE17),
  mints a key per act, and gives the log a READ (nothing lets anyone see it today). **ANSWER (BigDev, 2026-11-03: "mint 13-1a, 13-1b, 13-1c") — DISCHARGED; a FOURTH row, `13-1d-field-worker-move-requests-and-notices`, was minted the same day (v1.16) for the District-Admin-to-District-Admin move request and the notices.** The three rows are minted in `sprint-status.yaml`, `backlog`, in this order after this story's row, each with an entry in `epics.md` (`### Story 13.1a` / `13.1b` / `13.1c`): `13-1a-field-worker-approval-and-code-hand-over` (approval, the audited by-hand code read, the admin screens — the critical path), `13-1b-field-worker-code-by-sms` (the SMS — parallel) and `13-1c-field-worker-moves-suspension-and-termination` (move, suspend, reactivate, terminate, the full log's read). THROUGHOUT THIS STORY, "Q-2's owner", "the owner Q-2 names" and "the owner of the other lifecycle routes" mean those stories: 13.1a for the approval and the code read, 13.1c for move, suspend, reactivate, terminate and the log's read, 13.1b for the SMS. 13.1 builds none of their routes and waits for none of them to LAND — they need 13.1 landed, not the reverse. NOT homed in any row: the 8-year removal (C5), which is due eight years after the first termination and needs an owner named before the first terminate route reaches a real worker (13.1c's entry carries it).
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
  counsel question is REVISED to a review of the existing form and terms plus classification, retention and erasure —
  `counsel-question-2026-11-03-field-worker-data-basis.md` — and is sent ONLY if the form check does not settle the footing; not
  sent. An optional addition (not specified; say if wanted): record a non-personal reference to the physical form at registration, so
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
  REWRITTEN twice the same day after BigDev's corrections). DRAFTED as Question 1 of
  `trustee-panel-routing-note-2026-11-03-story-13-1-moving-workers-and-fill-in.md` — ⛔ sent.**
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
- **Q-7 — A worker who moves to another Pariwar (the Panel's; NON-BLOCKING for the build — added 2026-11-03). DRAFTED as Question 2 of the same note — ⛔ sent.** *Plain question:* "A
  field worker who has worked for one Pariwar moves to another: is that the same worker, with the same code and history, or a new
  registration in the new Pariwar?" *The one deciding fact:* whether the Trust treats the person as ONE across Pariwars — which
  would let one Pariwar's record of them be seen from another's, and decides whether they hold one code or one per Pariwar.
  *Options.* **(A) ⭐** a new registration in the new Pariwar (QE19) — how the system is built and how members' postings work; two
  records, two codes, no link; cost: their work is split and a person-level view needs a later link. **(B)** one worker across
  Pariwars — the code registry and the Pariwar data boundary would change (landed work; a worker record visible to several
  tenants). **(C)** a new registration PLUS a Trust-level link between the records — a later, narrower form of B. *Evidence (last):*
  QE19.

- **Q-8 — Is the Pariwar Admin's fill-in enforced? (the Panel's; NON-BLOCKING for the build — added 2026-11-03; QE18). DRAFTED as
  Question 3 of the same note — ⛔ sent.** *Plain question:* "You said the Pariwar Admin fills in when the District Admin cannot do the
  job, for any reason. Should the system stop a Pariwar Admin from adding or managing field workers while a District Admin is in
  post — or trust them and record who did what?" *The one deciding fact:* whether the system can know a District Admin is "unable"
  — it cannot, except that none has joined. *Options.* **(A) ⭐** both can always act and the log records the authorization that passed (QE18) —
  cost: nothing stops a Pariwar Admin acting when the District Admin is perfectly able. **(B)** a Pariwar Admin may act only where no
  District Admin holds the district — cost: only "not yet joined" is detectable, so illness or leave would block the Pariwar Admin
  until a Super Admin steps in. **(C)** a Pariwar Admin acts after recording a reason, which the log keeps — cost: friction, and the
  reason is the Pariwar Admin's own word.

- **Q-9 — Who approves a registered field worker? (the Panel's; NON-BLOCKING for the build — added 2026-11-03).** DRAFTED as Question 4
  of `trustee-panel-routing-note-2026-11-03-story-13-1-moving-workers-and-fill-in.md` — ⛔ sent. BigDev's process: the District Admin
  REGISTERS, the Pariwar Admin APPROVES, and the Pariwar Admin does both if the District Admin is unavailable. `-441` named the
  District Admin as the manager and the Pariwar Admin as the fill-in; a Pariwar Admin who APPROVES the District Admin's registrations
  is a different role (a check on them), and approval decides who is credited and so, later, paid. Options and costs are in the note.

## Invariants (I)

- **I1** — The projected columns `current_state`, `state_event_version`, `kyc_status`, `state_reason_code`, `district`, `ended_on`, `audit_id` and
  `updated_at` are written ONLY by `projectFieldWorkerGenesis` / `projectFieldWorkerTransition`. Two mechanisms: the DB trigger
  rejects any unguarded INSERT or UPDATE; the AST gate (`field-worker-state-invariant`) fails any write outside the projector.
- **I2** — Every other column is immutable after INSERT, even with the guard on (the trigger compares the whole row minus the I1
  columns, so a column added later is immutable by default).
- **I3** — On INSERT: `current_state = 'pending_kyc'`, `kyc_status = 'pending'`, `state_event_version = 1`, `state_reason_code IS
  NULL`, `district` non-blank. With the guard on, `state_event_version` strictly increases.
- **I4** — After every projector call the row equals `foldFieldWorkerProjection(loadEvents(field_worker_id))` on `{ state, version,
  kycStatus, reasonCode, district, endedOn }`.
- **I5** — A worker is `active` only with `kyc_status = 'completed'` (CHECK + the activation guard).
- **I6** — `terminated` is terminal: no event leaves it, in the reducer, the commands or the trigger (the trigger rule is Task 2.2's
  OWN — 0193 has none — and a resurrected row would also dodge the partial unique index, which excludes `terminated` rows).
- **I7** — All seven events are authored by a human actor (`operator` / `trustee`) with a non-null `actorId`; no event is ever
  recorded with actor `system` or `member`.
- **I8** — No event payload, audit line, log line, error message or response (other than the registration response's own `code`)
  carries a worker's name or mobile in any form; `events_log` is append-only and survives erasure.
- **I9** — `field_workers` has no `attribution_code` column; the code is read only through the door; no file in
  `packages/domain/src/field-worker/` imports `attribution-code`, and no file outside the door and the module names the registry.
- **I10** — A worker row is never deleted: `twt_app` has no DELETE grant, and the composite FK is `ON DELETE NO ACTION`.
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
  anyone READ the full log (Q-2's owner).

## Acceptance Criteria

0. **AC0 — governance first.** Before any code: Task 0.1 re-verification is done; BigDev has answered QE1–QE16 (done 2026-11-03) and Q-2…Q-4 and approved QE17 /
   QE18, Q-1 and Q-5 being RULED by the Panel (`-441`) (Task 0.2); the answers are recorded in ONE author-commit decision entry committed ALONE (Task 0.3); the Panel's
   ruling is recorded as decision `2026-11-03-441` (written 2026-11-03; no supersede line is needed — 13.2's C1 asked for a
   Panel-ratified key and now has one); THEN this story's ACs, Tasks, Invariants and Policy-meaning sentences, and the mirrored `epics.md` /
   `deferred-work.md` text, are amended to the recorded answers (Task 0.3) — no AC may still state a value an answer changed; if Q-3
   is unanswered it is recorded UN-ATTESTED and the go-live fence row exists (Task 0.4). The `epics.md` INHERITED / VARIANCE blocks
   and `deferred-work.md` C-items written by this create-story pass are re-read and still true.
1. **AC1 — table.** Given the new migration is applied, then `field_workers` has exactly the columns, types, NOT NULLs, defaults, named
   CHECKs and index in **QE4's column table**, with pgEnums sourced from the domain tuples; `twt_app` has SELECT, INSERT, UPDATE (no
   DELETE, no TRUNCATE); RLS is ENABLE + FORCE with the three per-command policies; `UNIQUE (pariwar_id, field_worker_id)` exists as
   the FK target; the partial unique mobile index exists — asserted through a NORMALISED `pg_get_indexdef` (strip whitespace and redundant
   parentheses, then compare the column list and the predicate; Postgres adds a `::field_worker_state` cast to the literal, so an
   exact-string assert on the source text fails — do not hard-code the rendered string).
2. **AC2 — guarded state (I1–I3).** Each of these is rejected with P0001 and the message prefix: an unguarded INSERT; an unguarded
   UPDATE of ANY column (including `audit_id` alone); a guarded UPDATE that changes an I2 column (at least `name_ciphertext`,
   `mobile_blind_index`, `pariwar_id`, `registered_by_display`, `created_at`); a guarded INSERT violating I3; a guarded UPDATE with a
   non-increasing version; a guarded UPDATE of ANY column on a `terminated` row (I6 — the trigger's own rule, Task 2.2). The CHECKs
   are asserted separately (23514): `_active_needs_kyc`, `_state_reason_pair`.
3. **AC3 — events.** The SEVEN payload schemas (the epic's six plus `posted`, QE17) are exported with `FIELD_WORKER_EVENT_TYPES` and a
   `satisfies Record<…>` payload map; all seven are registered in `packages/events/src/registry.ts` with the same schema objects; a set-equality coverage test exists;
   existing count assertions are checked by grep, do NOT assume them (re-run the 12.1 AC3 greps and update any that move, in the same
   commit). Payloads are `.strict()` and a unit test proves none can carry a name or mobile key; the genesis payload is `{ from_state:
   null, to_state, trigger, actor, authorization, district }` (QE6, QE17, QE18); the `posted` payload is `{ from_state, to_state, trigger, actor,
   authorization, from_district, to_district, reason_code }` (`reason_code` required, QE12's post list); the `authorization` schema is `.strict()` and a unit test proves it carries no personal data.
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
   the RBAC check (an object literal carrying the same fields is refused), names another Pariwar, or whose `target` is not this act's —
   `register`: key `field_worker.register` and target `{ district, the genesis district }`; `post`: target `{ district, toDistrict }` OR `{ district, the worker's current district }` — either end of the move, whichever the gate
   passed (QE17); any other target is refused — and its keys, one per reason, are its owner's to pin when they mint them. `posted` with a reason missing or outside QE12's post list ⇒ `FieldWorkerReasonInvalidError`
   (after the district-unchanged guard, QE5's order); a `posted` on a suspended worker leaves `state_reason_code` as it was (the pair
   CHECK stays valid). `terminateFieldWorker` REFUSES (`FieldWorkerEndedOnInvalidError`,
   command-only) an `ended_on` that is missing, is in the future, or is before the day the worker was registered (QE20); the
   terminated row's `ended_on` equals the event's.
6. **AC6 — concurrency (I13).** Twin: `module-stream-concurrency.spec.ts`. Own pool and REAL commits (a race needs real concurrent
   COMMITs); cleanup by the ids the suite created, under `session_replication_role = 'replica'` (`events_log` is append-only). The
   lock-order races (a, b, d, e) run at READ COMMITTED — under REPEATABLE READ a lock waiter gets an untyped 40001 (QE13, TR6),
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
   `FieldWorkerIllegalTransitionError`; and two `post`s to DIFFERENT districts at once both fulfil, in some order, with the second's
   `from_district` equal to the first's `to_district` and the row's `district` equal to the last event's `to_district` (the row lock
   serialises them).
   Honest scope: (a) is a probabilistic SMOKE — the interleaving is not forced (the twin says so too). I13's ORDER is pinned
   DETERMINISTICALLY by a unit test per command — a stub client records the statements and asserts SAVEPOINT → LOCK → HEAD →
   APPEND, then the guarded UPDATE (the twin: `tests/marketplace/commands-guards.test.ts`, RP4) — and that test carries a RED proof
   (swap the lock and the append, watch it fail, revert; recorded in the Debug Log).
7. **AC7 — composite FK and 13.2 interop (C1).** The same migration adds `field_worker_attribution_codes_worker_fk`
   `FOREIGN KEY (pariwar_id, field_worker_id) REFERENCES field_workers (pariwar_id, field_worker_id) ON DELETE NO ACTION`
   (`pg_get_constraintdef` omits `ON DELETE NO ACTION`, so assert `confdeltype = 'a'` from `pg_constraint` separately).
   A code for a worker that does not exist in that Pariwar is refused (23503); a code for a worker in ANOTHER Pariwar is refused;
   a `field_workers` DELETE and a `TRUNCATE … CASCADE` are refused (no grant; 13.2's TRUNCATE trigger). Every 13.2 spec listed in G4
   is updated to seed a real worker (a shared fixture) and is green; the policy-regression pin is rewritten to expect two UNIQUEs
   plus the named FK; nothing in 13.2's behaviour changes.
8. **AC8 — registration route (QE9; C1, C2, C6, C7) — UNCONDITIONAL, the Panel having ruled (`-441`).** Given a `pariwar_admin` with
   a display name and a listed `district`: a valid request returns 201 with
   `{ field_worker_id, district, current_state, kyc_status }` (`pending_kyc` / `pending`) and NO code (QE22); the worker row, the `field_worker.registered` event, the audit line
   and the code row all exist after commit; a replay with the same `Idempotency-Key` returns the recorded response and creates
   nothing; the same mobile again, sequentially (the pre-check) ⇒ 409 with no audit line — a concurrent loser that fails inside the
   transaction instead leaves its intent line and a `field_worker.registered_rolled_back` line; no session ⇒ 401; no grant in the
   Pariwar ⇒ 404; a grant without the key (and a `state_trustee` grant) ⇒ 403; a `district_admin` of the SAME district ⇒ 201 with
   genesis `authorization.role = 'district_admin'`; a `district_admin` of ANOTHER district ⇒ 403; a `pariwar_admin` for any listed district ⇒
   201 with `authorization.role = 'pariwar_admin'` (the fill-in); in EVERY 201 the genesis event's `authorization` EQUALS what the
   district gate itself returned (key, role, grant, target, catalog version — asserted against the guard's own result, not against a
   recomputation); an actor holding BOTH a `district_admin` grant at that district and a `pariwar_admin` grant is recorded as
   `district_admin` (the most specific), and a global `super_admin` as `super_admin`; an unlisted district ⇒ 422 `field_worker.district_unknown`, nothing
   written; a missing or non-string `district` ⇒ 400 `request.validation`; a missing `Idempotency-Key` ⇒
   400 `field_worker.idempotency_key_required`; an admin with no display name ⇒ 409
   `admin.display_name_missing` and nothing written; an exhaustion (door mocked to throw the re-exported class) ⇒ the flag wrapper is
   called once with the thrown `.attempts`, nothing is committed, the response is 503, and `field_worker.registered_rolled_back`
   exists; an invalid mobile ⇒ 422 `field_worker.mobile_invalid`, an invalid name ⇒ 422 `field_worker.name_invalid`, nothing written.
   Every 401 / 403 / 404 leg sends a VALID body (a bad body gets 400 `request.validation` before the guards run). Every error row
   the REGISTRATION route can raise (the 409 mobile / display-name / in-progress, the 400 key and validation, the 422 pair, the
   503) is asserted over HTTP at least once; the rows only a command can raise are asserted in a mapper unit test
   (`apps/api/tests/unit/field-worker-errors.test.ts`, twin: `marketplace-errors.test.ts`), marked "no route yet — Q-2". The response contains no key named
   `attributionCode` and no `code`, and the allocated code's VALUE is nowhere in its body (the test reads the code through the door and
   asserts the serialized body does not contain it); the plaintext name / mobile appear in no audit row, log or event — on the success path AND on every
   refusal path (409 / 422 / 503 bodies and messages included).
9. **AC9 — RBAC (I14).** Catalog version and key count move by exactly one (the key is `field_worker.register`, QE10: `district`
   dimension, held by `district_admin`, `pariwar_admin` + the derived `super_admin`); the grant list, the inert-grant
   legs (`state_trustee` is inert at a district gate), the POSITIVE legs (a `district_admin` grant AUTHORIZES at its own district and FAILS
   at another; a `pariwar_admin` grant authorizes at any district — `check.test.ts` pins that a seeded grant must actually authorize)
   and the "`field_worker` bundle stays empty" assertion are in `tests/rbac/{permissions,roles}.test.ts` (there is NO separate
   contracts permission mirror: `packages/contracts/src/rbac/permissions.ts` is a schema only, and the key appears in
   `emit-openapi.ts` as prose); `openapi/v1.yaml` is regenerated by the repo script (`pnpm contracts:emit-openapi`), never edited
   by hand; the route is registered in `server.ts`. The RBAC CORE change (QE18) is tested in `tests/rbac/check.test.ts`: `hasPermission` and
   `authorize` AGREE on every case in the existing matrix (allowed ⇔ a result, denied ⇔ none); with two satisfying grants the MORE
   SPECIFIC is returned whichever order they are loaded in; the result passes `isVerifiedAuthorization` and an object literal with the
   same fields does NOT; `requirePermission` still fires the denial seam and throws exactly as before; and the hook stores the result
   on `request.authorizations[key]`.
10. **AC10 — FR-85 contract (QE11).** `acceptsNewAttributions` is true for `active` only (all four states asserted) — QE11's
    settled build rule, CONFIRMED by the Panel (Question 2 A, `-441`). `getFieldWorkerStateAt(db,
    pariwarId, id, asOf)` takes a LOCAL
    `asOf: FieldWorkerAsOf = { captureId: MemberAttributionId } | { instant: <timestamptz text> } | 'now'` (QE11 — NOT a JS
    `Date`; do NOT import 13.2's `AttributionAsOf` or `AttributionCaptureMismatchError` — I9, and the reach fence flags a `path:`
    hit even for `import type`). A malformed `instant` throws `TypeError` BEFORE any SQL (a strict ISO-8601 regex, as 13.2's
    `parseAsOf` does — unguarded, garbage reaches Postgres as a raw 22007 and a route would answer 500). An unknown `captureId`, or
    one that belongs to another Pariwar, throws a typed `FieldWorkerCaptureNotFoundError` (domain `errors.ts`), NEVER `null` — `null`
    already means "unknown worker"; the `member_attribution` join carries `ma.pariwar_id = $pariwarId`.
    **THE ORDERING CONTRACT of `getFieldWorkerStateAt`** (copy the SHIPPED `getModuleStateAt` in `marketplace/read.ts`, not 12.1's
    story text). (1) Events are ORDERED by `event_version`, never by `occurred_at`. (2) The answer is the fold of the longest PREFIX
    — in `event_version` order — whose events ALL have `occurred_at <= asOf`: cut at the FIRST event stamped after the instant and
    drop it and everything after it; do NOT keep every event that individually satisfies `occurred_at <= asOf`. `occurred_at` is
    `now()`, the TRANSACTION START, so a transaction that BEGAN first but won the row lock second appends the HIGHER version with
    the LOWER timestamp; a per-event filter would replay {v1, v3} and skip v2 — for registered → kyc_completed → activated that is
    `active` with `kyc_status = pending`, a state I5 forbids and the worker never had. (3) A TIE counts: an event stamped exactly AT
    the instant is included (13.2's rule runs the same way round — `allocated_at <= captured_at`), so a suspension stamped at the
    capture's instant means the worker was suspended. (4) Every comparison is made IN the database at microsecond precision —
    `occurred_at > $instant::timestamptz` in SQL; on the `{ captureId }` arm the capture's `captured_at` is read in the SAME
    statement (a join), never into JS (a JS `Date` keeps milliseconds). (5) `'now'` applies NO timestamp cut — it is the whole
    stream, the latest committed state (equal to the stored projection, I4); a `<= now()` cut would drop an event committed by a
    transaction that started after the reader did. (6) An empty prefix (the first event is stamped after the instant) is the
    initial `pending_kyc` — the worker exists; `null` only when no `field_workers` row exists for (pariwar, id). (7) All seven event
    types are replayed (a stream is one event per transition — small), through the pure `foldFieldWorkerProjection`. (8) ⚠ CLOCK
    DOMAINS: `events_log.occurred_at` and `member_attribution.captured_at` are both `now()` — the TRANSACTION START — but 13.2's
    `field_worker_attribution_codes.allocated_at` is `clock_timestamp()`; they are not one domain. A transition therefore counts
    from the moment its transaction BEGAN: a signup whose transaction starts inside a transition's own window (the milliseconds
    before that transition commits) is read as already-suspended by this as-of replay, while a live read of the row at that moment
    still says `active`. The replay is the event-sourced, replayable answer (I4): say so in the doc comment, copy
    `getModuleStateAt`'s CLOCK DOMAIN caveat, and do NOT "fix" it with `clock_timestamp()`.
    The spec (own-committing, TR10) proves each rule: (a) the INVERSION, the twin's RV1 shape — register; open a `slow` transaction
    FIRST; commit `kyc_completed` (v2, the later stamp) from another connection; then `activated` on `slow` (v3, the EARLIER
    stamp); at just past v3's own stamp the answer is `pending_kyc` (the prefix {v1}), NOT `active`, and at just past v2's it is
    `active` — with the precondition asserted (v3's stamp is earlier than v2's); (b) the TIE and the microsecond order, passing
    `{ instant: <occurred_at::text> }` (included) and the same instant minus 1 µs computed in SQL (excluded); (c) `'now'` equals the
    stored projection in every state; (d) an instant before the genesis stamp gives `pending_kyc`, an unknown id gives `null`, an
    unknown or foreign `captureId` gives the typed error, and the `{ captureId }` arm agrees with the same instant given as
    `{ instant }` (the capture's `captured_at::text`) in a spec that seeds a real `member_attribution` row as 13.2's
    `resolve.spec.ts` does. Every read carries an explicit `pariwar_id`
    predicate, is isolated from a second tenant (one leg runs as the OWNER role, where RLS is NOT the filter — 13.2 TR3), and
    `listFieldWorkersForPariwar` is capped (`clampLimit`, inline `.limit()`) with a `Number.isInteger` guard that throws
    `RangeError` on a non-integer `limit` (13.2 deferred D1: `clampLimit(NaN)` is NaN and Drizzle then drops the LIMIT).
    `getFieldWorker` and `listFieldWorkersForPariwar`
    return a `FieldWorkerView` that OMITS `name_ciphertext`, `mobile_ciphertext` and `mobile_blind_index` and carries `district` (not personal data) (a type-level and a
    runtime assertion); no function in this story decrypts a worker's data — decrypt-on-read is 13.3's / 13.4's decision (C1, C6).
11. **AC11 — gate (G9).** `scripts/field-worker-state-invariant/` exists and is wired in `package.json`, `scripts/ci-local.sh` and
    `.github/workflows/ci.yml`; `lib.test.ts` flags a `.set({ currentState })`, `.set({ kycStatus })` and `.set({ auditId })`
    outside the allowlist (`field-worker/project.ts` → the two projector functions) and produces zero findings for the legitimate
    projector writes; a revert-sanity check is recorded. The compensating-audit gate's roots, README and
    `docs/access-wrapper-invariants.md` gain `apps/api/src/modules/field-worker` and `packages/domain/src/field-worker`.
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
13. **AC13 — privacy and logging (I8).** A test registers a worker with a recognisable name and mobile and
    asserts neither appears in `events_log.payload`, any `audit_log` row, the idempotency record's stored result, or the captured
    logger output (`buildServer(deps, { logStream })` — test-only, honoured only when `nodeEnv === 'test'`, the 6.19b precedent —
    plus a `console.error` spy) — and repeats the assertion for each refusal (409 duplicate, 422, 503 exhaustion): the response body,
    the error message and the `_rolled_back` audit row carry neither value. Assert reasons and values, never audit-row COUNTS (TR5).
14. **AC14 — full gate.** `pnpm ci:local` is green on a FRESH Postgres container (with `DATABASE_URL` set to the story's port), and
    the result is recorded; `pnpm typecheck` and the OpenAPI drift check (`pnpm turbo run contracts:check-openapi-determinism`,
    the ci-local job `contracts-determinism`) are green.

## Tasks / Subtasks

- [ ] **Task 0 — governance first (AC0).** ⭐ **0.1 runs FIRST in `bmad-dev-story`. Write no code before 0.1's greps are in the Debug Log.**
  - [ ] 0.1 `git fetch origin`; rebase on `origin/main` if it moved. Re-grep NUMBERS (decision id, migration + journal `when`, ADR,
        `PERMISSION_CATALOG_VERSION`, ledger letter in BOTH ledgers) across every ref and worktree. Re-verify G2, G3, G4, G5, G7, G8.
        Run this query on the story's DB and record the count: `SELECT count(*) FROM field_worker_attribution_codes` — if > 0, list the
        orphans (TR2) before the migration is written. Confirm the actor model: `events_log` has NO `actor` column — only `actor_id uuid`
        (NULL = system); the actor KIND is a Zod-validated payload key, so `operator` / `trustee` need no `events_log` change.
  - [ ] 0.2 **HALT — LIFTED 2026-11-03.** Every answer this story waited on is in: Q-2 (BigDev minted rows 13-1a / 13-1b / 13-1c), Q-3
        (the form "Application for Field Worker", version 1, states the purposes and records the worker's agreement — BigDev's word, the form
        unseen), Q-4 (No), QE17–QE20 and QE22 (APPROVED) and QE21 (ANSWERED: the District Admin registers, the Pariwar Admin approves; the B2
        nod is 13.1a's). Still do Task 0.1's re-verification, and STOP if any of those has since changed. The Panel's follow-up note
        (Q-6…Q-9) and the counsel question are NOT gates for this build; they gate go-live legs and the later routes. QE1–QE16 are ALREADY answered (2026-11-03, in session: as listed ⭐, with QE10 =
        `field_worker.register`, QE11 = `active` only and QE12 = the neutral reason values), and Q-1 and Q-5 are RULED by the Panel
        (`-441`) — this task does not re-ask them.
  - [ ] 0.3 FIRST commit the Panel's decision `2026-11-03-441` ALONE (already written, uncommitted: Q-1 A widened with the District
        Admin, "keep the full log", Q-5 A) together with its note's ruling block
        (`trustee-panel-routing-note-2026-11-03-story-13-1-field-worker-key-and-credit.md`; the question below the block stays
        UNEDITED). THEN one author-commit decision entry (≥ `-442`) recording the answers — QE1–QE16 as approved 2026-11-03 (QE10 the
        per-act key, QE12 the neutral reason values: an author-commit, not a `-210` delegation), QE17, QE18, Q-2, Q-3 and Q-4, with
        Q-1 and Q-5 cited to `-441` — committed ALONE, BEFORE any code. That entry also says that QE17 supersedes `-441`'s build reading ("later acts gate against the current district") for the MOVE only: a move gates on EITHER end of it — the destination district or the current one (v1.15). No supersede line is needed: 13.2's C1 asked for a
        Panel-ratified key and `-441` supplies it.
        THEN, in a second records commit before any code, AMEND this story (v1.2+) so that no AC, Task, Invariant, Names row or
        Policy-meaning sentence still states a value an answer changed, and mirror the change in the `epics.md` blocks and
        `deferred-work.md` items it touches — at least: QE17 / QE18 if BigDev changes them (the `district` column, the `authorization`
        payload key, AC1 / AC3 / AC8); Q-2 (which routes exist; QE2); and any QE a Q answer reopens (QE4 / QE15: AC1's columns, AC2's
        immutable list; QE5 / QE16: state labels). QE10's key, dimension and holders, QE12's reason lists and the Panel's ruling were
        applied in v1.3 / v1.5 — re-check that they still agree. A
        recorded answer that the ACs contradict is a silent override by the dev agent
        ([[feedback_spec_edits_must_propagate_to_tasks]]).
  - [ ] 0.4 Go-live fence. Add ONE row to `docs/launch-gate-inventory/inventory-roster.md` (`### Row N — <slug>`, bullet format;
        re-grep the number: the highest on main is 47 and 46 is reserved by 6.39 and 14.3 — take ≥ 48 unless 46 is confirmed free;
        `owner`: "Trustee Panel (gate); counsel (Story 0.13)", the Row 19 shape). Its closure legs, each marked open or met with the
        decision id that met it: (a) the Panel's ruling on the key — MET by `2026-11-03-441` (B(3) says additions are "ratified
        when their feature sets ship"; the Row 45 (a) precedent); (b) the footing and notice for the worker's name and mobile (Q-3) — MET by BigDev's confirmation, 2026-11-03: the form ("Application for Field Worker", version 1) states the purposes, records the worker's agreement, and tells the worker the Trust keeps the name and mobile electronically while they are employed and removes them 8 years after termination — on BigDev's word, the form unseen; record the form's version and the purposes as BigDev reads them in the row, and note that 13.1b (the SMS) and 13.5 (payment) re-check their own use; (c) MET — BigDev answered No to Q-4 (2026-11-03): no code has been handed out by hand; (d) the Panel's confirm of Q-5 — MET by `-441` (A, as built); (e) retention — for name and mobile CONFIRMED by BigDev 2026-11-03 from the form: kept while the person is employed, removed 8 years
        after the date of termination. Tell the owner of ARCH §2.12's retention matrix (it lives outside this repo and names
        "field-worker payout records", not name / mobile); payout records (13.5) and the paper form are NOT covered by this; (f) the erasure path — now with a dated trigger, the 8-year removal (C5 has no owner; DPDPA rights apply; a request BEFORE the 8 years is counsel's question 4); (g) the
        contractor-vs-employment classification (`docs/legal-counsel-engagement/review-scope-charter.md` §4 lists it open — and the form says "employed" while the PRD says contractors); (h) ⭐ a
        PRODUCTION PATH TO `activated` exists (Q-2) — without it QE11's mitigation ("activate, then tell them the code") cannot be
        carried out and, under Q-5 (A), no registered worker can be credited at all. The counsel question is DRAFTED and REVISED (2026-11-03, a third time) to the classification, the 8 years and erasure before them — (b) is settled by BigDev's confirmation, so its first question has fallen away:
        `_bmad-output/planning-artifacts/counsel-question-2026-11-03-field-worker-data-basis.md`, in the shape of
        `counsel-question-2026-10-18-nominee-contact-basis.md` ("WRITTEN, not sent") — re-read it before BigDev sends it. If Q-2 mints a sprint row, BigDev does it; this
        task only records the row key. Re-read the `deferred-work.md` "Deferred from: story 13-1-…" section and the
        INHERITED blocks under 13.3 / 13.4 / 13.5 / 13.6 / 13.8 in `epics.md` (written by the create-story pass).
- [ ] **Task 1 — encryption classes.** Add `FIELD_WORKER_FIELD_CLASS = 'field_worker'` and `FIELD_WORKER_MOBILE_FIELD_CLASS =
      'field_worker_mobile'` to `encryption/field-classes.ts` with a doc comment in the `CLAIM_CONTACT_MOBILE_FIELD_CLASS` style (the
      disjoint-space reason), exported through `encryption/index.ts` AND re-exported from `apps/api/src/context.ts` beside the other
      field classes (the claim-contact crypto helper imports them from there). Add the API-side helper that normalises, encrypts and
      indexes a field worker's name and mobile. Twins: `apps/api/src/modules/claims/claim-contact-crypto.ts` for the Tier-1 encrypt (it
      has no blind index and no normalise) and `packages/domain/src/claim/correction-crypto.ts` (`correctionNumberHash`, the
      `claim_contact_mobile` class) for the HMAC — the helper is a hybrid of the two.
- [ ] **Task 2 — schema, policies, migration (AC1, AC2, AC7).**
  - [ ] 2.1 `schema/field_workers.ts` (+ `schema/index.ts`), `policies/field-workers-rls.ts` (+ `policies/index.ts`). No `$type` on the
        branded id except `FieldWorkerId`. Do not write the literals `fieldWorkerAttributionCodes` or `field_worker_attribution_codes`
        as an identifier or a string in any `.ts` here — run the reach fence (TR3). ALSO declare the composite FK in the Drizzle table
        `schema/field_worker_attribution_codes.ts` with `foreignKey({ name: 'field_worker_attribution_codes_worker_fk', columns: [t.pariwarId, t.fieldWorkerId], foreignColumns:
        [fieldWorkers.pariwarId, fieldWorkers.fieldWorkerId] }).onDelete('no action')` (the house style: `member_wa_opt_in_codes.ts`,
        `marketplace_modules.ts`); that file is already in the fence's ALLOWED list.
  - [ ] 2.2 Hand-author `NNNN_field-workers.sql` in the G14 order: header ("never regenerate"; ⚠ the FK add scans 13.2's table — TR2);
        pgEnums; `field_workers` (incl. `district`, QE17, and the nullable `ended_on`, QE20); CHECKs (incl. `field_workers_district_nonblank` and `field_workers_ended_on_pair`); the FK-target UNIQUE; GRANT SELECT, INSERT, UPDATE; ENABLE/FORCE RLS; the three policies; the
        partial unique index; the guard trigger function and trigger — COPY `0193_marketplace-modules.sql`'s
        `marketplace_modules_reject_unguarded_state_write` (genesis-shape check on INSERT; the strictly-increasing version rule;
        whole-row comparison minus the projected columns — which now include `district`, changeable only under the writer var — and a genesis shape that also
        requires a non-blank `district`), DROP its slot rules (d) / (e), rely on the reason-pair CHECK, and ADD one rule of your own — an UPDATE of a row whose
        `OLD.current_state` is `terminated` is rejected P0001 with the same message prefix, guard on or off (I6: 0193 has no
        terminal-state rule, so a copy alone leaves I6's trigger leg unbuilt);
        THEN `ALTER TABLE field_worker_attribution_codes ADD CONSTRAINT … FOREIGN KEY … ON DELETE NO ACTION`. Add the journal entry by
        hand with a trailing newline and a `when` above every sibling's.
- [ ] **Task 3 — events + registry (AC3).** `field-worker/events.ts` with the "PINNED SEAM" delimiter comment; payload schemas (SEVEN events: the genesis payload carries the `authorization` snapshot and `district`, the `posted` payload the snapshot and both districts — QE17, QE18; the snapshot's schema is `.strict()`); the
      registry entries; the coverage test (clone `module-registry-coverage.test.ts`, but define the clone's OWN description template —
      the twin also asserts description strings that name the MODULE stream and Story 12.1, and fails on the first run otherwise); run
      the AC3 greps.
- [ ] **Task 4 — reducer (AC4).** `field-worker/state.ts`, `nextFieldWorkerState`, `foldFieldWorkerProjection`, `toFieldWorkerEvent`; the `posted` arms (same-state, from `pending_kyc` / `active` / `suspended`, never `terminated`); the fold also derives `district` and `endedOn`.
- [ ] **Task 5 — projector (AC2, AC5).** `field-worker/project.ts`: `projectFieldWorkerGenesis`, `projectFieldWorkerTransition` (copy the
      SHIPPED `marketplace/project.ts`: the transition takes `lockedRow` from its command, checks the stream HEAD equals
      `lockedRow.stateEventVersion` (else `FieldWorkerStreamConcurrencyError`), appends at version + 1, then the guarded UPDATE with
      `SET LOCAL app.field_worker_state_writer` — NOT a whole-stream replay; a `posted` event writes `district` in that same guarded UPDATE; the genesis wraps itself in a SAVEPOINT and maps the
      partial-unique 23505 BY CONSTRAINT NAME in its row-INSERT catch).
- [ ] **Task 6 — commands, reads, errors (AC5, AC6, AC10).** `field-worker/{commands,read,errors,index}.ts` (the reads project the row to
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
      `FieldWorkerCaptureNotFoundError` lives in `errors.ts`). The guard order of every command is QE5's. Export only the direct-write set at the top level of `domain/src/index.ts`
      (`FieldWorkerStateDirectWriteError`, `FIELD_WORKER_STATE_DIRECT_WRITE_CODE`, `FIELD_WORKER_STATE_DIRECT_WRITE_MESSAGE_PREFIX`,
      `isFieldWorkerStateDirectWriteError`), everything else through the `fieldWorker` namespace. `registerFieldWorker`'s input carries `district` (QE17) and `authorization` (QE18, a `VerifiedAuthorization`) — written at genesis;
      `district` is later changed only by `postFieldWorker(client, { …, toDistrict, reasonCode, authorization })`, which checks the district DIFFERS (whether it
      is LISTED is the caller's, via `assertDistrictRecorded`); `read.ts` also holds `assertDistrictRecorded` (QE17).
- [ ] **Task 7 — contracts, route, handlers (AC8, AC12, AC13) — UNCONDITIONAL, the Panel having ruled (`-441`).** ⭐ Do
      Task 8 (the key) FIRST — the route imports it. Contracts: DTOs under `packages/contracts/src/field-workers/` (shape only,
      QE9); RE-DECLARE `FIELD_WORKER_STATES` / `FIELD_WORKER_KYC_STATUSES` in `packages/contracts/src/field-workers/enums.ts` and
      NEVER import `@twt/domain` there (a domain import leaks `pg` into the browser / Metro bundles —
      [[project_contracts_domain_bundle_boundary]]), with a TEST-ONLY sync guard in `packages/contracts/tests/` that imports both
      and asserts equality (twin: `modules.test.ts`); `.openapi('…')` component names; the barrel edit in
      `packages/contracts/src/index.ts`; the `emit-openapi.ts` entry, then regenerate `openapi/v1.yaml` with `pnpm
      contracts:emit-openapi`. API: `apps/api/src/modules/field-worker/{routes,handlers,errors,index}.ts`; register in `server.ts`; the gate is
      `requirePermissionHook(deps, 'field_worker.register', { dimension: 'district', resolveValue })` (QE9, TR12) and the handler passes
      `request.authorizations['field_worker.register']` — the VERIFIED result the gate stored (QE18) — to `registerFieldWorker` and never
      recomputes it from `request.scopeGrants`; if the compensating-audit intent can carry an actor role, give it `authorization.role`,
      never a second computation (decision `2026-08-13-105` D4: "the grant that actually authorized");
      rename every `module.*` literal in the helpers copied from 12.2. Import the door's error classes FROM THE DOOR. Write the
      "Errors and their HTTP mapping" table's API half, with its mapper unit test
      (`apps/api/tests/unit/field-worker-errors.test.ts`). The exhaustion leg is tested with the door MODULE mocked — in its OWN spec
      file (`vi.mock` is file-wide and would also hit the success legs), or through a `vi.mock` factory using `importActual` and
      `mockRejectedValueOnce(new AttributionCodeAllocationExhaustedError(…))`; the mock path from `apps/api/tests` is
      `../../src/modules/field-worker/attribution-code-access.js`, which the fence does not scan — the door forwards no `generate`
      seam, by design. Run the AC12 review before opening the PR.
- [ ] **Task 8 — RBAC (AC9); do it BEFORE Task 7.** `rbac/permissions.ts` (the catalog entry
      `field_worker.register` at `dimension: 'district'`, `PERMISSION_CATALOG_VERSION` 58 → 59 and its version-history comment), `rbac/roles.ts` (a const + the `district_admin` list AND the `pariwar_admin` list),
      `tests/rbac/permissions.test.ts` (`toBe(58)` → 59 and `toHaveLength(77)` → 78), a `tests/rbac/roles.test.ts` block (twin: the
      `Story 12.2 — module.manage…` `describe`), and the key's prose mention in `packages/contracts/scripts/emit-openapi.ts`. There
      is no contracts permission mirror to update (AC9). Do not touch the stale "Epic 12" comments (G15).
      **THE RBAC CORE (QE18)** — in `packages/domain/src/rbac/check.ts` extract the per-grant test out of `hasPermission` into ONE
      private predicate that BOTH `hasPermission` and a new `authorize` call; `authorize` returns the authorizing grant (the most
      specific; ties by role, scope value, then grant id) as a `VerifiedAuthorization` issued only inside `check.ts` and registered in
      a module-private WeakSet (`isVerifiedAuthorization`); `requirePermission` returns it (it returned nothing) and `checkPermission`'s
      ok result carries it; `EffectiveGrant` gains an optional `grantId`, and `loadActorGrants` (and any twin loader) selects `id`;
      `requirePermissionHook` stores the result on `request.authorizations[key]` (typed in `apps/api/src/types.ts`). Strictly ADDITIVE:
      every existing RBAC test passes unchanged. `packages/domain/src/rbac` and `apps/api/src/modules/rbac` are governance-boundary
      roots — a reviewed edit, no feature flag. Tests build a real context and call the real check; there is no test-only way to mint a
      verified result.
- [ ] **Task 9 — gate (AC11).** Copy `scripts/marketplace-module-state-invariant/` → `scripts/field-worker-state-invariant/`; rename
      the table / columns / allowlist; wire `package.json`, `ci-local.sh`, `ci.yml`; extend the compensating-audit roots + README +
      `docs/access-wrapper-invariants.md`; record the revert-sanity check.
- [ ] **Task 10 — repair 13.2's specs (AC7).** ⭐ Land the DOMAIN-side repairs
      in the same commit as Task 2's migration, so no commit leaves 13.2's live-DB suites red; the `apps/api` repair needs
      `registerFieldWorker` and lands with Task 6 (until then do not push — the pre-push hook runs `ci:local`). (1) Domain: add
      `seedFieldWorker` to the shared attribution-code fixtures UNDER `packages/domain/tests/` — NEVER `packages/domain/src/test-utils/`,
      which the state-invariant gate scans (its `currentState` / `auditId` keys would be flagged). It generates a FRESH unique
      `mobile_blind_index` per call (a constant collides on `field_workers_pariwar_mobile_live_uq` when one Pariwar is seeded with many
      workers — `allocate-concurrency.spec.ts` and the exhaustion legs do) and is an OWNER-role INSERT under `SET LOCAL
      app.field_worker_state_writer = 'on'` with the genesis shape (`pending_kyc`, `pending`, version 1, reason NULL, a non-blank `district`). (2) `apps/api`:
      tests there cannot import `packages/domain/tests`, and `attribution-code-access.spec.ts` seeds inside `openScopeTx` (role
      `twt_app`, so no owner-role seed) — add `apps/api/tests/integration/_field-worker-fixture.ts` calling
      `fieldWorker.registerFieldWorker(client, …)` with dummy ciphertext strings; the cross-Pariwar leak block needs a worker in BOTH
      PARIWAR_A and PARIWAR_B. Update every spec in G4; in `allocate-concurrency.spec.ts` seed COMMITTED workers and clean both tables
      in `afterAll` under replica mode, codes first.
- [ ] **Task 11 — tests (AC2–AC13).** Unit: state, events, errors, no-audit-wrapper-in-domain, acceptsNewAttributions, commands-guards (I13's
      statement order, with its RED proof — AC6). Live-DB: commands, projector-trigger, concurrency (AC6), reads incl. the AC10
      ordering contract (own-committing: the inversion, the tie, µs order, `'now'`), composite FK, RLS regression, cross-Pariwar-leak
      block. API: the registration spec incl.
      the privacy leg. The `posted` legs live in the commands and projector-trigger specs (a move with each of the two reasons; a move with no reason or an unknown one ⇒ `FieldWorkerReasonInvalidError`; a repeat;
      a move after the worker is ended; a move of a SUSPENDED worker leaves `state_reason_code` untouched; a verified authorization
      whose target is the destination district, or the current district, is accepted, and one whose target is any OTHER district is refused; the row's `district` equals the last event's
      `to_district`) and AC6 (e). Every guard gets a RED proof; every scan a non-vacuity floor.
- [ ] **Task 12 — records and full gate (AC14).** Dev Agent Record, File List, Change Log; the story's completion ledger entry (the next
      free letter after `h`) prepended to BOTH ledgers in `sprint-status.yaml` — the top comment block and the `last_updated: >-` key
      block — by the safe-prepend pattern (read first, size guard, verify the YAML afterwards); `pnpm ci:local` on a fresh container;
      run the `decision-flow-sync` skill after the decision lands.

## Dev Notes

### Current state (what exists, what this story changes, what it must preserve)

- **`field_worker_attribution_codes` and the door (13.2)** — gain one FK; the door file is NOT edited (its export list is pinned to
  eleven names; the route imports it). The reach fence's ALLOWED list does not change (a door importer under `apps/api/src` is exempt).
  Stale "no FK yet" comments in `schema/field_worker_attribution_codes.ts` and `ids/index.ts` are updated (comment-only; the exports pin
  must stay green; `attribution-code/index.ts` carries no such comment). The Drizzle table also gains the composite `foreignKey()`
  (Task 2.1) so the schema file and the database agree.
- **`member_attribution` and its writer (3.6b)** — READ-ONLY here. The Reference Code stays an unvalidated capture; 13.8 wires the
  lookup into signup.
- **`rbac/roles.ts` `field_worker`** — stays `permissions: []`, `scopeCeiling: 'self'`.
- **`requireMemberSession` / `scopeResolutionHook` / `requestContextHook`** — unchanged; the 13.2 writer pin only reads them.
- **`events_log`** — gains six event types and no index.
- **`apps/api/src/modules/field-worker/`** — gains routes beside the door.

### ⚠ Traps (TR)

- **TR1 — the same-state legal event.** `kyc_completed` is `pending_kyc → pending_kyc`. A projector that rejects `toState === fromState`
  makes it illegal (12.1 TR1); legality is `nextFieldWorkerState(...) !== null`.
- **TR2 — the FK add scans 13.2's table.** A plain `ADD CONSTRAINT … FOREIGN KEY` validates existing rows. CI and production have none
  (nothing is live); a developer database that ever ran `allocate-concurrency.spec.ts` to a crash holds orphans, and the migration fails
  with 23503. Check at Task 0.1; clear orphans under `session_replication_role = 'replica'`; do NOT edit the migration afterwards
  ([[project_live_db_test_gotchas]] — never regenerate or edit an applied migration).
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
  exists only because its `at` IS a `Date` — this story's `{ instant }` is text, so it needs none (13.2 TR10 / TR11).
- **TR11 — a lost 201 loses the worker's id, not a code (QE22).** The 201 carries `field_worker_id` and nothing secret. 12.2's accepted
  residual still applies: an ambiguous COMMIT, or a `recordResult` failure after COMMIT, RELEASES the idempotency key, and the retry
  mints a new id and meets the duplicate-mobile pre-check — 409. The registered worker exists (`pending_kyc`), but until Story
  13.1a's list of workers awaiting approval exists nobody can find it to approve it. A retried registration after an exhaustion also
  writes a second flag (13.2 D3). Accepted residual, homed in Story 13.1a.

- **TR12 — a district gate is only as good as its target value.** This route's gate target is the BODY's `district` (QE9):
  `resolveValue` is synchronous and fail-closed (`null` denies); a District Admin's grant matches by EXACT bytes (`'Patna'` covers
  `'Patna'`, not `'patna'` or `'Patna '`); a Pariwar Admin's grant covers ANY string it is given — so the listed-district 422 (QE17) is
  the only data-quality guard, and the caller must send the spelling from the list. A seeded grant that authorizes no one is the
  recurring failure of district-gated work (`check.test.ts` pins it), so AC9 demands a POSITIVE leg for each holder. Later lifecycle
  routes gate on the worker's STORED district, never on a request value.

- **TR13 — the authorization result belongs to the CHECK, not the handler.** `hasPermission` returns on the FIRST satisfying grant in
  load order, so "which grant passed" was never defined; QE18 defines it once (most specific wins) in `authorize`, and `hasPermission`
  shares its predicate. A handler that recomputes the role from `request.scopeGrants` can disagree with the gate (a different
  resolver, a different order) and would write a FALSE record into an append-only log. Pass the stashed `request.authorizations[key]`.
  The snapshot records the role and grant that passed, NOT the role's permission list then in force (bundles are editable, FR-44),
  and a `grant_id` may point at a row later deleted — the tuple is the record. The audit line's `actorRole` (null in most handlers) is
  a second place a role is recorded: where it is set it comes from `authorization.role`, never a second computation.

### Carried to sibling stories (C) — written to `deferred-work.md` and under each sibling in `epics.md` by this create-story pass. ⭐ Build NONE of these.

- **C1 → 13.3 (the worker's own surface).** The worker's login principal (a `users` row + a `role_grants` row — no route creates either
  today; ARCH §2.3's email + password + passkey for a part-time seller on a mid-range phone is worth a look), the `field_worker_self`
  scope resolver (the `self` branch in `rbac/scope.ts` has "zero live consumers" and says to raise it WITH a live requirement — this
  is it), and the worker's own-read permission key (B(3)-literal). *Inference, not fact:* the grant's `scope_value` can carry the
  `field_worker_id`, so no `user_id` column is needed on `field_workers`. 13.3 also owns "tell the worker the code only after
  activation" in its runbook (QE11's mitigation).
- **C2 → 13.8 (the first signup consumer).** Apply FR-85 with `fieldWorker.acceptsNewAttributions` against the worker's state, and
  `getFieldWorkerStateAt(…, { captureId })` when resolving a stored capture (in SQL, never a JS `Date`); a not-credited code must ⛔ block or delay a signup.
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
- **C5 → Story 13.1c (the routes and the log's read); the 8-year removal has NO row yet.** The register screen, the five other lifecycle routes, list/detail reads (a PII-tier decrypt-on-read
  decision), the erasure path — the 8-YEAR REMOVAL the recruitment form promises (BigDev, 2026-11-03: name and mobile are kept while the person is
  employed and removed 8 years after the date of termination): an anonymize command for TERMINATED workers only, scrubbing
  `name_ciphertext`, `mobile_ciphertext` and `mobile_blind_index` (a tombstone, unique per row for the NOT NULL index) while the row,
  the code, the introductions and the whole log stay (the log carries no name or mobile — I8, I15); a later migration must `CREATE OR
  REPLACE` the guard function to admit that scrub under its own writer variable
  ([[project_append_only_guard_names_erasure_columns]]); terminated rows sit outside the partial unique index, so a scrubbed row cannot
  collide; the clock starts at the date of termination (QE20) and the first removal is 8 years after the first termination,
  so nothing is due at go-live — but the obligation must have an owner before then,
  and profile correction (QE15). ⚠ Build NO terminate route (and no suspend route that a terminate would follow) before 13.6 records
  C4 — reversibility and appeal. The owner must also give "activate" a production path before go-live (Task 0.4 (h)). Per the Panel
  (`-441`): the District Admin is the intended MANAGER of field workers with the Pariwar Admin filling in — so gate every such route on
  the worker's STORED district (QE17), mint a key per act, carry the `authorization` snapshot (QE18) on the other five events, each from the gate's verified result, and give the full
  log a READ (I15). The MOVE splits: a Pariwar Admin's DIRECT move (either reason) is 13.1c's; the District-Admin-to-District-Admin REQUEST
  and its accept / refuse, and every notice, are Story 13.1d's (C10).
- **C6 → 13.4.** The dashboard reads workers through the domain accessor; per-worker identity is operator-tier; the 13.2 flag list (its
  C3 / D3) is rendered there with `actor_display`.
- **C7 → the first go-live.** The roster row's legs (Task 0.4 (a)–(h)): (a) and (d) are MET by `-441` (the Panel's ruling on the key and its
  confirm of Q-5); also MET — (b) Q-3's footing and notice (BigDev: the form states the purposes and records the agreement) and (c) Q-4's hand-issued-codes premise (No); retention is CONFIRMED from the form; still open — the erasure path, the contractor classification, and a production path to `activated` (Story 13.1a).
  Also tell 14.3: its breach-readiness story (branch `story/14-3-dpo-breach-reporting-operational-readiness` — re-check when it lands)
  keeps a list of people-holding tables (nominees, known people, claim contacts, workplace requests); `field_workers` is one it does
  not name.
- **C8 → 13.3 and the Epic 6 ground-inspection dispatch owner (G17).** A field worker also visits claimants. (a)
  `acceptsNewAttributions` is the CREDITING predicate only; dispatch needs its own predicate, and this story's lifecycle state
  revokes nothing and gates no dispatch until 13.3 wires it. (b) 13.3 decides whether a worker sees their own state and reason
  code. (c) A worker's DISTRICT is now on the row (QE17, from the Panel's ruling `-441`); a block or anything finer is NOT, and
  I2 makes any later column immutable by default — adding one means `CREATE OR REPLACE` of the guard function (the C5 note).
  13.4's "field workers by Pariwar/district" can read `district` from the row. Mirrored under 13.3 and 13.4 in `epics.md`.

- **C9 → Stories 13.1a (approval, code read, screens) and 13.1b (the SMS) — onboarding completion.** BigDev's process (2026-11-03): the District Admin
  REGISTERS, the Pariwar Admin APPROVES (the Pariwar Admin does both if the District Admin is unavailable); the worker's code goes to
  them BY SMS once they are in the system; if they did not get it, a District Admin (own district) or a Pariwar Admin gives it BY HAND
  on the worker's request. Needed: (a) the approval route (QE21, Q-9); (b) an audited code-read route for the by-hand case — the
  door's `readAttributionCodeForRequest`, a per-act key for the District Admin (own district) and the Pariwar Admin, one audit line
  per read; (c) the SMS — traced 2026-11-03: the platform sends SMS for step-up and handover OTPs, but has NO sender for a non-member
  recipient and NO template for a code message, and DLT delivers only approved text, so a new template must be registered and
  approved first (a long-lead item — start it now); the worker's number is Tier-1 ciphertext, so sending needs a purpose-limited,
  audited decrypt (13.1's AC10 forbids any decrypt here), the send happens AFTER the approval commits and never rolls it back, and
  the sender must not log the mobile (I8); (d) the screens. The by-hand path is already sanctioned, so the SMS is NOT on the critical
  path to go-live. QE22 (APPROVED) withholds the code from the registration response, so 13.1a's read is the ONLY way any admin sees it.
- **C10 → Story 13.1d (the move request, the refusal reasons and the notices).** BigDev's rule (2026-11-03): a worker's reporting
  district changes by CONSENT — a District Admin at either end OPENS a request at the worker's request, the other ACCEPTS or REFUSES it
  with a reason from a fixed list (never free text; suggested `no_capacity`, `work_not_needed_here`, `request_incomplete`, `other`);
  the worker stays put until it is accepted; the opener may withdraw; unanswered for 7 days ⇒ escalated to the Pariwar Admin, NEVER
  accepted by default; a Pariwar Admin's direct move (13.1c) ends any pending request. The acceptance calls THIS story's
  `postFieldWorker` in the same transaction, under the accepting District Admin's verified authorization (target: either end, AC5),
  and fails cleanly if the worker has been moved meanwhile. The notices go by email AND in-app and are CONSUMERS of the events, so
  they cover a Pariwar Admin's direct move too — see QE17 for the trace (neither channel exists for District Admins today). Needs
  this story landed; independent of 13.1c.

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
  `field_workers`, then `events_log`, then the test `users` (13.2 TR12; the twin spec's cleanup). A committed `field_workers` seed
  in `allocate-concurrency.spec.ts` is an OWNER-role INSERT under the writer var, ⛔ the projector (a projector call would append to
  `events_log`, which cannot be cleaned without replica mode either — keep the two seeds separate and say which one a leg uses).
- Every guard gets a RED proof; every scan a non-vacuity floor; assertions after a savepoint rollback must assert the reason AND a
  control ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]). A test that names a copy key calls the real `t()`.

### Project Structure Notes

- New: `packages/domain/src/field-worker/{index,events,state,project,commands,read,errors}.ts`; `schema/field_workers.ts`;
  `policies/field-workers-rls.ts`; `migrations/NNNN_field-workers.sql`; `packages/contracts/src/field-workers/`;
  `apps/api/src/modules/field-worker/{routes,handlers,errors,index}.ts`; `scripts/field-worker-state-invariant/`; tests as in Task 11.
- Modified: `packages/domain/src/{index,encryption/field-classes,encryption/index}.ts`; `schema/index.ts`; `policies/index.ts`;
  `migrations/meta/_journal.json`; `packages/events/src/registry.ts`; `rbac/{permissions,roles}.ts` (conditional); `apps/api/src/server.ts`;
  `package.json`; `scripts/ci-local.sh`; `.github/workflows/ci.yml`; `scripts/access-wrapper-invariants/{check.ts,README.md}`;
  `docs/access-wrapper-invariants.md`; `packages/contracts/scripts/emit-openapi.ts` and `openapi/v1.yaml` (generated); `packages/contracts/src/index.ts` (the
  barrel) and a sync-guard test under `packages/contracts/tests/`; the 13.2 specs in G4; comment-only edits in three 13.2 files; `sprint-status.yaml`.
- Variance from the epic, with reason: no `attribution_code` column (13.2 AT2); event spelling `kyc_completed` (G8); no package (QE1);
  a registration route the epic's `[PRIMITIVE]` label does not mention (13.2 C1).

### References

- `_bmad-output/planning-artifacts/epics.md` — Epic 13 (summary + body), Stories 13.1 (incl. the INHERITED block), 13.2, 13.3, 13.5, 13.6, 13.8;
  Story 3.6; Story 12.1 / 12.2 for the twin.
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` — §2.4, §4.12, §4.14 (statutory), FR-53, FR-81–FR-87.
- `_bmad-output/planning-artifacts/architecture.md` — §2.3 (admin auth), §2.7 (tiers), §2.12 (retention), §4.1 (field-worker surface), event naming.
- `_bmad-output/implementation-artifacts/13-2-6-digit-attribution-code-generation-per-pariwar.md` (AT1–AT10, C1–C7, TR1–TR14) and
  `12-1-module-manifest-schema-module-lifecycle-state-machine.md` / `12-2-admin-module-targeting-wizard.md` (the twin and the route template).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`.
- `.decision-log.md` — `2026-06-21-059` amendment B(3); `2026-09-08-210` cl.2; `2026-11-01-433` QE2; `2026-10-30-421` QE6 / QE14.
- Code: `apps/api/src/modules/field-worker/attribution-code-access.ts`; `apps/api/tests/unit/attribution-code-reach-fence.test.ts`;
  `packages/domain/src/attribution-code/`; `packages/domain/src/marketplace/`; `apps/api/src/modules/marketplace/{routes,handlers}.ts`;
  `packages/domain/src/encryption/{field-classes,member-fields,blind-index}.ts`; `packages/domain/src/schema/{users,role_grants,
  member_identities,member_kyc_profiles}.ts`; `scripts/provision-admin.ts`; `scripts/marketplace-module-state-invariant/`;
  `packages/events/src/registry.ts`; `packages/domain/migrations/{0178,0189,0193,0199}_*.sql`.

## Dev Agent Record

### Agent Model Used

_(filled by `bmad-dev-story`)_

### Debug Log References

_(Task 0.1's greps go here first.)_

### Completion Notes List

_(empty)_

### File List

_(empty)_

### Change Log

- **v1.16 (2026-11-03)** — BigDev: "I think request should be made by sending District Admin to receiving District Admin. There should be
  mechanism to accept or refuse with reason. What do you say?", then "Yes to all four, mint 13-1d". (1) The move rule becomes CONSENT
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
- **v1.15 (2026-11-03)** — BigDev: "Yes, widen it to the current District Admin. For notification both email and in-app." (1) The move
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
- **v1.13 (2026-11-03)** — BigDev: "I don't want to restrict worker movement because a school may sit near another district boundary
  and visiting that school would cost money and time again ... make reporting authority the District Admin, changeable only if the
  worker requests ... or the Pariwar Admin directly ... without a lot of workload on the Pariwar Admin", then: "there can be a
  situation when we need to move the worker under a new reporting authority, so apart from worker request, the Pariwar Admin should
  be able to move the worker". (1) QE17 REWRITTEN (second revision): `district` is the worker's REPORTING district, not a work area —
  traced, the landed attribution-code module (13.2) never mentions district, and credit follows the lifecycle state only; the
  identifier stays `district`. (2) `posted` gains a REQUIRED `reason_code`: `at_worker_request` (the receiving District Admin or a
  Pariwar Admin) or `reassigned` (a Pariwar Admin only). It lives in the event only: `state_reason_code` is untouched, and the fold's
  `reasonCode` ignores `posted`, so a suspended worker who is moved keeps their suspension reason. (3) A MOVE gates on the DESTINATION
  district (AC5's target); suspend, reactivate and terminate still gate on the CURRENT district. This supersedes `-441`'s build
  reading for the move only — Task 0.3's author-commit says so; `-441` is committed (`0f66848b`) and is NOT edited. (4) 13.1c mints TWO
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
- **v1.11 (2026-11-03)** — BigDev: "District Admin recruits and Pariwar Admin approves, and code can be sent only when the worker is approved. So both cannot be done in 1 step. mint 13-1a, 13-1b, 13-1c". (1) Q-2 DISCHARGED: the three rows are minted (`13-1a-field-worker-approval-and-code-hand-over`, `13-1b-field-worker-code-by-sms`, `13-1c-field-worker-moves-suspension-and-termination`; `backlog`, directly after this story's row in `sprint-status.yaml`; an `epics.md` entry each, with its gates: 13.1a — Q-9 and Q-8, 13.1b — the DLT template and the roster's purposes leg, 13.1c — Q-6 and 13.6's C4 for the terminate route). (2) QE21 CONFIRMED as answered: registration and approval are two steps by two officers, option C stays out. (3) NOT applied: QE22 — "the code can be sent only once approved" is about SENDING, and whether the registration 201 still shows the code to the registering admin changes this story's route shape (QE9, AC8, TR11, Task 7), so it stays PROPOSED until BigDev says yes; the B2 nod is 13.1a's create-story's. (4) Edits: the Q-2 ask, Task 0.2's HALT (Q-2 removed), the "no owner in Epic 13" and Which-routes lines, the C5 and C9 headings, the header, the `epics.md` VARIANCE bullets, `deferred-work.md` C5 / C9 and the ledger. (5) The 8-year removal (C5) has NO row: it is carried in 13.1c's entry, to be named an owner before the first terminate route reaches a real worker. NO AC, Task or Invariant changed.
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
