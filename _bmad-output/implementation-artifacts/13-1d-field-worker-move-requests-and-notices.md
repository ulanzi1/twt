---
baseline_commit: 43deb5d2
---

<!--
PINNED: `43deb5d2` = `origin/main` (ledger 2026-11-08d - Story 13.1c LANDED, PR #326, `bb4d8620..23a1dbfa`). The story lives on branch
`story/13-1d-field-worker-move-requests-and-notices` in its OWN worktree (`.claude/worktrees/13-1d-field-worker-move-requests-and-notices`),
created from `origin/main` (no upstream) on 2026-11-08. Every `apps/` / `packages/` claim was traced at the pin on 2026-11-08 by the create-story pass
(three read-only research passes - the domain stream, commands and precedents; the staff-email and in-app notice substrates; the API, RBAC, contracts and
admin module - then the author's own reads of the decision log, the roster and the 13.1c story). Perishable - re-check at Task 0.1. Re-locate by
FUNCTION, not by line.

STATUS: review (v1.7, 2026-11-09). Tasks 0-9 DONE; `ci:local` 39/39 at `8ef28475` on a fresh container. Two questions for BigDev from the browser pass are OPEN (B2: a direct move to a third district does not tell the superseded request's counterpart — amends `-458` AD9; B4: a destination District Admin cannot open a request from the screens — a disclosure question). Governance: `-458` `d20eb1d5`, `-459` `0ba691f0`, `-460` `0a88cb40`; Row 51 `0b663d46`. Nothing pushed.

NUMBERS (re-grep each at Task 0.1; every one is contended by siblings):
- Next free decision: `2026-11-08-458` (the newest on every ref and every worktree is `-457`, 13.1c's). "The number belongs to the first COMMIT" (`-449`).
- RBAC: `PERMISSION_CATALOG_VERSION = 61`, 86 keys (`packages/domain/src/rbac/permissions.ts:880`; pinned `tests/rbac/permissions.test.ts:249,251`). This
  story: ONE bump, 61 -> 62; keys 86 -> 90 (four keys, AD5).
- Migration: ONE, `0205` (the journal's last entry is idx 204, `0204_field-worker-reason-subset-died`, `when` 1797219600049; no branch or worktree holds
  0205+ on 2026-11-08). Read the journal's last idx and `when` live ([[project_sibling_migration_when_order_shared_db]]).
- Ledger: the newest letter on any ref is `2026-11-08d` (read it live: letters collide across branches).
- Roster: next free row is **51** (the highest is 50 on every ref and worktree; Row 46 is RESERVED by 6.39 / 14.3). Rows 48 (i) and 50 are the
  field-worker rows this story touches.
- Panel notes: 13.1a's keys confirm is SENT (2026-11-05), NOT ruled; 13.1b's confirm is WRITTEN, NOT sent; 13.1c's is RULED (`-454`); 13.1d's is RULED (`-459`, 2026-11-08).
-->

# Story 13.1d: A District Admin Asks Another to Take On or Release a Field Worker, and the Other Accepts or Refuses With a Reason - and the District Admins Are Told in the Admin Console (and by Email) `[PRIMITIVE]` `[SURFACE]`

Status: review

## WHAT THIS STORY IS, IN ONE PARAGRAPH

A field worker's REPORTING district (whose District Admin manages them, 13.1 QE17) changes today only by a Pariwar Admin's direct move (13.1c). The
Panel ruled (`-443` Q1 A) that it changes BY CONSENT between the two District Admins: either one opens a request at the worker's request, the other
accepts or refuses it with a reason from a fixed list, the worker stays put until it is accepted, a request unanswered for 7 days goes to the Pariwar
Admin and is never accepted by default, and both District Admins are told "by email and in the admin console", including of a Pariwar Admin's direct
move. This story builds that: a **move request** with its own event stream and projected table, five write routes (open, accept, refuse, withdraw,
close) and two reads, four permission keys, an hourly **escalation sweep**, a **notice** row per recipient written in the deciding transaction, an
in-app **Move requests** page with the officer's notices, and the rule that a direct move or an ending **supersedes** a pending request in the same
transaction. **The email is NOT here (Q-1 A):** a fourth admin-email path is a new ADR (ADR-0040 / ADR-0043: "a fourth is a new ADR"), its own send
table and sweep; it is built in its own row, `13-1g`, over this story's notice rows, with go-live gated on it (Row 51 (c)).

## Story

As a **District Admin** - at either end of a field worker's move -
I want **to ask the District Admin of the other district to take on or release a worker who has asked to move, and to accept or refuse such a request
with a reason**,
so that **a worker never changes who manages them without the officer at the other end having agreed, the Pariwar Admin settles what we cannot, and
each of us is told when it happens.**

## Policy meaning (AI-10-1)

**This story introduces NO predicate on a member's access to a benefit, and changes none.** No member state, `account-frozen` source,
`member_attribution` row or payout field is touched (I9). A move changes only whose District Admin manages a worker: a code works anywhere in the
Pariwar and credit follows lifecycle state only (13.1 QE17; 13.2's registry never reads a district). *In the member's terms:* **"Which District Admin
manages the field worker who introduced you never changes anything about your membership."** *In the field worker's terms* (not a member benefit,
stated so it is not found later): **"If you ask to report to another District Admin, you stay where you are until the officer at the other end agrees;
if they refuse, you stay, and the Pariwar Admin may still move you; your code and your credit do not change either way."** `acceptsNewAttributions` is
not edited (I9). **Checked against the Niyamavali** (the git-ignored private copies in the main checkout, grepped by ABSOLUTE path 2026-11-08):
`docs/legal/niyamavali.md` and `niyamavali.hi.md` for `field.?worker|kshetra|district admin|zila` - **SILENT on field workers**; the two "District
Admin" hits are the member-decision escalation tiers (Part 9). `privacy-policy.md`: 0 field-worker hits. No text is pasted (the repo is public,
[[project_legal_corpus_private_repo_split]]); the Niyamavali is a rulebook, not a ratified spec ([[feedback_niyamavali_rulebook_not_spec]]).

## The rulings and sources this story builds on (quoted, never paraphrased)

Quotes are word-for-word; typographic dashes are written as ASCII hyphens; "..." marks a cut.

| Source | Verbatim | Status |
|---|---|---|
| Panel `2026-11-03-443` Q1 A, as put | "When a worker asks to report elsewhere, the District Admin of the district they are leaving **or** the one they are joining opens a request; the other **accepts or refuses it, giving a reason from a fixed list**. The worker stays where they are until it is accepted. A request left unanswered for 7 days goes to the Pariwar Admin and is **never accepted by default**. The Pariwar Admin may also move a worker directly, for either reason, and settles a refused or unanswered request. Both District Admins are told by email and in the admin console, including when the Pariwar Admin moves a worker." | Trustee-ratified - the whole flow (AC1-AC7) |
| `-443` Q1 A, costs as put, accepted | "Two actions for every move, and a refusal leaves the worker where they were. "At the worker's request" is the officer's word - the system cannot see that the worker asked. A District Admin who keeps refusing sends the dispute to the Pariwar Admin." | Trustee-ratified - why Q-2 exists (how a refusal reaches the Pariwar Admin) |
| `-443` "What this ratifies that was a reading" | "Everything the option text did not state stays the AUTHOR's: the opener's withdrawal, the either-end target rule and the split of the notices (QE17)" | the author's half (AD2-AD9) |
| `-443` "does NOT cover" | "The permission KEYS for opening, answering, moving and approving ... Each key still comes with the work that builds it (`-059` amendment B (3) ...)." · "The refusal-reason list, the escalation sweep, and the channel and wording of each notice (Story 13.1d) ... each that story's create-story decision." | the keys go to the Panel (Q-3); the list, the sweep and the wording are AD7, AD8, AD9 |
| `-442` QE17 (author-commit; BigDev) | "The counterpart District Admin is told of a request, the opener of the answer and its reason, the Pariwar Admin of an escalation, and BOTH District Admins of a move a Pariwar Admin makes (not the one who made it) - by email AND in-app." | author-commit - AD9's recipients |
| BigDev in `-442` | "At request by worker can be placed to either District Admin or pariwar admin to change the reporting authority. Yes losing district admin should be notified." · "For notification both emai and in-pp" · "well I think request should be made by sending District Admin to receiving District Admin. There should be mechanism to accept to refuse with reason." | BigDev's words, as typed |
| `-059` amendment B (3) | "(3) Future permission additions for Finance Officer, Media/Comms, Field Worker, and Helpline Operator are to be ratified when their feature sets ship." | Trustee-ratified - the four keys go to the Panel (Q-3) |
| ADR-0040 (ratified `-358`) | "⛔ No other new path is admitted; a third is a new ADR." · ADR-0043 (`drafted`): "a fourth is a new ADR." | the email needs a new ADR (Q-1) |
| `-262` FQ3 A (6.25's email) | "⛔ no names, ⛔ no note" | precedent: AD9's email names no one |
| `epics.md` Story 13.1d | "if the worker has been moved meanwhile, the acceptance fails cleanly ... and the request is marked stale" | variance (AD4): the move that made it stale already marked it, in its own transaction |

### 0 - whose decision is this (`trustee-panel-routing-note-TEMPLATE.md` section 0, per edge)

| # | Edge - stripped of citations | Verdict |
|---|---|---|
| 1 | Who may change a worker's reporting district, and how | **The Panel's - RULED** (`-443` Q1 A). Gate MET |
| 2 | Who holds the keys to open, answer, settle and read requests | **The Panel's in kind** (`-059` B(3)): built on the default, a NON-BLOCKING confirm (Q-3 A; Row 51 (a); Row 48 (i)). ✅ **RULED `-459` Q1 A** - as built |
| 3 | Whether the District Admin at the OTHER end - who cannot see a worker outside their district today - is shown the worker's NAME on the request | **The Panel's** (what the Trust discloses about a person, to whom). The ruled consent presupposes they know whom they accept; built on "name only, behind an audited read" - put as a confirm (Q-3; Row 51 (b)). ⭐ **RULED `-459` Q2 A, WIDENED**: the name AND "other details like work history with organization, number of member onboarded, etc."; never the phone number. The build follows Task 0.8 |
| 4 | Whether the system tells the WORKER of the answer | **The Panel's** (who is told - [[feedback_told_line_must_not_carry_panel_choice]]); the ruled option named District Admins only. Built default: the system sends the worker nothing (no channel exists); the answer notice tells the opener to tell the worker - put as a confirm (Q-3; Row 51 (b)). ✅ **RULED `-459` Q3 A** - as built |
| 5 | Which further officers are told (the split of the notices), incl. how a REFUSED request reaches the Pariwar Admin | **The author's / BigDev's** - `-443` left "the split of the notices" to the author. **Q-2 A**: the Pariwar Admins are told of every refusal |
| 6 | Whether the email is built here or in its own row | **BigDev's** scheduling - **Q-1 A**: its own row `13-1g`. WHAT is owed (email AND console) is ruled; go-live waits for both (Row 51 (c)) |
| 7 | The stream, the table, the reason list, the sweep, the screens, the key names, the email's wording (names no one) | **Yours** (AD) - the email naming NO ONE is narrower than any disclosure; naming anyone would be the Panel's (6.25's `-262` FQ3 A) |

**Result (Q-3 A): ONE Panel note (Task 0.6), NON-BLOCKING, three questions: (1) the four keys and holders (AD5); (2) the other end sees the
worker's name; (3) the worker is told by the officer, not the system.**

## Names at a glance

| Thing | Name |
|---|---|
| Keys (AD5) | `field_worker.request_move` (district_admin), `field_worker.answer_move_request` (district_admin), `field_worker.settle_move_request` (pariwar_admin), `field_worker.read_move_requests` (district_admin + pariwar_admin); super_admin derives all |
| Move-key list | `FIELD_WORKER_MOVE_PERMISSION_KEYS = ['field_worker.move', 'field_worker.answer_move_request'] as const` (`commands.ts:87`; 13.1c C1) |
| Stream | its OWN stream per request: `stream_id = move_request_id` (a caller-minted uuid), event prefix `field_worker_move_request.` |
| Events | `field_worker_move_request.opened`, `.accepted`, `.refused`, `.withdrawn`, `.escalated`, `.closed`, `.superseded` |
| States | open: `pending`, `escalated`; final: `accepted`, `refused`, `withdrawn`, `closed`, `superseded` |
| Tables (migration `0205`) | `field_worker_move_requests` (the projection; written only by its projector), `field_worker_notices` (one row per notice and recipient) |
| Domain | `packages/domain/src/field-worker/move-request*.ts` (events, state, project, commands, read), `notices.ts`; barrel `field-worker/index.ts` |
| Routes | `POST /api/v1/p/:pariwarId/field-workers/:fieldWorkerId/move-requests`; `POST .../field-workers/move-requests/:moveRequestId/{accept,refuse,withdraw,close}`; `GET .../field-workers/move-requests?district=&state=&after=&limit=`; `GET .../field-workers/move-requests/:moveRequestId`; `GET .../field-workers/notices?after=&limit=`; `POST .../field-workers/notices/seen` |
| API files | `apps/api/src/modules/field-worker/{move-request-handlers,notice-handlers}.ts`; loaders in `gate.ts`; registrations in `routes.ts` |
| Job | `apps/jobs/src/scheduler/field-worker-move-request-escalation.ts` (hourly, own pool) |
| Admin | `apps/admin/src/modules/field-workers/{MoveRequestsPage,MoveRequestActions,NoticeList}.tsx`; `FieldWorkerNav` gains `'requests'`; a "Ask to move" act in `WorkerActions` |
| Roster | Row 51 `field-worker-move-requests-live` |

## FOUND FACTS (G) - traced at `43deb5d2`, 2026-11-08

- **G1 - The worker's own stream CANNOT carry request events.** `projectFieldWorkerTransition` (`field-worker/project.ts:309-317`) reads
  `max(event_version)` for the stream and throws `FieldWorkerStreamConcurrencyError` unless it equals the row's `state_event_version`: a request event on
  `stream_id = field_worker_id` would make EVERY later transition of that worker fail. The I4 fixture `expectRowMatchesStream`
  (`tests/integration/field-worker/_fixtures.ts:156-175`) would break too. And the 13.1c log read returns every event on the stream
  (`listFieldWorkerEvents`, `read.ts:433`, no type filter) into `FieldWorkerLogItem.event_type = z.enum(FIELD_WORKER_EVENT_TYPES)` (contracts
  `enums.ts:56-66`, `dto.ts:222`), serialized through the Zod serializer - an unknown type is a 500; the admin `resolveEn` throws on an unknown
  `fw.history.event.*` key. ⇒ AD2: a stream of its own.
- **G2 - The stream + projection precedent.** Helpdesk (10.1): `events_log` stream `stream_id = ticket_id` (random uuid) + cache table
  `helpdesk_tickets` written only by the projector (`helpdesk/project.ts`, `projectTicketTransition` :319), migration `0084` (GRANT SELECT, INSERT,
  UPDATE; FORCE RLS; three per-command policies; guard trigger keyed on `app.helpdesk_state_writer` :157), a CI scan `scripts/helpdesk-state-invariant`,
  and `'system'` among its actors (`helpdesk/events.ts:39`). The alert primitive (8.1, `0078`) is the same shape. `events_log` has no stream-type column;
  the "type" is the event-type prefix plus the anchor table (`schema/events_log.ts:51-63`); append-only by triggers (`0001:48-56`).
- **G3 - "One open per X" and "a direct act ends a pending request" have precedents.** Partial unique indexes: `0033:61`
  `data_exports_one_pending_per_member ... WHERE status='pending'`; `0107:138` `..._one_open_per_action ... WHERE status='open'`. `workplace_requests`
  (`0161`): "Every posting write ends the member's older OPEN request (`withdrawn`)". `claim_correction_closures` (`0131`): a District Admin requests,
  the Pariwar Admin decides, a job writes only an escalation RECORD ("⛔ the system never decides").
- **G4 - The commands run in the CALLER's transaction.** All seven field-worker commands take the caller's `pg.PoolClient` and never BEGIN / COMMIT
  (`commands.ts` header :1-34, "the caller's transaction must be READ COMMITTED"); `activateFieldWorker` already writes a second table on the same client
  (`enqueueFieldWorkerCodeSms`, :375). Statement order `SAVEPOINT -> LOCK -> HEAD -> APPEND -> UPDATE` inside `runLockedTransition` (:262-296). The
  lock: `SELECT ... FROM field_workers WHERE field_worker_id = $1 AND pariwar_id = $2 FOR UPDATE` (:124-131).
- **G5 - `postFieldWorker` is ready for the acceptance.** `(client, Base & { toDistrict, reasonCode, expectedFromDistrict, authorization })`
  (:474-520); `verifiedSnapshot` with `{ permissionKeys: FIELD_WORKER_MOVE_PERMISSION_KEYS }` (:162-204); under the lock (3a) locked district =
  `expectedFromDistrict` else `AuthorizationStale`, (3b) unchanged -> `DistrictUnchanged`, (3c) target is `toDistrict` or the locked district else
  `AuthorizationStale`. The JSDoc at :84-85 and :481 and `permissions.ts:1510` say 13.1d APPENDS its key and passes the request's source. `posted`'s
  payload (`events.ts:230-249`) is strict: `from_state`, `to_state`, `trigger: 'field_worker.post'`, `actor`, `authorization`, `from_district`,
  `to_district`, `reason_code`. Actors are `['operator','trustee']` only (:36; header :18-22 "A later automated actor is a new decision") - so the
  sweep never writes a `field_worker.*` event.
- **G6 - The registry and its coverage test.** `packages/events/src/registry.ts:671-720`; `posted`'s description (:718) ends "the accepted move request
  of Story 13.1d is the second emitter (unverified until built)". `packages/events/tests/field-worker-registry-coverage.test.ts` pins every
  `field_worker.*` key to `FIELD_WORKER_EVENT_TYPES` (set equality) and per-type emitter text - a `field_worker_move_request.*` prefix is outside it
  (a sibling coverage test is needed, AD2).
- **G7 - RBAC.** Catalog v61, 86 keys (`permissions.ts:880`; 13.1c's changelog :869-879; field-worker entries :1492-1525). `roles.ts`: constants
  :336-354 (`FIELD_WORKER_MOVE` :347, comment "⛔ district_admin (13.1d's request is theirs)"); `pariwar_admin` bundle :370 (field-worker keys
  :530-540); `district_admin` bundle :553 (:598-606: register, read_code, view, suspend, reactivate, terminate, read_log). Containment
  (`rbac/scope.ts:229-300`): a pariwar grant covers every geo target; a district grant matches its exact value only; a broader target than the grant is
  denied ([[project_rbac_geo_scope_containment]]). `authorizingGrant` (`check.ts:241-262`) picks the MOST SPECIFIC grant. Pins:
  `tests/rbac/permissions.test.ts:249,251`, `tests/field-worker/{events,state}.test.ts` (`catalog_version: 61`), `tests/rbac/roles.test.ts`
  (`toHaveLength(13)` x5; 13.1c's describe :1154-1176).
- **G8 - The gate's target can be anything a preHandler stashed.** `requirePermissionHook` (`apps/api/src/modules/rbac/index.ts:134-174`):
  `resolveValue` is SYNCHRONOUS, reads a stash; the result is stored at `request.authorizations[key]`; a deny is 403 `authz.forbidden`. A null target
  fails closed (`scope.ts:236`). The body is validated BEFORE the hooks (`routes.ts:27`). Body-derived precedent: `registrationDistrict`
  (`routes.ts:76-80`). **Grant-aware loader precedent** (which end does the actor hold?): `claims.refile-confirmation.routes.ts:31-54` and
  `claims.nominee-name-check.routes.ts:100-125` test each of `request.scopeGrants` (set by `middleware/scope-resolution/index.ts:72`) with
  `rbac.hasPermission([g], KEY, ...)` and stash `{ dimension, value }`.
- **G9 - The write helper.** `tenantWrite` (`write-support.ts:90-119`): idempotency key (400 `field_worker.idempotency_key_required`, <= 200 chars) ->
  release the hook tx -> `withIdempotency` (replay / 409 `idempotency_in_progress`) -> `prepare` (no tx) -> `openScopeTx` -> `run` ->
  `mapFieldWorkerError` -> `closeScopeTx(false)` in `finally`. No body fingerprint: the namespace must carry the object's id (13.1a TR6). 13.1c's
  `act()` (`lifecycle-handlers.ts:74-133`) is the shape to copy: pre-read refusals BEFORE the audit wrapper (no audit line), then ONE
  `withCompensatingAudit` whose `mutate` runs the command and `closeScopeTx(ctx.scopeTx, true)`.
- **G10 - Errors.** `mapFieldWorkerError` (`errors.ts:43-108`) maps 18 codes (incl. 409 `illegal_transition`, `district_unchanged`,
  `authorization_stale`, `stream_conflict`; 422 `district_unknown`; 404 `not_found`). No move-request code exists.
- **G11 - Email: a NEW path is a new ADR.** Staff email exists for two kinds, each with its OWN table keyed by its object (6.25's
  `claim_suspicion_staff_emails`, `0152`-`0154`, FK to `claims`; 11b.4a's memorial take-down, `0187`) - neither is a generic outbox. Recipients are
  resolved by a fenced read (`claim/staff-email-identity-read.ts` Q1: `role_grants` `role='pariwar_admin'`, `scope_dimension='pariwar'`) and the address
  by Q2 (`admin_credentials.email_ciphertext`, Tier-1, `decryptAdminEmail` `encryption/admin-email.ts:30-34`). The fence
  `apps/jobs/tests/staff-email-identity-read-fence.test.ts` holds EXACT allowlists (`IDENTITY_`, `DECRYPT_`, `Q2_CALLER_`, `CONTEXT_`) with planted
  positive controls. ADR-0040 (`-358`): "⛔ No other new path is admitted; a third is a new ADR"; ADR-0043 (`drafted`): "a fourth is a new ADR". The
  port `apps/jobs/src/scheduler/staff-email-client.ts` (`ses | zeptomail | fake | none`); one bilingual template (`suspicion-staff-email-templates.ts`,
  its only parameter `link`; "adding a field is a disclosure question for the Panel" :16). Both existing staff emails NAME NO ONE. Emails need no DLT.
- **G12 - In-app: nothing to reuse.** No notices table, `read_at` or `seen_at` for admins; "unread" hits are all "unreadable". 6.20 D14's
  `/p/$pariwarId/nominee-refusals` (`router.tsx:383-387`, `NomineeRefusalsRoute.tsx`) and 6.19c's `DirectionInbox` are plain work lists with no read
  marker. Admin nav links are hand-declared in `routes/RootLayout.tsx` (field workers :150-156, ungated inside a Pariwar); a page = a `createRoute` in
  `router.tsx` + `routeTree` (:477) + a link. The field-worker pages use `FieldWorkerNav.tsx` (`FieldWorkerPage = 'register'|'approvals'|'find'`, :8).
- **G13 - Who holds a district.** `role_grants` (`schema/role_grants.ts:34-89`): `user_id, pariwar_id, role, scope_dimension, scope_value,
  created_at, created_by`; NO revoked column (revocation deletes the row). `twt_app` reads it tenant-isolated (`0004:74-75`); `users` is global
  (`0005:143`). `listAdminsByRole(db, pariwarId, role, { dimension, value })` (`claim/admin-directory.ts:43-75`) filters active users with a non-blank
  display name and caps at 50 - a notice recipient must NOT need a display name, so AD9 writes its own query.
- **G14 - The jobs side.** The shared jobs pool is `max: 2` (`apps/jobs/src/boot.ts:348`); separate pools exist (code SMS `max: 3`, :359)
  ([[project_jobs_pool_two_connection_starvation]]). The code-SMS sweep's Row 26 guard (`canReadAcrossPariwars`, `field-worker-code-sms.ts:360-365`)
  and its system audit line (`actorId: null, actorRole: 'system'`, :308-321). The state-writing day-N sweep precedent: `claim-correction-closure.ts`
  (daily, per-row `withPariwarScope`, a Pariwar Admin escalation record, `actorId: null`). The overdue warning precedent:
  `memorial-takedown-overdue.ts` (a stored 7-day `due_at`).
- **G15 - The admin module today.** `WorkerActions` picks acts by state only (`ACTS_BY_STATE` :38-43); Move sends `{ from_district: worker.district,
  to_district, reason_code }` (:161); a District Admin pressing Move gets 403 -> "Only a Pariwar Admin can move a worker directly."
  (`fw.actions.noAccess.move`, `i18n-en.ts:172`). `WorkerDetail.children(name, { current_state, district, created_at })` (:32-40). Hooks: field-worker
  region `src/api/hooks.ts:3005-3165` (`attemptKey` :603-619; `useFieldWorkerAct` :3132-3165 with `networkMode: 'always'`; `useApproveFieldWorker`
  :3084 still on the default - 13.1c CR34). Client `src/api/client.ts:3639-3690`.
- **G16 - Test harness.** `apps/api/tests/integration/field-worker/_registration-harness.ts`: `actor(p, role, dim, value)` (ONE grant), `addGrant`,
  `listDistrict`, `move`, `cleanup` (:153-181, replica-mode deletes in FK order: codes -> flags -> sms -> field_workers -> events_log -> geo; the new
  tables go before `field_workers`). Races: `move-race.spec.ts:47-62` (`waitForBlockedBy`). `_field-worker-fixture.ts` mints with the real
  `rbac.authorize` (fence-exempt by exact path; `actAuthorization` typed to the four act keys :75-89).
- **G17 - Fences.** `check.test.ts`: `authorize(` only in `rbac/check.ts`, the two `_field-worker-fixture` files and tests (:1314-1335); the
  `requirePermission` result kept only in `apps/api/src/modules/rbac/index.ts` (:1287-1312). The attribution-code reach fence (`apps/api/tests/unit/
  attribution-code-reach-fence.test.ts`) matters only if a new file imports the code module - none here does.

## Build decisions AD1-AD12 - the author's; Q-1..Q-3 answered A by BigDev (2026-11-08); recorded at Task 0.3

- **AD1 - Scope.** The move request (its stream, table, five writes, two reads, four keys), the escalation sweep, the supersede rule, the notice rows
  and the in-app page. **The email - Q-1 A:** its own row `13-1g-field-worker-move-notices-by-email` - a new ADR admitting a fourth
  path (district-admin recipients by exact district grant), a send table keyed on `notice_id`, a jobs sender, a template and the fence entries - over
  THIS story's `field_worker_notices` rows, which are channel-neutral; go-live waits for it (Row 51 (c)). NOT here: telling the worker (no channel:
  no login until 13.3; an SMS needs a DLT template - Row 49 (a)); a move to another Pariwar (QE19); 13.1c's direct move route itself (only its
  supersede and notice side effects, inside the domain command).
- **AD2 - The request has its own stream and a projected table (G1, G2).** `stream_id = move_request_id` (caller-minted uuid), events
  `field_worker_move_request.{opened,accepted,refused,withdrawn,escalated,closed,superseded}` in `move-request-events.ts` with `.strict()` payloads and
  NO name, mobile or code; a pure state table in `move-request-state.ts`; `projectMoveRequestTransition` (the helpdesk / `field_workers` shape:
  APPEND then UPDATE under `SET LOCAL app.field_worker_move_request_writer = 'on'`) is the ONLY writer of `field_worker_move_requests`. Registry entries
  in `packages/events/src/registry.ts` + a sibling coverage test (`field-worker-move-request-registry-coverage.test.ts`). Every event of the request
  is the Panel's "full log" for it. Why not a plain table: an overwritten state loses who did what; why not the worker's stream: G1.
  **Payloads:** common `{ from_state, to_state, actor: 'operator'|'trustee'|'system', field_worker_id }`; human acts carry `authorization` (the
  verified snapshot); `opened` adds `from_district, to_district, opened_at_end: 'from'|'to', counterpart_district, reason_code: 'at_worker_request'`;
  `refused` adds `refusal_reason`; `escalated` adds `cause: 'unanswered_7_days'|'no_counterpart_officer'` (actor `system`, no authorization);
  `superseded` adds `cause: 'worker_moved'|'worker_ended'` and the acting human's snapshot of the move / terminate key; `accepted` adds
  `posted_event_id` - the id of the `field_worker.posted` event the acceptance wrote (event ids are minted by the DB on insert, `.returning`,
  `project.ts:389`, so the move is written FIRST - AD4). `system` is the actor of `escalated` ONLY (a schema refinement + a test).
- **AD3 - States and who acts.**
  | From | Act (actor) | To |
  |---|---|---|
  | (none) | open (a District Admin holding EITHER end) | `pending` (then `escalated` in the same tx if the counterpart has no other District Admin - AD8) |
  | `pending` | accept / refuse (a District Admin of the COUNTERPART district, not the opener) | `accepted` / `refused` |
  | `pending`, `escalated` | withdraw (the opener only) | `withdrawn` |
  | `pending` | the sweep, 7 x 24 h after `opened_at` (system) | `escalated` |
  | `escalated` | close (a Pariwar Admin) | `closed` |
  | `pending`, `escalated` | a DIRECT move (`field_worker.posted` under key `field_worker.move`), or `field_worker.terminated` (the acting officer) | `superseded` |
  Once `escalated` the counterpart may no longer answer ("goes to the Pariwar Admin"); a Pariwar Admin settles by moving the worker directly (13.1c -
  which supersedes it, cause `worker_moved`) or closing it. A suspension supersedes nothing (a suspended worker may be moved, 13.1c G4). Final states
  are frozen (guard trigger). **One open request per worker:** partial UNIQUE `(pariwar_id, field_worker_id) WHERE state IN ('pending','escalated')` ->
  23505 mapped to 409 `field_worker.move_request_open` (savepoint, [[project_domain_limit_clamp_and_savepoint_retry]]).
- **AD4 - Lock order and the acceptance (13.1 D7; 13.1c C1).** EVERY writer takes the WORKER row lock FIRST, then the request row (open, accept,
  refuse, withdraw, close, the sweep, and the supersede inside `postFieldWorker` / `terminateFieldWorker`) - else a direct move and an acceptance
  deadlock. **Accept**, in ONE transaction: lock the worker (a `lockFieldWorkerRow` helper in `commands.ts`, the existing lock SQL) -> lock the request ->
  `pending`? else 409 `move_request_not_open` -> actor != opener? else 409 `move_request_same_officer` -> `postFieldWorker(client,
  { toDistrict: req.to_district, expectedFromDistrict: req.from_district, reasonCode: 'at_worker_request', authorization: <the answer key's verified
  object, target = counterpart_district> })` (3c passes: the counterpart is one end) -> write `accepted` with `posted_event_id` = the post's
  `result.eventId`. The supersede inside `postFieldWorker` runs ONLY for key `field_worker.move` (a direct move): under the answer key there is
  nothing else to supersede - the worker lock is held and the partial unique (AD3) allows one open request, the one being accepted. ⛔ a "not from
  this request" exception. **Variance from the epic's "the request is marked stale":** every move and ending supersedes the open request in its OWN
  transaction (AD3), so a request can never be pending for a worker who has moved; an acceptance that loses a race waits on the worker lock and then
  reads `superseded` -> 409 `move_request_not_open`. `FieldWorkerAuthorizationStaleError` from the post stays mapped (409 `authorization_stale`) as a
  defensive path. **R2-D1 fires** ("a second key for an existing event"): `posted`'s schema pins `authorization.permission_key` to
  `FIELD_WORKER_MOVE_PERMISSION_KEYS` (a `z.enum` over the list) in the same commit that appends the key.
- **AD5 - FOUR keys, ONE catalog bump (61 -> 62, 86 -> 90); each a `-059` B(3) key, built on the default, NON-BLOCKING Panel confirm (Q-3; Row 51 (a);
  a dated line at Row 48 (i)).**
  | Key | Holders | Gate (`district` dimension) |
  |---|---|---|
  | `field_worker.request_move` | `district_admin` | open: the END the actor holds (grant-aware loader, G8: test the source, then the destination; holding both -> the source); withdraw: the opener's end |
  | `field_worker.answer_move_request` | `district_admin` | the request's `counterpart_district` |
  | `field_worker.settle_move_request` | `pariwar_admin` | the request's `from_district` (a pariwar grant covers it) |
  | `field_worker.read_move_requests` | `district_admin`, `pariwar_admin` | list: the `district` query value; one request: either end (grant-aware) |
  ⛔ `pariwar_admin` for request / answer (the Pariwar Admin moves directly, BigDev: "I don't want to put a lot of workload on Pariwar Admin").
  `answer_move_request` is APPENDED to `FIELD_WORKER_MOVE_PERMISSION_KEYS` in the minting commit (13.1c C1). One key per act (13.1 QE10). A
  `roles.test.ts` describe per key (holders; non-holders `state_trustee`, `trustee_panel`, `helpline_operator`, `field_worker`; bundle count 13).
- **AD6 - The routes.**
  | Route | Body | Result | Key |
  |---|---|---|---|
  | `POST .../:fieldWorkerId/move-requests` | `{ from_district, to_district }` strict | 201 `FieldWorkerMoveRequest` | request_move |
  | `POST .../move-requests/:id/accept` | `{}` strict (send `'{}'`) | 200 `FieldWorkerMoveRequest` (+ `district`) | answer_move_request |
  | `POST .../move-requests/:id/refuse` | `{ reason_code }` strict (AD7) | 200 | answer_move_request |
  | `POST .../move-requests/:id/withdraw` | `{}` strict | 200 | request_move |
  | `POST .../move-requests/:id/close` | `{}` strict | 200 | settle_move_request |
  | `GET .../move-requests?district=&state=open\|closed&after=&limit=` | - | `FieldWorkerMoveRequestPage` | read_move_requests |
  | `GET .../move-requests/:id` | - | `FieldWorkerMoveRequestDetail` (the request + its events) | read_move_requests |
  | `GET .../notices?after=&limit=` | - | `FieldWorkerNoticePage` (the actor's own) | none - `[session, scope]` only, as `/districts` (`routes.ts:125`); the query filters `recipient_user_id = actor` |
  | `POST .../notices/seen` | `{ notice_ids: uuid[] (1..100) }` strict | 204 | none - `[session, scope]`; the UPDATE filters `recipient_user_id = actor` |
  ⛔ a fifth key for the notices: they are the actor's own rows (the login-wall guard still requires the session hook). `/move-requests` and
  `/notices` are registered BEFORE `/:fieldWorkerId` (as `/districts`, `routes.ts:121-128`). **Both list GETs** (move requests, notices): `limit`
  1-100, default 50, an over-cap value CLAMPED by copying `FieldWorkerLogQuery`'s `z.preprocess` (`contracts/src/field-workers/dto.ts:195-210`) so
  the declared `maximum` is what `forced-pagination.spec.ts` reads; each declares `rateLimit: limits.read` (`reads.spec.ts:648-660` checks the
  route table). Per-request loader
  `loadMoveRequestGate` reads the row on the hook tx and stashes the act's district (null for a missing / foreign request -> 403 for everyone, no
  oracle). Every write: `tenantWrite` with namespace `field_worker.move_request.<act>:${p}:${a}:${id}` (worker id for open); pre-reads refuse BEFORE
  the audit wrapper (no audit line); ONE `withCompensatingAudit` (action = the event type; accept's action is `field_worker_move_request.accepted`
  and its `auditId` also goes to `postFieldWorker`); COMMIT inside `mutate`. Open's pre-read: worker exists, not `terminated` (409
  `illegal_transition`), `from_district` = current (else 409 `authorization_stale`), `to_district` != current (409 `district_unchanged`),
  `assertDistrictRecorded(to_district)` (422), no open request (409 `move_request_open`). Withdraw: actor = `opened_by` else 409
  `move_request_not_opener`.
- **AD7 - The refusal list (pinned here, as the epic asks).** `FIELD_WORKER_MOVE_REFUSAL_REASONS = ['no_capacity', 'work_not_needed_here',
  'request_incomplete', 'other'] as const` - labels "We cannot take on another worker", "There is no work for them here", "The request is missing
  something - talk to me", "Another reason - talk to me". Never free text. Re-declared in `@twt/contracts` with a sync test (as the state enum).
- **AD8 - Escalation.** (a) The SWEEP (`apps/jobs/src/scheduler/field-worker-move-request-escalation.ts`): cron `'17 * * * *'` Asia/Kolkata,
  `localConcurrency: 1`, its OWN pool (`max: 2` beside the shared one, G14), the Row 26 guard; a cross-tenant selector of `pending` rows with
  `opened_at <= now() - interval '7 days'` (DB clock) ordered by `opened_at`, then per row in `withPariwarScope`: lock worker, lock request, re-check
  `pending` and the age, write `escalated` (cause `unanswered_7_days`, actor `system`), the Pariwar Admin notices, ONE audit line (`actorId: null,
  actorRole: 'system'`). Never accepts (I3). Idempotent: a second tick finds it `escalated`. (b) AT OPEN, if no District Admin OTHER than the opener
  holds an exact district grant on the counterpart district (active user), the open writes `escalated` (cause `no_counterpart_officer`) in the same
  transaction - "a request to a district with no District Admin goes straight to the Pariwar Admin". A District Admin granted later does not
  reclaim it (cost, stated).
- **AD9 - Notices: one row per notice and recipient, written in the deciding transaction (the 13.1b shape, [[project_field_worker_code_sms_substrate]]).**
  `field_worker_notices (notice_id, pariwar_id, recipient_user_id, kind, field_worker_id, move_request_id NULL, from_district, to_district,
  refusal_reason NULL, created_at, seen_at NULL)`; `twt_app` INSERT on the identity columns and UPDATE of `seen_at` only (a guard: `seen_at` set once,
  everything else frozen); RLS by Pariwar only - the scope transaction sets `app.pariwar_id` and NO actor setting (`packages/domain/src/db.ts:120`),
  so the domain read and the `seen` UPDATE both filter `recipient_user_id = <actor>` in SQL, and a live test proves another officer's rows are never
  returned and never changed (⛔ a new session setting). Recipients resolved in the transaction by a domain query on `role_grants` + `users.status = 'active'` (⛔ a
  display-name filter, G13): District Admins = `role='district_admin' AND scope_dimension='district' AND scope_value = <district>`; Pariwar Admins =
  `role='pariwar_admin' AND scope_dimension='pariwar'`; the actor is always excluded; no recipient -> no row (and nothing sent). One event, one
  notice per recipient: no recipient gets two kinds for the same act.
  | Kind | When | Recipients |
  |---|---|---|
  | `move_request_opened` | open (not escalated at open) | District Admins of the counterpart district |
  | `move_request_accepted` | accept | the opener |
  | `move_request_refused` | refuse | the opener and the Pariwar Admins (Q-2 A) |
  | `move_request_escalated` | either escalation | the Pariwar Admins; and the opener (at open the opener is the actor, so excluded - the screen says it instead, AD10) |
  | `move_request_superseded` | supersede by an ENDING (`worker_ended`) only | the opener and the counterpart's District Admins |
  | `moved_by_pariwar_admin` | `postFieldWorker` with key `field_worker.move` | District Admins of BOTH districts; `move_request_id` = the request it superseded, if any (a direct move writes NO `move_request_superseded` - its recipients are all here already) |
  Withdraw and close write none (the work list shows the state). A notice holds NO name, mobile or code; the in-app list renders the worker's name
  only through the audited request read (AD10). **The email (row `13-1g`, Q-1 A):** one email per notice row, naming NO ONE - "A field worker move request
  needs your answer" / "... was answered" etc. + a link to the Move requests page (6.25's `-262` FQ3 A shape); the wording is that row's.
- **AD10 - The screens.** ⭐ **Amended by the Panel (`-459` Q2 A, WIDENED, 2026-11-08):** where this AD says the worker's NAME, the Panel ruled
  the name AND *"other details like work history with organization, number of member onboarded, etc."* - never the phone number, every look
  audited. What those details are, where they are read and how the count shows before Story 13.8 can compute it are Task 0.8's author-commit,
  owed BEFORE Task 6. ⭐ **DECIDED by `-460` (2026-11-08, BigDev: "recommended"):** the LIST keeps the name only (below). ONE request's
  DETAIL (`GET .../move-requests/:moveRequestId`) adds a `worker` block - the name, and a work history read at request time from the worker's
  OWN stream: registered on; active since (the first `activated`, or none); the current state's NAME (⛔ its reason); each district with its
  dates (the `registered` district, then each `posted` `to_district`, oldest first, the last open-ended); each suspension's dates (`suspended`
  to the next `reactivated`, or open-ended) - ⛔ any reason, ⛔ any officer's name or role, ⛔ KYC, ⛔ code, ⛔ mobile; and `members_onboarded:
  null`, shown as "Not counted yet" until Story 13.8 (C4). "etc." adds nothing. ONE audit line per detail view
  (`field_worker.move_request_worker_viewed`, naming the request and the worker), written BEFORE the name is decrypted (the `-447` shape). The
  history read is bounded (a cap of at least 200 events, saying so if it stops); ⛔ a new column or table for it. On the page, each item opens its
  detail panel. A **Move requests** page (`FieldWorkerNav` gains `'requests'`, route `/p/$pariwarId/field-workers/requests`): (1) "Waiting
  for your answer" - open requests whose counterpart is a district the officer holds (a Pariwar Admin: every `escalated` request), each with Accept /
  Refuse (a REQUIRED reason select, labels only) or, for a Pariwar Admin, Close and a link to the worker on Find (moving directly is 13.1c's act);
  (2) "Your requests" - opened by the officer, with Withdraw; (3) "Notices" - the officer's notices, newest first, unseen ones marked; showing a page
  POSTs `notices/seen` for the shown ids; `FieldWorkerNav`'s Requests link carries the unseen count, read from the notices query's first page when
the nav mounts (no polling; `RootLayout` unchanged). A district picker for the list (District Admins pick among theirs;
  `useFieldWorkerDistricts`). Each item: the worker's NAME (Q-3 confirm) via the list read, which decrypts names behind ONE audit line per page
  naming the workers on it (`field_worker.move_requests_viewed`, the `-447` page-audit shape, through `field-worker-crypto.ts` - TR10), both
  districts, who opened it (current display name or "an officer (name not recorded)", [[project_admin_display_name_attribution]]), the age, the
  state, the refusal reason. On Find's opened worker, `WorkerActions` gains **Ask to move** (the WORKER's states `pending_kyc` / `active` /
  `suspended` - `ACTS_BY_STATE` keys, ⛔ the request's own `pending`; a district select excluding the current one; sends `{ from_district:
  worker.district, to_district }`); 403 -> "Only the District Admin of this worker's district, or of the district they are joining, can ask." A 201
  whose state is `escalated` (AD8 (b) - the opener, as the actor, gets no notice) says so: "No other District Admin holds this district, so the
  request has gone to the Pariwar Admin." The accepted notice's line reminds the opener: "Tell the worker." (Q-3, item 3). One idempotency key
  per attempt (`attemptKey`), `networkMode: 'always'` on every new mutation, and on `useApproveFieldWorker` and the registration mutation too
  (13.1c CR34 - its patch review's `networkMode` finding, whose owner is this story; ⛔ 13.1a's CR34, the seal's AAD, which stays open). After a 409 `move_request_not_open` / `_same_officer` / `authorization_stale`: refresh the lists and say
  so. No client-side role gating (13.1a C5).
- **AD11 - Migration `0205_field-worker-move-requests.sql`, hand-authored (the `0202` statement order: CREATE -> CHECKs -> GRANT -> ENABLE -> FORCE ->
  POLICY -> indexes -> trigger).** `field_worker_move_requests`: `move_request_id` uuid PK, `pariwar_id`, `field_worker_id`, `from_district`,
  `to_district` (CHECK differ), `opened_at_end` ('from'|'to'), `counterpart_district` (CHECK = the other end), `state`, `refusal_reason` (set iff
  `refused`), `escalation_cause` (written once on escalation and never cleared: NOT NULL when `escalated` or `closed`, NULL when `pending`,
`accepted` or `refused`, either when `withdrawn` or `superseded` - both are legal from `escalated`, AD3), `supersede_cause` (set iff `superseded`), `opened_by` (user id), `opened_at`,
  `answered_by` / `answered_at` (the act that ended it, NULL while open), `posted_event_id` (set iff `accepted`, AD4), `state_event_version`,
  `updated_at` - pair CHECKs as `field_workers` has. Both tables; composite FK `(pariwar_id, field_worker_id)` to `field_workers`; text-with-CHECK for states, kinds and
  reasons (⛔ new pg enums - no ADD VALUE trap); `field_worker_move_requests` GRANT SELECT, INSERT, UPDATE (no DELETE), guard trigger refusing any write
  without `app.field_worker_move_request_writer = 'on'` and any change to a final row; the partial unique (AD3); keyset indexes `(pariwar_id,
  counterpart_district, state, opened_at DESC, move_request_id)` and `(pariwar_id, from_district, ...)` - check with EXPLAIN on seeded rows
  ([[project_explain_index_cond_single_element_trap]]); `field_worker_notices` per AD9 with `(pariwar_id, recipient_user_id, created_at DESC,
  notice_id)`. A `scripts/field-worker-move-request-invariant` AST scan (the helpdesk one's shape) that only the projector writes the guarded columns.
  The 13.1e removal is NOT affected (no PII here); add a one-line note in `member/anonymize.ts` only if it lists field-worker tables. Any OTHER
  migration: stop and record why first.
- **AD12 - Not built, with homes.** The email - row `13-1g` (Q-1 A). Telling the worker - nobody (Q-3, item 3). The undo / appeal - `13-1f`. A
  move to another Pariwar - QE19. CR33 (a lost `recordResult` after COMMIT) re-trigger FIRES again (five keyed writes on `tenantWrite`): say so, do not
  fix. CB11 (`sending` without age) - not this story's signal work: leave it with 13.1c.

## Errors and their HTTP mapping - only what this story ADDS or makes reachable

| Class / condition | When | HTTP + code |
|---|---|---|
| `FieldWorkerMoveRequestOpenError` (new) | open while one is `pending` / `escalated` (pre-read, or 23505 under a race) | 409 `field_worker.move_request_open` |
| `FieldWorkerMoveRequestNotOpenError` (new) | accept / refuse a non-`pending`; withdraw a final one; close a non-`escalated` | 409 `field_worker.move_request_not_open` |
| `FieldWorkerMoveRequestSameOfficerError` (new) | the opener accepts or refuses their own request | 409 `field_worker.move_request_same_officer` |
| `FieldWorkerMoveRequestNotOpenerError` (new) | withdraw by anyone but the opener | 409 `field_worker.move_request_not_opener` |
| existing | terminated worker -> 409 `illegal_transition`; stale `from_district` -> 409 `authorization_stale`; same district -> 409 `district_unchanged`; unlisted -> 422 `district_unknown` | as mapped (G10) |
| loader null | a missing or foreign request / worker; a District Admin holding neither end | 403 `authz.forbidden` |
| body schema | a refusal reason outside AD7, an unknown key | 400 `request.validation` |

No message carries a name, a mobile or a code.

## ASKs - ANSWERED by BigDev 2026-11-08, verbatim "Q1-Q3 A" (each the recommended option)

Kept as asked, so the decision entry (Task 0.3) can quote them.

- **Q-1 - Build the email in this story, or in its own row?** *Deciding fact:* the Panel ruled "by email and in the admin console", and an email to a
  District Admin is a new path the email ADR forbids without a new ADR (ADR-0040 / ADR-0043), plus its own send table, sender, template and fence
  entries - about as much again as the request itself. *Options:* (A) its own row `13-1g-field-worker-move-notices-by-email`, minted now; this
  story writes channel-neutral notice rows the email reads; go-live waits for both (Row 51 (c)) - recommended; cost: one more row, and the in-app
  notices exist before the emails. (B) all here - cost: the story roughly doubles and its review with it; the ADR is drafted before code.
  **Answer: A.**
- **Q-2 - How does a REFUSED request reach the Pariwar Admin ("settles a refused ... request")?** *Deciding fact:* after a refusal the request is
  over and the worker stays; the Pariwar Admin can move them directly, but only if they know. *Options:* (A) the Pariwar Admins are told of every
  refusal (a notice; no new act) - recommended: refusals should be rare and each is a possible dispute; cost: a notice for refusals that need nothing.
  (B) the opener may "send it to the Pariwar Admin" (a new act and state) - cost: more to build, and the dispute waits on the opener remembering.
  (C) nobody is told; the Pariwar Admin sees refusals in the list - cost: "settles" depends on the Pariwar Admin looking. **Answer: A.**
- **Q-3 - Send ONE non-blocking Panel note with three questions?** *Deciding fact:* the keys are "ratified when their feature sets ship" (`-059`
  B(3)); the officer at the other end cannot see a worker outside their district today, yet must decide on them; and the ruled option named District
  Admins only as the people told. *Options:* (A) yes: (1) confirm the four keys and holders; (2) the other end sees the worker's NAME (not mobile),
  behind an audited read; (3) the system tells the worker nothing - the officer who opened the request tells them - recommended; built on these
  defaults, gating go-live only (Row 51 (a), (b)); cost: one note. (B) the keys only - cost: items 2-3 are decided by us on questions §0 says are the
  Panel's. **Answer: A.**

## Invariants (I)

- **I1** - No field-worker or request event is written without a verified authorization for ITS act's key, except `escalated` (actor `system`).
- **I2** - A worker's reporting district changes only through `postFieldWorker`; an acceptance is the ONLY request act that moves a worker.
- **I3** - Nothing accepts a request but a District Admin of its counterpart district who did not open it; the sweep only escalates.
- **I4** - At most one open request per worker; a move or an ending leaves none open (same transaction).
- **I5** - Lock order: worker row, then request row - everywhere.
- **I6** - No name, mobile or code in any new payload, audit field, notice, response (beyond the audited name and work history of AD10 as amended
  by `-460` - still ⛔ mobile and code), error, URL or email. ⛔ Any suspension or ending reason, or any officer's name, in the detail's `worker` block.
- **I7** - Every pre-read refusal writes no audit line; every committed act writes exactly one, before the COMMIT.
- **I8** - The reach fence, the door's eleven exports, `check.test.ts`'s two fences and the staff-email fence hold with no new entry here (a new
  entry is the email row's, with its ADR).
- **I9** - No member predicate, member state, `acceptsNewAttributions`, the code-SMS sweep or 13.1b's table is changed.
- **I10** - `PERMISSION_CATALOG_VERSION` moves exactly once (61 -> 62) and the key count by exactly four.

## Acceptance Criteria

**AC1 - Opening, from either end.** A District Admin of the worker's CURRENT district opens a request to B: 201, `pending`, `opened_at_end: 'from'`,
`counterpart_district: B`; one `opened` event with the `request_move` snapshot; one audit line; one `move_request_opened` notice per District Admin of
B. (a) A District Admin holding ONLY the destination opens one: `opened_at_end: 'to'`, counterpart = the current district (13.1a C2's positive leg).
(b) One holding neither end -> 403 (and a Pariwar Admin -> 403: not a holder). (c) A terminated worker -> 409 `illegal_transition`; a stale
`from_district` -> 409 `authorization_stale`; same district -> 409 `district_unchanged`; unlisted -> 422; an open request exists -> 409
`move_request_open`; each with NO event, NO audit line. (d) Two concurrent opens for one worker: one 201, one 409 `move_request_open` (live race).
(e) The worker's district, state, code and stream are unchanged by an open.

**AC2 - Accepting.** A District Admin of the counterpart accepts: 200; the worker is in `to_district` (state and reason unchanged); ONE transaction
holds `field_worker.posted` (its `authorization.permission_key = field_worker.answer_move_request`, `from_district` = the request's,
`reason_code: at_worker_request`) then `accepted`, whose `posted_event_id` and the row's equal that `posted` event's id; one audit line; the opener's
`move_request_accepted` notice; NO `moved_by_pariwar_admin` notice and no supersede (the answer key). (a) A destination-only District Admin accepts a request
the source opened (13.1a C2). (b) The opener accepting (holding both ends) -> 409 `move_request_same_officer`. (c) A District Admin of the opener's end
only -> 403. (d) An `escalated`, final or superseded request -> 409 `move_request_not_open`. (e) RACE: a Pariwar Admin's direct move commits while the
acceptance waits on the worker lock -> 409 `move_request_not_open`, the worker where the Pariwar Admin put them, the request `superseded` (live, the
lock held, `waitForBlockedBy`); and the reverse order -> the direct move answers 409 `authorization_stale`. No deadlock in either order (I5).
(f) `postFieldWorker` with `answer_move_request` succeeds; `posted`'s schema refuses a `permission_key` outside the move-key list (R2-D1).

**AC3 - Refusing.** The counterpart refuses with a reason from AD7: 200, `refused`, the reason in the event and the row; the worker stays; the
opener's `move_request_refused` notice and one per Pariwar Admin (Q-2 A; none to the actor). A reason outside the list or free text -> 400. Same-officer and wrong-end
legs as AC2.

**AC4 - Withdrawing.** The opener withdraws a `pending` or `escalated` request: 200, `withdrawn`, no notice. Another District Admin of the same end
-> 409 `move_request_not_opener`; a final request -> 409 `move_request_not_open`.

**AC5 - Escalation.** (a) A `pending` request opened 7 x 24 h ago (backdate `opened_at` in the fixture through the projector's writer, or a test
clock seam - never by disabling the guard on a shared DB) is `escalated` by one tick: cause `unanswered_7_days`, actor `system`, one audit line with
`actorRole: 'system'`, notices to the Pariwar Admins and the opener; the worker unmoved. A second tick changes nothing. One opened 6 days 23 h ago is
untouched. (b) Opening toward a district with no other District Admin escalates at once (cause `no_counterpart_officer`), with no
`move_request_opened` notice. (c) The counterpart cannot accept an `escalated` request (409). (d) A Pariwar Admin closes an `escalated` request: 200,
`closed`; a `pending` one -> 409; a District Admin -> 403. (e) A Pariwar Admin's direct move of the worker supersedes it (cause `worker_moved`).

**AC6 - Superseding (13.1c C1).** With a request open: a direct move (13.1c's route) -> the request `superseded` (`worker_moved`) in the same
transaction, and ONE `moved_by_pariwar_admin` notice per District Admin of BOTH districts (none to the actor) carrying the request's
`move_request_id`, and NO `move_request_superseded` notice (assert each recipient has exactly one notice for the act); an ending (13.1c's terminate
route) -> `superseded` (`worker_ended`) and `move_request_superseded` to the opener and the counterpart's District Admins (none to the actor). A
suspension supersedes nothing. An `escalated` request superseded or withdrawn keeps its `escalation_cause` (the AD11 CHECK admits it). A direct move with
NO request open still writes the two districts' notices. A rolled-back move leaves the request `pending` (the `_rolled_back` twin path).

**AC7 - Reading.** The list for a district returns requests where it is either end, keyset-paged (default 50, cap 100, clamped), open or closed; each
item with the worker's name (decrypted behind ONE `field_worker.move_requests_viewed` audit line per page naming the workers), both districts, the
opener's current display name or `null`, the state, the reason, the ages. One request's detail returns its events in `event_version` order and
(`-460`) a `worker` block - the name, registered on, active since, the current state, the districts with dates, the suspensions' dates,
`members_onboarded: null` - behind ONE `field_worker.move_request_worker_viewed` audit line per view (audit-first: an audit failure returns
no name), proved for a worker with a move and a suspension; ABSENCE legs: no reason code, no officer display name, no mobile, no code in the
block (seed a suspension `under_review` and assert the string is nowhere in the body). (a) A
District Admin of neither end -> 403 for both reads. (b) Absence: no mobile or code in any body; no name in the detail's events. (c) The notices read
returns only the actor's own rows, keyset-paged (default 50, cap 100, clamped); `seen` sets `seen_at` once on the actor's own rows and ignores
others' ids (no error, no change) - both proved with a second officer's notices in the same Pariwar (RLS does not separate them, AD9). (d) Both list
GETs declare a `limit` maximum of 100 and a `rateLimit` in the route table (`forced-pagination.spec.ts`, the `reads.spec.ts` route-table leg).

**AC8 - The keys (AD5).** Catalog v62; exactly four keys added; holders and non-holders pinned in `roles.test.ts`; super_admin derives all; bundle
count 13; `FIELD_WORKER_MOVE_PERMISSION_KEYS` gains `answer_move_request`; catalog fixtures updated.

**AC9 - The screens (AD10).** RTL: the Move requests page's three sections; Accept / Refuse with a required reason; Withdraw on "Your requests";
Close for an escalated one; (`-460`) an item's detail panel with the work history and "Not counted yet" for members onboarded; notices with unseen marks and `FieldWorkerNav`'s count, and the seen POST for the shown ids; "Ask to move" on Find for
`pending_kyc`, `active` and `suspended` workers only (none for `terminated`), its district select excluding the current one, its 403 line, its
"gone to the Pariwar Admin" line on a 201 `escalated`; the accepted notice's "Tell the worker." line; one idempotency key per attempt;
`networkMode: 'always'` on the new mutations and on approve / register (13.1c CR34, patch review). A real-browser pass (Task 9) in the dev
Mac's Chrome ([[project_admin_browser_pass_launcher]]; [[project_agent_chrome_cannot_reach_localhost]]).

**AC10 - Nothing else moves (I8, I9).** The fences stay green with no new entry; the two registry coverage tests pass; `scripts/field-worker-state-
invariant` and the new invariant scan pass; `openapi/v1.yaml` is regenerated and deterministic.

**AC11 - Governance first.** The decision entry is committed ALONE before any code; Row 51, the Row 48 (i) dated line, the `epics.md` note and the
`deferred-work.md` lines follow in their own commit; the Panel note is written per the template and is not called sent until BigDev says so
([[feedback_shown_to_panel_means_sent]]).

## Tasks / Subtasks

Order matters: governance first ([[feedback_governance_commits_precede_implementation]]), then the domain, the API, the job, the screens. Commit on
the story branch only ([[feedback_commit_on_story_branch]]); check the branch before EVERY commit ([[feedback_concurrent_review_agents_mutate_tree]]);
work only in this worktree and grep `docs/legal` by ABSOLUTE path ([[feedback_worktree_session_never_cd_to_main_checkout]]); prefix every `ci:local`
and `git push` with the story's `DATABASE_URL` port and `?sslmode=disable` ([[project_prepush_hook_inherits_5432]]) on a FRESH container; hand-format
([[project_prettier_not_enforced]]); first push with an explicit refspec ([[project_story_branch_upstream_is_main]]).

- [x] **Task 0 - Preflight and governance (AC: 11)** - writes no code.
  - [x] 0.0 (`5dea5d89`) Commit this story file and the create-story record edits (`epics.md` note under Story 13.1d, `deferred-work.md` section, `sprint-status.yaml`
    row + ledger) as ONE `records(13.1d)` commit on the story branch, when BigDev asks.
  - [x] 0.1 (2026-11-08: `origin/main` still `43deb5d2`, no code moved; `-458`, `0205`, catalog 61, Row 51 free on every ref and worktree) `git fetch origin`; `git merge-base --is-ancestor 43deb5d2 HEAD`; `git diff --name-only 43deb5d2..origin/main -- packages apps scripts docs`.
    Re-grep the NUMBERS block; `git worktree list` / `git branch -a` for another branch touching `field-worker/`, `rbac/permissions.ts`,
    `apps/admin/src/modules/field-workers/` or migrations `0205`+.
  - [x] 0.2 **HALT on Q-1..Q-3.** ANSWERED 2026-11-08, BigDev verbatim "Q1-Q3 A"; propagated through this file (v1.2), `deferred-work.md`, `epics.md`
    and the ledger in the same edit, before any code ([[feedback_spec_edits_must_propagate_to_tasks]]).
  - [x] 0.3 (`d20eb1d5`) Write decision `2026-11-08-458` (re-grep every ref and worktree) above the newest entry; commit it ALONE (`governance:`): an author-commit
    recording AD1-AD12, the answers verbatim, the four keys built on the default with a non-blocking confirm, the epic variance (AD4's "marked stale"),
    R2-D1's fix, "supersedes no RATIFIED text; adds no member predicate". Cite `-441`, `-442` QE17, `-443` Q1 A, `-453`, `-454` Q7 A, `-059` B(3),
    ADR-0040 / ADR-0043.
  - [x] 0.4 (`0b663d46`) Roster, its OWN `governance:` commit: append **Row 51 `field-worker-move-requests-live`** (decision-authored; blocks no build or merge,
    [[project_not_in_production_merge_is_not_golive]]): (a) the Panel's confirm of the four keys; (b) the Panel's answers on the name shown to the other
    end and on telling the worker; (c) the email notices BUILT and deployed (`-443` Q1 A: "by email and in the admin console") - owner row `13-1g` (Q-1 A);
    (d) Row 48 closed first. A dated line at Row 48 (i) (13.1d's keys now minted, the confirm outstanding). (Q-1 A) Add the row
    `13-1g-field-worker-move-notices-by-email: backlog` to `sprint-status.yaml` and a `### Story 13.1g` stub in `epics.md` (source: this story's
    AD1 / AD9, G11; needs this story LANDED and a new ADR), in the same commit.
  - [x] 0.5 Annotate `epics.md` Story 13.1d (what was answered, where; the variance) - annotate, never rewrite.
  - [x] 0.6 (written 2026-11-08 `ef5d5748`, E4 run: all pass; SENT by BigDev and RULED 2026-11-08 - see 0.7) (Q-3 A) ONE Panel note from the template,
    `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-08-story-13-1d-field-worker-move-requests.md`, section 0 answered per
    question, the deciding fact, honest costs on every option, evidence last; run its E4 commands before it is sent. Non-blocking.
  - [x] 0.7 (2026-11-08) Record the Panel's ruling, relayed by BigDev: *"by DR and KB / Q1 - A, Q2 - A, name and other details like work
    history with organization, number of member onboarded, etc. Keep the phone number out. / Q3 A"*. Decision `-459` (Trustee-ratified) committed
    alone `0ba691f0`; the note's status block; dated lines at Row 51 ((a) MET; (b) first half MET, second half OPEN) and Row 48 (i) (13.1d's
    contribution discharged); `epics.md`; `deferred-work.md` C4; ledger `2026-11-08h`.
  - [x] 0.8 (2026-11-08, BigDev: "recommended"; decision `-460` `0a88cb40`, committed alone; Row 51 (b) MET; ledger `2026-11-08i`) **HALT before Task 6 - Q2's widening (BigDev's answers, then an author-commit amending `-458` AD10, AD11 if a column, AC9).** Decide:
    (i) what "work history with organization" shows the officer at the other end - the dates and districts only, or also each suspension's
    reason and the acting officers' names (the worker's own log holds both); (ii) the closed list behind "etc."; (iii) where it is read and
    audited (the request detail read, one audit line per view, is the default); (iv) the count of members onboarded before Story 13.8 can
    compute it - shown as "not counted yet", or go-live waits for it (a new Row 51 leg). Then dated lines at Row 51 (b) naming the row(s).

