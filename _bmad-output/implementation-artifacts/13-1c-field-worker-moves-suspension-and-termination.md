---
baseline_commit: bb4d8620
---

<!--
PINNED: `bb4d8620` = `origin/main` (ledger 2026-11-07c - Story 13.1b LANDED, PR #325, `d555f75d..546c57d1`). The story lives on branch
`story/13-1c-field-worker-moves-suspension-and-termination` in its OWN worktree (`.claude/worktrees/13-1c-field-worker-moves-suspension-and-termination`),
created from `origin/main` on 2026-11-07. Every `apps/` / `packages/` claim was traced at the pin on 2026-11-07 by the create-story pass (three read-only
research passes - the domain commands and stream; the API routes, RBAC and admin module; the governance trail - then the author's own reads of `state.ts`,
the attribution door and the 13.1a / 13.1b stories). Perishable - re-check at Task 0.1. Re-locate by FUNCTION, not by line.

STATUS: ready-for-dev (v1.5, 2026-11-07; validated; Tasks 0.0, 0.2-0.6 done; Q-1..Q-5 ANSWERED by BigDev: "Q1 C, Q2-Q5 A" - Task 0.2 done). The Panel note (Task 0.6) is
DRAFTED, NOT sent. No code before Task 0.3 (the decision entry, committed ALONE). Nothing is committed: this pass wrote this file, the Panel note and the
record edits listed in Task 0.0 - committed `01cbba52`; decision `-453` `490510d9`; Row 50 and row `13-1e` `0b329bb4`; Task 0.5's annotations in the commit that records v1.5. Next: Task 0.1, then code.

NUMBERS (re-grep each at Task 0.1; every one is contended by siblings):
- Next free decision: `2026-11-07-453` (the newest on any ref is `-452`). "The number belongs to the first COMMIT" (`-449`).
- RBAC: `PERMISSION_CATALOG_VERSION = 60`, 81 keys (`packages/domain/src/rbac/permissions.ts`). This story: ONE bump, 60 -> 61; keys 81 -> 86 (five keys, AD5; Q-1 C keeps `field_worker.terminate`).
- Migration: NONE expected (the catalog is TypeScript only - 13.1a's mint `54ed242a` touched no permission table; payloads are JSON). If one turns out to be needed, the next free is `0203`; read the journal's last `when` live.
- Ledger: the newest letter on any ref is `2026-11-07c`; this pass takes `2026-11-07d` (read it live: letters collide across branches). The comment block at the top of `sprint-status.yaml` is the live ledger.
- Roster: the highest row is 49; Row 46 is RESERVED by 6.39 / 14.3. This story appends **Row 50** (Task 0.4).
- Panel notes: the 13.1a keys confirm (`trustee-panel-routing-note-2026-11-04-story-13-1a-field-worker-keys-confirm.md`) is SENT (reported 2026-11-05), NOT ruled; the 13.1b confirm is WRITTEN, NOT sent.
-->

# Story 13.1c: A Pariwar Admin Moves a Field Worker Directly; a Field Worker Is Suspended, Reactivated or Terminated - and Everything That Has Happened to Their Record Can Be Read `[SURFACE]`

Status: ready-for-dev

## WHAT THIS STORY IS, IN ONE PARAGRAPH

Story 13.1 built a field worker's seven-event lifecycle as domain COMMANDS; 13.1a gave registration's sibling acts (approval, the by-hand code read, the
list and identity reads) their routes and screens; 13.1b texts the code. Four commands still have **no route**: `postFieldWorker` (a change of the
REPORTING district), `suspendFieldWorker`, `reactivateFieldWorker` and `terminateFieldWorker`, so FR-85's "field worker can be deactivated" is unreachable in
production, and the Panel's "Keep the full log of field worker" (`-441`) has no READ. This story builds those routes, their five per-act permission
keys, the authorization snapshot on the three events that lack it (13.1 QE18, as 13.1a AD3 did for approval), an expected-source guard on a move
(13.1's D7), a paged read of a worker's whole event stream, and the admin screens for all of it. **Termination is the open edge:** the epic says the
terminate route waits on Story 13.6's decision on reversibility and appeal (13.1 C4), and 13.1's C5 says "Build NO terminate route before 13.6 records C4".
**BigDev chose (Q-1 C) to build the full terminate route now** - every neutral reason, from every state but `terminated` - superseding both lines by the
decision entry (Task 0.3); the route does not reach a real worker before C4 is recorded (Row 50 (b)), and C4 is put to the Panel from this story's note
(Q-2 A). Not here: the District-Admin-to-District-Admin move REQUEST and EVERY notice (13.1d), the 8-year removal (Q-4 A: owned by a new backlog row
`13-1e`, nothing is built), the labelling reasons (13.6).

## Story

As a **Pariwar Admin** - and, for suspending, reactivating and ending a worker, **the District Admin who manages them** -
I want **to move a field worker directly when the Trust needs it, suspend or reactivate them, record that they have left, and read everything that has
happened to their record**,
so that **a worker keeps one identity and one code across districts and nothing about them is lost.**

## Policy meaning (AI-10-1)

**This story introduces NO new predicate on a member's access to a benefit, and changes none.** No member state, `account-frozen` source,
`member_attribution` row or payout field is touched (I9). *In the member's terms* 13.1's sentence stands: **"Who introduced you never changes what you are
covered for - if your introducer is no longer active, you are a member in full; only the credit to them is not recorded."**

**It does make an EXISTING benefit predicate REACHABLE for the first time, and that predicate carries a meaning nobody has ruled on.** 13.1's
`acceptsNewAttributions(state)` is `state === 'active'`, confirmed by the Panel in `-441` Q2 A - a question put about a worker NOT YET approved ("a signup
made before activation is not credited and cannot be credited afterwards"). Today no state but `pending_kyc` and `active` can be reached; this story's
suspend route makes `suspended` reachable. *In the field worker's terms:* **"While you are suspended - even 'under review', even if the review clears you -
a teacher who joins with your code is a member in full, but you are never credited with that teacher, and that is not made up when your suspension is
lifted."** That is the Story 10.10 shape (a suspension that silently costs something permanent). It costs **nothing today**: no code records a signup's
credit to a worker - `resolveAttributionForRequest` (the door) has no caller (grepped at the pin), and the recorders are Stories 13.8 / 13.5. `-441` and
`-443` both list "what a suspension or ending does to money already earned" as NOT ruled, and 13.1's section 0 edge 6 calls money on suspension the Panel's.
**So this sentence goes to the Panel (Q-3 A, this story's note), and the first attribution recorder may not go live before it is answered (Row 50 (d)).**
This story builds nothing that decides it either way: it does not touch `acceptsNewAttributions`.

**Under Q-1 C, `terminated` becomes reachable from `active` and `suspended` too.** *In the field worker's terms:* **"Once you are ended, a teacher who
joins with your code is a member in full but is not credited to you; a teacher already credited to you stays credited; and ending is final - to work
again you are registered again, with a new code."** The first two halves are PRD FR-85 (binding: "existing attributions preserved; new attributions on
deactivated code rejected"); finality is 13.1's (section 0 edge 7). Whether an ending can be undone or appealed, and whether an officer is shown that a
number being registered belonged to an ended worker, go to the Panel (Q-2 A); the route does not reach a real worker before the answer is recorded
(Row 50 (b)). What an ending does to money ALREADY EARNED stays unruled (`-443`; 13.1 section 0 edge 6, carried to 13.5) and costs nothing today: no
code pays a field worker.

*Costs, stated so they are not found later:* (a) A District Admin can suspend, reactivate and END a worker in their own district with no second officer -
and an ending is final, with no appeal until the Panel says otherwise (Q-2) - the Panel's "District Admin will manage field workers" (`-441`) is read as
covering it; the key confirm (Q-5) puts that reading to the Panel. (b) A
suspension `under_review` has no time limit and no notice to the worker (the worker has no login until 13.3; notices are 13.1d's and name only District
Admins). (c) A move changes nothing about the worker's code or credit, by design (13.1 QE17) - it changes whose District Admin manages them.

**Checked against the Niyamavali** (the git-ignored private copies in the main checkout, grepped by absolute path 2026-11-07): `docs/legal/niyamavali.md` and
`niyamavali.hi.md` for `field.?worker|kshetra|suspend|terminat|appeal|8 years|eight years` (and the Devanagari terms). **Result: SILENT on field workers.**
Every suspend / terminate / appeal hit is about MEMBERS (Part 8 moderation, R56 / R6). No text is pasted here: the repo is public and the legal corpus is
kept out of it ([[project_legal_corpus_private_repo_split]]). The Niyamavali is a rulebook, not a ratified spec ([[feedback_niyamavali_rulebook_not_spec]]).
**Privacy Policy** (`docs/legal/privacy-policy.md`, same date): 0 field-worker hits; a field worker is outside its scope (13.1 section 0 edge 5).

## The rulings and sources this story builds on (quoted, never paraphrased)

Quotes are word-for-word; typographic dashes are written as ASCII hyphens; "..." marks a cut.

| Source | Verbatim | Status |
|---|---|---|
| Panel `2026-11-03-441` | "The goal is District Admin will manage field workers, however if District Admin is unable to discharge his duties for any reason, including District Admin is yet to be Join, Pariwar Admin will fill in. Keep the full log of field worker." | Trustee-ratified. "Manage" beyond ADDING was read "as a direction for those later permissions, NOT as a ruling on them" (`-441` itself) - hence Q-5 |
| Panel `2026-11-03-443` Q1 A, as put | "The Pariwar Admin may also move a worker directly, for either reason, and settles a refused or unanswered request. Both District Admins are told by email and in the admin console, including when the Pariwar Admin moves a worker." | Trustee-ratified - the direct move's WHO (AC1); the notice is 13.1d's |
| Panel `-443` Q3 A, as put | "Both can always act, and the log records which authorisation allowed each act" | Trustee-ratified - the snapshot on every event (AD3) |
| `-443`, "does NOT cover" | "What a suspension or ending does to money already earned; termination's reversibility and appeal (13.6); the contractor-or-employee classification and erasure (counsel's, not sent)." | why Q-1, Q-2, Q-3 exist |
| `-059` amendment B (3) | "(3) Future permission additions for Finance Officer, Media/Comms, Field Worker, and Helpline Operator are to be ratified when their feature sets ship." | Trustee-ratified - every key here goes to the Panel (Q-5) |
| PRD FR-85 | "Field worker can be deactivated; existing attributions preserved; new attributions on deactivated code rejected." | PRD - binding |
| `epics.md` Story 13.1c | "the terminate route does NOT ship before Story 13.6 records its C4 (is termination reversible, is there an appeal, is a re-registered terminated mobile surfaced to the registering admin) - suspend and reactivate may ship first" | BigDev-minted epic text - Q-1 |
| 13.1 C5 (the 13.1 story's carried item C5, near its line 2432; author-commit `-442`) | "Build NO terminate route before 13.6 records C4" | author-commit - Q-1 |
| `epics.md` Story 13.1c (header block) | "an owner must be named before the first terminate route reaches a real worker" | BigDev-minted epic text - Q-4 |
| 13.1 QE15 (`-442`) | "a typo is corrected by terminating (`registered_in_error`) and registering again" | author-commit - one reason Q-1 was asked |
| 13.1 section 0 edge 7 | "Terminated is final; re-engaging = a new registration - **Yours, cost recorded**" | author's - finality is NOT re-opened here |

### 0 - whose decision is this (`trustee-panel-routing-note-TEMPLATE.md` section 0, per edge)

| # | Edge - stripped of citations | Verdict |
|---|---|---|
| 1 | Who may move a worker directly | **The Panel's - RULED** (`-443` Q1 A): a Pariwar Admin, for either reason. Gate MET |
| 2 | Who may suspend, reactivate, end a worker, and read their log | **The Panel's in kind** (`-059` B(3): a field-worker permission "ratified when their feature sets ship"). Built on the default (District Admin own district + Pariwar Admin), a NON-BLOCKING confirm that gates go-live (Q-5 A, Row 50 (a)) - 13.1a's precedent (Row 48 (i)) |
| 3 | Can an ending be undone; can a worker appeal it; is a re-registered ended number shown to the officer | **The Panel's** - what the Trust owes a person it ended. Handed to 13.6 by 13.1 C4; **Q-2 A: put to the Panel now, in this story's note**; 13.6 records the answer. Gates the terminate route's go-live (Row 50 (b)) |
| 4 | Does a suspended worker lose credit for teachers who join meanwhile, for good | **The Panel's** (13.1 section 0 edge 6; `-441` / `-443` "NOT ruled"). **Q-3 A: in this story's note.** Blocks no build here: no recorder exists |
| 5 | Whether this story builds a terminate route at all, and which | **BigDev's** - his own scoping text (C5, the epic) - **ANSWERED Q-1 C: the full route, go-live gated (Row 50 (b))** |
| 6 | Who owns the 8-year removal | **BigDev's** scheduling - **Q-4 A: a new backlog row `13-1e-field-worker-eight-year-removal`**. Erasure BEFORE 8 years is counsel's (question 3, unsent) |
| 7 | The expected-source guard, the log's shape, the screens, the key names | **Yours** (AD) - no change to what a person sees or is owed |
| 8 | Whether the log shows the code text | **Yours** (AD9): officers already see the text's status on the same panel |

**Result: ONE Panel note (Task 0.6), holding SEVEN questions (second draft, BigDev 2026-11-07: "rewrite question 1 and add silent and death"):
1 an ending made wrongly - undo and appeal; 2 a worker who comes back - same record and code or a fresh start; 3 a returning number shown
(1-3 = Q-2 A's 13.1 C4, split); 4 a worker who goes silent; 5 a worker who dies (4-5 added by BigDev); 6 credit during a suspension (Q-3 A);
7 the key confirm (Q-5 A). The terminate route's go-live waits on 1-5 (Row 50 (b)). DRAFTED 2026-11-07: `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-07-story-13-1c-field-worker-lifecycle.md`,
NOT sent. It is non-blocking: it gates go-live (Row 50), never the build.**

## Names at a glance

| Thing | Name |
|---|---|
| Keys (AD5) | `field_worker.move` (pariwar_admin), `field_worker.suspend`, `field_worker.reactivate`, `field_worker.terminate`, `field_worker.read_log` (district_admin + pariwar_admin; super_admin derives all). Constants beside 13.1a's in `rbac/roles.ts` |
| Move-key list (AD4) | `FIELD_WORKER_MOVE_PERMISSION_KEYS = ['field_worker.move'] as const` in `packages/domain/src/field-worker/commands.ts` (13.1d APPENDS its keys) |
| Routes (AD6) | `POST /api/v1/p/:pariwarId/field-workers/:fieldWorkerId/{move,suspend,reactivate,terminate}`; `GET .../:fieldWorkerId/log?after=&limit=` |
| Domain, new read | `listFieldWorkerEvents(db, pariwarId, fieldWorkerId, { afterVersion?, limit? })` in `packages/domain/src/field-worker/read.ts` |
| Domain, changed | `suspendFieldWorker`, `reactivateFieldWorker`, `terminateFieldWorker` gain a REQUIRED `authorization`; `postFieldWorker` gains `expectedFromDistrict` and the key check; the `suspended` / `reactivated` / `terminated` payload schemas gain `authorization` |
| API, new file | `apps/api/src/modules/field-worker/lifecycle-handlers.ts` (the four writes) and `log-handlers.ts` (the read); registrations in `routes.ts` |
| Contracts | `packages/contracts/src/field-workers/`: `MoveFieldWorkerRequest`, `SuspendFieldWorkerRequest`, `ReactivateFieldWorkerRequest` (`{}` strict), `TerminateFieldWorkerRequest`, `FieldWorkerLifecycleResult`, `FieldWorkerLog`; the three reason tuples RE-DECLARED in `enums.ts` with a sync test, as the state enum is |
| Audit actions | = the event type (13.1 QE6): `field_worker.posted` (a move - ⛔ `moved`), `field_worker.suspended`, `field_worker.reactivated`, `field_worker.terminated` (+ their `_rolled_back` twins); locator `field_worker/<id>` |
| Admin | `apps/admin/src/modules/field-workers/`: `WorkerActions.tsx`, `WorkerHistory.tsx`; a state selector on `FindWorkerPage.tsx` (Waiting for approval / Active / Suspended / Ended); `WorkerDetail`'s `children` gains a second argument `(name, worker)`; copy in `i18n-en.ts` (`fw.actions.*`, `fw.history.*`, `fw.reason.*`) |
| Roster | Row 50 `field-worker-lifecycle-live` |

## FOUND FACTS (G) - traced at `bb4d8620`, 2026-11-07

- **G1 - The four commands exist and have NO caller in `apps/*`.** `packages/domain/src/field-worker/commands.ts`: `suspendFieldWorker(client, base & {reasonCode})`
  (:355), `reactivateFieldWorker(client, base)` (:370), `terminateFieldWorker(client, base & {reasonCode, endedOn})` (:381), `postFieldWorker` (:423,
  `PostFieldWorkerInput` :405: `toDistrict, reasonCode, authorization`). `FieldWorkerCommandBase` (:78) = `pariwarId, fieldWorkerId, auditId, actor:
  'operator'|'trustee', actorId`. The registry descriptions (`packages/events/src/registry.ts:700-718`) say "no production emitter".
- **G2 - HEADLINE: suspend, reactivate and terminate carry NO authorization.** Their payload schemas (`events.ts` :175, :187, :200) are `.strict()` and
  have no `authorization`; only `registered`, `kyc_completed`, `activated` and `posted` do. `-443` Q3 A ("the log records which authorisation allowed each
  act") cannot be met for them as built. 13.1a AD3 is the exact precedent (same shape, same cost: "a stream written before this change would fail a
  strict re-parse - nothing is live, tests only").
- **G3 - HEADLINE: `postFieldWorker` accepts ANY verified district key.** `verifiedSnapshot(..., {})` passes no key and no target (:425); the comment at
  :418-420 orders the key-minting story to refuse every key outside the move-key list, `field_worker.register` explicitly, in the same commit. Under the
  lock (:431-437): same district -> `FieldWorkerDistrictUnchangedError`; target neither `toDistrict` nor `row.district` -> `FieldWorkerAuthorizationStaleError`.
  No expected-SOURCE check (13.1 D7): two moves of one worker both fulfil, serialised by the row lock.
- **G4 - The transition table** (`state.ts:74-84`): `active -suspended-> suspended`; `suspended -reactivated-> active`; `posted` keeps the state from
  `pending_kyc`, `active` or `suspended`; `terminated` from `pending_kyc`, `active` or `suspended`; nothing leaves `terminated` (and trigger rule (t),
  `0201`, refuses any UPDATE of a terminated row). `foldFieldWorkerProjection`: `posted` changes the district only (a suspended worker moved stays
  suspended with the same reason); `reactivated` clears the reason.
- **G5 - Reasons:** `FIELD_WORKER_SUSPEND_REASONS = ['under_review','at_worker_request']`, `FIELD_WORKER_TERMINATE_REASONS = ['left_voluntarily','inactive','registered_in_error']`,
  `FIELD_WORKER_POST_REASONS = ['at_worker_request','reassigned']` (`events.ts:43-53`); Postgres enum `field_worker_reason_code` (`0200:53`) and CHECKs
  `field_workers_state_reason_pair` / `_subset` / `_ended_on_pair`. NOT re-declared in `@twt/contracts` (only the state, KYC and code-SMS enums are).
- **G6 - `ended_on`:** a real `YYYY-MM-DD` checked before SQL; under the lock, `> istToday` -> `in_future`, `< registeredOn` (IST date of `created_at`) ->
  `before_registration`; today and the registration day are allowed. Both bounds are IST days on the DB clock - a test that takes "today" from the UTC
  clock fails from 00:00 to 05:30 IST ([[project_ist_vs_utc_test_date_window]]; it bit 13.1b at R4-19).
- **G7 - No log read exists.** Nothing named `listFieldWorkerEvents` / history / log in `src`. The query to copy is `getFieldWorkerStateAt`'s
  (`read.ts:421-463`): it first checks the row exists in this Pariwar, then `events_log` by `(pariwar_id, stream_id)` ordered by `event_version`.
  `events_log` has `event_id, stream_id, event_type, payload, event_version, occurred_at (now(), the transaction start), actor_id, pariwar_id`; NO actor
  display name and NO stream type (the stream is `stream_id = field_worker_id`); index `events_log_pariwar_stream_idx`. Payloads hold NO name or mobile (13.1 QE4).
- **G8 - The API shapes to reuse** (`apps/api/src/modules/field-worker/`): the per-worker chain `[session, scope, loadWorker, requirePermissionHook(key,
  { dimension: 'district', resolveValue: fieldWorkerGateDistrict })]` (`routes.ts:83-91`; a missing or foreign worker stashes `null` -> 403 for everyone,
  no existence oracle); `tenantWrite` (`write-support.ts:90-119`: idempotency key -> release the hook tx -> `withIdempotency` -> `prepare` with no tx ->
  `openScopeTx` -> `run` -> `closeScopeTx(false)` in `finally`); the approval's pre-read that refuses an illegal transition BEFORE any audit wrapper, and
  its COMMIT inside the audit wrapper's `mutate` (`approval-handlers.ts:63-104`). 13.1a TR6: the keyed store keeps NO body fingerprint, so the idempotency
  namespace must carry the worker id. `request.authorizations[key]` is the verified object; a missing one is a 500.
- **G9 - `mapFieldWorkerError` already maps** `illegal_transition` 409, `reason_invalid` 422, `district_unchanged` 409, `authorization_stale` 409 ("The
  field worker was moved meanwhile - reload and try again"), `ended_on_invalid` 422, `district_unknown` 422, `stream_conflict` 409, `not_found` 404. Each
  is now reachable; `apps/api/tests/unit/field-worker-errors.test.ts` labels some "no route yet".
- **G10 - Districts:** `fieldWorker.assertDistrictRecorded(tx, pariwarId, district, at)` (`read.ts:142-150`) - the geo tree's district nodes if one is in
  force, else `workplace_districts` `listed`; byte-exact; `FieldWorkerDistrictUnknownError` -> 422. `GET .../field-workers/districts` (no key) lists them.
- **G11 - RBAC:** catalog v60, 81 keys, `SEED_PERMISSION_KEYS` (`permissions.ts:1484-1495`), changelog comment `:840-867`; holders in `roles.ts`
  (`pariwar_admin` bundle :520-524, `district_admin` :582-585); the dimension lives on the ROUTE, not the catalog. 13.1a's mint `54ed242a` is the
  template (`permissions.ts`, `roles.ts`, `tests/rbac/{permissions,roles}.test.ts`, `tests/field-worker/events.test.ts` catalog fixtures). Two source
  fences in `packages/domain/tests/rbac/check.test.ts`: `authorize(` only in `check.ts`, the two `_field-worker-fixture` files and tests; the
  `requirePermission` result only in `check.ts`, `apps/api/src/modules/rbac/index.ts` and tests.
- **G12 - Tests that will break.** (a) On the move-key check (G3): `packages/domain/tests/field-worker/commands-guards.test.ts` (`authAt` defaults to
  `field_worker.register`, :51, :151, :217, :268-285, :428), `tests/integration/field-worker/{_fixtures.ts:72-82,commands.spec.ts,stream-concurrency.spec.ts}`,
  `apps/api/tests/integration/_field-worker-fixture.ts:75-94` (`moveTestFieldWorker`), `apps/api/tests/integration/field-worker/code-read.spec.ts:57`,
  and the `permission_key: 'field_worker.register'` posted fixtures in `tests/field-worker/{state,events}.test.ts`. (b) On AD3's REQUIRED `authorization`
  - every caller of `suspendFieldWorker` / `reactivateFieldWorker` / `terminateFieldWorker` and every hand-built payload of those three events:
  `apps/jobs/tests/field-worker-code-sms-live.test.ts:293,298,312` (13.1b's, in ANOTHER app - its in-file `verified()` helper's key union is
  `'field_worker.register' | 'field_worker.approve'` and must widen; keep the helper inside the `.test.ts`, the `authorize(` fence),
  `apps/api/tests/integration/field-worker/approval.spec.ts:184-188`, `code-read.spec.ts:131-135,213,242`, `packages/domain/tests/integration/field-worker/read.spec.ts`
  (:154, :198, :201, :300), `projector-trigger.spec.ts` (payload fixtures; `APPROVAL_TYPES` at :73 decides which carry `authorization`), and the
  suspended / reactivated / terminated fixtures in `tests/field-worker/{state,events}.test.ts`. `scripts/field-worker-state-invariant/lib.ts:298` names the
  commands in a message only.
- **G13 - The admin module** (`apps/admin/src/modules/field-workers/`): `FindWorkerPage` lists `active` workers once a district is chosen; `WorkerDetail` is
  the audited identity panel (a `<dl>`; `children?: (name: string) => ReactNode` at `:29`, called only once the identity has loaded - it passes the NAME
  only, ⛔ the state or district); its query `useFieldWorkerIdentity` (`hooks.ts:3049`) decrypts the name and mobile and writes a `field_worker.identity_viewed`
  audit line on EVERY fetch (`gcTime: 0`, `refetchOnMount: false`); `CodeReveal`; `derive.ts` (`BY_CODE` maps `illegal_transition` -> `fw.approvals.alreadyDone`,
  `authorization_stale` -> `fw.approvals.moved`; `fieldWorkerGuidance` for 401 / 403 / 429); hooks in `src/api/hooks.ts:3005-3088`
  (`fieldWorkerListIsStale` covers `illegal_transition`, `kyc_already_completed`, `authorization_stale` and deliberately NOT `code_not_available`);
  `newIdempotencyKey` / `attemptKey` (`:596`, `:615`). Approve mints a key per click and reuses it only for a retryable failure of that click.
- **G14 - Two carried copy defects become reachable here.** (a) 13.1b C7 / CB9: `skipped_not_active` maps to `not_delivered` (`code-sms.ts:221`), whose
  copy reads "Code SMS not delivered - give the code by hand when they ask" (`i18n-en.ts:105`) - for a suspended or ended worker the by-hand read answers
  409. The outcome-to-STATUS mapping is pinned at `apps/api/tests/integration/field-worker/reads.spec.ts:514` (a status, not the words). (b) 13.1a CR60: a 409 `code_not_available` leaves the row on Find; the test
  `apps/admin/tests/field-worker-find-page.test.tsx:1057` pins "a 409 for another reason does not" refresh.
- **G15 - The SMS sweep's re-check.** 13.1b AD4 re-checks `active` with a plain read, not `FOR SHARE`; `read.ts:362-365` says to re-examine that when 13.1c
  ships suspend. A suspension in the seconds between the check and the gateway call does not stop the text - AD4 ACCEPTED this ("credited nothing while
  suspended"). This story re-examines and RE-ACCEPTS it (AD10); it does not touch the sweep.
- **G16 - Typo lock-out (one reason Q-1 was asked).** Name and mobile are immutable (13.1 QE15); `UNIQUE (pariwar_id, mobile_blind_index) WHERE current_state <> 'terminated'`.
  So a worker registered with a misspelt NAME can never be registered again on the same mobile until the first registration is TERMINATED - and no route terminates.
- **G17 - Old dev rows.** `field_workers_approved_by_state` (`0201:50`, NOT VALID) requires `approved_by_display` when `active` or `suspended`; its comment
  warns that pre-0201 dev rows hit 23514 on suspend, terminate or move. Fresh test containers are unaffected.
- **G18 - The 8-year removal needs more than a command** (13.1 C5, D8): a guard-function `CREATE OR REPLACE` to admit a scrub of the three PII columns
  (a per-row tombstone for the NOT NULL blind index), and a role a policy names (FORCE RLS, policies `TO twt_app` only, so an owner-run UPDATE matches
  zero rows). Counsel's question 3 (erasure on request before 8 years) is WRITTEN, NOT sent. Nothing is due before eight years after the first termination.
- **G19 - Officers' display names are readable on the request's transaction.** `users` has `users_global_access` `FOR ALL TO twt_app USING (true)` and
  `GRANT SELECT ... TO twt_app` (`0005_admin-identity-auth.sql:143,151`); no later migration narrows it. So AD7's join runs on the hook transaction.
  The rule to mirror is `getDisplayName` (`apps/api/src/modules/auth/admin/admin-auth.repo.ts:186`): a NULL or blank-after-trim name is `null`.
- **G20 - What a transition returns.** `FieldWorkerTransitionResult` (`project.ts:279`) = `{ eventId, eventVersion, fromState, state, kycStatus, district }`.
  `fromState` is the LOCKED row's state (read under `FOR UPDATE` inside the command). It carries ⛔ reason and ⛔ `ended_on`.

## Build decisions AD1-AD12 - the author's recommendations; BigDev's at Q-1..Q-5; recorded at Task 0.3

- **AD1 - Scope.** Four write routes (move, suspend, reactivate, terminate - Q-1 C), one read route (the log), their keys, and the screens. NOT here: the
  move request, its answer, the 7-day escalation and every notice (13.1d); the 8-year removal (Q-4 A: row `13-1e`); the labelling reasons `conduct_concern`, `conduct`,
  `fraud_confirmed` and their writer (13.6); profile correction (13.1 QE15, 13.3 / C5); the cross-Pariwar link (13.1 C11, no row).
- **AD2 - Termination: Q-1 C (BigDev, 2026-11-07: "Q1 C").** The terminate route accepts every reason in `FIELD_WORKER_TERMINATE_REASONS`
  (`left_voluntarily`, `inactive`, `registered_in_error`) for a `pending_kyc`, `active` or `suspended` worker - the domain command's own rules (G4, G6),
  and NO route-level restriction (⛔ `terminate_not_available`: that code was option B's and is not minted). A terminated worker -> 409
  `illegal_transition` on the pre-read (no audit line); one terminated by a concurrent request between the pre-read and the lock makes the command throw
  inside `mutate`, which rolls back and writes the `_rolled_back` twin (TR2) - as for every act. Termination stays FINAL (13.1 section 0 edge 7): this
  story adds no way back. **Supersession, by the decision entry (Task 0.3), never a re-reading:** 13.1 C5's "Build NO terminate route before 13.6 records
  C4" and the epic's "the terminate route does NOT ship before Story 13.6 records its C4" are superseded - and, found while writing `-453`, `-442`'s
  "terminate waits on Story 13.6's C4" and Story 13.6's INHERITED C4 lines ("13.1c's terminate route does not ship before this is recorded"); in their place, the route is built and merged,
  and does not reach a real worker before the Panel answers the note's Questions 1-5 (C4, going silent, death; Row 50 (b)). If the Panel rules a way back, a rejoin on the old code or an appeal,
  that is a new transition and a new decision (C2); if it rules that some reason or state must not be ended, or not by a District Admin, the route
  narrows - one file. The labelling reasons stay 13.6's (the body's reason enum is the three neutral values; anything else -> 400).
- **AD3 - Every event this story writes carries the verified authorization (13.1 QE18; `-443` Q3 A).** `suspendFieldWorker`, `reactivateFieldWorker` and
  `terminateFieldWorker` gain a REQUIRED `authorization`; each runs `verifiedSnapshot` at guard (0) with `expected.permissionKey` = its own key, and UNDER
  the lock, after the legality guard, refuses an authorization whose `target.value` is not the LOCKED row's `district` with
  `FieldWorkerAuthorizationStaleError` (reuse `assertApprovalTarget`'s logic - the gate read the district BEFORE the lock). The three payload schemas
  gain a required `authorization`. Exactly 13.1a AD3's shape and cost. The FOUR `registry.ts` descriptions this story's routes emit - `suspended`,
  `reactivated`, `terminated` AND `posted` (whose text says "the emitting surfaces are Stories 13.1c / 13.1d (unverified until built)") - name 13.1c's
  routes as the emitter and drop "no production emitter" / "unverified until built" (13.1d still owns the request half of `posted`).
- **AD4 - The move refuses every key but a move key, and names its expected source (13.1 C5 / C10, D7).** `postFieldWorker`: (i) `verifiedSnapshot`
  with the key checked against `FIELD_WORKER_MOVE_PERMISSION_KEYS` (refusing `field_worker.register` explicitly, by a test), IN THE SAME COMMIT that
  mints `field_worker.move`. `verifiedSnapshot`'s `expected` takes ONE `permissionKey` today: add `permissionKeys?: readonly string[]` beside it (the
  key must be one of them; same `FieldWorkerProjectorInputError` message shape) and pass `{ permissionKeys: FIELD_WORKER_MOVE_PERMISSION_KEYS }` -
  ⛔ a single key, so 13.1d only appends to the list; (ii) a REQUIRED `expectedFromDistrict`, checked under the lock FIRST among the district guards: `row.district !==
  expectedFromDistrict` -> `FieldWorkerAuthorizationStaleError` (the existing 409 and its "moved meanwhile - reload" message say exactly this; no new
  code). (iii) The either-end target rule stays (13.1 AC5, ratified in `-443` Q1 A's words). The body carries `from_district` - the district the admin's
  screen showed. 13.1d's acceptance will pass the request's source.
- **AD5 - FIVE keys, ONE catalog bump (60 -> 61, 81 -> 86), by author-commit; each a `-059` B(3) key with a non-blocking Panel confirm (Q-5).**
  | Key | Holders | Gate |
  |---|---|---|
  | `field_worker.move` | `pariwar_admin` (+ `super_admin`) | `district` = the worker's CURRENT district (the loader); a Pariwar grant covers both ends |
  | `field_worker.suspend` | `district_admin`, `pariwar_admin` | `district` = CURRENT district |
  | `field_worker.reactivate` | `district_admin`, `pariwar_admin` | same |
  | `field_worker.terminate` | `district_admin`, `pariwar_admin` | same |
  | `field_worker.read_log` | `district_admin`, `pariwar_admin` | same |
  One key per act (13.1 QE10). Not `field_worker.view` for the log: the epic names a log-read key, and keeping it separate lets the Panel confirm the two
  reads apart. No role but these three holds any of them (a `roles.test.ts` describe block per key: holders, non-holders `state_trustee`, `trustee_panel`,
  `helpline_operator`, `field_worker`, bundle count 13).
- **AD6 - The routes.**
  | Route | Body | 200 | Key |
  |---|---|---|---|
  | `POST .../:id/move` | `{ from_district, to_district, reason_code: 'at_worker_request' \| 'reassigned' }` strict | `FieldWorkerLifecycleResult` | move |
  | `POST .../:id/suspend` | `{ reason_code: 'under_review' \| 'at_worker_request' }` strict | same | suspend |
  | `POST .../:id/reactivate` | `{}` strict (send `'{}'`, [[project_fastify_empty_json_body_400]]) | same | reactivate |
  | `POST .../:id/terminate` | `{ reason_code, ended_on: 'YYYY-MM-DD' }` strict | same | terminate |
  | `GET .../:id/log?after=<event_version>&limit=` | - | `FieldWorkerLog` | read_log |
  `FieldWorkerLifecycleResult = { field_worker_id, district, current_state, state_reason_code, ended_on }` - no name, no mobile, no code. The command's
  result (G20) gives `district` and `current_state` only; fill the rest as: suspend - `state_reason_code` from the body, `ended_on: null`; reactivate -
  both `null`; terminate - both from the body; move - both from the PRE-READ row (a suspended worker moved keeps their reason, G4). Each write:
  `tenantWrite` with the namespace `field_worker.<act>:${p}:${a}:${fieldWorkerId}` (13.1a TR6); `prepare` has NO transaction (it may read only off the
  pool, as approval's display name does); `run` checks a move's `to_district` with `assertDistrictRecorded` on the write tx at the tx's `now()`, pre-reads
  the row and refuses an illegal transition before any audit line (as approval), then ONE `withCompensatingAudit` (action = the EVENT TYPE, 13.1 QE6:
  `field_worker.posted` for a move - ⛔ `field_worker.moved` - and `field_worker.suspended` / `.reactivated` / `.terminated`; `actorRole: authorization.role`,
  hash of canonical `{ field_worker_id, from_district?, to_district?, reason_code?, ended_on? }`) whose `mutate` runs the command and then
  `closeScopeTx(ctx.scopeTx, true)`. Errors propagate (13.1a TR4). `rateLimit: limits.read` on the log route as on 13.1a's reads.
- **AD7 - The log read.** `listFieldWorkerEvents` copies `getFieldWorkerStateAt`'s existence check and query; keyset on `event_version > $after`,
  `ORDER BY event_version`, default 50, `clampLimit` cap 100 (a worker has seven event types; real streams are short). It runs on the hook transaction
  (no write). Each item: `{ event_version, event_type, occurred_at, actor: { user_id, display_name, role }, permission_key, grant: { dimension, value },
  target_district, reason_code, from_district, to_district, ended_on }` - fields absent for an event are `null`. `role` and the grant come from
  `payload.authorization` (every event carries it after AD3; a stream written before 13.1a AD3 / this AD3 exists only in test databases). **Actor names:**
  `events_log` holds only `actor_id`; the read joins `users.display_name` at READ time on the hook transaction (readable under `twt_app`, G19; NULL or
  blank-after-trim -> `null`, as `getDisplayName`) and labels it the officer's CURRENT name (a variance from 6.11 R5's
  snapshot, chosen so no staff name enters the append-only log, where it could never be erased; cost: a renamed officer shows their new name). A missing
  `users` row or display name renders `null` -> "an officer (name not recorded)", never an email ([[project_admin_display_name_attribution]]). No audit line:
  the log holds no name, mobile or code (13.1 QE4), and no decrypt happens. A worker from another Pariwar's registration shows nothing of that past (13.1
  QE19; the link is C11).
- **AD8 - The screens.** On Find a worker: a state selector (Waiting for approval / Active / Suspended / Ended, default Active) beside the district
  picker, reusing the list route's `state` filter (13.1a C2). "Waiting for approval" (`pending_kyc`) is on Find because the pending acts - Move and End -
  live there; the Approvals page keeps its own pending list and approve button and is NOT edited. On an opened worker
  (`WorkerDetail`), `WorkerActions` shows the acts for the worker's state (active: Move, Suspend, End; suspended: Move, Reactivate, End; pending: Move,
  End; terminated: none) and `WorkerHistory` (a "Show history" button: an explicit click, then the log, with Load more). End's confirm says it is final
  ("Ending is final. Their code stops crediting new teachers; to work again they must be registered again.") and its reason select lists the three
  neutral reasons.
  **The panel hands them the worker:** `WorkerDetail`'s `children` becomes `(name: string, worker: { current_state; district }) => ReactNode` - a second
  argument, so the Approvals page's existing `(name) => ...` child compiles unchanged. `WorkerActions` reads the state from it and sends `worker.district`
  as Move's `from_district`; ⛔ a second identity fetch inside `WorkerActions` (each is an audited decrypt, G13). No client-side role gating (13.1a C5): a 403 shows the act's "no access"
  line. Each act opens an inline confirm with a REQUIRED reason select (labels, never codes; no free text), Move a district select (`useFieldWorkerDistricts`,
  the current one excluded) and Terminate a date input defaulting to the IST day of the browser - the SERVER judges the bounds. One idempotency key per
  SUBMISSION ATTEMPT (`attemptKey`), reused only for a retryable failure of that attempt. On success: invalidate the lists and the log, and UPDATE the
  cached identity from the 200 (`setQueryData` on `fieldWorkerIdentityKey`: `current_state`, `district`) - ⛔ invalidate the identity, which would
  decrypt the name and mobile again and write a `field_worker.identity_viewed` line the officer did not ask for (G13).
  `authorization_stale` -> "This worker was moved by someone else while you were working. Reload to see their district." and a refresh.
- **AD9 - The code text is NOT in the log (13.1b C1).** The log is the worker's event stream; the text's status is already one line on the same panel
  (13.1b AD12). Cost: the history does not say when a text went. Nothing is pruned or changed in `field_worker_code_sms_sends`.
- **AD10 - The two carried copy defects are fixed here (13.1b C7 / CB9, 13.1a CR60).** (a) `fw.codeSms.not_delivered` becomes "Code SMS not delivered -
  if the worker is active, give the code by hand when they ask", and `not_confirmed` the same tail - no new status, no enum change (a sixth status would
  move the contracts enum and OpenAPI for one word). `reads.spec.ts:514` stays as it is (the status is still `not_delivered`); pin the new words in
  the admin tests (`field-worker-derive.test.ts` and the Find / Approvals page test that renders the code-text line). (b) `fieldWorkerListIsStale` gains `code_not_available`; the Find test
  at `:1057` changes to "a 409 `code_not_available` refreshes the list". (c) G15's re-examination: re-accepted, a comment at `read.ts:362-365` dated and
  pointing at 13.1b AD4; the sweep is not touched. Under Q-1 C the same window covers a TERMINATION of an active worker (the text can still go in the
  seconds between the sweep's check and the gateway call); re-accepted on the same ground - the code credits nothing once the worker is not `active`.
- **AD11 - No migration.** The keys are TypeScript; payloads are JSON; the log uses `events_log_pariwar_stream_idx`. If a test proves otherwise, stop and
  record why before adding one.
- **AD12 - Not built, with homes.** The move request, the notices, "a move ends a pending request" - 13.1d (nothing pending can exist before it). The
  8-year removal - row `13-1e` (Q-4 A). Appeal, reinstatement of a terminated worker, showing an officer that a number belonged to an ended worker - the
  Panel (asked in this story's note, Q-2 A), recorded by 13.6; the labelling reasons - 13.6. Search by mobile or name - 13.1a C7.
  A time limit on `under_review` - nobody asked; recorded as cost (b). CR32 (one unreadable row 500s a page) and CR33 (a lost `recordResult` after COMMIT)
  stay deferred: this story adds keyed writes on the same helper (CR33's re-trigger fires) - say so in `deferred-work.md`, do not fix.

## Errors and their HTTP mapping - only what this story ADDS or makes reachable

| Class / condition | When | HTTP + code |
|---|---|---|
| `FieldWorkerAuthorizationStaleError` | move: locked district != `from_district`, or target neither end; suspend / reactivate / terminate: target != locked district | 409 `field_worker.authorization_stale` (13.1's row; now reachable) |
| `FieldWorkerIllegalTransitionError` | suspend a non-active, reactivate a non-suspended, any act on a terminated worker (on the pre-read: no audit line; one that only the lock sees, e.g. two concurrent terminations: the `_rolled_back` twin) | 409 `field_worker.illegal_transition` |
| `FieldWorkerDistrictUnchangedError` | move to the current district | 409 `field_worker.district_unchanged` |
| `FieldWorkerDistrictUnknownError` | `to_district` not recorded for the Pariwar | 422 `field_worker.district_unknown` |
| body schema (the route's `schema.body`, a strict DTO with the act's reason enum) | a reason outside the act's tuple, an unknown key, a malformed `ended_on` shape | 400 `request.validation` - validated BEFORE the hooks run (`routes.ts:21`), as registration does; so the domain's 422 `field_worker.reason_invalid` stays mapped but is unreachable through a route (say so in `field-worker-errors.test.ts`) |
| `FieldWorkerEndedOnInvalidError` | malformed, future (IST), before registration | 422 `field_worker.ended_on_invalid` |
| a key outside the move-key list reaching `postFieldWorker` | a code fault, not a user path | 500 (unmapped `FieldWorkerProjectorInputError`) |

No message carries a name, a mobile or a code.

## ASKs - BigDev's, asked at Task 0.2

**ANSWERED 2026-11-07 - BigDev, verbatim: "Q1 C, Q2-Q5 A".** Q-1 **C** (against the recommendation B: propagated through the Policy note, section 0,
AD1, AD2, AD5, AD8, AD10 (c), AD12, the Errors table, I5, AC6, AC10, Tasks 0, 4 and 8, TR2 and C2-C4); Q-2 **A**, Q-3 **A**, Q-4 **A**, Q-5 **A** (each
the recommendation). The questions below are kept as they were put.

Each is the author's recommendation in plain words. Q-2, Q-3 and Q-5 shape one Panel note; none blocks the build.

- **Q-1 - Does this story build a terminate route, and which (AD2)?** *Deciding fact:* your own text says build no terminate route before 13.6 decides
  reversibility and appeal, and 13.6 is not scheduled; meanwhile a worker registered with a misspelt name can never be registered again on that mobile,
  because only an ended registration frees it (G16). *Options:* (A) none, as written - cost: the typo lock-out stays; a worker who leaves stays `active`
  or is suspended "at worker request" indefinitely, and the 8-year clock never starts for them. (B) only "registered in error", only for a worker not yet
  approved - recommended: such a worker was never credited, never had a readable code and was never texted, so nothing in it needs the Panel; cost: a
  real leaving still cannot be recorded, so a worker who leaves is suspended "at worker request" until C4 is settled; a typo found only AFTER approval
  stays locked out (B frees only a worker not yet approved); and a person registered in error keeps their name and mobile on file for 8 years, because
  the form's clock starts at the date of termination - so Q-4's owner matters for people who never worked. (C) the full route now, go-live
  gated on the Panel's answer - cost: it supersedes "build NO terminate route" before the question is answered; if the Panel adds an appeal or a way back,
  that is further work, possibly on this route.
- **Q-2 - Put 13.6's termination question to the Panel now, from this story?** *Deciding fact:* 13.6 (anti-fraud) is backlog with no date, and until
  its question is answered nobody can record that a worker has left. *Options:* (A) yes - recommended: a question in this story's one Panel note
  ("can an ending be undone; who hears an appeal; is an officer shown that a number being registered belonged to an ended worker"); 13.6 then records the
  answer instead of asking it; cost: one more question for the Panel now. (B) no, leave it to 13.6 - cost: termination waits on 13.6's create-story.
- **Q-3 - Ask the Panel about credit lost during a suspension (Policy meaning)?** *Deciding fact:* this story is what makes suspension possible, and
  the rule already built means a teacher who joins with a suspended worker's code is never credited to them, even if the suspension is lifted; nothing
  records credit yet, so nothing is lost today. *Options:* (A) yes, in the same note; the first credit recorder (13.8 / 13.5) waits for the answer
  (Row 50 (d)) - recommended: this is the shape that cost Epic 10 fourteen stories; cost: one more question. (B) no, record your reading that `-441`'s
  "active only" covers it - cost: the reading was asked about workers not yet approved, and the Panel said what a suspension does to money is NOT ruled.
- **Q-4 - Who owns the 8-year removal (13.1 C5)?** *Deciding fact:* nothing is due before eight years after the first termination, but your C5 says an
  owner must be named before the first terminate route reaches a real worker, and under Q-1 B or C it will. *Options:* (A) mint a backlog row now,
  `13-1e-field-worker-eight-year-removal`, as its owner, with no build here - recommended; it waits on counsel's question 3 and needs a guard change and a
  role (G18); cost: one more row. (B) build the anonymize command in this story - cost: counsel's erasure question is unsent, and the guard and role work
  doubles this story for something not due until 2034. (C) give it to Story 14.3 (DPO readiness) - cost: 14.3 is about breach reporting; it would widen it.
- **Q-5 - The five keys and who holds them (AD5): confirm with the Panel, non-blocking?** *Deciding fact:* the Panel said permissions like these are
  "ratified when their feature sets ship", ruled who may move a worker, and said the District Admin "will manage" workers - which it said was a direction,
  not a ruling, for suspending and ending. *Options:* (A) build on the default (District Admin in their own district and Pariwar Admin suspend, reactivate,
  end and read the history; only the Pariwar Admin moves directly) and send a short confirm that gates go-live only - recommended, as for 13.1a's three
  keys (sent 2026-11-05, not yet ruled); cost: one more question for the Panel, and a refusal changes holders before go-live. (B) Pariwar Admin only for
  suspend and end - cost: against the Panel's stated direction; the District Admin cannot act on their own workers.

## Invariants (I)

- **I1** - No field-worker event is written without a verified authorization for ITS act's key whose target matches the locked row (AD3, AD4).
- **I2** - `postFieldWorker` accepts only `FIELD_WORKER_MOVE_PERMISSION_KEYS`; `field_worker.register` is refused by a test.
- **I3** - A move whose source is not the district the admin saw is refused; the worker's id, code, state, reason and history are unchanged by a move.
- **I4** - A terminated worker is never moved, suspended, reactivated or terminated again (13.1; re-proved through the routes).
- **I5** - Termination is final: no route leaves `terminated`, and the terminate route writes only a neutral reason (`left_voluntarily`, `inactive`,
  `registered_in_error`) with an `ended_on` inside the IST bounds; no labelling reason is writable (13.6's).
- **I6** - No name, mobile or code in any new payload, audit field, response, log item, error message or URL. The log route decrypts nothing.
- **I7** - Every refusal on the pre-read writes no audit line; every committed act writes exactly one, before the COMMIT, naming the actor and role.
- **I8** - The door's eleven exports, the reach fence (no new `ALLOWED` entry) and the C7 route-review items hold: no re-export of a door wrapper, no
  relative import of `apps/api/src` from `apps/public` / `apps/jobs`, no new writer of the request context's Pariwar. No new file imports the door.
- **I9** - No member predicate, member state, `acceptsNewAttributions`, the code-SMS sweep or 13.1b's table is changed (AD10 (c) is a comment).
- **I10** - `PERMISSION_CATALOG_VERSION` moves exactly once (60 -> 61) and the key count by exactly the keys minted.

## Acceptance Criteria

**AC1 - Moving directly (a Pariwar Admin).** `POST .../move` with `{ from_district, to_district, reason_code }` by a Pariwar Admin moves a `pending_kyc`,
`active` or `suspended` worker: 200 with the new district; one `field_worker.posted` event whose payload carries both districts, the reason and the
`field_worker.move` authorization snapshot; one `field_worker.posted` audit line (audit action = event type, 13.1 QE6). (a) A suspended worker stays suspended with the same reason; the code row,
`field_worker_attribution_codes`, and the worker id are unchanged; a code-SMS row is unchanged. (b) A District Admin of either district -> 403. (c) Same
district -> 409 `district_unchanged`; an unlisted district -> 422 `district_unknown`; a terminated worker -> 409 `illegal_transition`; each with NO
event and NO audit line. (d) A reason outside the two -> 400 `request.validation` (the Errors table).

**AC2 - A move that loses a race (D7).** Two Pariwar Admins both see the worker in A; one moves A -> B and commits; the other's A -> C then answers 409
`authorization_stale` and the worker stays in B (a live leg with the row lock held, `waitForBlockedBy`, as `code-read.spec.ts`). A move whose
`from_district` is already stale when sent is refused the same way. The admin screen shows the AD8 message and refreshes.

**AC3 - Only a move key moves.** `postFieldWorker` with a verified `field_worker.register` authorization (and with each other non-move key) throws before
any SQL; with `field_worker.move` it succeeds. Every existing test that moved a worker under `field_worker.register` now uses the move key (G12).

**AC4 - Suspending.** A District Admin of the worker's CURRENT district, or a Pariwar Admin, suspends an `active` worker with `under_review` or
`at_worker_request`: 200, `current_state: suspended`, `state_reason_code` set; one `field_worker.suspended` event with the `field_worker.suspend`
authorization; one audit line. (a) A District Admin of ANOTHER district -> 403 (and one who held the worker's old district before a move -> 403).
(b) A `pending_kyc`, suspended or terminated worker -> 409 `illegal_transition`, no audit line. (c) `acceptsNewAttributions` is `false` for the worker
afterwards and the by-hand code read answers 409 `code_not_available` (13.1a AD8, now reachable).

**AC5 - Reactivating.** The same holders reactivate a `suspended` worker: 200, `active`, reason cleared; one `field_worker.reactivated` event with the
`field_worker.reactivate` authorization. No second code text is due (13.1b G5: the row is final); the by-hand read works again. A non-suspended worker -> 409.

**AC6 - Terminating (Q-1 C).** A District Admin of the current district or a Pariwar Admin ends a `pending_kyc`, `active` or `suspended` worker with
`left_voluntarily`, `inactive` or `registered_in_error` and an `ended_on` (today or a day between registration and today, IST): 200, `terminated`,
`state_reason_code` and `ended_on` set; one `field_worker.terminated` event with the `field_worker.terminate` authorization; one `field_worker.terminated`
audit line. (a) The same mobile can then be registered again in the Pariwar (G16) - a live leg through the register route, for a pending worker ended
`registered_in_error` AND an active one ended `left_voluntarily`. (b) Two concurrent terminations of one worker: one commits; the other answers 409
`illegal_transition` from inside `mutate` and writes the `_rolled_back` twin (a live race leg, the row lock held, `waitForBlockedBy`). (c) A future
`ended_on` or one before registration -> 422 `ended_on_invalid` (IST bounds; the test reads "today" from the DB, never the UTC clock). (d) Every act on a
terminated worker -> 409 `illegal_transition`, no event, no audit line. (e) An active worker once ended: `acceptsNewAttributions` is `false`, the by-hand
code read answers 409 `code_not_available`, and the code row and worker id are unchanged (FR-85: existing attributions preserved). (f) A labelling reason
(`conduct`) or any value outside the three -> 400 `request.validation`.

**AC7 - The authorization rides every event (AD3).** The `suspended`, `reactivated` and `terminated` payload schemas REQUIRE `authorization`; each
command refuses a look-alike object, another Pariwar's or another actor's authorization, the wrong key, and (under the lock) a target that is not the
locked district (a live leg: the worker moved between the gate and the lock -> 409 `authorization_stale`). `field-worker-registry-coverage.test.ts`
and the registry descriptions are updated; `scripts/field-worker-state-invariant` still passes.

**AC8 - Reading the log.** `GET .../log` by a District Admin of the current district or a Pariwar Admin returns every event of the worker's stream in
`event_version` order, each with its type, time, actor (current display name, role), key, grant, target, reason, districts and `ended_on` as applicable;
`after` + `limit` page it (default 50, cap 100; an over-cap `limit` is clamped, never an error). (a) No item, field or header holds a name, mobile or code
(an absence assertion on a 200 body). (b) A missing or foreign worker -> 403 for everyone (the loader's null). (c) A District Admin of another district ->
403. (d) An actor whose user has no display name renders `null`, never an email. (e) A worker moved A -> B: a District Admin of B reads the whole log,
including the events from when the worker was in A (the log follows the worker, as the Panel's "full log" reads).

**AC9 - The keys (AD5).** Catalog v61; exactly the minted keys added; holders and non-holders per AD5 pinned in `roles.test.ts`; super_admin derives all;
the bundle count stays 13; `events.test.ts` catalog fixtures updated.

**AC10 - The screens (AD8).** RTL tests: Find's state selector lists workers waiting for approval, suspended and ended; each act appears only for a
state it is legal in (a waiting worker opened from Find shows Move and End; an active one Move, Suspend and End; a suspended one Move, Reactivate and
End; an ended one none); End's confirm shows the finality line and the three reasons; the Approvals page's approve child still renders
through the widened `children`; a reason is required before Confirm enables; one idempotency key per submission attempt (a retry after a 5xx reuses
it, a new attempt mints a new one); success refreshes the list and history and updates the panel from the 200 with NO second identity fetch (assert
`getFieldWorkerIdentity` was called once); 403 shows the act's no-access line; `authorization_stale` shows AD8's message; the history loads only on
click and pages. The copy fixes of AD10 are pinned. A real-browser pass (Task 8.1) moves, suspends, reactivates, ends and reads a history in the dev Mac's
Chrome ([[project_admin_browser_pass_launcher]]; [[project_agent_chrome_cannot_reach_localhost]] - re-probe after a reconnect).

**AC11 - Nothing else moves (I8, I9).** The reach fence, the door's export pin, the AT9 `generate` rule and `check.test.ts`'s two fences stay green
with no new allow-list entry; `openapi/v1.yaml` is regenerated (`pnpm contracts:emit-openapi`) and its determinism check passes.

**AC12 - Governance first.** The decision entry is committed ALONE before any code; Row 50 and the Row 48 (i) dated line, the `epics.md` note and the
`deferred-work.md` lines follow in their own commit; the Panel note is written per the template (Task 0.6) and is not called sent until it is
([[feedback_shown_to_panel_means_sent]]).

## Tasks / Subtasks

Order matters: governance first ([[feedback_governance_commits_precede_implementation]]), then the domain, then the API, then the screens. Commit on the
story branch only ([[feedback_commit_on_story_branch]]); check the branch before EVERY commit ([[feedback_concurrent_review_agents_mutate_tree]]); work
only in this worktree, grep `docs/legal` by ABSOLUTE path ([[feedback_worktree_session_never_cd_to_main_checkout]]); prefix every `ci:local` and
`git push` with the story's `DATABASE_URL` port and `?sslmode=disable` ([[project_prepush_hook_inherits_5432]]) on a FRESH container; hand-format,
never `prettier --write` ([[project_prettier_not_enforced]]); first push with an explicit refspec ([[project_story_branch_upstream_is_main]]).

- [ ] **Task 0 - Preflight and governance (AC: 12)** - runs FIRST; writes no code.
  - [x] 0.0 (`01cbba52`) Commit this story file and the create-story record edits (`epics.md` note under Story 13.1c, `deferred-work.md` lines, `sprint-status.yaml`
    row + ledger `2026-11-07d`) as ONE `records(13.1c)` commit on the story branch, when BigDev asks.
  - [ ] 0.1 `git fetch origin`; `git merge-base --is-ancestor bb4d8620 HEAD`; `git diff --name-only bb4d8620..origin/main -- packages apps scripts docs/launch-gate-inventory`.
    Re-derive any claim at the new tip; re-grep the NUMBERS block; check `git worktree list` / `git branch -a` for another branch touching
    `packages/domain/src/field-worker/`, `rbac/permissions.ts` or `apps/admin/src/modules/field-workers/` (13.1d especially: it mints move keys too, AD4).
    If any migration after `0202` touches `users`' policies or grants, re-check G19.
  - [x] 0.2 **HALT on Q-1..Q-5.** ANSWERED 2026-11-07, BigDev verbatim: "Q1 C, Q2-Q5 A" (Change Log v1.2). Q-1 C was propagated through this file in
    the same edit, before any code ([[feedback_spec_edits_must_propagate_to_tasks]]): AC6 covers every neutral reason and every non-terminated state;
    Row 50 (b) gates the route's go-live; `terminate_not_available` is not minted.
  - [x] 0.3 (`490510d9`, alone, 2026-11-07; it supersedes FOUR texts - the two below plus `-442`'s "terminate waits on Story 13.6's C4" and
    Story 13.6's INHERITED C4 lines) Write decision `2026-11-07-453` (re-grep every ref) in `.decision-log.md` above the newest entry; commit it ALONE, `governance:` prefix: an
    author-commit (BigDev) recording AD1-AD12, the answers verbatim ("Q1 C, Q2-Q5 A"), the SUPERSESSION of 13.1 C5's "Build NO terminate route before 13.6
    records C4" AND of the epic's "the terminate route does NOT ship before Story 13.6 records its C4" - superseded, never re-read
    ([[feedback_supersede_never_reinterpret]]); the replacement rule: built and merged, no real worker before C4 is recorded (Row 50 (b)) - the five keys
    as built on the default with a non-blocking confirm, the D7 guard, AD7's display-name variance, the Q-4 owner (`13-1e`), the three questions put to the
    Panel (Q-2, Q-3, Q-5) and "supersedes no RATIFIED text (C5 is an author-commit, the epic line BigDev's); adds no member predicate". Cite `-441`,
    `-442`, `-443`, `-444`, `-445`, `-446`, `-447`, `-450`, `-059` B(3).
  - [x] 0.4 (`0b329bb4`, 2026-11-07; (c) MET on minting; ledger `2026-11-07g`) Roster, its OWN `governance:` commit: append **Row 50 `field-worker-lifecycle-live`** (state why 46 is skipped), decision-authored,
    blocking no build and no merge ([[project_not_in_production_merge_is_not_golive]]): (a) the Panel's confirm of each key minted (and a dated line at
    Row 48 (i) pointing here); (b) the Panel's answers to the note's Questions 1-5 (C4, going silent, death) recorded - and a ROW for each answer that needs a build - before
    the terminate route reaches a real worker;
    (c) the 8-year removal's owner named - row `13-1e` (Q-4 A) - and a dated line at Row 48 (f); (d) the Panel's answer on credit during suspension
    (Q-3 A) recorded before any attribution recorder goes live (13.8 / 13.5 must read it); (e) Row 48 closed first. Add the row
    `13-1e-field-worker-eight-year-removal: backlog` to `sprint-status.yaml` and a `### Story 13.1e` stub in `epics.md` (source: 13.1 C5, D8, counsel
    question 3; G18; trigger: before the first removal falls due, eight years after the first termination), in the same commit.
  - [x] 0.5 (2026-11-07; 13.6's line says DECIDED, not BUILT - nothing is built yet, so "BUILT" below would be a record ahead of its
    evidence) Annotate `epics.md` Story 13.1c (a create-story note: what was answered, where; the supersession by `-453`) and Story 13.6's INHERITED C4
    block ("put to the Panel from 13.1c, note `trustee-panel-routing-note-2026-11-07-story-13-1c-field-worker-lifecycle.md`, not sent / sent <date>;
    13.1c's terminate route is BUILT, its go-live gated by Row 50 (b)"). Each of the 13.1c and 13.6 blocks also gets a pointer that `-453`
    supersedes its "does NOT ship" / "does not ship before this is recorded" line. Annotate, never rewrite.
  - [x] 0.6 ONE Panel note DRAFTED 2026-11-07 from the template: `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-07-story-13-1c-field-worker-lifecycle.md`
    - seven questions (Q-2's C4 split in three: a wrong ending's undo / appeal, a worker who comes back, a returning number; going silent and death,
    added by BigDev; credit during a suspension: Q-3; the five keys: Q-5), each with section 0 answered, the deciding fact, honest
    costs on every option, evidence last. NOT sent; it is called sent only when BigDev says it went ([[feedback_shown_to_panel_means_sent]]); re-run its
    E4 commands before sending (the decision id `-453` it cites exists only after Task 0.3). Non-blocking. A ruling is its own decision entry plus dated
    lines at Row 50 and Row 48 (i).

- [ ] **Task 1 - Keys (AC: 9; I10)** - in the SAME commit as Task 2.3.
  - [ ] 1.1 `permissions.ts`: the keys, `PERMISSION_CATALOG_VERSION = 61`, the changelog comment; `roles.ts`: constants and bundle entries per AD5.
  - [ ] 1.2 `tests/rbac/permissions.test.ts` (`toBe(61)`, length), `tests/rbac/roles.test.ts` (one describe per key, 13.1a's shape), `tests/field-worker/events.test.ts` catalog fixtures.

- [ ] **Task 2 - The domain (AC: 1-7; I1-I5)**
  - [ ] 2.1 `events.ts`: `authorization` REQUIRED on `suspended`, `reactivated`, `terminated`; the four registry descriptions (AD3, incl. `posted`);
    `packages/events/tests/field-worker-registry-coverage.test.ts`.
  - [ ] 2.2 `commands.ts`: the three commands gain `authorization` + key check at guard (0) + locked-target check (AD3); update the guard-order header (:13-30).
    Sweep G12 (b) in the SAME commit - including `apps/jobs/tests/field-worker-code-sms-live.test.ts`, which the domain test run does not reach
    (run `pnpm --filter @twt/jobs test` too, or it first fails at `ci:local`).
  - [ ] 2.3 `postFieldWorker`: `FIELD_WORKER_MOVE_PERMISSION_KEYS`, `verifiedSnapshot`'s `permissionKeys` option, `expectedFromDistrict` (AD4). Sweep G12 (a)'s tests to the new keys
    through the two fence-exempt fixture files only; `commands-guards.test.ts` gains: register key refused, every non-move key refused, stale source refused.
  - [ ] 2.4 `read.ts`: `listFieldWorkerEvents` (AD7) + `clampLimit`; export through the barrel; the dated comment at `:362-365` (AD10 (c)).
  - [ ] 2.5 Tests: `tests/integration/field-worker/commands.spec.ts` (each act with its key; stale target under the lock; move of a suspended worker keeps
    the reason), `log.spec.ts` (order, paging, clamp, foreign Pariwar null, a moved worker's whole stream), `stream-concurrency.spec.ts` updated. RED proof
    for each new guard (mutate it, see the intended assertion fail, restore).

- [ ] **Task 3 - Contracts (AC: 6-8, 11)**
  - [ ] 3.1 DTOs and the three reason tuples (re-declared, sync test in `packages/contracts/tests/field-workers.test.ts`); `emit-openapi.ts` entries; regenerate `openapi/v1.yaml`.
  - [ ] 3.2 A required field added to a contract breaks fixtures outside tsc ([[project_contracts_tests_outside_tsc]]) - grep the contracts tests.

- [ ] **Task 4 - The API (AC: 1-8, 11; I6-I8)**
  - [ ] 4.1 `lifecycle-handlers.ts` (AD6) on `createFieldWorkerWriteSupport`; `log-handlers.ts`; registrations in `routes.ts` with the per-worker chain and
    each key; `index.ts` header (13.1c no longer "owner of" unbuilt routes). `errors.ts`: no new code (Q-1 C needs none); `field-worker-errors.test.ts`
    relabels the rows now reachable.
  - [ ] 4.2 Extend `_registration-harness.ts` (`move`, `suspend`, `reactivate`, `terminate`, `log` helpers; `cleanup` unchanged in order) and
    `_field-worker-fixture.ts` (`moveTestFieldWorker` on the move key). New specs in `apps/api/tests/integration/field-worker/`: `lifecycle.spec.ts`
    (AC1, AC4-AC6 incl. holders and non-holders, pre-read refusals write no audit line - assert by counting `audit_log` rows for the locator, with a
    control that a committed act writes one; assert the move's line is `field_worker.posted`), `move-race.spec.ts` (AC2), `terminate-race.spec.ts`
    (AC6 (b): two concurrent terminations, the loser's 409 `illegal_transition` from inside `mutate` and its `_rolled_back` twin, with the reason AND a
    control asserted - TR8), `log.spec.ts` (AC8). Idempotency:
    same key replays; same key on another worker is a different namespace (13.1a TR6).
  - [ ] 4.3 Route review (13.2 C7): grep the new files for a door import, a re-export, `requestContextStorage.run`, `pariwarId =`; run the reach fence and `check.test.ts`.

- [ ] **Task 5 - The screens (AC: 10)**
  - [ ] 5.1 Hooks and client (`src/api/hooks.ts`, `client.ts`): four mutations (on success: invalidate the lists and the log, `setQueryData` the identity - AD8), `useFieldWorkerLog` (infinite, `gcTime: 0` like identity - [[project_query_gctime_blinds_removal_tests]]); `fieldWorkerListIsStale` + `code_not_available` (AD10 (b)).
  - [ ] 5.2 `WorkerDetail.tsx`: `children`'s second argument (AD8); `WorkerActions.tsx`, `WorkerHistory.tsx`, the Find state selector (incl. Waiting for approval), copy in `i18n-en.ts` (reason labels; AD8 messages; AD10 (a)); `derive.ts` `BY_CODE` rows.
  - [ ] 5.3 RTL tests: `apps/admin/tests/field-worker-{actions,history}.test.tsx`; update `field-worker-find-page.test.tsx` (`:1057`), `field-worker-derive.test.ts` (walks `FIELD_WORKER_EN_KEYS`). Mind [[project_tanstack_onsettled_before_success]] and [[project_tanstack_mutate_callbacks_latest_only]].

- [ ] **Task 6 - Records (AC: 12)** - the story's Dev Agent Record and File List; `deferred-work.md`: CR33's re-trigger fired (AD12), 13.1b C1 / C7 and 13.1a CR60 closed by
  this story with commit ids; `epics.md` BUILT note; ledger entry. A record states only what has been run ([[feedback_record_unattested_no_backfill]]).

- [ ] **Task 7 - Gate** - `ci:local` on a FRESH container through the push ([[project_known_livedb_test_failures]], #18 needs a fresh DB).

- [ ] **Task 8 - Browser pass (AC: 10)**
  - [ ] 8.1 In the dev Mac's Chrome: move a worker, suspend, reactivate, end an active one (left voluntarily) and a pending one (registered in error), read a history, and see a
    District Admin of another district refused. Record what ran and what did not.

### Review Findings

_(none yet)_

## Dev Notes

### Current state (what exists, what this story changes, what it must preserve)

- `packages/domain/src/field-worker/commands.ts` - three commands gain `authorization`; `postFieldWorker` gains the key list and `expectedFromDistrict`.
  Preserve: the guard order (0) -> (0b) -> lock -> legality -> KYC -> district -> target -> reason -> IST bounds; `runLockedTransition`'s savepoint;
  `activateFieldWorker`'s enqueue of the code text (13.1b AD1) - do not touch it.
- `packages/domain/src/field-worker/events.ts` - three schemas gain a required field; `registered`, `kyc_completed`, `activated`, `posted` unchanged.
- `apps/api/src/modules/field-worker/` - new handler files; `routes.ts` grows; `write-support.ts`, `gate.ts`, `approval-handlers.ts`, `read-handlers.ts`
  and `attribution-code-access.ts` are NOT edited (if you edit the door, stop).
- `apps/admin/src/modules/field-workers/` - `FindWorkerPage` gains a state selector (incl. `pending_kyc`); `WorkerDetail`'s `children` gains a second
  argument `(name, worker)` and hosts the two new components; the Approvals and Register pages are NOT edited (the Approvals child keeps its
  one-argument form). Preserve 13.1a's focus and status-region behaviour, 13.1b's code-SMS line, and `children` being called only once the identity loaded.

### Traps (TR)

- **TR1** - A strict payload schema change makes any stream written before it fail a re-parse: fresh test containers only; never against a shared DB.
- **TR2** - The pre-read refusal must happen BEFORE the audit wrapper (no audit line); a refusal only the lock sees (a concurrent act, AC6 (b)) happens
  INSIDE it: it rolls back and writes the `_rolled_back` twin - assert that, not "no audit line".
- **TR3** - IST dates: read "today" from `(now() AT TIME ZONE 'Asia/Kolkata')::date` in every `ended_on` test ([[project_ist_vs_utc_test_date_window]]).
- **TR4** - One transaction => equal `now()` ([[project_db_clock_ordering_tests_tie]]): two events in one test transaction share `occurred_at`; order the log by `event_version`, never by time.
- **TR5** - A bodyless POST needs `'{}'` ([[project_fastify_empty_json_body_400]]) - reactivate.
- **TR6** - `authorize(` may be called only from the two fixture files and tests (G11); a new helper elsewhere fails `check.test.ts`.
- **TR7** - An absence assertion is only meaningful against a 200 body (13.1a testing standards).
- **TR8** - A savepoint-rollback assertion must assert the reason AND a control ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]).
- **TR9** - Domain spec files run in parallel forks against one DB: seed by the worker ids you created and assert on them; mind the FK + TRUNCATE lock order ([[project_fk_truncate_cascade_deadlock]]).
- **TR10** - `field-worker-crypto.ts` must keep ONE mockable export shape (13.1a TR10) - do not add to it.
- **TR11** - `**cl.3**`-style emphasis inside a JSDoc closes it ([[project_markdown_emphasis_closes_jsdoc]]).

### Carried to sibling stories (C) - WRITTEN to `deferred-work.md` ("Deferred from: story 13-1c-... (create-story, 2026-11-07)"). Build NONE.

- **C1 -> 13.1d.** `FIELD_WORKER_MOVE_PERMISSION_KEYS` exists: append the request keys in the commit that mints them; the acceptance passes the
  request's source as `expectedFromDistrict`; a direct move (`field_worker.posted` with key `field_worker.move`) must end any pending request and be noticed
  to both District Admins. Trigger: 13.1d create-story.
- **C2 -> 13.6 (C4 put to the Panel from here, Q-2 A).** The terminate route is BUILT (Q-1 C); 13.6 records the Panel's answer. If it adds a way back
  or an appeal, that is a new transition and a new decision; if it narrows who may end whom, or for which reason or state, narrow AD2's route (one
  file); if it says an officer is shown that a number belonged to an ended worker, that is a register-route change. The labelling reasons extend the
  AD8 reason labels and the re-declared tuples.
- **C3 -> 13.8 / 13.5.** Credit during suspension (Q-3 A): read Row 50 (d) before recording any attribution. What an ending does to money ALREADY
  EARNED is unruled (`-443`; 13.1 section 0 edge 6) and is NOT in this story's note: the first commission writer (13.5) asks it.
- **C4 -> 13.1e (Q-4 A; row minted at Task 0.4).** The 8-year removal: G18's guard and role work, counsel question 3.

### Testing standards

- Unit: `packages/domain/tests/**/*.test.ts`, `apps/api/tests/unit/`, `packages/contracts/tests/`, `apps/admin/tests/*.test.tsx`. Live-DB:
  `packages/domain/tests/integration/**/*.spec.ts` and `apps/api/tests/integration/`, self-skipping on `!hasDatabase`; `SET LOCAL ROLE twt_app` before policy assertions.
- Twins: 13.1a's `approval.spec.ts`, `approval-atomicity.spec.ts`, `code-read.spec.ts` (lock races), the harness; the admin `field-worker-approvals-page.test.tsx` (per-click key).
- Every guard gets a RED proof; every scan a non-vacuity floor; a green gate proves nothing about what it does not scan ([[feedback_gate_scope_semantic_coverage]]).
- No browser E2E harness exists for the admin: AC10 is RTL plus Task 8.1. State plainly what ran.

### Project Structure Notes

- New: `apps/api/src/modules/field-worker/{lifecycle-handlers,log-handlers}.ts`; `apps/admin/src/modules/field-workers/{WorkerActions,WorkerHistory}.tsx`;
  tests per Tasks 2-5; the Panel note; the decision entry; Row 50.
- Modified: `packages/domain/src/field-worker/{commands,events,read,index}.ts`; `packages/domain/src/rbac/{permissions,roles}.ts`; `packages/events/src/registry.ts`;
  `packages/contracts/{src/field-workers/*,scripts/emit-openapi.ts}`; `openapi/v1.yaml`; `apps/api/src/modules/field-worker/{routes,errors,index}.ts`;
  `apps/admin/src/{api/client.ts,api/hooks.ts}`; `apps/admin/src/modules/field-workers/{FindWorkerPage,WorkerDetail,derive,i18n-en}.ts(x)`; the test files of G12 and G14.
- Variance from the epic, with reason: the move body names its expected source (D7, AD4); the log shows the actor's CURRENT name (AD7); the terminate
  route is built before 13.6 records C4, its go-live gated by Row 50 (b) (AD2, Q-1 C; the epic's line and 13.1 C5 superseded by `-453`); the code text is
  not in the log (AD9).
- Detected conflicts with a ratified text: none. The Niyamavali and the Privacy Policy are silent on field workers.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 13; Stories 13.1 (VARIANCE block), 13.1a, 13.1b, 13.1c (incl. INHERITED D7, 13.1a C2, 13.1b C1 / C7), 13.1d, 13.6 (INHERITED C4).
- `_bmad-output/implementation-artifacts/13-1-field-worker-identity-lifecycle-state-machine.md` (QE4, QE10, QE12, QE15, QE17-QE20, section 0 edges 6-10, C4, C5, C10, C11, X3);
  `13-1a-...md` (AD3-AD8, TR4, TR6, TR10, C2, C5, C7); `13-1b-...md` (AD4, AD12, C1, C7).
- `_bmad-output/implementation-artifacts/deferred-work.md` - 13.1 C4, C5, C7, C10, C11, D7, D8; 13.1a C2, CR32, CR33, CR60; 13.1b C1, C7, CB9, CB11.
- `.decision-log.md` - `2026-11-03-441`, `-442`, `-443`, `-444`; `2026-11-04-445`, `-446`, `-447`; `2026-11-06-450`; `2026-06-21-059` B(3).
- `docs/launch-gate-inventory/inventory-roster.md` Rows 48, 49; `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`;
  `trustee-panel-routing-note-2026-11-04-story-13-1a-field-worker-keys-confirm.md`; `counsel-question-2026-11-03-field-worker-data-basis.md` (question 3).
- PRD FR-85, FR-86 (`prds/prd-TWT-2026-05-22/prd.md`).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created (create-story, 2026-11-07).

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-11-07 | 1.0 | Created by `bmad-create-story 13.1c` at `bb4d8620`: G1-G18, AD1-AD12, Q-1..Q-5 open, AC1-AC12, Tasks 0-8. Status `ready-for-dev`; no code before Task 0.3. |
| 2026-11-07 | 1.1 | Validated (`bmad-create-story validate 13.1c`, claims re-traced at `bb4d8620`; BigDev: "all" - 14 items applied). A waiting worker's acts get a screen (Find's selector gains Waiting for approval); `WorkerDetail`'s `children` passes the worker; the move's audit action is `field_worker.posted` (13.1 QE6); G12 (b) lists AD3's breakage incl. the jobs test; AD2's under-lock re-check is `result.fromState` (G20); `verifiedSnapshot` gains `permissionKeys`; G19 (display names readable, Task 0.1's check dropped); `reads.spec.ts:514` unchanged; no second identity fetch after an act; Q-1 B's costs completed; two quote sources corrected; `posted`'s registry text; "13.1a TR6"; the lifecycle result's field sources. Q-1..Q-5 still OPEN. |
| 2026-11-07 | 1.2 | BigDev answered the asks, verbatim: "Q1 C, Q2-Q5 A" (Task 0.2 done). **Q-1 C** (against the recommendation B): the terminate route takes every neutral reason from `pending_kyc`, `active` or `suspended`, with no route restriction; `terminate_not_available` and the `fromState` re-check are dropped (a concurrent termination is refused by the command inside `mutate`, as for every act); 13.1 C5's "Build NO terminate route" and the epic's "does NOT ship" line are to be superseded by `-453` (Task 0.3), replaced by "no real worker before C4 is recorded" (Row 50 (b)). Propagated through the Policy note (ending is reachable from `active` / `suspended`; FR-85; finality), section 0, AD1, AD2, AD5, AD8 (End on every non-ended state, a finality line), AD10 (c) (the SMS window re-accepted for termination), AD12, the Errors table, I5, AC6 (every reason and state; a concurrent-termination race leg; FR-85 checks), AC10, Tasks 0.2-0.6, 4.1, 4.2, 8.1, TR2, C2-C4. **Q-2 A, Q-3 A, Q-5 A:** one Panel note with four questions (C4 split in two), DRAFTED (Task 0.6), NOT sent: `trustee-panel-routing-note-2026-11-07-story-13-1c-field-worker-lifecycle.md`; its suggestions are 1 A (an appeal), 2 A (shown, information only), 3 C (by reason) and 4 A. **Q-4 A:** the row `13-1e-field-worker-eight-year-removal` is minted at Task 0.4. What an ending does to money already earned is NOT in the note (C3: 13.5 asks it). |
| 2026-11-07 | 1.3 | The Panel note REWRITTEN before sending (BigDev: "yes, rewrite question 1 and add silent and death", after challenging Question 1 with an employee who resigns and rejoins a year later). Question 1 had mixed a person who left and comes back (not an appeal) with a person ended wrongly: now 1 (a wrong ending: undo a slip, appeal a dispute), 2 (coming back: old record and code, or new), 3 (a returning number shown); added 4 (a worker who goes silent: a 90-day warning, officer decides, never automatic) and 5 (death: its own reason, on the officer's word); 6 credit during a suspension; 7 the keys. Seven questions; suggestions 1 A, 2 A, 3 A, 4 A, 5 A, 6 C, 7 A - the author's, not BigDev's. Row 50 (b) now waits on Questions 1-5, each build-needing answer with a ROW. Still DRAFTED, NOT sent. No AC or Task of the build changed: the route ships the three neutral reasons; "died" / "could not be reached" are built only if the Panel chooses them. |
| 2026-11-07 | 1.4 | Governance committed on the story branch: Task 0.0 records `01cbba52`; Task 0.3 decision `2026-11-07-453` ALONE `490510d9` (BigDev: "commit records and write decision 453") - it supersedes FOUR author / BigDev texts, not two: writing it found `-442`'s "terminate waits on Story 13.6's C4" and Story 13.6's INHERITED C4 lines besides 13.1 C5 and the 13.1c epic line (AD2 and Task 0.5 updated); Task 0.4 (BigDev: "go ahead with task 0.4") `0b329bb4` - roster Row 50 `field-worker-lifecycle-live` (a)-(e), (c) MET; dated lines at Row 48 (f), (i); row `13-1e-field-worker-eight-year-removal: backlog` and its `epics.md` stub; ledger `2026-11-07g`. Task 0.6's note: DRAFTED, NOT sent. Next: Task 0.5, then Task 0.1's re-check and code. |
| 2026-11-07 | 1.5 | Task 0.5 (BigDev: "go ahead with task 0.5"): `epics.md` annotated, nothing edited - under Story 13.1c, the answers, the supersession of its "does NOT ship" line by `-453` (with the other three texts), Row 50 (b) in its place, and the seven-question note (DRAFTED, NOT sent); under Story 13.6's INHERITED C4, its two "before 13.1c's terminate route ships" lines superseded, C4 put to the Panel from 13.1c, 13.6 RECORDS the answer. Task 0.5's own text said to write that the route is "BUILT": written as DECIDED, not built, because no code exists. |
