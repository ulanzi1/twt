---
baseline_commit: bb4d8620
---

<!--
PINNED: `bb4d8620` = `origin/main` (ledger 2026-11-07c - Story 13.1b LANDED, PR #325, `d555f75d..546c57d1`). The story lives on branch
`story/13-1c-field-worker-moves-suspension-and-termination` in its OWN worktree (`.claude/worktrees/13-1c-field-worker-moves-suspension-and-termination`),
created from `origin/main` on 2026-11-07. Every `apps/` / `packages/` claim was traced at the pin on 2026-11-07 by the create-story pass (three read-only
research passes - the domain commands and stream; the API routes, RBAC and admin module; the governance trail - then the author's own reads of `state.ts`,
the attribution door and the 13.1a / 13.1b stories). Perishable - re-check at Task 0.1. Re-locate by FUNCTION, not by line.

STATUS: ready-for-dev (v1.9, 2026-11-07; validated twice; Tasks 0.0, 0.2-0.6 done; Q-1..Q-5 ANSWERED by BigDev: "Q1 C, Q2-Q5 A"). The Panel note (Task 0.6) is
RULED (`-454`, DR + KB: Q1 A, Q2 B, Q3 A, Q4 A, Q5 A, Q6 C, Q7 A); split by `-455` ("yes, apply the split"): `died` HERE (two migrations),
row `13-1f` for the undo / appeal / link / shown number, the warning to 13.8, the held credit to 13.8 / 13.5. Committed on the story branch: records
`01cbba52`; decision `-453` `490510d9`; Row 50 and row `13-1e` `0b329bb4`; Task 0.5's annotations with v1.5; `-454` `98cebb74`; `-455` `608f9faf`; v1.8's
records `2852318f`. No code yet. Next: Task 0.1, then code.

NUMBERS (re-grep each at Task 0.1; every one is contended by siblings):
- Next free decision: `2026-11-07-456` (the newest on any ref is `-455`, this story's). "The number belongs to the first COMMIT" (`-449`).
- RBAC: `PERMISSION_CATALOG_VERSION = 60`, 81 keys (`packages/domain/src/rbac/permissions.ts`). This story: ONE bump, 60 -> 61; keys 81 -> 86 (five keys, AD5; Q-1 C keeps `field_worker.terminate`).
- Migration: TWO, for the reason `died` only (`-455`, amending AD11): `0203` (ADD VALUE, alone) and `0204` (the reason-subset CHECK). The keys stay TypeScript-only (13.1a's mint `54ed242a` touched no permission table); payloads are JSON. `0203` / `0204` were free on every branch on 2026-11-07 (the journal's last entry: idx 202, `0202_field-worker-code-sms-sends`) - read the journal's last idx and `when` live ([[project_sibling_migration_when_order_shared_db]]).
- Ledger: the newest letter on any ref is `2026-11-07l` (read it live: letters collide across branches). The comment block at the top of `sprint-status.yaml` is the live ledger.
- Roster: Row 50 `field-worker-lifecycle-live` is this story's (appended at Task 0.4, `0b329bb4`; leg (f) added by `-455`); Row 46 is RESERVED by 6.39 / 14.3.
- Panel notes: the 13.1a keys confirm (`trustee-panel-routing-note-2026-11-04-story-13-1a-field-worker-keys-confirm.md`) is SENT (reported 2026-11-05), NOT ruled; the 13.1b confirm is WRITTEN, NOT sent; this story's note is RULED (`-454`).
-->

# Story 13.1c: A Pariwar Admin Moves a Field Worker Directly; a Field Worker Is Suspended, Reactivated or Terminated - and Everything That Has Happened to Their Record Can Be Read `[SURFACE]`

Status: review

## WHAT THIS STORY IS, IN ONE PARAGRAPH

Story 13.1 built a field worker's seven-event lifecycle as domain COMMANDS; 13.1a gave registration's sibling acts (approval, the by-hand code read, the
list and identity reads) their routes and screens; 13.1b texts the code. Four commands still have **no route**: `postFieldWorker` (a change of the
REPORTING district), `suspendFieldWorker`, `reactivateFieldWorker` and `terminateFieldWorker`, so FR-85's "field worker can be deactivated" is unreachable in
production, and the Panel's "Keep the full log of field worker" (`-441`) has no READ. This story builds those routes, their five per-act permission
keys, the authorization snapshot on the three events that lack it (13.1 QE18, as 13.1a AD3 did for approval), an expected-source guard on a move
(13.1's D7), a paged read of a worker's whole event stream, and the admin screens for all of it. **Termination is the open edge:** the epic says the
terminate route waits on Story 13.6's decision on reversibility and appeal (13.1 C4), and 13.1's C5 says "Build NO terminate route before 13.6 records C4".
**BigDev chose (Q-1 C) to build the full terminate route now** - every neutral reason, from every state but `terminated` - superseding both lines by
`-453` (Task 0.3). C4 was put to the Panel from this story's note (Q-2 A) and RULED (`-454`): a mistaken ending is undone by the Pariwar Admin, a disputed
one may be appealed, a returning worker is a new registration linked to the old, and a death is its own reason. `-455` puts `died` HERE (two migrations)
and the rest in row `13-1f`; the route is built and merged but is not used on a real worker before 13-1f's undo and appeal record are built (Row 50 (f)).
Not here: the District-Admin-to-District-Admin move REQUEST and EVERY notice (13.1d), the 8-year removal (Q-4 A: row `13-1e`, nothing is built), the
undo / appeal / link / shown number (row `13-1f`), the silence warning and the held credit (13.8 / 13.5), the labelling reasons (13.6).

## Story

As a **Pariwar Admin** - and, for suspending, reactivating and ending a worker, **the District Admin who manages them** -
I want **to move a field worker directly when the Trust needs it, suspend or reactivate them, record that they have left, and read everything that has
happened to their record**,
so that **a worker keeps one identity and one code across districts and nothing about them is lost.**

## Policy meaning (AI-10-1)

**This story introduces NO new predicate on a member's access to a benefit, and changes none.** No member state, `account-frozen` source,
`member_attribution` row or payout field is touched (I9). *In the member's terms* 13.1's sentence stands: **"Who introduced you never changes what you are
covered for - if your introducer is no longer active, you are a member in full; only the credit to them is not recorded."**

**It does make an EXISTING benefit predicate REACHABLE for the first time - a predicate on a FIELD WORKER's benefit (their credit), whose meaning
the Panel has now RULED (`-454` Q6 C).** 13.1's `acceptsNewAttributions(state)` is `state === 'active'` (`-441` Q2 A, put about a worker NOT YET approved).
Today no state but `pending_kyc` and `active` can be reached; this story's suspend and terminate routes make `suspended` and `terminated` reachable.
The Panel's own sentence (`-454`, its Policy meaning), *in the field worker's terms:* **"If you are suspended while something is looked into, teachers
who join with your code are kept for you, and credited to you if you are cleared. If you are suspended because you asked for a break, teachers who
join meanwhile are not credited to you. If you are ended by mistake, the Pariwar Admin puts it right and you keep your code; if you think an ending was
unfair, you can appeal - to the Pariwar Admin, or to the Trustee Panel if a Pariwar Admin ended you. If you leave and come back, you are registered
again with a new code, and your old record is linked to the new one."**

**What THIS story builds of that: nothing - and it must not try.** The held credit for `under_review` is the credit recorder's (13.8 / 13.5, C3; `-454`
Consequence 3): `acceptsNewAttributions` stays `active`-only and is NOT edited here (I9) - ⛔ widen it to `suspended` / `under_review`: a signup is
HELD by a recorder that does not exist yet, never credited live. It costs **nothing today**: no code records a signup's credit to a worker -
`resolveAttributionForRequest` (the door) has no caller (grepped at the pin). The undo, the appeal record and the link are row `13-1f`'s; until the
undo and the appeal record are built the terminate route is not used on a real worker (Row 50 (f), `-455`). So IN THIS STORY an ending has no way
back (I5), and its member-facing effect is PRD FR-85's: *"a teacher who joins with an ended worker's code is a member in full but is not credited to
them; a teacher already credited stays credited."* `died` (`-455`) has the same effect as every other ending. What an ending, a suspension or a death
does to money ALREADY EARNED stays unruled (`-443`, `-454`; carried to 13.5) and costs nothing today: no code pays a field worker. Nothing changes for
a MEMBER: a teacher who joins with any worker's code is a member in full in every case.

*Costs, stated so they are not found later:* (a) A District Admin can suspend, reactivate and END a worker in their own district with no second officer -
the Panel CONFIRMED those holders (`-454` Q7 A: "Suspend, reactivate, end and read the history: the District Admin of the worker's current district, and
the Pariwar Admin"); a mistaken ending is put right by the Pariwar Admin (Q1 A, built by `13-1f` before go-live). (b) A
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
| 13.1 section 0 edge 7 | "Terminated is final; re-engaging = a new registration - **Yours, cost recorded**" | author's - now the Panel's for a worker who LEFT (`-454` Q2 B); no longer true for an ending made by mistake (Q1 A, row `13-1f`) |
| Panel `2026-11-07-454` Q1 A, as put | "The Pariwar Admin may undo any ending made by mistake, restoring the worker as they were, with the same code; both the ending and the undo stay in the history. A worker who says an ending was unfair may appeal: the Pariwar Admin hears it - or, if a Pariwar Admin ended them, the Trustee Panel." Cost, accepted: "A way back and an appeal record must be built before go-live." | Trustee-ratified - built by row `13-1f`; its cost line is Row 50 (f) (`-455`) |
| Panel `-454` Q4 A, as put | "If a worker brings in no teacher for a set time (we suggest 90 days), their District Admin is told; the officer tries to reach them, and only then may end them for "stopped working". Until then they stay as they are." Cost, accepted: "until then, it is the officer's judgement alone." | Trustee-ratified - the warning is 13.8's (C5); the "tries to reach them" rule binds THIS route's `inactive` reason now (AD8's End line) |
| Panel `-454` Q5 A, as put | "recorded by the District Admin or the Pariwar Admin on what they have been told (by the family, a colleague or the community), with the date of death." | Trustee-ratified - `died` (AD2, AD11, AC6 (g)) |
| Panel `-454` Q6 C, as put | "under review - held, and credited if cleared; at the worker's own request - not credited." | Trustee-ratified - the recorder's (13.8 / 13.5, C3); nothing here (Policy meaning) |
| Panel `-454` Q7 A, as put | "Move: the Pariwar Admin only. Suspend, reactivate, end and read the history: the District Admin of the worker's current district, and the Pariwar Admin." | Trustee-ratified - AD5's five keys and holders; Row 50 (a) MET |
| `2026-11-07-455` (author-commit, BigDev: "yes, apply the split") | "The terminate route accepts FOUR reasons: `left_voluntarily`, `inactive`, `registered_in_error` and `died`, from `pending_kyc`, `active` or `suspended`. For `died`, `ended_on` carries the date of death, judged by the same IST bounds" | author-commit - amends `-453` AD1 / AD2 / AD11; adds Row 50 (f) |

### 0 - whose decision is this (`trustee-panel-routing-note-TEMPLATE.md` section 0, per edge)

| # | Edge - stripped of citations | Verdict |
|---|---|---|
| 1 | Who may move a worker directly | **The Panel's - RULED** (`-443` Q1 A): a Pariwar Admin, for either reason. Gate MET |
| 2 | Who may suspend, reactivate, end a worker, and read their log | **The Panel's in kind** (`-059` B(3)) - **RULED** (`-454` Q7 A): the District Admin of the worker's current district and the Pariwar Admin, as built. Row 50 (a) MET |
| 3 | Can an ending be undone; can a worker appeal it; is a re-registered ended number shown to the officer | **The Panel's** - **RULED** (`-454` Q1 A, Q2 B, Q3 A; put from this story's note under Q-2 A; 13.6's C4 RECORDED). Built by row `13-1f` (`-455`); its undo and appeal record gate this route's use on a real worker (Row 50 (f)) |
| 4 | Does a suspended worker lose credit for teachers who join meanwhile, for good | **The Panel's** - **RULED** (`-454` Q6 C): by reason - under review held, at the worker's request not credited. Built by the recorder (13.8 / 13.5, C3); nothing here |
| 5 | Whether this story builds a terminate route at all, and which | **BigDev's** - his own scoping text (C5, the epic) - **ANSWERED Q-1 C: the full route, go-live gated** (Row 50 (b), MET by `-455`; now Row 50 (f): `13-1f`'s undo and appeal record built first) |
| 6 | Who owns the 8-year removal | **BigDev's** scheduling - **Q-4 A: a new backlog row `13-1e-field-worker-eight-year-removal`**. Erasure BEFORE 8 years is counsel's (question 3, unsent) |
| 7 | The expected-source guard, the log's shape, the screens, the key names | **Yours** (AD) - no change to what a person sees or is owed |
| 8 | Whether the log shows the code text | **Yours** (AD9): officers already see the text's status on the same panel |

**Result: ONE Panel note (Task 0.6), holding SEVEN questions (second draft, BigDev 2026-11-07: "rewrite question 1 and add silent and death"):
1 an ending made wrongly - undo and appeal; 2 a worker who comes back - same record and code or a fresh start; 3 a returning number shown
(1-3 = Q-2 A's 13.1 C4, split); 4 a worker who goes silent; 5 a worker who dies (4-5 added by BigDev); 6 credit during a suspension (Q-3 A);
7 the key confirm (Q-5 A). The terminate route's go-live waited on 1-5 (Row 50 (b), MET by `-455`) and now waits on Row 50 (f). DRAFTED 2026-11-07: `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-07-story-13-1c-field-worker-lifecycle.md`,
SENT 2026-11-07 (reported by BigDev; channel and time not recorded); RULED the same day, `-454` (DR + KB): Q1 A, Q2 B, Q3 A, Q4 A, Q5 A, Q6 C, Q7 A. It is non-blocking: it gates go-live (Row 50), never the build.**

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
| Admin | `apps/admin/src/modules/field-workers/`: `WorkerActions.tsx`, `WorkerHistory.tsx`; a state selector on `FindWorkerPage.tsx` (Awaiting approval / Active / Suspended / Ended - AD8 wrote "Waiting", `-456` item 3); `WorkerDetail`'s `children` gains a second argument `(name, worker)`; copy in `i18n-en.ts` (`fw.actions.*`, `fw.history.*`, `fw.reason.*`) |
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
  The pgEnum's source is `FIELD_WORKER_REASON_CODES` (`schema/field_workers.ts:69-76`: `under_review, at_worker_request, left_voluntarily, inactive,
  registered_in_error, reassigned`), and `packages/domain/tests/integration/rls/field-workers-policy-regression.spec.ts:67` pins the database labels
  `ORDER BY enumsortorder` EQUAL to that tuple, in order. `ADD VALUE` (no `BEFORE` / `AFTER`) appends - so `died` goes LAST in the tuple, after
  `reassigned`; placed beside `registered_in_error` it fails that live spec. The same spec's `:70-90` lists the CHECK names (drop and re-add under the
  same name keeps it green). `schema-trigger.spec.ts:213-220` exercises `_subset` with wrong-arm reasons.
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
  (`left_voluntarily`, `inactive`, `registered_in_error`, and - `-455`, the Panel's `-454` Q5 A - `died`) for a `pending_kyc`, `active` or `suspended` worker - the domain command's own rules (G4, G6),
  and NO route-level restriction (⛔ `terminate_not_available`: that code was option B's and is not minted). A terminated worker -> 409
  `illegal_transition` on the pre-read (no audit line); one terminated by a concurrent request between the pre-read and the lock makes the command throw
  inside `mutate`, which rolls back and writes the `_rolled_back` twin (TR2) - as for every act. Termination stays FINAL (13.1 section 0 edge 7): this
  story adds no way back. **Supersession, by the decision entry (Task 0.3), never a re-reading:** 13.1 C5's "Build NO terminate route before 13.6 records
  C4" and the epic's "the terminate route does NOT ship before Story 13.6 records its C4" are superseded - and, found while writing `-453`, `-442`'s
  "terminate waits on Story 13.6's C4" and Story 13.6's INHERITED C4 lines ("13.1c's terminate route does not ship before this is recorded"); in their place, the route is built and merged.
  The Panel has answered (`-454`): it narrowed no reason, state or holder (Q7 A confirms the District Admin may end); it ruled a way back for a mistaken
  ending and an appeal (Q1 A) - new transitions, row `13-1f`'s (C2) - and Row 50 (f) (`-455`) keeps this route off real workers until those are built.
  The labelling reasons stay 13.6's (the body's reason enum is the four values; anything else -> 400). **`inactive` ("Stopped working") and `-454` Q4 A:**
  the officer "tries to reach them, and only then may end them for "stopped working"" - the route records no proof of that (the Panel accepted "the
  officer's judgement alone" until 13.8's warning); AD8's End confirm says it to the officer. **`died` (`-455`):** recorded
  on the officer's word (`-454` Q5 A: "on what they have been told"); `ended_on` is the DATE OF DEATH, under the same IST bounds; nothing else is asked for.
  **The Panel's later answers (`-454`)** - the undo of a mistaken ending, the appeal record, the returning worker's link, the shown number - are row
  `13-1f`'s, ⛔ this story's; Row 50 (f) keeps this route off real workers until the undo and the appeal record are built.
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
- **AD5 - FIVE keys, ONE catalog bump (60 -> 61, 81 -> 86); each a `-059` B(3) key, minted by author-commit (`-453`) and CONFIRMED by the Panel as
  built (`-454` Q7 A; Row 50 (a) MET). Changing a holder now needs the Panel.**
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
  both `null`; terminate - both from the body; move - both from the row the LOCK holds, re-read after the command (a suspended worker moved keeps their reason, G4; a suspend or a reactivate can commit between the pre-read and the lock - review CR10, which found the pre-read's reason in the 200). Each write:
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
  ("Ending is final. Their code stops crediting new teachers; to work again they must be registered again." - row `13-1f` rewords it when the undo
  exists) and its reason select lists the four reasons ("Left", "Stopped working", "Registered by mistake", "Died"); choosing "Died" relabels the date
  input "Date of death"; choosing "Stopped working" shows "End a worker for this only after you have tried to reach them." (`-454` Q4 A; key
  `fw.actions.end.inactiveHint`) - a line, ⛔ a checkbox or a recorded attestation (the Panel accepted "the officer's judgement alone").
  **The panel hands them the worker:** `WorkerDetail`'s `children` becomes `(name: string, worker: { current_state; district }) => ReactNode` - a second
  argument, so the Approvals page's existing `(name) => ...` child compiles unchanged. `WorkerActions` reads the state from it and sends `worker.district`
  as Move's `from_district`; ⛔ a second identity fetch inside `WorkerActions` (each is an audited decrypt, G13). No client-side role gating (13.1a C5): a 403 shows the act's "no access"
  line. Each act opens an inline confirm with a REQUIRED reason select (labels, never codes; no free text), Move a district select (`useFieldWorkerDistricts`,
  the current one excluded) and Terminate a date input defaulting to the IST day of the browser - the SERVER judges the bounds. One idempotency key per
  SUBMISSION ATTEMPT (`attemptKey`), reused only for a retryable failure of that attempt. On success: invalidate the lists and the log, and UPDATE the
  cached identity from the 200 (`setQueryData` on `fieldWorkerIdentityKey`: `current_state`, `district`) - ⛔ invalidate the identity, which would
  decrypt the name and mobile again and write a `field_worker.identity_viewed` line the officer did not ask for (G13).
  `authorization_stale` -> "This worker was moved by someone else while you were working. Reload to see their district." and a refresh.
  **REVIEW AMENDMENTS to AD8 (code review round 1, 2026-11-08) - the developer's, made while applying review findings; (a)-(g) were CONFIRMED by BigDev on 2026-11-08 ("B, A, A", question 2 = A) in decision-log entry `2026-11-08-456` (author-commit, NOT Trustee-ratified); (h) and (i) are that entry's own, and the same entry is where the amendments are recorded.** (a) `WorkerDetail`'s `children` second argument is `{ current_state; district; created_at }`: `created_at` is the End date's lower bound (CR24); the Approvals page's one-argument child is unaffected. (b) The End date control carries `min` = the registration's IST day and `max="9999-12-31"`; the browser's own "today" is NOT a `max` - the SERVER still judges the bounds. Its default is today in India, never before `min` (PR7). (c) After a 409 `authorization_stale` / `illegal_transition` the acts and the form are WITHDRAWN until the worker is reopened: AD8's stale line is kept VERBATIM, "and a refresh" still happens, and a second line says how to reopen (CR23); "Show code" goes with them (PR11). (d) "Show code" is rendered only while the worker is `active` (CR26). (e) The `illegal_transition` line reads "This worker's status has changed since you opened them." - AD8 binds only the stale line (CR23). (f) The Suspend intro names no credit rule (CR21; `-454` Q6 C). (g) Re-pressing the open act's button takes the officer to its form instead of resetting it (CR29, PR8). (h) Choosing "Died" EMPTIES the End date, and Confirm waits for a date the officer types; leaving "Died" puts today back, choosing it again empties a typed date, and moving between the other three reasons keeps what was typed (CR-Q1 B; `-456` item 1) - AD8's "defaulting to the IST day of the browser" now holds for those three only. (i) Find's state selector reads "Awaiting approval" for the waiting state (`fw.find.state.pending_kyc`), not "Waiting for approval" (`-456` item 3): AD8's first lines, the Files table and Task 5.2 spell the old words and are read with this. **CODE REVIEW ROUND 2 (2026-11-08), CONFIRMED by BigDev ("A") in decision-log entry `2026-11-08-457` (author-commit):** (c)'s second line now reads "Close this panel and find the worker again to see their current details. They may now be listed under another status, or moved to a district you cannot open." (`-457` item 1; the 409's refresh takes the worker off the list on screen, and a District Admin cannot open another district); (j) while an act saves, its reason, date and district fields are HELD - `aria-disabled`, a change ignored - as Confirm is; after a failure they are editable, and an edited body is a new attempt with a new key (R2-2); (k) "Show code" answering 409 `code_not_available` (no longer active) or `authorization_stale` (moved) withdraws the acts with the matching line and (c)'s second line, announced politely beside the code's own line, unless the panel's own act is saving (R2-5, RP-1-RP-3); (l) the history's first page answering 409 `authorization_stale` says "This worker was moved to another district while their history was loading. Try again." with Retry, and a "Load more" no retry can help shows its own line (the history's no-access line) (R2-6, R2-3). Also `fw.find.empty.pending_kyc` reads "No workers awaiting approval in this district." (R2-7; `-457` item 3).
- **AD9 - The code text is NOT in the log (13.1b C1).** The log is the worker's event stream; the text's status is already one line on the same panel
  (13.1b AD12). Cost: the history does not say when a text went. Nothing is pruned or changed in `field_worker_code_sms_sends`.
- **AD10 - The two carried copy defects are fixed here (13.1b C7 / CB9, 13.1a CR60).** (a) `fw.codeSms.not_delivered` becomes "Code SMS not delivered -
  if the worker is active, give the code by hand when they ask", and `not_confirmed` the same tail - no new status, no enum change (a sixth status would
  move the contracts enum and OpenAPI for one word). `reads.spec.ts:514` stays as it is (the status is still `not_delivered`); pin the new words in
  the admin tests (`field-worker-derive.test.ts` and the Find / Approvals page test that renders the code-text line). (b) `fieldWorkerListIsStale` gains `code_not_available`; the Find test
  at `:1057` changes to "a 409 `code_not_available` refreshes the list". (c) G15's re-examination: re-accepted, a comment at `read.ts:362-365` dated and
  pointing at 13.1b AD4; the sweep is not touched. Under Q-1 C the same window covers a TERMINATION of an active worker (the text can still go in the
  seconds between the sweep's check and the gateway call); re-accepted on a narrower ground than 13.1b AD4's: the text only tells the worker their own
  code. What a signup on that code earns while the worker is not `active` is the credit recorder's under `-454` Q6 C (held for `under_review`), not the
  text's; for an ended worker, nothing.
- **AD11 - Two migrations, for `died` only (`-455` amends "No migration").** `0203_field-worker-reason-died.sql`: `ALTER TYPE "field_worker_reason_code"
  ADD VALUE IF NOT EXISTS 'died'` ALONE (the `0146` posture - TR12). `0204_field-worker-reason-subset-died.sql`: DROP and re-ADD
  `field_workers_state_reason_subset` with the terminated arm `state_reason_code::text IN ('left_voluntarily','inactive','registered_in_error','died')`
  (text, never an enum literal of the new value); the suspended arm unchanged. Both hand-authored, journal entries in order, ⛔ regenerated; the drizzle
  schema moves in the same commit: `FIELD_WORKER_REASON_CODES` gains `'died'` as its LAST element, after `'reassigned'` (G5: `ADD VALUE` appends and
  the policy-regression spec pins the order); the `check()` text mirrors `0204` (`::text` on the terminated arm); and the JSDoc above the tuple (`:63-67`,
  "Terminate: ...") and the comment above the CHECK (`:143`, "Story 13.6 REPLACES this CHECK") name `died` and `0204` (13.6 replaces it again for its
  labelling values). `FIELD_WORKER_TERMINATE_REASONS` (`events.ts`) appends `'died'` too. The keys stay TypeScript; payloads are
  JSON; the log uses `events_log_pariwar_stream_idx`. Any OTHER migration: stop and record why first.
- **AD12 - Not built, with homes.** The move request, the notices, "a move ends a pending request" - 13.1d (nothing pending can exist before it). The
  8-year removal - row `13-1e` (Q-4 A). The undo of a mistaken ending, the appeal record, a returning worker's link, showing an officer that a number
  belonged to an ended worker - RULED (`-454` Q1-Q3), built by row `13-1f` (`-455`); the silence warning - 13.8 (`-454` Q4 A, C5); the held credit -
  13.8 / 13.5 (Q6 C, C3); the labelling reasons - 13.6. Search by mobile or name - 13.1a C7.
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
- **I5** - Termination is final IN THIS STORY: no route leaves `terminated` (the undo is row `13-1f`'s), and the terminate route writes only
  `left_voluntarily`, `inactive`, `registered_in_error` or `died`, with an `ended_on` inside the IST bounds; no labelling reason is writable (13.6's).
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
`left_voluntarily`, `inactive`, `registered_in_error` or `died` and an `ended_on` (today or a day between registration and today, IST): 200, `terminated`,
`state_reason_code` and `ended_on` set; one `field_worker.terminated` event with the `field_worker.terminate` authorization; one `field_worker.terminated`
audit line. (a) The same mobile can then be registered again in the Pariwar (G16) - a live leg through the register route, for a pending worker ended
`registered_in_error` AND an active one ended `left_voluntarily`. (b) Two concurrent terminations of one worker: one commits; the other answers 409
`illegal_transition` from inside `mutate` and writes the `_rolled_back` twin (a live race leg, the row lock held, `waitForBlockedBy`). (c) A future
`ended_on` or one before registration -> 422 `ended_on_invalid` (IST bounds; the test reads "today" from the DB, never the UTC clock). (d) Every act on a
terminated worker -> 409 `illegal_transition`, no event, no audit line. (e) An active worker once ended: `acceptsNewAttributions` is `false`, the by-hand
code read answers 409 `code_not_available`, and the code row and worker id are unchanged (FR-85: existing attributions preserved). (f) A labelling reason
(`conduct`) or any value outside the four -> 400 `request.validation`. (g) `died` (`-455`): an `active` worker ended `died` with a date of death is
`terminated`, `state_reason_code = 'died'`, `ended_on` = that date - a live leg proving migrations `0203` + `0204` (the CHECK admits it); a date of
death in the future -> 422. Below the route, `schema-trigger.spec.ts`'s `_subset` case gains `died` as a SUSPENSION reason -> 23514
`field_workers_state_reason_subset`, with a control that `died` on a `terminated` row is accepted. RED proof (a development-time mutation on a FRESH
container, not a committed test - Task 2.5's convention): with `0204` reverted, the `died` UPDATE fails 23514; restore. The enum-order spec
(`field-workers-policy-regression.spec.ts:67`) passes with `died` last (G5).

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
End; an ended one none); End's confirm shows the finality line and the FOUR reasons ("Left", "Stopped working", "Registered by mistake", "Died");
choosing "Died" relabels the date input "Date of death" and EMPTIES it, so Confirm waits for a date the officer types (and another reason restores the plain label and today - `-456` item 1); choosing "Stopped working" shows the
`-454` Q4 A line (AD8) and no other reason does; the Approvals page's approve child still renders
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

- [x] **Task 0 - Preflight and governance (AC: 12)** - runs FIRST; writes no code.
  - [x] 0.0 (`01cbba52`) Commit this story file and the create-story record edits (`epics.md` note under Story 13.1c, `deferred-work.md` lines, `sprint-status.yaml`
    row + ledger `2026-11-07d`) as ONE `records(13.1c)` commit on the story branch, when BigDev asks.
  - [x] 0.1 `git fetch origin`; `git merge-base --is-ancestor bb4d8620 HEAD`; `git diff --name-only bb4d8620..origin/main -- packages apps scripts docs/launch-gate-inventory`.
    Re-derive any claim at the new tip; re-grep the NUMBERS block; check `git worktree list` / `git branch -a` for another branch touching
    `packages/domain/src/field-worker/`, `rbac/permissions.ts` or `apps/admin/src/modules/field-workers/` (13.1d especially: it mints move keys too, AD4).
    If any migration after `0202` other than this story's `0203` / `0204` touches `users`' policies or grants, re-check G19; if a sibling has taken
    `0203` / `0204` on `origin/main`, renumber ours to the next free pair (and their `when` after the newest).
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
    costs on every option, evidence last. SENT - BigDev, 2026-11-07: "note sent to panel"; it is called sent only when BigDev says it went ([[feedback_shown_to_panel_means_sent]]); re-run its
    E4 commands before sending (the decision id `-453` it cites exists only after Task 0.3). Non-blocking. A ruling is its own decision entry plus dated
    lines at Row 50 and Row 48 (i).

- [x] **Task 1 - Keys (AC: 9; I10)** - in the SAME commit as Task 2.3.
  - [x] 1.1 `permissions.ts`: the keys, `PERMISSION_CATALOG_VERSION = 61`, the changelog comment; `roles.ts`: constants and bundle entries per AD5.
  - [x] 1.2 `tests/rbac/permissions.test.ts` (`toBe(61)`, length), `tests/rbac/roles.test.ts` (one describe per key, 13.1a's shape), `tests/field-worker/events.test.ts` catalog fixtures.

- [x] **Task 2 - The domain (AC: 1-7; I1-I5)**
  - [x] 2.0 Migrations `0203` + `0204` and the drizzle schema (AD11, TR12): `'died'` APPENDED LAST to `FIELD_WORKER_REASON_CODES` (after `'reassigned'` -
    G5; the enum-order spec fails otherwise) and to `FIELD_WORKER_TERMINATE_REASONS` in `events.ts` (the payload enum follows); the CHECK text and the two
    comments (AD11). `schema-trigger.spec.ts`: `died` refused as a suspension reason, accepted on `terminated` (AC6 (g)). `scripts/field-worker-state-invariant`
    names no reason (grepped at the pin) - re-check. Run the migrations on a FRESH container.
  - [x] 2.1 `events.ts`: `authorization` REQUIRED on `suspended`, `reactivated`, `terminated`; the four registry descriptions (AD3, incl. `posted`);
    `packages/events/tests/field-worker-registry-coverage.test.ts`.
  - [x] 2.2 `commands.ts`: the three commands gain `authorization` + key check at guard (0) + locked-target check (AD3); update the guard-order header (:13-30).
    Sweep G12 (b) in the SAME commit - including `apps/jobs/tests/field-worker-code-sms-live.test.ts`, which the domain test run does not reach
    (run `pnpm --filter @twt/jobs test` too, or it first fails at `ci:local`).
  - [x] 2.3 `postFieldWorker`: `FIELD_WORKER_MOVE_PERMISSION_KEYS`, `verifiedSnapshot`'s `permissionKeys` option, `expectedFromDistrict` (AD4). Sweep G12 (a)'s tests to the new keys
    through the two fence-exempt fixture files only; `commands-guards.test.ts` gains: register key refused, every non-move key refused, stale source refused.
  - [x] 2.4 `read.ts`: `listFieldWorkerEvents` (AD7) + `clampLimit`; export through the barrel; the dated comment at `:362-365` (AD10 (c)).
  - [x] 2.5 Tests: `tests/integration/field-worker/commands.spec.ts` (each act with its key; stale target under the lock; move of a suspended worker keeps
    the reason), `log.spec.ts` (order, paging, clamp, foreign Pariwar null, a moved worker's whole stream), `stream-concurrency.spec.ts` updated. RED proof
    for each new guard (mutate it, see the intended assertion fail, restore).

- [x] **Task 3 - Contracts (AC: 6-8, 11)**
  - [x] 3.1 DTOs and the three reason tuples (the terminate one with `died`; re-declared, sync test in `packages/contracts/tests/field-workers.test.ts`); `emit-openapi.ts` entries; regenerate `openapi/v1.yaml`.
  - [x] 3.2 A required field added to a contract breaks fixtures outside tsc ([[project_contracts_tests_outside_tsc]]) - grep the contracts tests.

- [x] **Task 4 - The API (AC: 1-8, 11; I6-I8)**
  - [x] 4.1 `lifecycle-handlers.ts` (AD6) on `createFieldWorkerWriteSupport`; `log-handlers.ts`; registrations in `routes.ts` with the per-worker chain and
    each key; `index.ts` header (13.1c no longer "owner of" unbuilt routes). `errors.ts`: no new code (Q-1 C needs none); `field-worker-errors.test.ts`
    relabels the rows now reachable.
  - [x] 4.2 Extend `_registration-harness.ts` (`move`, `suspend`, `reactivate`, `terminate`, `log` helpers; `cleanup` unchanged in order) and
    `_field-worker-fixture.ts` (`moveTestFieldWorker` on the move key). New specs in `apps/api/tests/integration/field-worker/`: `lifecycle.spec.ts`
    (AC1, AC4-AC6 incl. holders and non-holders, pre-read refusals write no audit line - assert by counting `audit_log` rows for the locator, with a
    control that a committed act writes one; assert the move's line is `field_worker.posted`), `move-race.spec.ts` (AC2), `terminate-race.spec.ts`
    (AC6 (b): two concurrent terminations, the loser's 409 `illegal_transition` from inside `mutate` and its `_rolled_back` twin, with the reason AND a
    control asserted - TR8), `log.spec.ts` (AC8). Idempotency:
    same key replays; same key on another worker is a different namespace (13.1a TR6).
  - [x] 4.3 Route review (13.2 C7): grep the new files for a door import, a re-export, `requestContextStorage.run`, `pariwarId =`; run the reach fence and `check.test.ts`.

- [x] **Task 5 - The screens (AC: 10)**
  - [x] 5.1 Hooks and client (`src/api/hooks.ts`, `client.ts`): four mutations (on success: invalidate the lists and the log, `setQueryData` the identity - AD8), `useFieldWorkerLog` (infinite, `gcTime: 0` like identity - [[project_query_gctime_blinds_removal_tests]]); `fieldWorkerListIsStale` + `code_not_available` (AD10 (b)).
  - [x] 5.2 `WorkerDetail.tsx`: `children`'s second argument (AD8); `WorkerActions.tsx`, `WorkerHistory.tsx`, the Find state selector (incl. the waiting state, which reads "Awaiting approval" - `-456` item 3), copy in `i18n-en.ts` (reason labels incl. "Died" and "Date of death", the "Died" date starting EMPTY with Confirm waiting for one - `-456` item 1; the "Stopped working" line `fw.actions.end.inactiveHint`; AD8 messages; AD10 (a)); `derive.ts` `BY_CODE` rows.
  - [x] 5.3 RTL tests: `apps/admin/tests/field-worker-{actions,history}.test.tsx`; update `field-worker-find-page.test.tsx` (`:1057`), `field-worker-derive.test.ts` (walks `FIELD_WORKER_EN_KEYS`). Mind [[project_tanstack_onsettled_before_success]] and [[project_tanstack_mutate_callbacks_latest_only]].

- [x] **Task 6 - Records (AC: 12)** - the story's Dev Agent Record and File List; `deferred-work.md`: CR33's re-trigger fired (AD12), 13.1b C1 / C7 and 13.1a CR60 closed by
  this story with commit ids; `epics.md` BUILT note; ledger entry. A record states only what has been run ([[feedback_record_unattested_no_backfill]]).

- [x] **Task 7 - Gate** - `ci:local` on a FRESH container through the push ([[project_known_livedb_test_failures]], #18 needs a fresh DB).

- [x] **Task 8 - Browser pass (AC: 10)**
  - [x] 8.1 In the dev Mac's Chrome: move a worker, suspend, reactivate, end an active one (left voluntarily), a pending one (registered in error) and
    one with "Died" (see the date relabel "Date of death"; choose "Stopped working" first and see its line), read a history, and see a District Admin of
    another district refused. Record what ran and what did not.

### Review Findings

**Code review 2026-11-07, BigDev's instruction: "chunk, complete all chunks one by one, apply all finding, run adversarial review on patches applied, apply any further findings". The branch is reviewed in four chunks - A domain + events, B contracts + API + openapi, C admin + microcopy, D records (D is read by every chunk's Acceptance Auditor as spec, not hunted). Each chunk: Blind Hunter (diff file only), Edge Case Hunter (diff + the worktree, read-only), Acceptance Auditor (diff + this story + the checklist + `-453` / `-454` / `-455`); every claim below was re-read against the code by the reviewer before it was classified. The fixes were left uncommitted until BigDev asked ("commit it", 2026-11-08): the decision `a55a079f` (corrected in the commit after it), the code `8c2f5e7a`, then these records.**

**Chunk A (domain + events; `bb4d8620...5616ec83`, 1,974 diff lines): Blind Hunter 19, Edge Case Hunter 5, Acceptance Auditor 3 -> 22 unique -> 0 decision-needed, 8 patch (all applied), 1 defer, 13 dismissed.** No AC violation on the domain side; checklist families 1-6, 9-12 covered; family 8's snapshot letter is the recorded variance of AD7 / `-453` clause 7 (below).

- [x] [Review][Patch] CR1 - `listFieldWorkerEvents` documents `RangeError` for a non-integer `limit` and throws none: `clampLimit(NaN)` is NaN and `2.5` passes, so Postgres answers 22P02 (a 500); the sibling `pageFieldWorkersForPariwar` has the guard. Guard added (same shape); the spec's "RangeError before any statement" leg now proves it with a db that throws on first touch (`afterVersion` -1 / 1.5 / NaN / 2^53 and `limit` 1.5 / NaN / Infinity) plus a control (an over-cap integer is clamped). RED-proved: the guard removed, the 1.5 leg failed. [packages/domain/src/field-worker/read.ts, tests/integration/field-worker/log.spec.ts] (blind + edge + auditor)
- [x] [Review][Patch] CR2 - `read.ts`'s header said the event stream "holds no personal data" in the file that joins each officer's current display name into it; now says the stream holds no data of the WORKER and names the officer's name as the one personal datum joined. [read.ts:9] (blind)
- [x] [Review][Patch] CR3 - `commands.ts`'s guard-order header read "on EVERY command but none (...)" (meaningless; all seven commands carry an authorization since AD3) - Task 2.2 asked for the header to be updated. [commands.ts:14] (blind + auditor)
- [x] [Review][Patch] CR4 - guard (3a) builds `FieldWorkerAuthorizationStaleError(id, expectedFromDistrict)` while the field is documented as the authorization's target. Nothing reads `targetDistrict` (grep), so the class doc now says what each guard puts there and that it is not the worker's present district; the log read and the three AD3 acts are named among the throwers. [errors.ts:223] (blind + edge)
- [x] [Review][Patch] CR5 - `post`'s negative list lost its isolated WRONG-DIMENSION case (`module.manage` is refused by the key check first); `keyAtPariwar('field_worker.move')` added, as the lifecycle acts have. [tests/field-worker/commands-guards.test.ts] (blind)
- [x] [Review][Patch] CR6 - `events.test`'s "stray display_name" refusal changed two things at once with no control; a control that `actAuth('x')` alone parses added. [tests/field-worker/events.test.ts] (blind)
- [x] [Review][Patch] CR7 - the (3d) CONTROL ran `suspend` and `reactivate` at Gaya but not `terminate`; terminate's control added (a suspended worker is ended at Gaya). [tests/integration/field-worker/commands.spec.ts] (blind)
- [x] [Review][Patch] CR8 - SEAM (contracts): `GET .../log?after=` took any integer (`1e21`, 2^53 + 1) while the domain accepts only a safe integer, so an authorized admin got a 500 instead of a 400. `FieldWorkerLogQuery.after` gains `.max(Number.MAX_SAFE_INTEGER)`; `openapi/v1.yaml` regenerated (ONE line: `maximum: 9007199254740991`, which also shows the committed file otherwise equals the emitter's output); the contract test pins the boundary (2^53 - 1 passes, 2^53 and `1e21` are refused). [packages/contracts/src/field-workers/dto.ts, tests/field-workers.test.ts, openapi/v1.yaml] (edge)
- [x] [Review][Defer] CR9 - `ended_on` is the clock of the 8-year removal and its only lower bound is the registration day, so a District Admin can back-date a termination to start the clock early (and a typo in a `died` date is permanent). Spec-conformant (AC6 (c)); the removal is row 13-1e, not built - deferred to 13-1e, which decides whether the date needs a further bound or a correction path. [commands.ts terminateFieldWorker] - deferred, recorded in `deferred-work.md`
- Dismissed (13), with the reason, so a later round need not re-find them: (1) event payload schemas do not bind the key to the event type - the projectors are NOT exported (`index.ts`), each event has ONE caller (its command, which checks its own key), 13.1a's two events have the same posture; (2) `terminate` is in the default District / Pariwar Admin bundles with only a comment fencing it - the holders are `-454` Q7 A, the go-live fence is Row 50 (b) / (f) (merge is not go-live); (3) `clampLimit(limit + 1, ...)` is a "double clamp" - it is the sibling `pageFieldWorkersForPariwar`'s exact shape; (4) the journal's `when` values look synthetic - each is the previous + 86,400,001 ms, the neighbours' convention (0200-0202); (5) `0204` has no `IF EXISTS` on its DROP - no other migration does; its "0204 names `'died'` as an enum literal" comment uses the house negation marker and is correct (0204 compares `::text`); (6) the post-vs-terminate race leg no longer reaches (3d) - the live (3d) loser is chunk B's `move-race.spec.ts`; (7) `log.spec`'s `enc:v1|idx-` pin "cannot fail" - it is a regression pin for a later join to the worker row, whose fixture holds both strings; (8) the `others.length === SEED_PERMISSION_KEYS.length - 1` pin will break when 13.1d extends the move list - it is meant to, 13.1d updates it; (9) the log follows the worker, so a District Admin of the new district sees the earlier district's officers' names - that is `-441`'s "full log" and AD7; (10) route paths in registry descriptions - the 13.1 / 13.1a events already do this; (11) the SMS sweep's TOCTOU - AD10 (c) re-examined and re-accepted, dated, in `read.ts`; (12) a stale screen that was moved A -> B -> A can still move the worker A -> C - the worker IS in A, which is what the admin saw and meant; closing it needs a version in the contract, out of AD4's scope; (13) a display name of only zero-width characters is not "blank" to `trim()` - every other display-name check in the repo uses `trim()`, and the write path is not this story's. One more, borderline: the `posted` registry text keeps "(unverified until built)" - it now qualifies 13.1d's emitter only, which is true.
- Observation, not a finding (FYI for BigDev): checklist family 8 reads "admin attribution snapshotted server-side from users.display_name"; the log shows each officer's CURRENT name instead (AD7, `-453` clause 7, a documented author-commit, an explicit test). It is a deliberate, recorded variance, not an oversight.

**Chunk B (contracts + API + jobs test; 1,773 diff lines, `openapi/v1.yaml` excluded and proved equal to the emitter by regenerating it): Blind Hunter 15, Edge Case Hunter 7, Acceptance Auditor 5 -> 0 decision-needed, 9 patch (all applied), 2 defer, 10 dismissed.** Verified on a fresh container (:5481): the whole `apps/api/tests/integration/field-worker/` folder 114 passed, contracts 16, API errors unit 28, `contracts:check-openapi-determinism` green.

- [x] [Review][Patch] CR10 - the MOVE's 200 paired the locked row's `current_state` with the PRE-READ's `state_reason_code` (its own comment said the lock "confirmed unchanged in state" - it confirmed only the district). A move is legal in every non-terminated state, so a suspend or reactivate that commits between the pre-read and the lock does not stop it: an active worker came back "suspended, reason null" (or an active one carrying `under_review`), the wrong body was what the idempotency store replays for a day and what AC10's panel renders without a second fetch. The DB row was right. The command now re-reads the row the lock holds, on the same transaction. Two live race legs (a suspend and a reactivate committing while the move waits on the lock) were RED against the old handler (`state_reason_code: null` vs `under_review`) and are green; each compares the body to the stored row. Fixture `actTestFieldWorker` added. [apps/api/src/modules/field-worker/lifecycle-handlers.ts, tests/integration/field-worker/move-race.spec.ts, tests/integration/_field-worker-fixture.ts] (blind + edge)
- [x] [Review][Patch] CR11 - checklist family 3 REAL GAP (Task 4.2): the four write routes had only the move's and suspend / terminate's wrong-district legs. Added, per route: no session 401, no grant here (another Pariwar's admin) 404, a role without the key 403 (`helpline_operator`), a District Admin of another district 403 (and of the worker's own district for `move`), another Pariwar's worker id the same 403 as an unknown id with the other stream untouched, and a control; and the holders per route: Pariwar Admin, `super_admin` (derived), and a District Admin of the worker's own district where the bundle has the key - 200, the event naming WHICH role acted. Reactivate was never refused or run by a District Admin before. [apps/api/tests/integration/field-worker/lifecycle.spec.ts] (auditor)
- [x] [Review][Patch] CR12 - an `ended_on` that is not a real calendar day (`2026-02-30`, `2026-13-45`) passed the DTO's shape-only regex and was refused by the command's pure guard (0b) INSIDE `mutate`, after the intent line: each attempt wrote an intent line plus a `_rolled_back` twin, and no HTTP test reached it. It is a pure refusal, so it is now judged in the handler's pre-read (after legality, before the wrapper): 422 `ended_on_invalid`, no event, NO line (I7). The IST bounds (not after today, not before the registration day) stay in the command - ONE judge of them, under the lock; the handler COULD pre-judge them (the pre-read row carries `createdAt`, `now()` is one SELECT) at the price of a second copy of the rule (the first wording of this entry said they NEED the lock: the patch review showed that false) - and that variance (the intent-and-twin pair, pinned by `expectRefusedInMutate`) is unchanged. RED-proved: with the pre-check removed the new legs fail (8 lines where 6 are expected). Legality still precedes the date (an ended worker with a bad date is 409). [lifecycle-handlers.ts, lifecycle.spec.ts] (auditor + blind + edge)
- [x] [Review][Patch] CR13 - `FieldWorkerLogQuery.limit` clamped an over-cap value only when it was a plain digit string or an integer number, so `limit=1e3`, `1000.0`, `+1000` and a 400-digit string answered 400 where AC8 says "clamped, never an error". The preprocess now clamps every spelling of an over-cap whole number (and Infinity); a fraction, zero, a negative, an empty string or a word is still 400. [packages/contracts/src/field-workers/dto.ts, tests/field-workers.test.ts] (blind + edge)
- [x] [Review][Patch] CR14 - the OpenAPI log entry omitted its reachable 409 `authorization_stale` and the 404 `field_worker.not_found`, and the four write routes' descriptions did not say the `Idempotency-Key` header is required (the approve route's does). Added to `emit-openapi.ts`; `openapi/v1.yaml` regenerated (the diff is exactly those lines plus CR8's). [packages/contracts/scripts/emit-openapi.ts, openapi/v1.yaml] (auditor + edge)
- [x] [Review][Patch] CR15 - `expectOneAct` asserted `(await row(id)).audit_id` `toBeDefined()` (the column is NOT NULL: it cannot fail) and the AD6 audit hash shape was selected but never compared. Now: the row's `audit_id` equals the act's intent line, and `request_payload_hash` equals `payloadHash({ field_worker_id, ...shape })` for move, suspend (both reasons), terminate and reactivate (CR18's pattern from 13.1a). [lifecycle.spec.ts] (auditor + blind + edge)
- [x] [Review][Patch] CR16 - `errors.ts` still said the command-only error rows "wait for 13.1c / 13.1d" (twice); now says what 13.1c reaches. [apps/api/src/modules/field-worker/errors.ts] (auditor)
- [x] [Review][Patch] CR17 - test hygiene: the AC7 terminate race leg sent a hard-coded `ended_on: '2026-11-01'`, invalid for a worker registered today, and passed only because the stale check runs before the date check (a hidden ordering dependency) - it now sends IST today read from the DB; AC6 (d) called `istToday()` twice (the request and its expected body) - one read; the AC1 (d) / AC6 (f) title claimed "before any gate" while sending as a fully authorized admin - retitled to what it asserts; AC4 (a)'s loop asserted only `403` - now the code `authz.forbidden` and no event / line. [move-race.spec.ts, lifecycle.spec.ts] (blind + edge)
- [x] [Review][Patch] CR18 - the log route's 409 was untested and its re-read is a statement of its own: a move landing between the re-read and the page lets that one page through (the identity read is one statement and the code read takes `FOR SHARE`). Accepted and now written into the header (the page holds event metadata, no data of the worker); a live leg reaches the 409 through the `afterLoad` hook, with a control (Gaya's District Admin reads the whole log, Patna's is a plain 403). The header also gains the DELIBERATE / re-examination block checklist family 9 asks for (the log follows the worker; the re-examination trigger is the author's, not the Panel's). [log-handlers.ts, reads.spec.ts] (edge + auditor)
- [x] [Review][Defer] CR19 - none of the six field-worker WRITE routes (register, approve, move, suspend, reactivate, terminate) sets `config.rateLimit`; only the reads take `limits.read`, so a write is bounded by the global per-IP ceiling alone (a named `limits.write` exists and helpdesk / data-rights routes use it). 13.1 and 13.1a shipped the same posture and the story does not mention it, so adding it only to the new routes would split the module; a cross-cutting decision (CR12 removed the cheapest way to write audit pairs from a bad date; the IST-bound refusals still write one pair each). Deferred - recorded in `deferred-work.md`.
- [x] [Review][Defer] CR20 - the keyed idempotency store keeps no body fingerprint (the header comment says so), so a retry with the SAME `Idempotency-Key` and a DIFFERENT body (another `to_district`, reason or `ended_on`) silently gets the first call's recorded 200 and the second act is never attempted. Namespaced by worker (TR6), so it cannot cross workers; shared substrate in `write-support.ts` (approve has the same shape, with an empty body); acts now carry real bodies. Deferred - recorded in `deferred-work.md`; chunk C checks the admin client sends a fresh key per attempt - ANSWERED yes: `attemptKey` keys on the act, the worker and the BODY, so an edited body gets a new key, and a new attempt (opening afresh, a success, a final failure) mints a new one; pinned by `field-worker-actions.test.tsx`.
- Dismissed (10): (1) the `field_worker.move` authorization "means different things" in the route (the source) and the fixture (the destination) - the command accepts EITHER end (guard 3c, AC5) and the route's gate targets the worker's current district; the handler header's "target = the locked district" is now worded for that (CR10); (2) `before` (the unlisted-district check) runs ahead of the pre-read, so an ended worker with an unlisted `to_district` answers 422, not 409 - both refusals are right, and AD6 puts the district check first; (3) the terminate route is live behind a comment only - as chunk A (2): `-455` / Row 50 (f); (4) suspend / terminate echo the request's reason and `ended_on` in the 200 - they equal the stored values (the command stores the same strings; the specs compare the body to the row); (5) code smells (an unused generic, the harness's argument order, `as` casts on the response enums - the closed 7-value event enum is already carried to 13-1f as C2 (iii)); (6) the emitted `after` schema is `type: [integer, "null"]` - how the generator renders `z.coerce`, the same on every coerced query in the file; (7) a `recordResult` that fails after COMMIT releases the key and a retry meets 409 - CR33, disclosed and deferred by AD12; (8) `istTomorrow()` is a separate statement from the request, so a run straddling 00:00 IST would flip "tomorrow" to today - a window of milliseconds (about 6e-7 per run), unlike 13.1b's UTC-vs-IST class, which these legs avoid by reading the DB's IST date; (9) no leg for the 404 `field_worker.not_found` in `run` (a lost race with a worker that is never deleted) or for a log item with a null `actor_user_id` (the API writes human actors only, QE7; the domain leg covers a missing `users` row); (10) the log shows other districts' officers to the new district's admin - chunk A (9), now carrying its DELIBERATE block (CR18). Verified and found sound: `log.spec.ts`'s `@example.test` email check matches the harness's domain.

**Chunk C (admin web UI + `microcopy.yaml`; 1,448 diff lines): Blind Hunter 17, Edge Case Hunter 15, Acceptance Auditor 6 -> 1 decision-needed (BigDev's, not the Panel's - not applied), 12 patch (all applied), 0 defer, 11 dismissed.** Two of the three layers were cut off by a usage limit and RESUMED from their saved transcripts (no layer was skipped). Verified: the whole admin suite 104 files / 2,066 tests, `tsc`, ESLint on every touched file, `pnpm microcopy:check`.

- [x] [Review][Decision] CR-Q1 (RESOLVED 2026-11-08: BigDev chose (B), `2026-11-08-456` item 1 - applied as `chooseReason` in `WorkerActions.tsx`, two new legs in `field-worker-actions.test.tsx`, RED-proved by removing the change) - AD8 pre-fills the End date with today, and choosing "Died" only RELABELS it "Date of death", so an officer can confirm a date of death they never looked at (Confirm is enabled as soon as a reason is chosen; the server only bounds it, and an ending has no way back until row 13-1f). The default is BigDev's own AD8, so it was NOT changed. Options: (A) leave AD8 as written; (B) choosing "Died" clears the date and Confirm waits for one. Raised by the Blind Hunter, the Edge Case Hunter and the Auditor's note. [WorkerActions.tsx `start`, the End date] - asked at the end of the review
- [x] [Review][Patch] CR21 - the Suspend intro said "...and credits no new teacher" before any reason is chosen; `-454` Q6 C rules that a suspension UNDER REVIEW holds a signup and credits it if cleared (the story's Policy meaning: this story states no credit rule). For `under_review` the line told the officer the opposite of the ruling. Now: "While suspended, the worker's code cannot be given out." (pinned, and a test that it names no credit). [i18n-en.ts, field-worker-actions.test.tsx] (auditor)
- [x] [Review][Patch] CR22 - the act mutation used TanStack's default `networkMode: 'online'`: pressed while offline it PAUSED (the form stuck on "Saving…", Cancel disabled) and RAN on reconnect - a Suspend or an irreversible End the officer had given up on, with no announcement. It now has `networkMode: 'always'`: offline it is sent, fails as a retryable network error, and the retry reuses the attempt's key. RED-proved: with the line removed the leg times out waiting for the error. [api/hooks.ts, field-worker-actions.test.tsx] (edge)
- [x] [Review][Patch] CR23 - after a 409 `authorization_stale` / `illegal_transition` the panel kept offering the old state's acts and a Confirm that resent the same doomed body (the identity is deliberately not re-read - each read is audited, G13), and "Reload to see..." named nothing the panel could do. AD8's stale line is kept VERBATIM, and the acts and form are now withdrawn with a second line: "Close this panel and open the worker again to see their current details." The `illegal_transition` line no longer says "by someone else" (the officer's own earlier try, whose answer was lost, meets the same 409): "This worker's status has changed since you opened them." (dev-owned copy; AD8 binds only the stale line). [derive.ts, WorkerActions.tsx, i18n-en.ts, tests] (blind + edge + auditor)
- [x] [Review][Patch] CR24 - the End date had no bounds: a day before the registration (known client-side: the identity's `created_at`) or a year the contract cannot read (Chrome accepts more than four digits: a 400 "something in the form is not valid") reached the server, and a before-registration date costs an audit pair. The control now has `min` = the registration's IST day (`WorkerSummary` gains `created_at`) and `max="9999-12-31"`; the browser's own "today" is deliberately NOT a `max` (a wrong device clock would hard-block a true end date; AD8: the server judges). `istTodayInBrowser` is pinned at the 18:30 UTC turnover (it was only matched against a date-shaped regex). [WorkerActions.tsx, WorkerDetail.tsx, derive.ts, derive test] (edge + blind)
- [x] [Review][Patch] CR25 - focus and announcements (checklist family 13 (d), two REAL GAPs from the Auditor): the finality line and the other intros sat before the control focus lands on and described nothing; the "Stopped working" line appeared in a plain `<p>`; the form had no name; Cancel, a success and "Show history" unmounted the focused button (focus fell to the body); "Load more" appended entries silently; "Saving…" was only a button label. Now: the form is named ("End", "Move", ...); the intro `aria-describedby`s the reason select (Reactivate's Confirm); the "Stopped working" line arrives INTO a status region mounted with the form; Cancel returns focus to the act that opened it, a result rests it on the panel's heading, "Show history" on the history's heading, "Load more" says "n more entries shown." and focuses the first new entry (only if the officer has not gone elsewhere - the `WorkerList` convention); Confirm is `aria-disabled` while saving (a disabled control loses focus) and "Saving…" is said in the status region. [WorkerActions.tsx, WorkerHistory.tsx, i18n-en.ts, tests] (auditor + edge + blind)
- [x] [Review][Patch] CR26 - "Show code" was rendered for every state, and the state selector now lists waiting, suspended and ended workers, where it can only answer 409 (and each answer refetched the lists); a code already on screen survived a Suspend or an End. It is rendered only while the worker is `active`; a Suspend's 200 unmounts it (and so clears the code). AD10 (b)'s `code_not_available` handling stays for a worker whose state changed after the panel opened. [FindWorkerPage.tsx, tests] (blind + edge)
- [x] [Review][Patch] CR27 - tests and copy tidy: the dead key `fw.actions.failedNamed` (and the `act` parameter the copy test added only for it) removed; the AD8 / `-455` strings pinned VERBATIM, not through their own keys (the finality line, "Date of death", the four status labels); Reactivate's 403 leg added; the history's "loaded" status, a failed "Load more" (rows kept, pressable again) and a failed first load's Retry tested; the client's `fieldWorkerAct` narrowed to the four routes and `object` bodies; `draft()` (non-null, the key placeholder explained) replaces `input(...)!`. [i18n-en.ts, client.ts, WorkerActions.tsx, tests] (auditor + blind + edge)
- [x] [Review][Patch] CR28 - Move's district select ignored `districts_truncated`: in a Pariwar with more districts than can be listed the target could not be chosen (the Find picker offers an exact-text field, `DistrictPicker` R9). Move now offers it too (same words), the typed district is sent byte for byte, and the server judges. [WorkerActions.tsx, test] (blind + edge)
- [x] [Review][Patch] CR29 - re-pressing the OPEN act's button called `start()` again: it wiped the reason, district, date and error and dropped the attempt's key (a try whose answer never arrived then went out under a NEW key); it is now a no-op. An error that described a value stays on screen after the officer corrects the value; editing a field now clears it. [WorkerActions.tsx, tests] (blind + edge)
- [x] [Review][Patch] CR30 - the history printed the ending's date raw ("Last day: 2026-11-06") beside timestamps formatted "7 Nov 2026, 4:05 pm"; it now reads "6 Nov 2026" like every other date on the screen. [WorkerHistory.tsx, test] (blind + edge)
- [x] [Review][Patch] CR31 - nothing proved a label exists for every reason code and every event type (the resolver THROWS on a missing key, and row 13-1f adds event types): a totality test walks `FIELD_WORKER_REASON_CODES` and `FIELD_WORKER_EVENT_TYPES` and pins the reason words. [field-worker-derive.test.ts] (auditor + blind)
- [x] [Review][Patch] CR32 - every page test replaced the client's lifecycle helpers with `vi.fn()`, so nothing saw the wire: a new test drives the REAL `moveFieldWorker` / `suspendFieldWorker` / `reactivateFieldWorker` / `terminateFieldWorker` / `getFieldWorkerLog` over a stubbed `fetch` - the route of each (End is `/terminate`), the `Idempotency-Key` header, Reactivate's `{}` body (never empty), the body byte for byte, `?after=`, `no-store`, and that a 409 envelope becomes an `ApiError` with its code. [field-worker-lifecycle-client.test.ts] (blind)
- Dismissed (11): (1) the panel can be closed or the filter changed while an act is in flight, so the outcome is not said - one request with its own key; the hook's `onSuccess` still refreshes the lists, and a repeat meets the neutral 409 (CR23); (2) Move is offered to a District Admin, who then meets "Only a Pariwar Admin can move a worker directly." - AD8 and 13.1a C5 (no client-side role gating: the server decides); (3) `formatIstDateTime` would throw on a malformed instant - the server writes ISO strings, the contract types them, and the sibling `formatIstDate` has the same shape; (4) a blank officer name rendering "by , District Admin" - the domain turns a blank name into `null` (chunk A) and the API passes it through; (5) a future event type (row 13-1f) would fail the strict contract parse - carried as C2 (iii); (6) a disabled Confirm gives no reason - the labelled `required` fields are the module's pattern; (7) no `max` of the browser's today on the End date - see CR24; the server judges and a future date costs one audit pair (CR19, deferred); (8) Task 5.1 says "four mutations" and the code has one that takes the act as a variable - equivalent behaviour, the story's wording stays; (9) `FindWorkerPage` imports `FieldWorkerState` and `FIELD_WORKER_STATES` in two statements - the type / value split is the repo's style (ESLint passes; `WorkerActions` does the same); (10) `fieldWorkerListIsStale` counting `code_not_available` refetched the lists on every "Show code" in the new views - moot after CR26; (11) Task 8's browser pass could not be re-checked from the repo (no artifact of it exists) - its disclosure of three synthetic endings and the RTL-only 5xx retry stands as written, and NONE of this review's UI-visible fixes (CR21-CR31 and the patch round's PR1-PR11) has had a browser pass (passed afterwards - see "Browser pass of the review's UI fixes" below).
- Observation (FYI): "Ending is final" is spec-mandated (AD8) and becomes untrue when row 13-1f's undo lands - that story rewords `fw.actions.end.final` (the verbatim pin in `field-worker-actions.test.tsx` changes with it, on purpose).

**Patch review (the fixes of chunks A-C, reviewed again; 1,948 diff lines of code and tests + the records): Blind Hunter 27, Edge Case Hunter 6, Acceptance Auditor 6 -> 0 decision-needed, 18 patch (all applied), 1 defer, 15 dismissed.** The Auditor found no AC, invariant or ratified-clause violation in the fixes; its findings were the story's own text going stale, CR21 applied to one surface only, and unsupported rationales. Verified afterwards on the fresh container (:5481): domain unit 174 / live 124, API unit 1,115 / live 114, contracts 16, admin 104 files / 2,073 tests, `tsc` and ESLint on every touched package, `pnpm microcopy:check`, `contracts:check-openapi-determinism`.

- [x] [Review][Patch] PR1 - editing ANY field cleared EVERY error, including a "no access" line that is not about a value; now only an error that described a value clears (a 403 or a sign-in line stays). [WorkerActions.tsx, test] (blind)
- [x] [Review][Patch] PR2 - three of the new API specs read IST `today` BEFORE creating the worker, so a run straddling 00:00 IST could put `today` before the registration day (the control then answers 422); read after the worker exists. [lifecycle.spec.ts] (blind)
- [x] [Review][Patch] PR3 - the recovery the stale line names ("close and open the worker again") was asserted nowhere: a test closes, reopens against a changed worker, and sees the second identity read, the true state's acts and no stale lock. [field-worker-actions.test.tsx] (blind)
- [x] [Review][Patch] PR4 - CR21 had fixed the screen only: the OpenAPI suspend description (source and generated) still said "credits no new teacher", against `-454` Q6 C; it now says the code cannot be read by hand and that what a signup earns depends on the reason (not decided here); `v1.yaml` regenerated. (The Reactivate intro's "...credits new teachers" is true after every reactivation and stays.) [emit-openapi.ts, openapi/v1.yaml] (blind + auditor)
- [x] [Review][Patch] PR5 - two comments claimed more than the code: the log's accepted-race note said the page holds "no data of the worker" while it carries reasons and a date of death (it holds no name, mobile or code); the domain header says "no identity data". [log-handlers.ts, read.ts] (blind)
- [x] [Review][Patch] PR6 - the success path (focus, close, announce) sat inside the `try` whose `catch` reports a FAILED act: anything throwing there would have shown a committed act as failed, and a retry under a new key meets a 409. It is now after the `try`. [WorkerActions.tsx] (blind)
- [x] [Review][Patch] PR7 - a browser clock behind the server's could pre-fill an End date below the control's own `min`; `defaultEndDate` takes the later of today and the registration day (unit-pinned). [derive.ts, WorkerActions.tsx, derive test] (blind)
- [x] [Review][Patch] PR8 - re-pressing the open act's button did nothing while it announced `aria-expanded`; it now takes the officer to the form's first control (the form, the reason and the key survive). [WorkerActions.tsx, test] (blind)
- [x] [Review][Patch] PR9 - Move: a blank typed district enabled Confirm (now a blank is no district); a Pariwar with no other LISTED district but a truncated list got "no other district" (now the exact-text field alone, tested); and a failed REFETCH of the districts (the window refocusing) hid both controls while the chosen district stayed set and submittable (v5 keeps `data`: the error now replaces the controls only with nothing to show). RED-proved. [WorkerActions.tsx, test] (blind + edge)
- [x] [Review][Patch] PR10 - History: "Load more" was gated on `isFetchingNextPage` only - pressed during an act's refresh of the pages shown it cancelled that refresh (the act's own event missing), exactly the class `WorkerList` CR41 / CR53 gates against; gated the same way (RED-proved). The count cannot go negative; a pressed Retry restores focus to the heading; a failed "Load more" gives focus back to its button; a test title no longer claims the first-load case it did not cover. [WorkerHistory.tsx, tests] (blind + edge)
- [x] [Review][Patch] PR11 - the stale lock withdrew the acts but left "Show code" offered on the same out-of-date copy (CR26's gate reads it); `WorkerActions` now reports `onStale` and the Find page withdraws "Show code" (and a code on screen) with the acts; reopening clears it. [WorkerActions.tsx, FindWorkerPage.tsx, test] (edge)
- [x] [Review][Patch] PR12 - the `limit` clamp's comment said a word falls through to 400; `Number()` also reads 'Infinity' and hex, which clamp. The comment says so; 'Infinity' is pinned. [dto.ts, contracts test] (blind + edge)
- [x] [Review][Patch] PR13 - the move's 200 mixed the command result (state, district) with the second read (reason, end date); all four now come from the one row the lock holds. [lifecycle-handlers.ts] (blind)
- [x] [Review][Patch] PR14 - the reason-label test pinned the order of the contract's list; now by code. [field-worker-derive.test.ts] (blind)
- [x] [Review][Patch] PR15 - a busy Confirm is `aria-disabled` (so it keeps focus) and so lost `disabled:opacity-50`; it keeps a visible busy state. [WorkerActions.tsx] (blind)
- [x] [Review][Patch] PR16 - `WorkerActions` holds per-worker state (the stale lock never clears); mounted without a `key` for another worker it would carry one worker's withdrawn acts to the next. The only consumer remounts through `WorkerDetail`'s `key`; the header now says to mount with `key={fieldWorkerId}`. [WorkerActions.tsx] (edge)
- [x] [Review][Patch] PR17 - comments that now lied: the handler header's step 2 and the `preCheck` doc omitted the terminate calendar check; CR12's rationale ("the bounds need `now()` and the registration day under the lock") was false - corrected in the code and in CR12's entry. [lifecycle-handlers.ts, this file] (auditor)
- [x] [Review][Patch] PR18 - the story's own text brought in line with the code ("Spec edits reach Tasks"): AD6 (the move's source), the Dev Agent Record variance (6), AD8 (a dated REVIEW AMENDMENTS block, the developer's, awaiting BigDev), the File List (four files), the Change Log (v1.12), the browser-pass disclosure (every UI-visible fix, not five), and CR20's answered loop (here and in `deferred-work.md`). [this file, deferred-work.md] (auditor)
- [x] [Review][Defer] CR34 - `useApproveFieldWorker` and the registration mutation keep the default `networkMode: 'online'`: offline they PAUSE and run on reconnect (CR22's hazard, fixed only for the four lifecycle acts). 13.1 / 13.1a's mutations; an approval is the milder case. Deferred - recorded in `deferred-work.md`. (blind)
- Dismissed (15): (1) the stale alert gives two remedies - AD8 binds the first line verbatim, the second is the way out (PR3 proves it); (2) a Move retried after a lost answer meets `authorization_stale` and "moved by someone else" - that line is AD8's, verbatim; (3) the required `Idempotency-Key` is documented in prose only - the approve route's description (13.1a) does the same; the regenerated `v1.yaml` was excluded from the diff the layer was given; (4) `istDateOf` throws on a malformed `created_at` - the identity response is parsed by the contract; (5) impossible calendar dates get 422 and malformed ones 400 - AC6 (c) / (f) and the Errors table say so; the pre-check uses the domain's own exported `isCalendarDateString`; (6) the `limit` guard changes `listFieldWorkerEvents` for all callers - the one caller passes a validated integer; (7) "Load more" is `disabled` mid-fetch - as `WorkerList`'s; (8) "No more entries." beside a live button - the server returns `next_after` only when a row remains; (9) `focusIfUnclaimed` is imported from `marketplace/` - `WorkerList` and `CodeReveal` already do; (10) the form is named like its button, and "Saving…" is said twice - harmless; (11) `payloadHash` imported from `src/` in the spec - 13.1a's CR18 pattern; (12) the offline test mocks the client with a raw `TypeError` - `fieldWorkerGuidance` maps any non-`ApiError` to the retryable network line, and the wire is pinned by the new client test; (13) closing the panel mid-save drops the outcome (raised a third time) - accepted, see chunk C (1); (14) "Died" changes the date label without an announcement - read when the field takes focus; (15) the Reactivate intro's "credits new teachers" - an active worker's credit is the existing ratified rule (`-441` Q2 A, FR-85), true after every reactivation.

**Answered by BigDev (2026-11-08, "B, A, A"; decision-log entry `2026-11-08-456`, author-commit, committed `a55a079f`):** CR-Q1 -> (B), the "Died" date starts empty and Confirm waits for one; the AD8 amendments (a)-(g) -> (A), confirmed, with the entry; one word for one state -> (A), "Awaiting approval" on Find's selector too. All three are applied (AD8's dated block gains (h) and (i)). Items 1 and 3 and the review's other UI-visible fixes were browser-passed afterwards (next paragraph).

**Browser pass of the review's UI fixes (2026-11-08, about 06:47-06:55 IST; BigDev: "complete the browser pass").** The Mac's Chrome through Claude in Chrome (probed first: `127.0.0.1` loaded), admin `localhost:3001` -> API `:3000`, a throwaway Postgres 16 (`:5481`, removed), a Pariwar seeded through the real routes with ten workers and three passkey-minted sessions (Pariwar Admin, District Admin of Patna, District Admin of Gaya); the launcher spec was uncommitted and is deleted. **RAN, all as intended:** Find's selector reads "Awaiting approval", and so does the waiting worker's panel (`-456` item 3); "Show code" only for an active worker, gone after that worker's Suspend (CR26), absent for waiting / suspended / ended; Suspend: named form, intro with no credit clause, reason select focused and described by the intro, re-pressing keeps the reason and focuses the select (CR29, PR8), Cancel returns focus to Suspend, success is said in the status region with focus on the panel heading; Reactivate: Confirm focused and described by its intro, Enter commits; End: the finality line verbatim, the four reasons, "Last day" defaulting to today with `min` = the registration day and `max` 9999-12-31 (CR24); **"Died" empties the date, labels it "Date of death", Confirm stays disabled, and leaving "Died" puts today back (`-456` item 1)**; a date before the registration is stopped by Chrome's own validation (nothing sent; its wording is Chrome's, not ours); a worker ended "Died" with a typed past date (event `ended_on` 2026-11-05; history "Reason: Died", "Date of death: 5 Nov 2026"); another ended "Left"; the "Stopped working" line arrives in the status region and Cancel returns focus to End; Move: the current district is not offered, the 200 shows the new district, one `posted` event; a 409 `illegal_transition` (the worker suspended behind the open panel) and a 409 `authorization_stale` (moved behind it) each withdrew the acts and "Show code" with the right line plus the reopen line, focus on the heading, and no event or audit line from the refused act (CR23, PR11); history: 50 entries, then "Load more" said "13 more entries shown." and focused the first new entry, "Show history" focused its heading (CR25, PR10); a Patna District Admin's Move showed "Only a Pariwar Admin can move a worker directly.", and the line stayed when a field was edited (PR1); the Gaya District Admin was refused Patna, read the Patna part of a moved worker's history, and could Suspend in Gaya; server side: one event and one audit line per act, one `identity_viewed` per opened panel, and no name, mobile or code in the API log. **SIMULATED:** the offline leg - the API was stopped (the Vite proxy answered 500) and an `offline` event dispatched (`navigator.onLine` stayed true): the act failed with the retry line and "Try again" and never sat on "Saving…"; after the restart "Try again" committed ONE suspend (one event, one audit line). It shows the mutation does not pause under the online manager's offline state; it is not a real network drop. **NOT RUN:** Move's exact-text field for a truncated district list (CR28: needs 200+ districts); a real screen reader (the status regions were read from the DOM, not heard); the failed "Load more" and Retry paths and a panel closed mid-save (React Testing Library only); ending as "Stopped working" or "Registered by mistake" (RTL only); the console during the first legs (tracking began late - the last act cycle's console held only Vite and React DevTools notices). Observation: after a stale 409 the detail block still shows the old status under the alert - by design (the identity is not re-read, G13). No defect found; the pass changed no code.

**Code review round 2 (2026-11-08, BigDev: "1, launch all chunk in parallel") - the whole branch `bb4d8620..297bdc02` again, in round 1's chunks, all three at once: A domain + events (2,020 diff lines), B contracts + API + jobs test (2,031; `openapi/v1.yaml` excluded), C admin + `microcopy.yaml` (2,217); the records diff (1,797) given to each Acceptance Auditor as spec. Nine layers, none failed: Blind Hunter 16 / 15 / 15, Edge Case Hunter 0 / 2 / 6, Acceptance Auditor 1 / 1 / 3 -> 59 raw, 53 unique -> 0 decision-needed, 13 patch, 1 defer, 39 dismissed.** The reviewer re-read every surviving claim against the code before classifying it. All three Auditors re-traced round 1's fixes in their chunk and found them correct and complete (A: CR1, CR3-CR7; B: CR8, CR10-CR18; C: CR21-CR32, PR1-PR17), with one exception (R2-1). Checklist: two REAL GAPs, family 4 (R2-9) and family 13 (d) (R2-3); every other touched family is covered by test or by construction. Nothing is the Panel's: R2-1's copy is the developer's second line under AD8 amendment (c), not AD8's verbatim first line, and R2-7 carries out `-456` item 3 as it stands.

- [x] [Review][Patch] R2-1 (medium) - the stale panel's way out, "Close this panel and open the worker again", usually cannot be taken. After a 409 `authorization_stale` / `illegal_transition`, `onError` refreshes the lists, and the worker leaves the filtered list (the old district, or Active), so after Close there is no row to reopen and nothing names where they went. PR3's test passes only because its list mock ignores `state` (`listFieldWorkers.mockImplementation(async () => ({ items: [row(state)] ... }))`), so round 1's dismissal (1), "PR3 proves it", was WRONG. Fix: reword `fw.actions.reopen` to say the worker may now be listed under another status or district (AD8's first line stays verbatim), make the mock honour `state` and `district`, and have PR3 choose the new status before reopening. [apps/admin/src/modules/field-workers/i18n-en.ts:179, apps/admin/tests/field-worker-actions.test.tsx:87, :419] (edge + blind)
- [x] [Review][Patch] R2-2 (medium) - the reason select, the End date and Move's district controls stay editable while an act saves (only the act buttons and Cancel take `busy`). An edit made then is silently not what was sent if the act succeeds (for "Died", a date of death the officer believes they corrected), or goes out under a NEW key on "Try again" although the first request may have committed, which then meets the stale 409 about the officer's own act. Fix: `disabled={busy}` on those controls (focus is on Confirm, which keeps `aria-disabled`). [apps/admin/src/modules/field-workers/WorkerActions.tsx:261, :288, :303, :345] (edge)
- [x] [Review][Patch] R2-3 (low-medium; checklist 13 (d) REAL GAP) - a "Load more" refused for good (a 403, or the 409 `authorization_stale` of CR18's window) shows "Could not load more of the history. Try again." beside a button that stays disabled, and hides the guidance (`g !== null && !moreFailed`), so the history's own no-access line never shows. Only a 500 next-page failure is tested. Fix: when `g.retryable !== true`, show `g.text` in place of `moreError` and give focus to the heading; add the 403 leg. [apps/admin/src/modules/field-workers/WorkerHistory.tsx:88, :132, :143] (blind + edge + auditor)
- [x] [Review][Patch] R2-4 (low) - a "Load more" in flight is cancelled by an act's `refresh` (`invalidateQueries`' default `cancelRefetch`), and its promise resolves with the old pages, so `n = 0` and the status region says "No more entries." while more remain. Fix: count PAGES before and after, and say nothing when no page was added. [apps/admin/src/modules/field-workers/WorkerHistory.tsx:49-57] (edge)
- [x] [Review][Patch] R2-5 (low) - a 409 `code_not_available` from "Show code" (the worker was suspended or ended behind the panel) refreshes the lists, but the acts still offer the Active worker's Move / Suspend / End beside a line saying the worker is suspended; the next press costs a doomed request. Fix: the Find page tells `WorkerActions` the panel is stale (the `stateChanged` and reopen lines, acts withdrawn), and CodeReveal keeps its own line. [apps/admin/src/modules/field-workers/FindWorkerPage.tsx:137, apps/admin/src/modules/field-workers/CodeReveal.tsx:105] (edge)
- [x] [Review][Patch] R2-6 (low) - the history's FIRST page answering 409 `authorization_stale` (a move landing between the gate's read and the handler's, `log-handlers.ts`) shows the Approvals page's "Reload and try again." with no Retry, although a plain refetch succeeds (the gate re-reads the district). Fix: on the history surface, that 409 is retryable, with history copy. [apps/admin/src/modules/field-workers/derive.ts:51, WorkerHistory.tsx:35] (edge)
- [x] [Review][Patch] R2-7 (low) - `fw.find.empty.pending_kyc` still reads "No workers waiting for approval in this district." on the selector view that `-456` item 3 made "Awaiting approval"; `-456`'s grep for "Waiting" was case-sensitive. Fix: "No workers awaiting approval in this district." [apps/admin/src/modules/field-workers/i18n-en.ts:122] (blind + auditor)
- [x] [Review][Patch] R2-8 (low) - copy keys the components BUILD at runtime are proven to exist (the derive test's key walk) but never rendered: `fw.find.empty.${state}` for Awaiting / Suspended / Ended, `fw.actions.done.reactivate`, `fw.actions.done.end`, `fw.err.districtUnchanged`. Fix: render legs that assert each line through the real `t()`. [apps/admin/tests/field-worker-find-page.test.tsx, field-worker-actions.test.tsx] (auditor)
- [x] [Review][Patch] R2-9 (low; checklist 4 REAL GAP) - the `terminated` payload's JSDoc says `authorization.role` "is who ended the worker" and that row 13-1f's appeal reads it; it is the role of the MOST SPECIFIC grant that allowed the act (`authorizingGrant` tries `district` before `pariwar`, `check.ts` `compareGrantSpecificity`), and `role_grants` allows one officer both roles, so a dual-role officer's ending is recorded as `district_admin` and `-454` Q1 A's "a Pariwar Admin ended them -> the Panel" would route to the Pariwar Admin. Fix: reword the JSDoc, and add the fact to C2 (ii) here and in `deferred-work.md` for 13-1f (snapshot every role the actor held, or read the grants as they were). [packages/domain/src/field-worker/events.ts:206] (auditor)
- [x] [Review][Patch] R2-10 (low) - the move's pre-read skips the gate-target check (`which !== 'move'`), so a target that is neither end of the move (guard 3c; an A->B move landing between the gate and the pre-read with a body that already says `from_district: B`) is refused only under the lock, with an intent line and its `_rolled_back` twin, against the header's step 2 and I7. Fix: pre-judge `target ∉ {worker.district, to_district}` -> 409 `authorization_stale`, no audit line. [apps/api/src/modules/field-worker/lifecycle-handlers.ts:104] (edge + blind)
- [x] [Review][Patch] R2-11 (low) - the log's page cap is a bare `100` in contracts whose comment names the domain's `LIST_FIELD_WORKER_EVENTS_MAX_LIMIT`, and no sync test binds them (the five tuples are guarded; this is not), so the OpenAPI `maximum` that `forced-pagination.spec.ts` reads could drift silently. Fix: assert it against the domain constant in the sync-guard describe. [packages/contracts/src/field-workers/dto.ts:189, packages/contracts/tests/field-workers.test.ts] (auditor + edge)
- [x] [Review][Patch] R2-12 (low) - the log's "no existence oracle" leg asserts 403 for the unknown and the foreign worker but not the same body; the lifecycle denial leg compares `errOf(...).code`. Fix: compare code and message. [apps/api/tests/integration/field-worker/log.spec.ts:113] (blind)
- [x] [Review][Patch] R2-13 (low) - `verifiedSnapshot` checks NO key when `expected` names neither `permissionKey` nor `permissionKeys`; all seven callers pass one today, but the hole round 1 closed for `post` would reopen silently for the next caller. Fix: make one of the two required in the type. [packages/domain/src/field-worker/commands.ts:166] (blind)
- [x] [Review][Defer] R2-D1 - the event payload's `authorization` (`FieldWorkerAuthorizationSnapshotSchema`, shared by every field-worker event since 13.1a) does not tie `permission_key` to the event type; the commands enforce it (`verifiedSnapshot`), and `projectFieldWorkerTransition` is reached only through them (and the projector spec). Pinning a key per event touches 13.1a's events too. Deferred - recorded in `deferred-work.md`. [packages/domain/src/field-worker/events.ts:102] (blind)
- Dismissed (39). Chunk A (14): the post-vs-terminate race reads the district before authorizing (deliberate; (3d) is pinned in `commands.spec.ts` and live in `move-race.spec.ts` AC7); the old (e3) race leg removed ((3a) precedes (3c) by construction; (3c) is pinned in the guard unit tests); `errors.ts` naming the log read as a thrower (it names the API's read, which does throw); the log filters only by `stream_id` (one stream per worker, `project.ts` its only writer); `new Date(occurred_at)` (read as a Date); an untrimmed display name and an untrimmed `expectedFromDistrict` (values the screen supplies); one stale error class for (3a) and (3c) (no reader needs them apart); no legacy path for events without `authorization` (not in production); `state.test.ts` fixtures without `authorization` (the fold ignores it); no drizzle snapshot (the snapshots stop at 0020; migrations are hand-authored); a "no ciphertext" absence pin that cannot fail today (a regression guard); untested defensive branches of the log read; a Pariwar Admin's stale 409 after a concurrent move ((3d) as specified). Chunk B (13): a key reused with a different body (CR20, deferred); `to_district` judged before existence and legality (the header's documented order; both refusals write nothing); legality judged before the gate district (mirrors the domain's (2) BEATS (3d)); the log 500s on an event type it does not know (13-1f's C2 (iii) extends the tuple with the undo); the log's re-read-then-page window (CR18, DELIBERATE); the HTTP clamp leg "cannot fail" (without the clamp `1000` is a 400, so it can); no 429 in the log's OpenAPI and no write rate limit (CR19, deferred); a future `ended_on` writes an audit pair (CR12's variance (2)); a replay returns the state as of the first call (what an idempotent replay is); `from_district` whitespace (the screen sends the worker's own district); `?after=` read as 0 (the contract's "0 or absent: from the start"); `ended_on` without `format: date` (the request has the regex; the siblings' responses are plain strings); a no-key leg that does not test key-before-gate ordering (low value). Chunk C (12): "Load more" natively disabled while fetching (the `WorkerList` convention; `focusIfUnclaimed` restores focus); an unknown event type would throw in render (the client parses the strict contract first, so it is an error state; 13-1f C2 (iii)); "Check details" on the open worker (it returns early, no state is cleared); closing the panel mid-save (the server refuses a second act); the list dropping a moved worker (CR46's focus fallback); the End date's `max` (the server is the one judge, PR7); the atomic status region re-reading "History loaded." (verbosity, not a missing announcement); "Saving…" said twice (round 1's design); the find-page negative leg's code (the code read has no other 409 left); `fieldWorkerListIsStale` widened (no other caller can receive `code_not_available`); a test comparing two clock reads across 00:00 IST (a window of milliseconds); `fieldWorkerAct`'s `body: object` (the four exported wrappers are typed).
- **Round 2 applied (2026-11-08, BigDev: "1" - apply every patch; NOT committed).** All 13 patches. R2-2 holds the fields as Confirm is held - `aria-disabled` and a change that is ignored, ⛔ `disabled` (Enter in the date or the typed district submits with focus there). R2-5 adds `CodeReveal`'s `onStateChanged` and `WorkerActions`' `stateChanged` (the acts withdrawn with the `stateChanged` and reopen lines; the code's own line stays, `onStale` is not called). R2-6 adds `historyGuidance` and the copy key `fw.history.moved`; R2-1 rewrites `fw.actions.reopen` only (AD8's first line is unchanged); R2-11 exports `FIELD_WORKER_LOG_MAX_LIMIT`. New legs: admin R2-1 (the list mock filters by status; PR3 finds the worker under its new status), R2-2 x2, R2-3, R2-4, R2-5, R2-6, R2-8 x4 (with R2-7's wording); API R2-10 (the request parked after the gate on the idempotency claim's advisory lock while a move commits) and R2-12; contracts R2-11. **RED-proved** by restoring each source file to `297bdc02`: `WorkerHistory.tsx` -> R2-3, R2-4, R2-6 fail; `WorkerActions.tsx` -> both R2-2 legs and R2-5 fail; `lifecycle-handlers.ts` -> R2-10 fails (`['field_worker.posted', 'field_worker.posted_rolled_back']` where `[]` was expected). **Verified:** admin whole suite 104 files / 2085 tests; contracts 96 / 1714; domain unit `tests/field-worker` + `tests/rbac` 12 / 461; API unit 84 files, 1115 passed, 1 skipped; `tsc --noEmit` clean in admin, api, domain and contracts; `eslint` clean on every changed file; on a FRESH Postgres 16 container (`:5482`, migrated from scratch, removed afterwards) the API `tests/integration/field-worker/` folder 10 files / 115 tests (round 1: 114) and the domain `tests/integration/field-worker/` folder 10 / 124. NOT run: `ci:local`, a browser pass of the UI fixes. Row stays `review` (`done` is set when the branch lands on main, as for 13.1b).

**Review of the round-2 patches (2026-11-08, BigDev: "1" - review this patch diff before committing).** The uncommitted diff (663 code lines, 67 records lines) to three layers in parallel: Blind Hunter 15, Edge Case Hunter 5, Acceptance Auditor 12 -> 32 raw -> 1 decision-needed (BigDev's, NOT the Panel's), 10 patch, 0 defer, 15 dismissed. The Edge Case Hunter confirmed R2-4's signal against the installed TanStack query-core 5.101.0 (a silently cancelled next page joins the refetch of every page, so `!r.hasNextPage` is right; the comment's "resolves with the old pages" is imprecise) and found R2-2, R2-3, R2-10, R2-11 and R2-13 sound.

- [x] [Review][Decision] RP-D1 - **RESOLVED (BigDev: "A", decision-log entry `2026-11-08-457`, author-commit, committed alone as `26cb5763`): the second line now reads "Close this panel and find the worker again to see their current details. They may now be listed under another status, or moved to a district you cannot open."; `-457` also confirms R2-2, R2-5 (with RP-1–RP-3) and R2-6 as AD8 (j)–(l) and corrects `-456`'s count.** R2-1 rewrote `fw.actions.reopen`, but `-456` item 2 (c) QUOTES that line ("Close this panel and open the worker again to see their current details.") among the amendments it confirms "as built" - so round 2's header was wrong to call it only the developer's line, and nothing records the change ([[feedback_supersede_never_reinterpret]]). The new wording also sends a District Admin to "another district" they cannot open (Find needs a district they hold; a worker moved out answers 403). Round 2 also added AD8 behaviour no record confirms: the fields held while saving (R2-2), "Show code"'s 409 withdrawing the acts (R2-5), the history's own retryable "moved" line (R2-6); and `-456`'s "one string for 'Waiting'" count was wrong (R2-7: a case-sensitive grep). BigDev's call: the wording, and whether a new author-commit entry records it. (auditor + edge)
- [x] [Review][Patch] RP-1 - R2-5's withdrawal fires when the officer's OWN act caused the code read's 409 (Show code pressed while a Suspend or End saves; the act commits first, the 409 arrives before its 200): the success line then sits beside "status changed" and the acts stay withdrawn on a copy the 200 already corrected; the effect also leaves `problem` / `announce` up and, with a form open, drops focus to the body. Fix: ignore it while busy, clear both lines, focus the heading before closing a form (as the act's own stale path does). [apps/admin/src/modules/field-workers/WorkerActions.tsx:111-116] (blind + edge)
- [x] [Review][Patch] RP-2 - "Show code" answering 409 `authorization_stale` (the worker MOVED behind the panel) still leaves Move / Suspend / End offered on the old district - R2-5's cost with a move instead of a suspend. Fix: that 409 withdraws the acts too, with AD8's "moved" line. [apps/admin/src/modules/field-workers/CodeReveal.tsx:108] (edge)
- [x] [Review][Patch] RP-3 - R2-5 mounts two `role="alert"` regions one render apart (the code's refusal, then the acts' stale block); the second can cut off the first, which is the specific line. Fix: a withdrawal another part of the panel triggered is announced politely (`role="status"`). [WorkerActions.tsx stale block] (auditor)
- [x] [Review][Patch] RP-4 - a "Load more" cancelled by an act's refresh says nothing (R2-4) but leaves focus where the disabled button dropped it (the body). Fix: give focus back to "Load more" in that branch. [apps/admin/src/modules/field-workers/WorkerHistory.tsx:61-62] (blind)
- [x] [Review][Patch] RP-5 - R2-1 said the list mock would honour `state` AND `district`; it filters by status only, so the "moved" way out is untested. Fix: the mock filters by district too, and a leg finds a moved worker under the new district (a Pariwar Admin). [apps/admin/tests/field-worker-actions.test.tsx:316] (auditor + edge)
- [x] [Review][Patch] RP-6 - R2-12 compares the two 403s' code and message only, from two different actors. Fix: ONE actor asks for a real foreign worker and for an id that never existed, and the whole error object is compared. [apps/api/tests/integration/field-worker/log.spec.ts:113] (blind)
- [x] [Review][Patch] RP-7 - R2-13 is type-only: a cast, or a loosely typed `expected`, still reaches the body with neither key. Fix: a runtime refusal as well. [packages/domain/src/field-worker/commands.ts:166] (blind)
- [x] [Review][Patch] RP-8 - the handler header's step 2 still says "the worker no longer in the district the gate passed"; for a move R2-10 made it "the gate's district is neither the worker's district nor `to_district`" (guard 3c). [apps/api/src/modules/field-worker/lifecycle-handlers.ts:19-20] (auditor)
- [x] [Review][Patch] RP-9 - claims wider than their proof: R2-2's test title says "a retry cannot mint a new key from an edit" (no retry is driven), and its comment says holding the fields stops an edit going out "under a NEW key on Try again" (it holds only during the save; after a retryable failure an edited body gets a new key BY DESIGN - `attemptKey`, round 1 CR20 - and the server refuses a second act); R2-8's title says "each act's success line" (reactivate only). Fix: say what is proven. [WorkerActions.tsx held comment; field-worker-actions.test.tsx R2-2 / R2-8 titles] (blind + edge + auditor)
- [x] [Review][Patch] RP-10 - the records: the "Round 2 applied" note says "each source file" was restored for the RED proofs (three were) and does not list `microcopy:check` or the OpenAPI determinism check among what did not run (round 1 ran both); no round-2 File List line (`CodeReveal.tsx` is new to the story) or Change Log row; R2-3 calls a next page's 409 `authorization_stale` "refused for good" though R2-6 made it retryable; R2-4 was built by item index (as `WorkerList`), not by page count as its fix text said; the round-2 header's "two REAL GAPs" should say R2-9 corrects the doc and carries the gap; and C2 (ii)'s second remedy ("read the grants as they were at the ending") may not be buildable - `role_grants` is mutable with no history table. [this story; deferred-work.md C2 (ii)] (auditor)
- Dismissed (15): an edit after a retryable failure goes out under a new key (by design - a different body is a different request; the server refuses a second act; RP-9 corrects the overclaim); `aria-disabled` on a native select still opens it (the value reverts; the same held pattern as Confirm); R2-10 lets an "ABA" move through by its destination (it mirrors guard 3c, which accepts either end, and `field_worker.move` is the Pariwar Admin's alone); the `MoveFieldWorkerRequest` cast and import (already imported; `which === 'move'`); the R2-10 race leg's hand-built claim key (it fails loudly on a change, never falsely); its `pending` not awaited on a timeout (the test fails either way); the posted-event control (registration and approval emit no `posted`); a next page's 409 `authorization_stale` shows the generic "Try again" (accurate, and the retry works); R2-13 has no compile-fail test (RP-7 adds the runtime refusal); R2-7 goes past `-456` item 3's literal scope (it carries out the option BigDev chose; folded into RP-D1); and five confirmations that found no gap (R2-2's controlled revert, R2-3's retryable path, R2-10's parsed body, R2-11's export, R2-13's call sites).
- **Applied (2026-11-08, after BigDev's "A"; committed: the decision `26cb5763` first, then the code `312f5e46` - round 2's R2 patches and these together - then these records; NOT pushed).** RP-D1 -> A (`fw.actions.reopen`, pinned verbatim). RP-1: the withdrawal is ignored while the panel's own act saves (`busyRef`), clears `problem` / `announce`, and focuses the heading before an open form unmounts. RP-2: `CodeReveal`'s `onStateChanged(kind)` - `'state'` for `code_not_available`, `'moved'` for `authorization_stale` (AD8's moved line); `WorkerActions`' prop is now `externalStale: 'state' | 'moved' | null`. RP-3: that withdrawal's block is `role="status"`; an act's own 409 stays `role="alert"`. RP-4: a cancelled "Load more" gives focus back to the button once the refresh settles. RP-5: the list mock filters by district too, and a leg finds a moved worker under the new district. RP-6: one actor, the whole error object (only `request_id` differs - stripped; code, message and details are equal). RP-7: `verifiedSnapshot` also refuses at runtime when neither key is named. RP-8: the handler header. RP-9: the held-fields comment and the R2-2 / R2-8 titles say what is proven. **RED-proved** by mutating one fix at a time (the file restored after each): the busy guard removed -> the RP-1 own-act leg fails; the heading focus removed -> the RP-1 focus leg fails; the `'moved'` call removed -> RP-2 fails; the polite role made `alert` -> R2-5's role assertion fails. ⚠ **RP-4 is NOT proven:** jsdom keeps focus on a disabled button and will not blur it, so no leg can see focus fall; a leg that blurred first failed on jsdom itself, and the assertion was removed rather than kept vacuous - unproven until a browser pass. **Verified:** admin whole suite 104 files / 2089 tests; contracts 96 / 1714; domain unit `tests/field-worker` + `tests/rbac` 12 / 461; API unit 84 files, 1115 passed, 1 skipped; `tsc --noEmit` clean in admin, api, domain and contracts; `eslint` clean on every changed file; `pnpm microcopy:check` passed; `contracts:check-openapi-determinism` passed and `openapi/v1.yaml` came out byte-identical; on a FRESH Postgres 16 container (`:5482`, migrated, removed) the API `tests/integration/field-worker/` folder 10 files / 115 and the domain one 10 / 124 (RP-6 first failed there on `request_id`, then passed). NOT run: `ci:local`; a browser pass of round 2's UI changes.
- **Corrections to round 2's own text (this review's RP-10).** (1) Round 2's header said R2-1's copy was "the developer's second line under AD8 amendment (c)" and that nothing was the Panel's or needed a record - the second half stands (nothing is the Panel's), the first was WRONG: `-456` item 2 (c) quotes the line, so changing it needed BigDev, now `-457`. (2) "Two REAL GAPs": R2-3 closed family 13 (d)'s; R2-9 CORRECTS the doc and CARRIES family 4's gap to 13-1f, it does not close it. (3) R2-3 called a next page's 409 `authorization_stale` "refused for good"; R2-6 made that 409 retryable, so on a next page it reads "Could not load more of the history. Try again." with the button live - R2-3's fix applies to the 403 (and any other refusal no retry can help). (4) R2-4 was built by ITEM index, as `WorkerList` does, not by page count as its fix text said; equivalent, because every page before a `next_after` is full. (5) The "Round 2 applied" note's "restoring each source file" meant three files (`WorkerHistory.tsx`, `WorkerActions.tsx`, `lifecycle-handlers.ts`); R2-1, R2-7, R2-8, R2-11, R2-12 and R2-13 had no RED proof; and its NOT-run list missed `microcopy:check` and the OpenAPI determinism check (both run above). (6) C2 (ii)'s second remedy for 13-1f, "read the grants as they were at the ending", may not be buildable: `role_grants` is mutable and no grant-history table was found in `packages/domain/src/schema` (2026-11-08) - recorded in `deferred-work.md`.

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
- **TR12** - A new enum value cannot be USED in the transaction that added it, and drizzle applies every pending migration in ONE transaction: `0203`
  holds the ADD VALUE alone, and `0204` compares `state_reason_code::text` - never `'died'::field_worker_reason_code`. Never regenerate an applied
  migration ([[project_live_db_test_gotchas]], 42P07); test on a FRESH container.

### Carried to sibling stories (C) - WRITTEN to `deferred-work.md` ("Deferred from: story 13-1c-... (create-story, 2026-11-07)"). Build NONE.

- **C1 -> 13.1d.** `FIELD_WORKER_MOVE_PERMISSION_KEYS` exists: append the request keys in the commit that mints them; the acceptance passes the
  request's source as `expectedFromDistrict`; a direct move (`field_worker.posted` with key `field_worker.move`) must end any pending request and be noticed
  to both District Admins. Trigger: 13.1d create-story.
- **C2 -> 13.6 and row `13-1f`.** C4 is RULED (`-454`) and RECORDED for 13.6. Its builds are row `13-1f-field-worker-ending-undo-appeal-and-return`'s
  (`-455`): the undo of a mistaken ending and the appeal record (Q1 A - Row 50 (f): built before this route meets a real worker), the returning
  worker's link (Q2 B), the shown number on the register screen (Q3 A); it rewords AD8's "Ending is final" line. 13.6 keeps the labelling reasons
  (they extend AD8's labels and the re-declared tuples) and whether a CONDUCT ending may be appealed or undone (not ruled). Three facts this story
  fixes that 13-1f inherits: (i) an undo "restoring the worker as they were" meets the partial UNIQUE `(pariwar_id, mobile_blind_index) WHERE
  current_state <> 'terminated'` if the number was registered again meanwhile - exactly AC6 (a)'s path - and that pair is also what Q2 B's link joins;
  (ii) who hears an appeal depends on who ended the worker ("if a Pariwar Admin ended them, the Trustee Panel") - the `terminated` event's
  `authorization.role` (AD3) is that record (a `super_admin` ending is not ruled) - ⚠ but it is the role of the most specific grant that
  allowed the act, not every role the officer held, so an officer who is both the worker's District Admin and a Pariwar Admin is recorded
  as `district_admin`; 13-1f snapshots every role or reads the grants as they were at the ending (code review round 2, R2-9); (iii) the undo is a new event type in the stream AD7 reads - if
  `FieldWorkerLog.event_type` is a closed enum, 13-1f extends it and the history's labels.
- **C3 -> 13.8 / 13.5.** Credit during suspension is RULED (`-454` Q6 C): under review - HELD, credited on reactivation; at the worker's own request
  - not credited. The recorder builds the held credit (PRD FR-85 annotated). What an ending - incl. a death - does to money ALREADY EARNED is unruled
  (`-443`, `-454`): the first commission writer (13.5) asks it.
- **C5 -> 13.8 (`-455`).** The silence warning (`-454` Q4 A): the District Admin is told when a worker brings in no teacher for a set time; ended
  only after the officer tries to reach them. Needs the credit recorder; the PERIOD is not ruled (the option said "we suggest 90 days") - confirm
  with the Panel at 13.8's create-story. A suspension reason "could not be reached" was NOT ruled.
- **C4 -> 13.1e (Q-4 A; row minted at Task 0.4).** The 8-year removal: G18's guard and role work, counsel question 3.

### Testing standards

- Unit: `packages/domain/tests/**/*.test.ts`, `apps/api/tests/unit/`, `packages/contracts/tests/`, `apps/admin/tests/*.test.tsx`. Live-DB:
  `packages/domain/tests/integration/**/*.spec.ts` and `apps/api/tests/integration/`, self-skipping on `!hasDatabase`; `SET LOCAL ROLE twt_app` before policy assertions.
- Twins: 13.1a's `approval.spec.ts`, `approval-atomicity.spec.ts`, `code-read.spec.ts` (lock races), the harness; the admin `field-worker-approvals-page.test.tsx` (per-click key).
- Every guard gets a RED proof; every scan a non-vacuity floor; a green gate proves nothing about what it does not scan ([[feedback_gate_scope_semantic_coverage]]).
- No browser E2E harness exists for the admin: AC10 is RTL plus Task 8.1. State plainly what ran.

### Project Structure Notes

- New: `apps/api/src/modules/field-worker/{lifecycle-handlers,log-handlers}.ts`; `apps/admin/src/modules/field-workers/{WorkerActions,WorkerHistory}.tsx`;
  tests per Tasks 2-5; migrations `0203` + `0204` (`died`); the Panel note; decisions `-453`, `-454`, `-455`, `-456` (the review's, 2026-11-08); Row 50; rows `13-1e`, `13-1f`.
- Modified: `packages/domain/src/schema/field_workers.ts` (the reason enum + CHECK text); `packages/domain/src/field-worker/{commands,events,read,index}.ts`; `packages/domain/src/rbac/{permissions,roles}.ts`; `packages/events/src/registry.ts`;
  `packages/contracts/{src/field-workers/*,scripts/emit-openapi.ts}`; `openapi/v1.yaml`; `apps/api/src/modules/field-worker/{routes,errors,index}.ts`;
  `apps/admin/src/{api/client.ts,api/hooks.ts}`; `apps/admin/src/modules/field-workers/{FindWorkerPage,WorkerDetail,derive,i18n-en}.ts(x)`; the test files of G12 and G14.
- Variance from the epic, with reason: the move body names its expected source (D7, AD4); the log shows the actor's CURRENT name (AD7); the terminate
  route is built before 13.6 records C4, its use on a real worker gated by Row 50 (f) (AD2, Q-1 C; the epic's line and 13.1 C5 superseded by `-453`; C4 since ruled, `-454`); the code text is
  not in the log (AD9).
- Detected conflicts with a ratified text: none. `-454` Q1 A makes a mistaken ending undoable, which this story does not build; the terminate route is
  kept off real workers until row `13-1f` builds it (Row 50 (f)), and AD8's "Ending is final" line is reworded there. The Niyamavali and the Privacy
  Policy are silent on field workers.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 13; Stories 13.1 (VARIANCE block), 13.1a, 13.1b, 13.1c (incl. INHERITED D7, 13.1a C2, 13.1b C1 / C7), 13.1d, 13.6 (INHERITED C4).
- `_bmad-output/implementation-artifacts/13-1-field-worker-identity-lifecycle-state-machine.md` (QE4, QE10, QE12, QE15, QE17-QE20, section 0 edges 6-10, C4, C5, C10, C11, X3);
  `13-1a-...md` (AD3-AD8, TR4, TR6, TR10, C2, C5, C7); `13-1b-...md` (AD4, AD12, C1, C7).
- `_bmad-output/implementation-artifacts/deferred-work.md` - 13.1 C4, C5, C7, C10, C11, D7, D8; 13.1a C2, CR32, CR33, CR60; 13.1b C1, C7, CB9, CB11.
- `.decision-log.md` - `2026-11-03-441`, `-442`, `-443`, `-444`; `2026-11-04-445`, `-446`, `-447`; `2026-11-06-450`; `2026-11-08-456`; `2026-06-21-059` B(3).
- `docs/launch-gate-inventory/inventory-roster.md` Rows 48, 49; `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`;
  `trustee-panel-routing-note-2026-11-04-story-13-1a-field-worker-keys-confirm.md`; `counsel-question-2026-11-03-field-worker-data-basis.md` (question 3).
- PRD FR-85, FR-86 (`prds/prd-TWT-2026-05-22/prd.md`).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 13.1c`, 2026-11-07, in the story's worktree.

### Debug Log References

- Task 0.1 (2026-11-07): `origin/main` still `bb4d8620` (ancestor of HEAD; no `packages/` / `apps/` / `scripts/` change); journal's last
  idx 202, so `0203` / `0204` free; catalog v60 / 81 keys; next decision `-456`; no live sibling branch (14.3, 6.22b, 6.39) touches the
  field-worker domain, RBAC, the admin module or migrations (older branches touching `permissions.ts` are stale, Aug-Oct). No
  migration after `0202` touches `users` (G19 holds).
- Containers: `twt-13-1c-pg` `:5481` (dev), `twt-13-1c-red` `:5482` (AC6 (g)'s RED proof, removed), `twt-13-1c-ci` `:5483` (`ci:local`).
- ⚠ The shell's own `DATABASE_URL` is `:5432` and an `export` does not survive between tool calls: two RED-proof runs of the domain
  `log.spec.ts` went to `:5432` and failed at their first insert ("relation field_workers does not exist") - per-test-rollback specs,
  nothing persisted there. Every later run carries the URL on the command. ([[project_prepush_hook_inherits_5432]])
- A first draft of the API `lifecycle.spec.ts` refusal helper read its "before" counts AFTER the request ran (the argument was
  evaluated first), so "no audit line" could not fail - found because a RED proof (the legality pre-read removed) stayed green.
  Fixed to a thunk; the RED proofs then failed as intended.
- The domain-accessor-invariants gate refused `listFieldWorkerEvents`'s bare `.limit(limit + 1)`; it now clamps inline
  (`pageFieldWorkersForPariwar`'s form).
- The microcopy tone gate's out-of-band-blame rule fired on the admin label "Registered by mistake" (AC10 pins it verbatim): ONE
  allow entry scoped to `i18n-en.ts` and the exact phrase (the rule is for member copy about gifts). **KEPT by BigDev, 2026-11-07,
  verbatim: "Registered by mistake - keep it."** (the label and the scoped allow entry both stay).
- A throwaway browser-pass launcher spec was written into `apps/api/tests/integration/` while `ci:local` ran; moved out to the
  scratchpad within about a minute (the lint job had already passed). Never committed.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created (create-story, 2026-11-07).
- **Implemented 2026-11-07 (dev-story), six commits on the story branch, nothing pushed:** `7575ce9f` migrations `0203` + `0204`
  (`died`); `e14636da` the five keys (catalog 60 -> 61, 81 -> 86), AD3 (the three acts carry their own key's verified
  authorization, target judged against the locked district) and AD4 (`FIELD_WORKER_MOVE_PERMISSION_KEYS`, `verifiedSnapshot`'s
  `permissionKeys`, the `expectedFromDistrict` guard (3a)); `3381e55e` `listFieldWorkerEvents` (AD7) and AD10 (c)'s dated comment;
  `68baf1db` contracts + OpenAPI; `290802b2` the four write routes and the log route (AD6) + five live specs; `f311243b` the admin
  screens (AD8), AD10 (a) and (b), and one `microcopy.yaml` allow entry.
- **Tests run (all on fresh containers):** domain unit 3996 + field-worker live 135 (incl. `log.spec` 4); API field-worker live
  103 (lifecycle 14, move-race 3, terminate-race 1, log 4); jobs code-SMS live 21; contracts 1713; admin 2035 (actions 15,
  history 4). RED proofs, each failing the intended leg and restored: AC6 (g)'s `0204` held back on a fresh container (23514);
  the move-key list, the (3a) source check, suspend's (3d), terminate's key check; the log's Pariwar predicate and blank-name rule;
  the API's legality and district-unchanged pre-reads; the history read on mount and invalidating the identity instead of
  `setQueryData`.
- **Task 7 - gate, as run (⛔ through the push; nothing is pushed):** `ci:local` at `f311243b` on a FRESH container (`:5483`), run
  directly: 37 of 38 jobs green - lint, typecheck, build, every gate, `integration-tests` (api 3148, jobs 2150 among them) - and
  `test (unit)` FAILED on ONE spec this story does not touch, `packages/domain/tests/db.test.ts` "builds a pool with defaults",
  a 5000 ms timeout under load (collection 2224 s; turbo then cancelled admin / api / jobs). It passes 3/3 alone; the unit job
  re-run alone (`env -u DATABASE_URL pnpm turbo run test --concurrency=4`, same tree) was 37/37 tasks green. The oversubscription
  class ([[project_ci_local_concurrency_oversubscription]]). The push's own `ci:local` is still to run.
- **Task 8 - browser pass: RAN 2026-11-07** in the dev Mac's Chrome ("Devs MacBook Air", macOS) once BigDev reconnected it ("chrome
  connected"; earlier in the session only a Windows browser was connected and the probe failed). Against `f311243b`: a throwaway
  launcher (API :3000 on a fresh `:5481`, four workers registered and three approved through the real routes; three officers by real
  passkey flows), admin Vite :3001, a cookie helper (loopback only). Observed: as the Pariwar Admin on Find, Patna / Active - an active
  worker offers Move / Suspend / End; Suspend's reason select took focus, Confirm disabled until "Under review" was chosen; the panel
  turned Suspended with Move / Reactivate / End and the network showed the suspend POST and a list refresh, NO second identity read;
  Move offered only Gaya / Nalanda (Patna excluded) and the reasons "At the worker's request" / "Reassigned by the Trust"; moved to
  Gaya, still Suspended; "Show history" read the log only on the click: Registered, Identity check accepted, Approved, Suspended
  (Reason: Under review), Moved (From Patna to Gaya), each with the time in India and "by Meera Pariwar-Admin, Pariwar Admin". As the
  PATNA District Admin: Gaya's list 403 with the no-access line; the moved worker gone from Patna. As the GAYA District Admin:
  Reactivate (no reason; Confirm focused; Enter) -> Active, one POST; Move -> 403 and "Only a Pariwar Admin can move a worker
  directly.", the worker stayed in Gaya. As the Pariwar Admin: End's confirm showed the finality line and the four reasons; "Stopped
  working" showed the try-to-reach line; "Died" relabelled the date "Date of death" and "Left" restored "Last day"; a future date of
  death answered the ended_on line (422), today ended Gopal Yadav (Died), the panel said Ended with no actions; his history read
  "Reason: Died | Date of death: 2026-11-07"; Sita Devi ended "Left"; Mohan Lal on "Waiting for approval" offered Move / End and ended
  "Registered by mistake"; "Ended" listed all three. Server side: the rows, each event's own key and role (the reactivate
  `district_admin`), one audit line per act plus the 422's intent and twin; the refused move wrote nothing; the API log (129 lines)
  holds no worker name or mobile. ⚠ After a usage limit stopped the `find` tool, the selects of the three endings were set by
  JavaScript (the native value setter + a `change` event) and Confirm by `.click()` - synthetic events on the real page, not
  physical clicks; the earlier acts used real clicks. Not exercised in the browser: a 5xx retry (RTL only). Everything torn down;
  nothing of the pass is in the tree.
- **Variances / choices to review:** (1) the log's `limit` is CLAMPED to 100 by a `preprocess` (AC8) while the OpenAPI still declares
  `maximum: 100` (the forced-pagination guard reads a bound); (2) the `ended_on` bounds are judged by the command inside `mutate`,
  so a 422 `ended_on_invalid` writes the intent and its `_rolled_back` twin (TR2's case), asserted as such - every refusal the
  pre-read can see writes none; (3) the API pre-read also refuses a stale gate target / a stale `from_district` /
  `district_unchanged` with no line (AC1 (c), I7); (4) `stream-concurrency.spec` (e2)/(e3) rewritten: two moves from the same
  screen no longer both fulfil (13.1 D7); (5) "Registered by mistake" kept verbatim (AC10) with a file- and phrase-scoped
  microcopy allow entry - confirmed by BigDev 2026-11-07 ("Registered by mistake - keep it."); (6) ~~`CodeReveal` stays on the Find panel for every state~~ - SUPERSEDED by code review round 1 (CR26, PR11): it is rendered only while the worker is `active`, and goes with the acts after a stale 409.

### File List

New: `packages/domain/migrations/0203_field-worker-reason-died.sql`, `packages/domain/migrations/0204_field-worker-reason-subset-died.sql`,
`packages/domain/tests/integration/field-worker/log.spec.ts`, `apps/api/src/modules/field-worker/lifecycle-handlers.ts`,
`apps/api/src/modules/field-worker/log-handlers.ts`, `apps/api/tests/integration/field-worker/{lifecycle,log,move-race,terminate-race}.spec.ts`,
`apps/admin/src/modules/field-workers/WorkerActions.tsx`, `apps/admin/src/modules/field-workers/WorkerHistory.tsx`,
`apps/admin/tests/field-worker-actions.test.tsx`, `apps/admin/tests/field-worker-history.test.tsx`.

Modified: `packages/domain/migrations/meta/_journal.json`; `packages/domain/src/schema/field_workers.ts`;
`packages/domain/src/field-worker/{commands,events,read}.ts`; `packages/domain/src/rbac/{permissions,roles}.ts`;
`packages/domain/tests/field-worker/{commands-guards,events,state}.test.ts`; `packages/domain/tests/rbac/{permissions,roles}.test.ts`;
`packages/domain/tests/integration/field-worker/{_fixtures.ts,commands.spec.ts,projector-trigger.spec.ts,read.spec.ts,schema-trigger.spec.ts,stream-concurrency.spec.ts}`;
`packages/events/src/registry.ts`; `packages/events/tests/field-worker-registry-coverage.test.ts`;
`packages/contracts/src/field-workers/{dto,enums,index}.ts`; `packages/contracts/scripts/emit-openapi.ts`; `packages/contracts/tests/field-workers.test.ts`;
`openapi/v1.yaml`; `apps/api/src/modules/field-worker/{routes,index}.ts`; `apps/api/tests/integration/_field-worker-fixture.ts`;
`apps/api/tests/integration/field-worker/{_registration-harness.ts,approval.spec.ts,code-read.spec.ts}`; `apps/api/tests/unit/field-worker-errors.test.ts`;
`apps/jobs/tests/field-worker-code-sms-live.test.ts`; `apps/admin/src/api/{client,hooks}.ts`;
`apps/admin/src/modules/field-workers/{FindWorkerPage,WorkerDetail}.tsx`, `{derive,i18n-en,index}.ts`;
`apps/admin/tests/{field-worker-derive.test.ts,field-worker-find-page.test.tsx,field-worker-reads.test.tsx}`; `microcopy.yaml`.

Added by code review round 2 (2026-11-08): `apps/admin/src/modules/field-workers/CodeReveal.tsx` (13.1a's, first touched by this story: `onStateChanged`, R2-5 / RP-2); every other round-2 edit is to a file listed here.
Added by code review round 1 (2026-11-08, uncommitted): `packages/domain/src/field-worker/errors.ts`; `apps/api/src/modules/field-worker/errors.ts`;
`apps/api/tests/integration/field-worker/reads.spec.ts`; and the NEW (new, committed in `8c2f5e7a`) `apps/admin/tests/field-worker-lifecycle-client.test.ts`.
Their other review edits are to files listed above (`read.ts`, `commands.ts`, `lifecycle-handlers.ts`, `log-handlers.ts`, `dto.ts`, `emit-openapi.ts`, `openapi/v1.yaml`,
`client.ts`, `hooks.ts`, `derive.ts`, `i18n-en.ts`, `WorkerActions.tsx`, `WorkerHistory.tsx`, `WorkerDetail.tsx`, `FindWorkerPage.tsx`, and the specs and tests).

Records: this story file; `_bmad-output/implementation-artifacts/{deferred-work.md,sprint-status.yaml}`; `_bmad-output/planning-artifacts/epics.md`.

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-11-07 | 1.0 | Created by `bmad-create-story 13.1c` at `bb4d8620`: G1-G18, AD1-AD12, Q-1..Q-5 open, AC1-AC12, Tasks 0-8. Status `ready-for-dev`; no code before Task 0.3. |
| 2026-11-07 | 1.1 | Validated (`bmad-create-story validate 13.1c`, claims re-traced at `bb4d8620`; BigDev: "all" - 14 items applied). A waiting worker's acts get a screen (Find's selector gains Waiting for approval); `WorkerDetail`'s `children` passes the worker; the move's audit action is `field_worker.posted` (13.1 QE6); G12 (b) lists AD3's breakage incl. the jobs test; AD2's under-lock re-check is `result.fromState` (G20); `verifiedSnapshot` gains `permissionKeys`; G19 (display names readable, Task 0.1's check dropped); `reads.spec.ts:514` unchanged; no second identity fetch after an act; Q-1 B's costs completed; two quote sources corrected; `posted`'s registry text; "13.1a TR6"; the lifecycle result's field sources. Q-1..Q-5 still OPEN. |
| 2026-11-07 | 1.2 | BigDev answered the asks, verbatim: "Q1 C, Q2-Q5 A" (Task 0.2 done). **Q-1 C** (against the recommendation B): the terminate route takes every neutral reason from `pending_kyc`, `active` or `suspended`, with no route restriction; `terminate_not_available` and the `fromState` re-check are dropped (a concurrent termination is refused by the command inside `mutate`, as for every act); 13.1 C5's "Build NO terminate route" and the epic's "does NOT ship" line are to be superseded by `-453` (Task 0.3), replaced by "no real worker before C4 is recorded" (Row 50 (b)). Propagated through the Policy note (ending is reachable from `active` / `suspended`; FR-85; finality), section 0, AD1, AD2, AD5, AD8 (End on every non-ended state, a finality line), AD10 (c) (the SMS window re-accepted for termination), AD12, the Errors table, I5, AC6 (every reason and state; a concurrent-termination race leg; FR-85 checks), AC10, Tasks 0.2-0.6, 4.1, 4.2, 8.1, TR2, C2-C4. **Q-2 A, Q-3 A, Q-5 A:** one Panel note with four questions (C4 split in two), DRAFTED (Task 0.6), NOT sent: `trustee-panel-routing-note-2026-11-07-story-13-1c-field-worker-lifecycle.md`; its suggestions are 1 A (an appeal), 2 A (shown, information only), 3 C (by reason) and 4 A. **Q-4 A:** the row `13-1e-field-worker-eight-year-removal` is minted at Task 0.4. What an ending does to money already earned is NOT in the note (C3: 13.5 asks it). |
| 2026-11-07 | 1.3 | The Panel note REWRITTEN before sending (BigDev: "yes, rewrite question 1 and add silent and death", after challenging Question 1 with an employee who resigns and rejoins a year later). Question 1 had mixed a person who left and comes back (not an appeal) with a person ended wrongly: now 1 (a wrong ending: undo a slip, appeal a dispute), 2 (coming back: old record and code, or new), 3 (a returning number shown); added 4 (a worker who goes silent: a 90-day warning, officer decides, never automatic) and 5 (death: its own reason, on the officer's word); 6 credit during a suspension; 7 the keys. Seven questions; suggestions 1 A, 2 A, 3 A, 4 A, 5 A, 6 C, 7 A - the author's, not BigDev's. Row 50 (b) now waits on Questions 1-5, each build-needing answer with a ROW. Still DRAFTED, NOT sent. No AC or Task of the build changed: the route ships the three neutral reasons; "died" / "could not be reached" are built only if the Panel chooses them. |
| 2026-11-07 | 1.4 | Governance committed on the story branch: Task 0.0 records `01cbba52`; Task 0.3 decision `2026-11-07-453` ALONE `490510d9` (BigDev: "commit records and write decision 453") - it supersedes FOUR author / BigDev texts, not two: writing it found `-442`'s "terminate waits on Story 13.6's C4" and Story 13.6's INHERITED C4 lines besides 13.1 C5 and the 13.1c epic line (AD2 and Task 0.5 updated); Task 0.4 (BigDev: "go ahead with task 0.4") `0b329bb4` - roster Row 50 `field-worker-lifecycle-live` (a)-(e), (c) MET; dated lines at Row 48 (f), (i); row `13-1e-field-worker-eight-year-removal: backlog` and its `epics.md` stub; ledger `2026-11-07g`. Task 0.6's note: DRAFTED, NOT sent. Next: Task 0.5, then Task 0.1's re-check and code. |
| 2026-11-07 | 1.5 | Task 0.5 (BigDev: "go ahead with task 0.5"): `epics.md` annotated, nothing edited - under Story 13.1c, the answers, the supersession of its "does NOT ship" line by `-453` (with the other three texts), Row 50 (b) in its place, and the seven-question note (DRAFTED, NOT sent); under Story 13.6's INHERITED C4, its two "before 13.1c's terminate route ships" lines superseded, C4 put to the Panel from 13.1c, 13.6 RECORDS the answer. Task 0.5's own text said to write that the route is "BUILT": written as DECIDED, not built, because no code exists. |
| 2026-11-07 | 1.6 | BigDev: "note sent to panel" - the seven-question Panel note is SENT (as committed at `01cbba52`; channel, time and whether the sent text is identical are NOT recorded). Recorded in the note's AWAITING block (the rest kept as drafted), dated lines at Row 50 and Row 48 (i), `deferred-work.md` C2, the `epics.md` 13.6 annotation (a dated pointer, nothing edited) and ledger `2026-11-07i`. No ruling; every Row 50 leg but (c) stays open. |
| 2026-11-07 | 1.7 | The Panel RULED (BigDev relayed: "by DR and KB / Q1 A, Q2 B, Q3 A, Q4 A, Q5 A, Q6 C, Q7 A") - decision `2026-11-07-454` committed ALONE `98cebb74` (Trustee-ratified). Q2 B was NOT our suggestion: a returning worker gets a new code, linked to the old record. Row 50 (a) and (d) MET; (b)'s answers recorded, its rows OPEN (an undo and appeal record, the link, the shown-number line, the silence warning, the reason "died" - BigDev's scheduling); Row 48 (i): 13.1c's contribution discharged. 13.6's C4 RECORDED. Not ruled: Q4's period, a "could not be reached" reason, credit for a wrongly-ended worker's gap, money already earned. PRD FR-85 annotated (the under-review hold). No AC of this story changed yet: the build still ships the three neutral reasons; whether "died" (and the rest) joins THIS story is the open scheduling question. |
| 2026-11-07 | 1.8 | BigDev: "yes, apply the split" - decision `2026-11-07-455` (author-commit, alone `608f9faf`) amends `-453` AD1 / AD2 / AD11. **This story gains the reason `died`** (`-454` Q5 A): on the officer's word, `ended_on` = the date of death; TWO hand-authored migrations (`0203` ADD VALUE alone; `0204` the reason-subset CHECK by `::text` - TR12); AD2, AD8 ("Died", "Date of death"), AD11, I5, AC6 (g), Tasks 2.0 / 3.1 / 5.2, Project Structure. **Not here:** the undo, appeal record, link and shown number - row `13-1f` (C2), whose undo + appeal gate this route's go-live (Row 50 (f), new); the silence warning - 13.8 (C5, new; its period not ruled); the held credit - 13.8 / 13.5 (C3). Row 50 (b) MET. |
| 2026-11-07 | 1.9 | Validated a second time (`bmad-create-story validate 13.1c`, at `2852318f`; `origin/main` still `bb4d8620`, no `packages/` / `apps/` change; `0203` / `0204` free on every branch; BigDev: "all" - 13 items applied). **`died` goes LAST in `FIELD_WORKER_REASON_CODES`** (`ADD VALUE` appends; `field-workers-policy-regression.spec.ts:67` pins the enum order) - G5, AD11, Task 2.0. **AC10 names the FOUR reasons**, the "Date of death" relabel and the `-454` Q4 A line. **Policy meaning** rewritten to the Panel's ruled sentence (`-454` Q6 C, Q1 A, Q2 B), with "this story builds none of it; `acceptsNewAttributions` is not edited". **Q4 A binds `inactive` here:** End's confirm shows "End a worker for this only after you have tried to reach them." (AD2, AD8, Task 5.2) - a line, no attestation. Rulings table gains `-454` Q1 / Q4 / Q5 / Q6 / Q7 and `-455`; the opening paragraph, section 0 edges 2-4, cost (a), AD2, AD5, AD12 and Project Structure read as RULED (gate Row 50 (f); keys confirmed; undo / appeal in `13-1f`). Header NUMBERS (next decision `-456`, ledger `2026-11-07l`, Row 50 appended). `schema-trigger.spec.ts` gains `died`-as-suspension refused (AC6 (g)); AC6 (g)'s RED proof is a development-time mutation; AD10 (c)'s ground narrowed (the text tells a worker their own code); Task 0.1 renumbers on collision; Task 8.1 ends one "Died"; C2 carries three facts to `13-1f` (the mobile index on undo, the ender's role, the log's event type) - also in `deferred-work.md`. No AC of the build changed beyond AC6 (g) and AC10; nothing went to the Panel. |
| 2026-11-07 | 1.11 | Task 8.1 ran in the Mac's Chrome after BigDev reconnected it (move, suspend, reactivate by the current district's District Admin, the three endings incl. "Died", the history, a District Admin of another district refused, Move refused to a District Admin). All tasks done; Status -> `review`; row -> `review`. |
| 2026-11-07 | 1.10 | `bmad-dev-story 13.1c`: Tasks 0.1-7 done (six code commits `7575ce9f`..`f311243b`, nothing pushed); Task 8 (the browser pass) NOT YET RUN - the Mac's Chrome dropped and only a Windows browser was connected. `ci:local` at `f311243b` on a fresh container: 37/38, `test (unit)` failed on an untouched spec's load timeout (`db.test.ts`); the unit job re-run alone 37/37. Status stays `in-progress` until Task 8. `deferred-work.md`: CB9 / 13.1b C7 / C1 and 13.1a CR60 BUILT on the branch (close on landing); CR33's re-trigger confirmed. |
| 2026-11-08 | 1.12 | CODE REVIEW round 1 (`bmad-code-review 13.1c`, BigDev: "chunk, complete all chunks one by one, apply all finding, run adversarial review on patches applied, apply any further findings"): chunks A (domain + events), B (contracts + API), C (admin), then a review of the patches. 0 Panel questions. Findings CR1-CR32 and PR1-PR18 APPLIED (uncommitted), defers CR9 / CR19 / CR20 / CR34 in `deferred-work.md`, one decision (CR-Q1) and the AD8 amendments left for BigDev. The row STAYS `review`. See `### Review Findings`. |
| 2026-11-08 | 1.13 | BigDev answered the review's three questions: "B, A, A" (decision-log entry `2026-11-08-456`, author-commit, committed `a55a079f`). (1) CR-Q1 B: choosing "Died" EMPTIES the End date and Confirm waits for one the officer types; leaving "Died" puts today back (`WorkerActions.tsx` `chooseReason`; two new legs in `field-worker-actions.test.tsx`, RED-proved by removing the change). (2) The seven AD8 amendments (a)-(g) CONFIRMED; the dated block is marked so and gains (h) the "Died" date and (i) the word. (3) Find's state selector reads "Awaiting approval" (`fw.find.state.pending_kyc`), as the state's label, the nav link and the Approvals page already do; AC10, the Files table and Task 5.2 carry the new words. CR-Q1 resolved; the "Left for BigDev" line answered. Browser-passed in v1.14. |
| 2026-11-08 | 1.14 | BigDev: "complete the browser pass". The review's UI-visible fixes (CR21-CR32, PR1-PR17) and `-456` items 1 and 3 ran in the Mac's Chrome against a seeded throwaway stack (Pariwar Admin and two District Admins): suspend, reactivate, end (Left and Died with a typed date), move, both 409 stale locks, "Show code" gating, history "Load more", the "Died" date emptied, one word for the waiting state. The offline leg was SIMULATED (API stopped plus an `offline` event); Move's truncated-districts field, a real screen reader and the RTL-only failure paths were NOT run. No defect; no code changed. Recorded in Review Findings ("Browser pass of the review's UI fixes"). BigDev: "commit it" - committed on the story branch, not pushed: the decision `a55a079f` (status corrected in the commit after it), the code `8c2f5e7a` (30 files, incl. the new `field-worker-lifecycle-client.test.ts`), and the commit that adds this line (story, `deferred-work.md`, the ledger). |
| 2026-11-08 | 1.15 | CODE REVIEW round 2 (`bmad-code-review 13.1c`, BigDev: "1, launch all chunk in parallel"): the whole branch again in round 1's chunks, nine layers in parallel -> 13 patches (R2-1-R2-13, applied on "1"), 1 defer (R2-D1, `deferred-work.md`), 39 dismissed; round 1's dismissal (1) of the stale alert found WRONG (R2-1). Then a review of the round-2 patches (BigDev: "1"): 1 decision (RP-D1, BigDev "A" -> decision-log entry `2026-11-08-457`, committed alone `26cb5763`: the stale panel's second line, AD8 (j)-(l), `-456`'s count corrected), 10 patches (RP-1-RP-10, applied), 15 dismissed. Verified as in the Review Findings (admin 2089, contracts 1714, API live 115, domain live 124, both gates); RP-4 unproven in jsdom; `ci:local` and a browser pass NOT run. Committed: `26cb5763` (decision), `312f5e46` (code), then the records; NOT pushed. Row stays `review`. |