- [x] **Task 1 - Keys (AC: 8; I10)** (`2ae726f0`) - in the SAME commit as Task 2.4 (the move-key list).
  - [x] 1.1 `permissions.ts` (four keys, v62, changelog comment); `roles.ts` (constants beside 13.1c's; bundles per AD5; update the :347 comment).
  - [x] 1.2 `tests/rbac/{permissions,roles}.test.ts`, `tests/field-worker/{events,state}.test.ts` catalog fixtures.

- [x] **Task 2 - The domain (AC: 1-7; I1-I5)** (`e20fe202`; 2.4's key half with Task 1, `2ae726f0`)
  - [x] 2.1 Migration `0205` + drizzle schema files + `schema/index.ts` + RLS policy file + regression spec (`packages/domain/tests/integration/rls/`)
    (AD11). Run on a FRESH container; never regenerate an applied migration ([[project_live_db_test_gotchas]]).
  - [x] 2.2 `move-request-events.ts`, `move-request-state.ts`, `move-request-project.ts` (AD2, AD3); registry entries + the sibling coverage test.
  - [x] 2.3 `move-request-commands.ts`: open, accept, refuse, withdraw, close, escalate, supersede - each takes the caller's client, worker lock first
    (I5), the request lock second; `notices.ts`: recipients + insert (AD9). Export through the barrel.
  - [x] 2.4 `commands.ts`: append the key; export `lockFieldWorkerRow` (it exists, private, :125); call supersede + notices from `postFieldWorker`
    (key `field_worker.move` ONLY -> supersede + the direct-move notice; the answer key -> neither, AD4) and `terminateFieldWorker` (supersede +
    `move_request_superseded`), AFTER `runLockedTransition` returns, on the same client - `activateFieldWorker`'s code-SMS shape (:375); ⛔ editing
    `runLockedTransition` (a failure there rolls back the caller's transaction whole). `posted`'s `permission_key` pinned (R2-D1). Update the
    guard-order header and the registry's `posted` description (drop "unverified until built").
  - [x] 2.5 `read.ts` (or `move-request-read.ts`): list (keyset, `clampLimit`), detail with events, notices page; (`-460`) the worker's
    work-history read from their own stream (types, versions, dates, districts only - ⛔ select a reason or an actor), bounded, `truncated` flag.
  - [x] 2.6 Tests: unit (events, state table incl. `system` only on `escalated`); live (`tests/integration/field-worker/move-requests.spec.ts`: each
    act, the partial unique race, lock-order legs both ways, supersede from move and terminate, a rolled-back move, notices' recipients incl. "no
    recipient => no row" and "the actor excluded"). RED proof for each guard (mutate, see the assertion fail, restore).

- [x] **Task 3 - Contracts (AC: 7, 10)** (`cbb52a48`) - DTOs (`FieldWorkerMoveRequest`, `...Page`, `...Detail`, `Open...Request`, `Refuse...Request`,
  `FieldWorkerNotice`, `...Page`, `MarkFieldWorkerNoticesSeenRequest`, the detail's `worker` block (`-460`: `members_onboarded` nullable), the two list queries with `FieldWorkerLogQuery`'s clamp), the refusal and
  notice-kind tuples re-declared with sync tests; `emit-openapi.ts`
  entries; regenerate `openapi/v1.yaml`; grep the contracts tests for broken fixtures ([[project_contracts_tests_outside_tsc]]).

- [x] **Task 4 - The API (AC: 1-7; I6-I8)** (`701f3cc4`) - `move-request-handlers.ts`, `notice-handlers.ts`; loaders in `gate.ts` (the grant-aware open loader,
  G8; `loadMoveRequestGate`); registrations in `routes.ts` (before `/:fieldWorkerId`); the new codes in `errors.ts` + `field-worker-errors.test.ts`;
  `index.ts` header. Harness helpers (`openMoveRequest`, `accept`, `refuse`, `withdraw`, `close`, `notices`) and `cleanup` (the two tables before
  `field_workers`). Specs: `move-requests.spec.ts` (AC1-AC4, AC7 incl. 13.1a C2's legs), `move-request-race.spec.ts` (AC1 (d), AC2 (e)),
  `move-request-supersede.spec.ts` (AC6 through 13.1c's routes). Pre-read refusals: count `audit_log` rows for the locator, with a control. Route
  review (13.2 C7): no door import, no re-export, no `requestContextStorage.run`, no `pariwarId =`. (`-460`) The detail handler writes
  `field_worker.move_request_worker_viewed` before decrypting the name through `field-worker-crypto.ts`; an audit failure returns no name.

- [x] **Task 5 - The job (AC: 5)** (`070e63f7`) - `field-worker-move-request-escalation.ts` + `register...Cron` + `boot.ts` (own pool); `apps/jobs/tests/` unit (tick
  outcomes, the Row 26 guard) and a live test (AC5 (a)). Mind the jobs pool ([[project_jobs_pool_two_connection_starvation]]).

- [x] **Task 6 - The screens (AC: 9)** (`1dd9d64c`) - client + hooks (new mutations `networkMode: 'always'`; approve / register too - CR34); `MoveRequestsPage`,
  `MoveRequestActions`, `NoticeList`, (`-460`) the request's detail panel (work history; members onboarded "Not counted yet"), `FieldWorkerNav` (`'requests'` + count), the route in `router.tsx` + `routeTree`, "Ask to move" in
  `WorkerActions`; copy in `i18n-en.ts` (`fw.requests.*`, `fw.notices.*`, the refusal labels); `derive.ts` `BY_CODE` rows. RTL tests
  `apps/admin/tests/field-worker-move-requests.test.tsx`; update `field-worker-actions.test.tsx`, `field-worker-derive.test.ts` (walks the keys).
  Mind [[project_tanstack_onsettled_before_success]], [[project_query_gctime_blinds_removal_tests]].

- **Task 7 - The email - NOT this story's (Q-1 A).** Row `13-1g` builds it (its ADR first) over this story's `field_worker_notices` rows; here, only
  keep those rows channel-neutral (AD9). ⛔ a send table, sender, template or fence entry in this story.

- [x] **Task 8 - Records + gate** (`ci:local` 39/39 at `8ef28475`, fresh container :5451, 2026-11-09) - Dev Agent Record and File List; `deferred-work.md`: 13.1 C10 / D7, 13.1a C2, 13.1b C6, 13.1c C1 and R2-D1, 13.1c
  CR34 (patch review, `networkMode`; ⛔ 13.1a's CR34) closed with commit ids; CR33's re-trigger fired; `epics.md` BUILT note; ledger. A record states only what has run
  ([[feedback_record_unattested_no_backfill]]). `ci:local` on a FRESH container through the push ([[project_known_livedb_test_failures]]).

- [x] **Task 9 - Browser pass (AC: 9)** (2026-11-09, the Mac's Chrome; findings below — two fixed `28385fbb`, two put to BigDev) - in the dev Mac's Chrome, two District Admins and a Pariwar Admin: open from the source and from the
  destination, accept one, refuse one with a reason, withdraw one, close an escalated one (seeded age), a Pariwar Admin's direct move with an open
  request, the notices and the count. Record what ran and what did not.

## Dev Notes

### Current state (what exists, what this story changes, what it must preserve)

- `packages/domain/src/field-worker/commands.ts` - the move-key list grows; `lockFieldWorkerRow` is exported; `postFieldWorker` (direct-move key
  only) / `terminateFieldWorker` gain the supersede + notice side effects after `runLockedTransition` returns (Task 2.4). Preserve the guard order, `runLockedTransition`'s savepoint, `activateFieldWorker`'s code-SMS enqueue, and the
  human-only `field_worker.*` actors.
- `apps/api/src/modules/field-worker/` - new handler files; `routes.ts`, `gate.ts`, `errors.ts` grow. `lifecycle-handlers.ts` is NOT edited (its
  commands carry the side effects); `write-support.ts`, `attribution-code-access.ts` and `field-worker-crypto.ts`'s export shape are NOT edited.
- `apps/admin/src/modules/field-workers/` - a new page and two components; `WorkerActions` gains one act; `FieldWorkerNav` one link. Preserve 13.1c's
  withdrawn-acts behaviour after a 409 (`-456` / `-457`), the held fields while saving, and `children` being called only once the identity loaded.

### Traps (TR)

- **TR1** - Lock order (I5): an acceptance that locks the request first deadlocks with a direct move. Prove both orders live.
- **TR2** - Pre-read refusals BEFORE the audit wrapper; a refusal only the lock sees happens INSIDE it and writes the `_rolled_back` twin - assert that
  with the reason AND a control ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]).
- **TR3** - One transaction => equal `now()` ([[project_db_clock_ordering_tests_tie]]): `accepted` and `posted` share a time; order by `event_version`
  within a stream; the 7-day age is judged on the DB clock, never the test runner's ([[project_ist_vs_utc_test_date_window]]).
- **TR4** - A bodyless POST needs `'{}'` ([[project_fastify_empty_json_body_400]]).
- **TR5** - `authorize(` only in the two fixture files and tests (G17); widen `actAuthorization`'s key union inside the fixture.
- **TR6** - Domain spec files run in parallel forks against one DB: seed by your own ids; mind FK + TRUNCATE order ([[project_fk_truncate_cascade_deadlock]]).
- **TR7** - A partial-unique 23505 inside a transaction needs a SAVEPOINT to map cleanly ([[project_domain_limit_clamp_and_savepoint_retry]]).
- **TR8** - A cross-tenant SKIP LOCKED selector with `IN (subquery LIMIT)` over-claims: use a MATERIALIZED CTE ([[project_in_subquery_limit_skip_locked_overclaim]]).
- **TR9** - Recipients by EXACT district grant: a District Admin holding a pariwar-dimension grant is not found by AD9's query (G13) - say so in a test.
- **TR10** - `field-worker-crypto.ts` keeps ONE mockable export shape (13.1a TR10).
- **TR11** - `**cl.3**`-style emphasis in a JSDoc closes it ([[project_markdown_emphasis_closes_jsdoc]]).
- **TR12** - A type-only import cycle between `commands.ts` and the new request modules is a runtime init cycle ([[project_type_only_import_cycle_trap]]).

### Carried to sibling stories (C) - WRITTEN to `deferred-work.md` ("Deferred from: story 13-1d-... (create-story, 2026-11-08)"). Build NONE.

- **C1 -> 13.1g (Q-1 A): the email.** A new ADR amending ADR-0040 / ADR-0043 (a district-admin recipient read by exact
  district grant; the Q2 address read for a third caller); a send table keyed on `notice_id` (6.25's shape: once per notice, held / parked sweep,
  `aging_since`); the jobs sender on the existing port; one template per kind naming NO ONE, with a link; the four fence allowlists. Trigger: 13.1g
  create-story.
- **C2 -> 13.3 (the worker's app).** Whether a worker sees their own pending request and its answer depends on Q-3 item 3; a worker login is 13.3's.
- **C3 -> 13-1f.** An undo of a mistaken ending does not reopen a request it superseded (the supersede is final); 13-1f says so or decides otherwise.
- **C4 -> 13.8 (`-459` Q2 A, widened).** The number of members a worker has onboarded is shown to the officer at the other end of a move
  request. It cannot be computed until 13.8 resolves a member's captured code to a worker (`member_attribution` has no worker column;
  `resolveAttributionForRequest` has no caller). 13.8 supplies the count read (by worker, inside one Pariwar, a number - never a member's name).

### Testing standards

- Unit: `packages/domain/tests/**/*.test.ts`, `apps/api/tests/unit/`, `packages/contracts/tests/`, `packages/events/tests/`, `apps/admin/tests/`,
  `apps/jobs/tests/`. Live-DB: `packages/domain/tests/integration/**/*.spec.ts`, `apps/api/tests/integration/`, self-skipping on `!hasDatabase`;
  `SET LOCAL ROLE twt_app` before policy assertions.
- Twins: 13.1c's `lifecycle.spec.ts`, `move-race.spec.ts`, `terminate-race.spec.ts`; 13.1b's jobs live test; the helpdesk projector specs.
- Every guard gets a RED proof; every scan a non-vacuity floor ([[feedback_gate_scope_semantic_coverage]]). No browser E2E harness exists for the
  admin: AC9 is RTL plus Task 9. State plainly what ran.

### Project Structure Notes

- New: `packages/domain/migrations/0205_field-worker-move-requests.sql`; `packages/domain/src/schema/{field_worker_move_requests,field_worker_notices}.ts`;
  a policy file; `packages/domain/src/field-worker/{move-request-events,move-request-state,move-request-project,move-request-commands,move-request-read,notices}.ts`;
  `scripts/field-worker-move-request-invariant/`; `apps/api/src/modules/field-worker/{move-request-handlers,notice-handlers}.ts`;
  `apps/jobs/src/scheduler/field-worker-move-request-escalation.ts`; `apps/admin/src/modules/field-workers/{MoveRequestsPage,MoveRequestActions,NoticeList}.tsx`
  and a route wrapper; tests per Tasks 2-6; decision `-458`; Row 51; (Q-1 A) row `13-1g`; (Q-3 A) the Panel note.
- Modified: `field-worker/{commands,events,index}.ts`; `rbac/{permissions,roles}.ts`; `packages/events/src/registry.ts`;
  `packages/contracts/{src/field-workers/*,scripts/emit-openapi.ts}`; `openapi/v1.yaml`; `apps/api/src/modules/field-worker/{routes,gate,errors,index}.ts`;
  `apps/jobs/src/boot.ts`; `apps/admin/src/{api/client.ts,api/hooks.ts,router.tsx}`; `apps/admin/src/modules/field-workers/{WorkerActions,FieldWorkerNav,derive,i18n-en}.ts(x)`.
- Variances from the epic, with reason: the request is marked `superseded` by the move that made it stale, not at acceptance (AD4); the email is
  its own row (Q-1 A); a refused request reaches the Pariwar Admin by a notice (Q-2 A); an escalated request can no longer be answered by the counterpart
  (AD3); the refusal list as suggested (AD7).
- Detected conflicts with a ratified text: none. Q-1 A keeps "by email and in the admin console" as a go-live leg (Row 51 (c)).

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 13; Story 13.1d (incl. INHERITED D7, 13.1a C2, 13.1b C6); 13.1c.
- `_bmad-output/implementation-artifacts/13-1c-...md` (AD4, AD5, AD6, AD8, C1); `13-1a-...md` (C2, C5, TR6, TR10); `13-1b-...md` (C6); `13-1-...md` (QE17, D7, C10).
- `_bmad-output/implementation-artifacts/deferred-work.md` - 13.1c C1, R2-D1, CR34 (patch review, `networkMode`); 13.1a C2, CR33; 13.1b C6; 13.1 C10, D7.
- `.decision-log.md` - `2026-11-03-441`, `-442` (QE17), `-443` (Q1 A); `2026-11-07-453`, `-454` (Q7 A); `2026-06-21-059` B(3); `-262` FQ3 A; `-358`.
- `docs/adr/ADR-0040-staff-email-transport.md`; ADR-0043; `docs/launch-gate-inventory/inventory-roster.md` Rows 48, 50;
  `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-03-story-13-1-moving-workers-and-fill-in.md` (Question 1 as put);
  `trustee-panel-routing-note-TEMPLATE.md`.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story`, on the story worktree.

### Debug Log References

- The story's own Postgres container `twt-131d-pg` (:5451, `twt_dev`), migrated fresh twice (once at the start, once before `ci:local`).
- RED proofs (each mutation made, the named test seen failing, the code restored): the role bundles (`roles.test.ts`); `posted`'s pinned key
  (`events.test.ts`); both 0205 guard triggers disabled on the story DB (exactly the six guard tests failed); the acceptance's move also
  superseding, and the actor not excluded from notices, and the one-notice-per-recipient rule (`move-requests.spec.ts`, domain); a planted
  raw write outside the projector (the write gate); the approval without `networkMode: 'always'` (stalls); the detail decrypting before its
  audit line (`move-request-reads-audit.spec.ts`).
- EXPLAIN (COSTS OFF) on 1,500 seeded requests of one Pariwar (+ 20 of a rare district), ANALYZEd, as `twt_app` under RLS, 2026-11-09: a
  common district's page and the Pariwar-wide page walk `field_worker_move_requests_pariwar_idx` in page order with NO Sort (the district a
  filter); a rare district's page uses a BitmapOr of `_from_idx` and `_to_idx` and sorts its few rows; the sweep's selector uses
  `_pending_idx`. The seeded rows were deleted afterwards. A one-off measurement, ⛔ a pinned spec.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created (create-story, 2026-11-08).
- **Task 1** (`2ae726f0`): four keys, catalog 61 -> 62, 86 -> 90; `FIELD_WORKER_MOVE_PERMISSION_KEYS` gains the answer key and MOVED to
  `events.ts` (re-exported by `commands.ts`) so `posted`'s schema pins its snapshot key without an import cycle (TR12; 13.1c R2-D1).
- **Task 2** (`e20fe202`): migration 0205 (both tables, CHECK pairs, guard triggers, one-open partial unique); the request's own stream
  (seven events, each pinning its act's key; `system` only on `escalated`); projector; commands (open, accept, refuse, withdraw, close,
  escalate — worker lock first, I5); the supersede after a direct move / an ending in its own module (TR12); notices (exact district grant,
  active users, actor excluded, one per recipient per act); reads incl. `-460`'s work history (selects no reason, no actor).
- **Task 3** (`cbb52a48`): contracts + sync guard + nine OpenAPI paths (deterministic).
- **Task 4** (`701f3cc4`): the API — grant-aware open target, per-request gate loaders (missing / foreign = 403 for all), pre-read refusals
  with no audit line, one audit line per act (the acceptance's covers the move), audit-first reads, notices on `[session, scope]`.
- **Task 5** (`070e63f7`): the hourly sweep on its own pool with the Row 26 guard; a row no longer due writes the twin and is skipped.
- **Task 6** (`1dd9d64c`): the page, detail panel, notices, nav count, "Ask to move"; `networkMode: 'always'` on the approval (13.1c CR34).
- **Task 7**: not this story's (row `13-1g`); the notice rows are channel-neutral.
- **Variances from the story text, each with its reason:**
  (1) The request list's page cap is **25** (default 20), ⛔ AD6's 100: AD10 requires ONE audit line a page NAMING the page's workers, and the
  audit locator holds 1,024 characters — 25 UUIDs fit (the 13.1a list's cap, for the same reason). The notices (no names) keep 100. Not in
  `-458`'s text (it names no number).
  (2) The list indexes are `(pariwar_id, from_district, …)`, `(pariwar_id, to_district, …)` and `(pariwar_id, opened_at, …)`, ⛔ AD11's
  counterpart / source pair: a district's list is EITHER end (from OR to), and the Pariwar Admin's page has no district. EXPLAIN above.
  (3) "Ask to move" is its own component (`AskToMove.tsx`) mounted beside `WorkerActions` in the Find panel, ⛔ a fifth act inside
  `WorkerActions`: 13.1c's acts (their stale handling, held fields and focus rules) stay untouched. It is withdrawn with the acts when the
  panel's copy is stale.
  (4) "the registration mutation" (13.1c CR34): there is none — the register page calls the client directly (13.1a review R5).
- **Quick validation (BigDev, 2026-11-09: "run quick story validation once done and apply any findings")** — every AC re-read against the
  build; findings, all APPLIED: (V1) AC7's "an audit failure returns no name" had no test — `move-request-reads-audit.spec.ts` (the real
  wrapper on a pool that cannot connect; RED-proved); (V2) AD11's EXPLAIN check had not run — run and recorded above; (V3) AC1 (c)'s "NO
  event" was asserted only as "no audit line" over HTTP — added; (V4) AC7 (b)'s "no code in any body" was not asserted on the detail — added;
  (V5) the variances above were unrecorded — recorded; (V6) the STATUS line repeated itself — fixed.
- 13.1a CR33's re-trigger FIRED again (five keyed writes), not fixed — `deferred-work.md`.
- **Task 8 — the gate.** `ci:local` run 1 (at `1dd9d64c`, a fresh container): 37/39 — `microcopy` (a real finding: my intro used the bare word
  "report", the member register's; and "Not counted yet", decision `-460`'s own wording, tripped the out-of-band-blame "not counted" arm)
  and `test (unit)` (`apps/admin/tests/helpline-claim-page.test.tsx`, one 5 s timeout under load — unrelated to this story; 28/28 alone).
  Fixed `8ef28475`: the intro says "change district"; "Not counted yet" allow-listed for the field-workers copy file and that exact phrase
  (13.1c's "Registered by mistake" precedent — ⛔ the ruled wording reworded). Run 2 (at `8ef28475`, the container recreated fresh): **39/39**.
- **Task 9 — the browser pass (2026-11-09)**, in the Mac's Chrome (`list_connected_browsers`: one macOS browser; a 127.0.0.1 probe loaded first)
  against a throwaway stack: an uncommitted env-guarded launcher spec (its own container :5452; a Pariwar Admin, District Admins of Patna and
  Gaya (two), five approved workers, one suspended and reactivated; four requests opened through the real routes), the API on 127.0.0.1:3000,
  the admin Vite on :3001, a cookie helper (sessions minted through the real passkey routes). RAN, as the officers: the District Admin's "All
  districts" → "choose a district you manage"; Gaya chosen → "Waiting for your answer" (two, from Patna) and "Your requests" (one); View →
  the work history (Status, Registered, Active since, Patna since …, one suspension's dates, "Members brought in: Not counted yet", the
  request's history — no reason anywhere); Refuse with no reason sent NOTHING (one `refused` line in the audit log), then with "There is no
  work for them here" → "You refused the request for Sunita Devi."; Accept → "Meena Kumari now reports to Gaya."; as Ravi (Patna) the
  notices "Your request was accepted: Patna to Gaya. Tell the worker." and the refusal with its reason's LABEL; "Ask to move" on Find (the
  current district excluded) → "Request sent. Ramesh Kumar stays in Patna until it is answered."; a second ask → "This worker already has a
  move request waiting…"; as the Pariwar Admin "All districts" → "Gone to the Pariwar Admin" (Kiran, escalated at open: nobody holds
  Nalanda) → Close → "You closed the request for Kiran Yadav."; a direct Move of Ramesh to Nalanda with his request open → superseded
  (`worker_moved`); as Sita, Withdraw → "You withdrew the request for Arjun Singh.". Swept afterwards: no worker name or mobile in the API
  log, the audit lines or the request events. Everything torn down (container, servers, launcher file). NOT RUN: the 7-day sweep (live job
  test only), a direct move with NO open request in the browser (API spec only).
  FINDINGS: (B1) FIXED `28385fbb` — the notices' "New" marks vanished before they could be read (the seen mark's refresh returned them
  seen); now a notice unseen when the visit showed it keeps "New" for the visit — re-checked in the browser. (B3) FIXED `28385fbb` — an act
  refreshed every request query, so an OPEN detail panel was re-read: its worker's name decrypted again and a `move_request_worker_viewed`
  line written nobody asked for (three lines for one View); now only the lists refresh. (B2) OPEN — BigDev's: a Pariwar Admin's direct move
  to a THIRD district (Ramesh: request Patna→Gaya, moved Patna→Nalanda) supersedes the request and tells Patna and Nalanda, but GAYA's
  District Admins — told the request was opened — are told nothing; it vanishes from their list. AD9 assumed the move's two districts always
  include the request's; changing who is told amends `-458` AD9. (B4) OPEN — BigDev's / the Panel's: a DESTINATION District Admin cannot
  open a request from the screens — "Ask to move" is on Find a worker, which shows only the officer's own district's workers (Sita on
  Patna: "You do not have access to this district's workers"). The API supports it (pinned in the specs); a screen would have to let an
  officer identify a worker outside their district, a disclosure `-459` Q2 ruled only for workers already on a request.

### File List

- `.github/workflows/ci.yml`
- `apps/admin/src/api/client.ts`
- `apps/admin/src/api/hooks.ts`
- `apps/admin/src/modules/field-workers/AskToMove.tsx`
- `apps/admin/src/modules/field-workers/FieldWorkerNav.tsx`
- `apps/admin/src/modules/field-workers/FindWorkerPage.tsx`
- `apps/admin/src/modules/field-workers/MoveRequestActions.tsx`
- `apps/admin/src/modules/field-workers/MoveRequestDetail.tsx`
- `apps/admin/src/modules/field-workers/MoveRequestsPage.tsx`
- `apps/admin/src/modules/field-workers/NoticeList.tsx`
- `apps/admin/src/modules/field-workers/derive.ts`
- `apps/admin/src/modules/field-workers/i18n-en.ts`
- `apps/admin/src/modules/field-workers/index.ts`
- `apps/admin/src/router.tsx`
- `apps/admin/src/routes/FieldWorkerMoveRequestsRoute.tsx`
- `apps/admin/tests/field-worker-derive.test.ts`
- `apps/admin/tests/field-worker-move-requests.test.tsx`
- `apps/api/src/modules/field-worker/errors.ts`
- `apps/api/src/modules/field-worker/gate.ts`
- `apps/api/src/modules/field-worker/index.ts`
- `apps/api/src/modules/field-worker/move-request-handlers.ts`
- `apps/api/src/modules/field-worker/notice-handlers.ts`
- `apps/api/src/modules/field-worker/routes.ts`
- `apps/api/src/types.ts`
- `apps/api/tests/integration/_field-worker-fixture.ts`
- `apps/api/tests/integration/field-worker/_registration-harness.ts`
- `apps/api/tests/integration/field-worker/move-request-race.spec.ts`
- `apps/api/tests/integration/field-worker/move-request-reads-audit.spec.ts`
- `apps/api/tests/integration/field-worker/move-requests.spec.ts`
- `apps/api/tests/unit/field-worker-errors.test.ts`
- `apps/jobs/src/boot.ts`
- `apps/jobs/src/scheduler/field-worker-move-request-escalation.ts`
- `apps/jobs/tests/field-worker-move-request-escalation-live.test.ts`
- `apps/jobs/tests/field-worker-move-request-escalation.test.ts`
- `openapi/v1.yaml`
- `package.json`
- `packages/contracts/scripts/emit-openapi.ts`
- `packages/contracts/src/field-workers/dto.ts`
- `packages/contracts/src/field-workers/enums.ts`
- `packages/contracts/src/field-workers/index.ts`
- `packages/contracts/tests/field-workers.test.ts`
- `packages/domain/migrations/0205_field-worker-move-requests.sql`
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/field-worker/commands.ts`
- `packages/domain/src/field-worker/errors.ts`
- `packages/domain/src/field-worker/events.ts`
- `packages/domain/src/field-worker/index.ts`
- `packages/domain/src/field-worker/move-request-commands.ts`
- `packages/domain/src/field-worker/move-request-events.ts`
- `packages/domain/src/field-worker/move-request-lock.ts`
- `packages/domain/src/field-worker/move-request-project.ts`
- `packages/domain/src/field-worker/move-request-read.ts`
- `packages/domain/src/field-worker/move-request-state.ts`
- `packages/domain/src/field-worker/move-request-supersede.ts`
- `packages/domain/src/field-worker/notices.ts`
- `packages/domain/src/ids/index.ts`
- `packages/domain/src/policies/field-worker-move-requests-rls.ts`
- `packages/domain/src/policies/field-worker-notices-rls.ts`
- `packages/domain/src/policies/index.ts`
- `packages/domain/src/rbac/permissions.ts`
- `packages/domain/src/rbac/roles.ts`
- `packages/domain/src/schema/field_worker_move_requests.ts`
- `packages/domain/src/schema/field_worker_notices.ts`
- `packages/domain/src/schema/index.ts`
- `packages/domain/tests/field-worker/commands-guards.test.ts`
- `packages/domain/tests/field-worker/events.test.ts`
- `packages/domain/tests/field-worker/move-request.test.ts`
- `packages/domain/tests/field-worker/state.test.ts`
- `packages/domain/tests/integration/field-worker/_fixtures.ts`
- `packages/domain/tests/integration/field-worker/move-requests.spec.ts`
- `packages/domain/tests/integration/rls/field-worker-move-requests-policy-regression.spec.ts`
- `packages/domain/tests/rbac/permissions.test.ts`
- `packages/domain/tests/rbac/roles.test.ts`
- `packages/events/src/registry.ts`
- `packages/events/tests/field-worker-move-request-registry-coverage.test.ts`
- `packages/queue/src/index.ts`
- `scripts/ci-local.sh`
- `scripts/field-worker-move-request-invariant/README.md`
- `scripts/field-worker-move-request-invariant/check.ts`
- `scripts/field-worker-move-request-invariant/lib.test.ts`
- `scripts/field-worker-move-request-invariant/lib.ts`
- `_bmad-output/implementation-artifacts/13-1d-field-worker-move-requests-and-notices.md`, `deferred-work.md`, `sprint-status.yaml`; `_bmad-output/planning-artifacts/epics.md`

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-11-08 | 1.0 | Created by `bmad-create-story 13.1d` on the story worktree at `43deb5d2`; Q-1..Q-3 open with BigDev; no code before Task 0.3. |
| 2026-11-08 | 1.1 | Validated (`bmad-create-story validate 13.1d`; numbers re-checked live, unchanged), BigDev: "all": the acceptance moves the worker FIRST and records `posted_event_id` (event ids are DB-minted); only a direct move supersedes inside `postFieldWorker`; side effects after `runLockedTransition`, ⛔ inside its savepoint; `escalation_cause` CHECK admits withdraw / supersede after escalation; notices filtered by recipient in SQL (no actor setting); a direct move writes one notice per recipient; `pending_kyc` named; the list GETs' clamp, `limit` max and `rateLimit` named; the 201-`escalated` line; the notices routes on `[session, scope]`; the unseen count on `FieldWorkerNav`; 13.1c's CR34 told apart from 13.1a's. Q-1..Q-3 still open. |
| 2026-11-08 | 1.2 | Q-1..Q-3 ANSWERED by BigDev, verbatim "Q1-Q3 A": the email is row `13-1g`'s (Task 7 not here); the Pariwar Admins are told of every refusal; ONE non-blocking Panel note with the three questions (Task 0.6). Propagated through AD1, AD9, AD12, AC3, Tasks 0.2-0.6 and 7, C1 and the variances; Task 0.2 done. |
| 2026-11-08 | 1.3 | Task 0 done on BigDev's "go ahead": records `5dea5d89`; preflight clean; decision `-458` committed alone `d20eb1d5`; roster Row 51 + Row 48 (i) line + row `13-1g` and its `epics.md` stub `0b663d46`; `epics.md` 13.1d annotation (the supersession pointer); the Panel note written (E4 all pass), NOT sent. |
| 2026-11-08 | 1.4 | The Panel note SENT and RULED (DR + KB, relayed by BigDev): Q1 A, Q2 A WIDENED (the name and "other details like work history with organization, number of member onboarded, etc.", never the phone number), Q3 A. Decision `-459` `0ba691f0`; section 0 edges 2-4 marked; AD10 carries the widening; Task 0.7 [x]; Task 0.8 (the widening's author-commit) owed before Task 6; C4 -> 13.8 (the count). |
| 2026-11-08 | 1.5 | Task 0.8 done on BigDev's "recommended": decision `-460` `0a88cb40` amends `-458` AD10 - one request's DETAIL shows the name and a work history (registered on, active since, current state, districts with dates, suspensions' dates; no reason, no officer's name), members onboarded "Not counted yet" until 13.8; "etc." adds nothing; one audit line per detail view; the list keeps the name only; go-live does not wait for the count. AD10, I6, AC7, AC9, Tasks 2.5, 3, 4, 6 updated; Row 51 (b) MET. |
| 2026-11-09 | 1.6 | `bmad-dev-story`: Tasks 1-6 built and committed (`2ae726f0` keys; `e20fe202` domain; `cbb52a48` contracts; `701f3cc4` API; `070e63f7` sweep; `1dd9d64c` screens); the request list capped at 25 (one audit line names a page's workers); the either-end indexes; `AskToMove` beside `WorkerActions`. Quick validation (BigDev's ask): six findings, all applied (an audit-first spec, the EXPLAIN check, two absence assertions, the variances recorded, the STATUS line). Task 8's `ci:local` and Task 9's browser pass remain. |
| 2026-11-09 | 1.7 | Task 9 browser pass (B1, B3 fixed `28385fbb`; B2, B4 put to BigDev); Task 8: `ci:local` 37/39 then, after the microcopy fix `8ef28475`, 39/39 on a fresh container; `deferred-work.md` closures; `epics.md` BUILT note; status -> review. |
