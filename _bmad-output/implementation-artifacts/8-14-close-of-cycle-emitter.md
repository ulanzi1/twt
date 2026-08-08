---
baseline_commit: d3d8e92
---

# Story 8.14: Close-of-Cycle Emitter — `alert.closed` `[SUBSTRATE / CORRECTIVE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **contribution loop**,
I want a cycle's alert to actually transition `live → closed` at the FR-22 hard Day-15 close,
so that closed cycles exist as a fact in the system — and every downstream consumer that has been built against that fact for four stories can finally observe it.

---

## ⛔ Why this story exists — a producer was committed, assigned, and then dropped by a rescope

This is a **corrective engineering story**, not new capability. `alert.closed` is fully specified —
reducer arm, payload schema, event registration, five consumers — and **has no production emitter
anywhere in the repository**. The transition never fires.

**The root cause is a circular attribution between two `done` stories:**

| Story | What it said | Where |
|---|---|---|
| **8.1** | *"this story emits only the cycle-open transitions `alert.frozen/published/live`… `alert.closed` is Story 8.9, `alert.settled` is Epic 9 — **the reducer arms exist, the emitters don't**."* | `8-1-alert-state-machine-cycle-open-trigger.md:96` |
| **8.9** | *"**Story 8.1 (shipped)** \| Alert lifecycle **already implements `live → closed` as a hard transition**."* → and on that premise ratified *"Do not touch `live → closed` timing."* | `8-9-calendar-aware-close-of-cycle-timing.md` scope table |

8.9's premise is false. 8.1 assigned the emitter forward; 8.9's 2026-07-24 rescope assumed it already
existed and reframed itself to the reconciliation tail. Neither built it. **Story 8.9's file contains
zero occurrences of `alert.closed` or "emitter"**, and none of its five ACs is a producer AC — so 8.9
is correctly `done` against its own scope, while the obligation silently evaporated.

⚠ **No decision or ADR ever removed this producer.** `.decision-log.md` and `docs/adr/` contain no entry
changing the lifecycle; `docs/adr/ADR-0035-reconciliation-matcher-mechanism.md:145` *consumes* it.
Absence here is an omission, not an intentional design change.

> ### The mechanization lesson, stated because this story must not repeat it
>
> Story 8.9's **AC3** was a regression fence asserting the `live → closed` transition is
> **"byte-unchanged"**, proven by a revert-sanity test. It passed. **Byte-unchanged is satisfied by code
> that never runs** — the fence guarded a reducer arm with no emitter and reported green.
> **This story's gate must be end-to-end (AC6), never a diff assertion.**

---

## The evidence, so the dev agent does not re-derive it

- **No append site.** The only alert event types appended in all of `apps/*/src` + `packages/*/src` are
  `alert.frozen`, `alert.published`, `alert.live`. The registry says so in its own words:
  `packages/events/src/registry.ts:406-407` — *"only frozen/published/live (the cycle-open path)."*
- **The one dynamic append site** (`apps/api/src/modules/reconciliation/handlers.ts:147`,
  `appendPoolEvent`) is bounded — both callers (`:312`, `:374`) pass `reconciliation.*` constants onto
  the **pool** stream, never an alert stream.
- **No closing job.** The full scheduled inventory is: Telegram/WA webhook processors, member-renewal,
  data-export vacuum, report-export vacuum, device-token cleanup, DigiLocker cert refresh, idempotency
  vacuum, validity-cache GC, matcher sweep, cycle-open sweep, and three contribution-notify sweeps
  (`CYCLE_OPEN`, `DEADLINE_REMINDER`, `PENDING_MATCH_RETRY`). **None closes an alert.**
- **`CYCLE_WINDOW_DAYS = 15`** (`packages/contracts/src/alerts/contribution-loop-templates.ts:43`) is
  pure display/window arithmetic feeding `computeDaysRemaining` — **not** a transition trigger.
- **`alert.settled` is transitively dead** — its only transition is `{ from: 'closed', … }`
  (`packages/domain/src/alert/state.ts:109`).
- **Tests prove the reducer, not the path.** `packages/domain/tests/alert/state.test.ts:55` is a pure
  reducer call on a synthetic event; `packages/validity-service/tests/integration/contribution-facts.spec.ts:296`
  raw-`INSERT`s `'alert.closed','{}'::jsonb, …, NULL` straight into `events_log`, bypassing both
  `appendEvent` and the projector.
- **Live corroboration (test DB, 2026-08-08):** 1,246 `alert.closed` events, **all** with `actor_id`
  NULL and exactly **one** distinct payload; `alerts.current_state` = `live` for all 1,287 rows —
  **zero** closed, zero settled. Not one was produced by application code.

---

## In scope / out of scope

| In scope (8.14) | Out of scope → owner |
|---|---|
| A domain-side `closeCycleAlert` driving `live → closed` through the EXISTING `projectAlertState` (**AC1**, **D1**). | A second append path, a new projector, or any edit to `projectAlertState`'s genesis/validation logic. |
| An `apps/jobs` sweep that closes due alerts at the FR-22 hard Day-15 boundary (**AC2**, **D2**). | Changing **when** the close happens. FR-22's Day-15 is ratified; 8.9 re-ratified it. This story does not move the deadline. |
| The close instant computed in `apps/jobs` from `CYCLE_WINDOW_DAYS` and passed EXPLICITLY into the domain (**AC3**, **D3**). | `@twt/domain` importing `@twt/contracts` — **forbidden** (turbo cycle, `packages/domain/src/errors.ts:41`). |
| Idempotency + concurrency safety on redelivery (**AC4**, **D4**). | `alert.settled`. Epic 9's exclusive; still unemitted. **Escalation 2.** |
| An **end-to-end** gate proving the real path moves `skips_current_year` (**AC6**, **D6**). | A "byte-unchanged" revert-sanity fence. That is the failure mode this story corrects. |
| Recording what the emitter does **not** retroactively fix (**AC7**). | **Backfilling historical un-closed cycles.** ⛔ **Escalation 1 — an explicit decision, not an implementer default.** |
| | Any change to R7, missed-cycle semantics, restoration discipline, or the 10.27 surface. |

---

## Acceptance Criteria

### AC1 — `closeCycleAlert` reuses the EXISTING projector; it does not add a second write path

**Given** `packages/domain/src/alert/project.ts`'s `projectAlertState`, which is already **generic over
all five `AlertEventType`s** (`:86`), appends to `events_log`, replays via `replayAlertState`, and
upserts `alerts.current_state` under the `app.alert_state_writer` guard (migration `0078`)

**Then** a `closeCycleAlert(client, input)` function is added to `packages/domain/src/alert/project.ts`
mirroring `openCycleAlert` (`:431`), which:

- resolves the alert for the cycle (deterministic `deriveAlertId`, the 8.1 identity — never a new id
  scheme);
- **refuses to close an alert that is not `live`** — a `closed`/`settled` alert is a **no-op success**
  (idempotent redelivery), a `draft`/`frozen`/`published` alert is an **error** (a cycle whose window
  never opened cannot close);
- calls `projectAlertState` with `eventType: 'alert.closed'` and a payload validated against the
  already-registered `AlertClosedPayloadSchema` (`alert/events.ts:140` — `{ ...auditShape }.strict()`);
- passes `actorId: null` — **NULL = system**, the documented convention at `project.ts:89-90` and the
  same posture the cycle-open trigger uses.

**And** ⛔ **`projectAlertState` is NOT modified.** Its genesis rules (`:151-160`) and `alert.frozen`
cross-validation (`:165-175`) are byte-unchanged. If a change there looks necessary, that is a finding —
raise it.

**And** the function runs on the **caller's** transaction/client (the `openCycleAlert` contract), never
opening its own.

### AC2 — The sweep, mirroring `CYCLE_OPEN_ALERT_SWEEP` exactly

**Given** the established sibling `apps/jobs/src/scheduler/cycle-open-alert.ts` (registered at `:287`)

**Then** a close-of-cycle sweep is added in `apps/jobs/src/scheduler/` that:

- selects `live` alerts whose Day-15 window has elapsed, **bounded** by an explicit batch limit
  mirroring `DEFAULT_CYCLE_OPEN_ALERT_SWEEP_LIMIT` (`cycle-open-alert.ts:41`) — a full batch is
  **logged, never silently capped**;
- runs on the **BYPASSRLS service pool** for the cross-tenant scan, then does each close inside
  `withPariwarScope` for the tenant-scoped write;
- registers via `boss.schedule` with an IST (`Asia/Kolkata`) cron, env-overridable, following the
  `DEFAULT_CYCLE_OPEN_ALERT_SWEEP_CRON` precedent (`:35-36`);
- isolates each alert's close so **one failure cannot abort the batch** — per-candidate `SAVEPOINT`,
  the convention established by 10.23's batch writer
  ([[project_domain_limit_clamp_and_savepoint_retry]]).

**And** ⛔ **the registration function is CALLED from `apps/jobs/src/boot.ts`, or it never runs.**
`boot.ts` is the single process-boot call site that wires every sweep into the live `pg-boss`
instance — `registerCycleOpenAlertWorkers(boss, {...})` at `boot.ts:584` (imported at `:92`) is the
pattern to mirror exactly, alongside `registerNewsPublishWorker`/`registerModerationNotifyWorker`. A
new `registerCloseCycleAlertWorkers`-style export that is never imported and called from `boot.ts` is
byte-for-byte the defect class this story exists to correct: code that exists but never executes in
production. Wiring `boot.ts` is part of AC2, not a follow-up.

**And** ⚠ **unlike cycle-open, this sweep is the PRIMARY path, not a recovery net.** Cycle-open's D4
made the sweep secondary to a post-commit enqueue because a freeze is an event you can hook. A Day-15
close is a **time** boundary with nothing to hook, so the periodic sweep IS the mechanism. **Say that
at the top of the file**, because the next reader will otherwise copy cycle-open's "recovery only"
framing and under-schedule it.

### AC3 — The close instant is computed in `apps/jobs` and passed in EXPLICITLY

**Given** ⛔ **`@twt/domain` MUST NOT import `@twt/contracts`** (turbo cycle — stated at
`packages/domain/src/errors.ts:41`), while `CYCLE_WINDOW_DAYS = 15` lives in
`packages/contracts/src/alerts/contribution-loop-templates.ts:43`

**Then** the **job** computes the close instant (it already imports both `CYCLE_WINDOW_DAYS` and
`computeDaysRemaining` — `contribution-notify-triggers.ts:40,48`) and passes it to `closeCycleAlert` as
an **explicit `Date`**. The domain function takes the instant as a parameter and **never** re-derives
it, reads a wall clock, or hardcodes `15`.

> ### D3 — the anchor is the `cycle.frozen` payload, not the table column
>
> The authoritative anchor is **`cycle.frozen`'s `attestation.committed_at`** — the exact value
> `openCycleAlert` reads (`project.ts:447`) and the exact value the member-facing countdown is computed
> from (`computeDaysRemaining(committedAt)`, `contribution-loop-templates.ts:61`).
>
> ⚠ `cycle_freeze_commits.committed_at` is a column with `defaultNow()`
> (`schema/cycle_freeze_commits.ts:58`). It may be used as a **sweep prefilter** for query efficiency,
> but the close instant written must come from the **event payload**. Using the column as the authority
> risks a member's deadline disagreeing with the countdown they were shown.

**And** window arithmetic is **fixed-ms UTC** (`committedAt.getTime() + CYCLE_WINDOW_DAYS * MS_PER_DAY`),
**never** `setDate`/`getDate` — those read the process's local timezone
(`contribution-loop-templates.ts:44-48`).

### AC4 — Idempotent and concurrency-safe

**Then** a redelivered or double-scheduled close is safe:

- the `events_log (stream_id, event_version)` unique index is the race arbiter — a concurrent second
  close loses and surfaces `PoolStreamConcurrencyError` (`project.ts:196-199`), which the sweep treats
  as **benign** (another worker won);
- a sequential redelivery short-circuits on the not-`live` precondition (AC1) and is a **no-op success**;
- **no second `alert.closed` is ever appended to a stream.** Pinned by test.

### AC5 — The Day-15 boundary is preserved exactly, and nothing else moves

**Then** `CYCLE_WINDOW_DAYS`, `computeDaysRemaining`, the My Pool card window
(`apps/api/src/modules/member-pool/handlers.ts:459-465`), and the deadline-reminder sweep window are
**unchanged in behaviour**. This story adds a transition **at** the existing boundary; it does not move,
soften, or calendar-adjust it.

**And** ⚠ **the reconciliation tail is NOT the contribution window.** Story 8.9's holiday-calendar
resolver governs post-close reconciliation timing only
([[project_calendar_aware_tail_not_window_extension]]). **Do not apply `reconciliationTailDeadline` to
the close instant** — that would re-open the exact rescope 8.9 ratified shut.

### AC6 — ⭐ THE GATE IS END-TO-END. A byte-unchanged assertion does not satisfy this AC.

**Given** the 8.9 AC3 failure — a revert-sanity fence over a reducer arm with no emitter reported green

**Then** a **live-DB** test drives the REAL production path and asserts the full chain:

1. open a cycle through the real cycle-open path → alert reaches `live`;
2. assign a member (`member_pool_assignments`, from the persisted snapshot);
3. advance past the Day-15 boundary and **run the actual sweep function**;
4. assert `alerts.current_state = 'closed'` **and** a real `alert.closed` row exists in `events_log`
   with a **non-fixture payload** (schema-validated, not `'{}'`);
5. assert `deriveContributionFacts` now reports **`skips_current_year = 1`** for that member.

**And** ⛔ **step 5 is the load-bearing one.** It is the first test in the repository proving the R7
fact chain works from a production-produced closed cycle rather than a manufactured one.

**And** a **revert-probe** is run: disable the emitter, confirm the test goes **RED**. A gate that
passes with the feature reverted is the defect this story exists to correct
([[feedback_gate_scope_semantic_coverage]]).

**And** ⚠ the existing fixture-based specs (`contribution-facts.spec.ts:296` and siblings) **stay as
they are** — they legitimately unit-test the fact derivation in isolation. This AC **adds** the missing
integration proof; it does not rewrite them.

### AC7 — No backfill, no floor, no governance dependency — the system is PRE-LAUNCH

**Given** the system has **never run in production** — the launch-gate inventory is framed throughout
around *"pre-launch measurement"* and *"Phase 1 launch"*, with the 4L measurement still un-executed
(`docs/launch-gate-inventory/inventory-roster.md:197-202`)

**Then** the emitter is **unconditional**. It closes any `live` alert past its Day-15 boundary, with
**no floor instant and no backfill switch**.

**And** the reasoning is stated at the sweep's definition site, because the absence of a floor will
otherwise look like an oversight to the next reader:

> There is no historical member data. No real member has ever been assigned to a cycle, so no member
> can be retroactively assigned a consequence for a period when this emitter did not exist. When the
> system launches, the emitter exists from day one and every cycle closes on time. **"Backfill" has no
> referent here.**

**And** ⚠ the only real consequence is a **test-fixture** one: dev/CI databases accumulate `live` alerts
seeded by fixtures (1,287 in `twt-test-pg` as of 2026-08-08), so a sweep run against a shared dev DB
will close them in bulk. That is a **test-isolation concern, not a policy one** — handle it in the test
setup, never by adding a production floor to compensate.

### AC8 — Suite + gates green, with a baseline

**Then** `pnpm ci:local` is green at `--concurrency=4` ([[project_ci_local_concurrency_oversubscription]]),
and the live-DB suite runs against `twt-test-pg`:5433.

**And** a **baseline is captured before any edit**. ⚠ **Expect real breakage, and do not assume
innocence** — this story makes a previously-unreachable state reachable. Specs written against the
assumption that alerts are always `live` may legitimately fail. Chase each to root cause; confirm
innocence by running the suspect spec in isolation
([[project_ci_local_double_run_pollution]], [[project_known_livedb_test_failures]]).

**And** the `alert-state-invariant` gate must stay green — `alerts.current_state` remains
**projector-only**, written solely through `projectAlertState` under the `app.alert_state_writer` guard.

---

## Tasks / Subtasks

- [x] **Task 1 — Baseline** (AC8): capture a full `ci:local` + live-DB baseline BEFORE any edit.
- [x] **Task 2 — Domain `closeCycleAlert`** (AC1, AC3, AC4)
  - [x] Add to `packages/domain/src/alert/project.ts`, mirroring `openCycleAlert` (`:431`)
  - [x] Not-`live` precondition: `closed`/`settled` → no-op success; pre-`live` → error
  - [x] Explicit close-instant parameter; no clock read, no `15` in domain
  - [x] Export via `packages/domain/src/alert/index.ts` (already `export * from './project.js'` — no edit needed)
- [x] **Task 3 — The sweep** (AC2, AC3, AC7) — **not blocked**
  - [x] Unconditional emitter: **no floor instant, no backfill switch** (AC7); state the pre-launch reasoning at the definition site
  - [x] New module in `apps/jobs/src/scheduler/`, mirroring `cycle-open-alert.ts`
  - [x] Anchor on `cycle.frozen`'s `attestation.committed_at` (D3); table column as prefilter only
  - [x] Per-candidate `SAVEPOINT`; bounded batch; full-batch logging
  - [x] Register the queue + `boss.schedule` (IST cron, env-overridable); add to `QUEUE_NAMES`
  - [x] **Wire the registration into `apps/jobs/src/boot.ts`** (mirror the
        `registerCycleOpenAlertWorkers(boss, {...})` call at `boot.ts:584`, import at `:92`) — unwired
        code never runs at process boot
  - [x] Header comment: **this sweep is PRIMARY, not recovery** (AC2)
- [x] **Task 4 — The end-to-end gate** (AC6)
  - [x] Live-DB test: real cycle-open → assign → advance → run sweep → `closed` + real event + `skips_current_year = 1`
  - [x] **Revert-probe it RED** (3/3 RED with the emitter removed — see Debug Log)
- [x] **Task 5 — Idempotency + concurrency tests** (AC4)
- [x] **Task 6 — Boundary regression** (AC5): Day-15 math and the four consumer windows behave unchanged
- [x] **Task 7 — Records** (AC7, Escalations)
  - [x] `deferred-work.md`: Escalation 2 (**record only** — Epic 9's, do not expand scope)
  - [x] `deferred-work.md`: Escalation 3 (**retrospective/process finding** — do not build the detector)
  - [x] `sprint-status.yaml` — one combined ledger entry at completion ([[project_sprint_status_ledger]])
  - [x] ⚠ Governance-shaped records commit separately and FIRST ([[feedback_governance_commits_precede_implementation]])
        — the `deferred-work.md` edit is staged as its own `governance:` commit ahead of the `story(8.14):` commit; **not yet committed** (commits are the user's call)
  - [x] ⛔ **Do NOT open a new governance decision** unless implementation exposes a genuinely new policy question — **none opened; none was needed**

### Review Findings

**Code review (bmad-code-review, 2026-08-08)** — 3 layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor), all completed. 15 unified findings after dedup; 5 dismissed as false positives or already handled elsewhere (verified against the actual schema/code, not taken at face value).

- [x] [Review][Patch] D3 anchor validation reads as stronger than it is — `closeCycleAlert` only checks `closeAt > committedAt`, never that `closeAt` is actually anchored to `committedAt + CYCLE_WINDOW_DAYS`; any positive offset from the freeze passes. **Resolved (2026-08-08):** the check itself stays as-is — `@twt/domain` cannot import `CYCLE_WINDOW_DAYS` from `@twt/contracts`, so a precise window check isn't available here without a bigger contract change, and the user chose not to take that on now. **Applied:** rewrote the docstring and the thrown error message so they no longer claim the guard "refuses an instant that could not possibly be this cycle's Day-15 boundary" — they now state plainly it is a minimal sanity floor (closeAt must postdate the freeze), not a Day-15 window check. [packages/domain/src/alert/project.ts:561-577]
- [x] [Review][Dismissed] `closeAt` is validated but never persisted on the `alert.closed` event — `events_log.occurred_at` stays the DB-default recording instant, not the FR-22 close instant. **Resolved (2026-08-08):** accepted as a documented tradeoff, no code change. `projectAlertState` is AC1-frozen and the `.strict()` payload schema has no field for it; the implementer's own Completion Notes already reasoned through this exact tradeoff and flagged it for review — this review confirms the reasoning and closes it without further action. [packages/domain/src/alert/project.ts:508-514]
- [x] [Review][Patch] Sweep prefilter test coverage gap — the D3 regression test (`close-cycle-alert-live.test.ts`) only drags `cycle_freeze_commits.committed_at` into the PAST (safe/looser prefilter direction). No test covers the dangerous direction: the column dragged into the FUTURE relative to the payload's `committed_at`, which would make `c.committed_at <= $1` silently EXCLUDE a genuinely-due alert from ever being scanned — leaving it permanently `live` with no alarm. **Applied:** added a 4th cohort cycle + a `D3 (dangerous direction)` live-DB test pinning this exact behavior (`scanned: 0`, alert stays `live`) so the gap is visible and regression-tested rather than silent. [apps/jobs/tests/close-cycle-alert-live.test.ts:269-322]
- [x] [Review][Patch] `registerCloseCycleAlertWorkers` — the actual pg-boss wiring (`createQueue`/`work`/`schedule`) and the `boot.ts` call site — is never exercised by any test. Both new test files call `runCloseCycleAlertSweep` directly. Given the story's entire thesis is "an unwired registration function is invisible and never runs," nothing would fail if a future edit dropped the `boot.ts` call. **Applied:** added 3 DB-free tests asserting `createQueue`/`work`/`schedule` are called with the right queue name/cron/tz (including the env-override seam), and that the registered `boss.work` handler actually invokes `runCloseCycleAlertSweep`. [apps/jobs/tests/close-cycle-alert.test.ts:141-196]
- [x] [Review][Patch] Missing index — the hourly cross-tenant BYPASSRLS scan filters on `alerts.current_state` and filters/orders on `cycle_freeze_commits.committed_at`; neither column is indexed (verified: `cycle_freeze_commits.ts` indexes only `pariwar_id` and `trigger_delivered`; `alerts.ts` indexes only `pariwar_id` and a unique index on `cycle_id`). The sweep's own header comment calls the column "an indexed prefilter" — it isn't. **Applied:** hand-authored migration 0098 (drizzle snapshot baseline is frozen at 0020 per the 0021-0097 convention — regenerating would emit a bloated catch-up migration) adding a partial index `alerts_current_state_live_idx` (`WHERE current_state = 'live'`) and `cycle_freeze_commits_committed_at_idx`; applied and verified against `twt-test-pg`:5433. [packages/domain/migrations/0098_story-8-14-close-cycle-alert-indexes.sql, packages/domain/src/schema/cycle_freeze_commits.ts:66-70, packages/domain/src/schema/alerts.ts:143-147]
- [x] [Review][Patch] Fragile test assertion — `expect(scan!.sql).not.toMatch(/15/)` (the "not hardcoded 15" check) is a textual proxy rather than an assertion on the actual sourced value; it would spuriously pass or fail on unrelated token coincidence. **Applied:** replaced with a structural check (`not.toMatch(/interval\s*'/)`) that verifies no interval literal is embedded in the SQL text, alongside the existing direct assertion that the bound parameter equals `now - CYCLE_WINDOW_DAYS`. [apps/jobs/tests/close-cycle-alert.test.ts:68-73]
- [x] [Review][Patch] Test cleanup ordering bug — `afterAll` deletes `alerts` rows in autocommit mode BEFORE opening the `BEGIN`/`COMMIT` transaction that deletes the corresponding `events_log` rows. If the `events_log` deletion fails and rolls back, the `alerts` row is already permanently gone while its `events_log` rows remain — orphaned-data / latent-flake risk. **Applied:** moved both deletes inside the same transaction. [apps/jobs/tests/close-cycle-alert-live.test.ts:82-92]
- [x] [Review][Defer] No real alerting/paging channel wired for `onAlarm` — defaults to `console.warn` at the `boot.ts` call site [apps/jobs/src/boot.ts:622] — deferred, pre-existing (verified: every job in `apps/jobs` shares this exact default; not unique to this diff)
- [x] [Review][Defer] No backoff/circuit-breaker/dead-letter handling for a candidate that fails every tick [apps/jobs/src/scheduler/close-cycle-alert.ts:219-233] — deferred, pre-existing (same system-wide convention as every other sweep job in this codebase)
- [x] [Review][Defer] Per-candidate `SAVEPOINT`/`RELEASE SAVEPOINT` statements are not themselves wrapped in a try/catch; an exception at that exact statement (not the domain call) would escape per-candidate isolation and abort/roll back the whole tenant batch, including candidates already tallied as closed in the in-memory counters [apps/jobs/src/scheduler/close-cycle-alert.ts:210-221] — deferred, pre-existing (byte-identical pattern reused from `restoration-discipline.ts`, `claim-ocr-parity.ts`, `claim-peer-mesh.ts`, and several `packages/domain` write functions — a repo-wide convention, not introduced here)

---

## ⛔ Sequencing — what happens after 8.14 goes green

Recorded here rather than left as an intention, because an un-gated re-commitment decays
([[feedback_record_unattested_no_backfill]]).

1. **8.14 implemented, live-DB tests green, AC6 revert-probe RED.**
2. ⭐ **Re-run the real downstream chain through Story 10.23 — before resuming 10.27.** 10.23's entire
   suite passed against **fixture-produced** `alert.closed` events inserted by raw SQL below the
   projector. The purpose of this step is to validate 10.23 against **production-produced** closed
   cycles: that `scanR7ViolatorCandidates` selects real candidates, that `imposesRestorationObligation`
   fires on them, and that the overlay behaves as its tests claim. ⚠ **Expect findings** — this is the
   first time that code meets a state the system can actually reach.
3. **Only then resume Story 10.27.** Its row source is exactly the closed-cycle opportunity set, so it
   cannot be meaningfully implemented or reviewed until step 2 confirms the set can be non-empty.

⛔ **10.23 and 10.27 are NOT modified by this story.** Step 2 is a validation pass, not a re-scope; if it
produces findings they are recorded against those stories on their own terms.

---

## Escalations owed (raise them; do not silently absorb)

> **Dispositions fixed 2026-08-08.** Each escalation is classified below and **must be handled as
> classified**. Only Escalation 1 is a governance question; the other two are recorded and must **not**
> become implementation scope. The purpose is to end the decision cascade and finish the already-defined
> engineering substrate.

1. ✅ **WITHDRAWN — the premise was false. NOT a governance question, and NOT routed.**

   This was raised as a blocking Trustee question ("do historical un-closed cycles close
   retroactively?") on the strength of 1,287 `live` alert rows. **Those rows are in the TEST database.**
   The system has never run in production (`docs/launch-gate-inventory/inventory-roster.md:197-202` —
   pre-launch throughout, 4L measurement un-executed), so there is **no historical member data**, no
   member who ever lived through an un-closed cycle, and nothing to retroactively assert about anyone.
   **"Backfill" has no referent.** A routing note was drafted on 2026-08-08 and **withdrawn the same
   day, unsent and uncommitted**, when the pre-launch premise was checked.

   ⚠ **Recorded so it is not re-raised.** The reasoning error was specific and worth naming: test-DB
   counts were read as a description of a live member population. The caveat *"this is the test DB; it
   cannot prove what production has done"* was correctly stated during the investigation and then
   dropped one step later when the question was written up. **Any future claim about member-facing
   historical state must name the database it came from.**

   **Consequence for this story:** AC7 needs no ratified disposition, Task 3 is **not blocked**, and the
   emitter is **unconditional** — no floor instant, no backfill switch. The only residue is a
   test-isolation concern (AC7).

2. ⚖ **RECORD ONLY — do NOT expand 8.14. `alert.settled` remains unemitted, and its owner is complete.**
   `registry.ts:435` assigns it to *"Epic 9 … EXCLUSIVELY"*; every Epic 9 story and its retrospective are
   `done`. It is transitively blocked today (it needs `closed` first), so this story **unblocks** it
   without supplying it. Once cycles close, `settled` becomes reachable-but-unemitted — a real
   terminal-state gap, and **Epic 9's to close, not this story's.**
   **Re-trigger:** the first consumer requiring `settled` (Sahyog Vivran publication is gated on the
   lifecycle at `architecture.md:4643`).

3. ⚖ **RECORD AS A RETROSPECTIVE / PROCESS FINDING — do NOT turn into implementation scope.**
   Two `done` stories each believed the other owned this producer, and nothing detected it across four
   subsequent stories built on the missing fact. Story 9.8 *noticed* (`9-8-…md:191`: *"`alert.closed`
   (Story 8.9) may not be wired for all cycles yet"*) and coded defensively around it without raising
   it. The generalizable observation: **a registry entry naming an owner (`registry.ts:429`) is an
   assertion nothing verifies**, and *"named owner + reducer arm + consumers + no emitter"* is a
   mechanically detectable condition. ⚠ **Building that detector is explicitly out of scope here** —
   record it for the retrospective and let it be scoped on its own merits.

---

## Dev Notes

### The five consumers currently reading a fact that cannot exist

| Consumer | Reference |
|---|---|
| R7 contribution facts (`skips_current_year`, `opportunities_since_last`) | `packages/domain/src/contribution/facts.ts:337-343` — **inner** `JOIN LATERAL` with `closed_at IS NOT NULL`, so un-closed cycles are dropped from the opportunity set entirely |
| Yogdaan Bahi `grey` tone | `packages/domain/src/contribution/history.ts:39-41` (self-documented as unreachable) |
| Reconciliation matcher window | `docs/adr/ADR-0035…md:145`, `packages/domain/src/reconciliation/matcher-reads.ts:298` — open-ended while live |
| Reconciliation review queue ordering | `packages/domain/src/reconciliation/reconciliation-review-read.ts:376` |
| Sahyog Vivran publication | `_bmad-output/planning-artifacts/architecture.md:4643` |

⚠ **Expect AC8 breakage in these.** Making a state reachable for the first time is exactly the change
that surfaces latent assumptions.

### The projector mechanism (read `project.ts` before editing)

`projectAlertState` (`project.ts:~120-240`) does all four steps already: (1) loads the stream and
validates the payload against `ALERT_EVENT_PAYLOAD_SCHEMAS`; (2) inserts into `events_log` at
`nextVersion`, converting a unique-violation into `PoolStreamConcurrencyError`; (3) replays via
`replayAlertState` to derive the new state; (4) upserts `alerts` under
`SET LOCAL app.alert_state_writer = 'on'`, resetting the guard in a `finally` that swallows `25P02`.

**Everything this story needs is already there.** The missing piece is a caller.

### Why the test DB shows 1,246 closed events but zero closed alerts

The fixtures `INSERT` directly into `events_log`, so step (4) never runs — the projection is untouched.
This is also why the `alert-state-invariant` gate never caught the gap: the projector is genuinely
the only writer, and the fixtures went around it rather than through it.

### Boundaries

- `@twt/domain` **must not** import `@twt/contracts` (`errors.ts:41`) — hence D3.
- `@twt/domain` cannot import `@twt/events` (turbo cycle) — read `events_log` directly
  ([[project_member_lifecycle_domain_substrate]]).
- Watch the type-only → value import trap; hoist to a leaf module rather than converting an import
  ([[project_type_only_import_cycle_trap]]).

### Testing standards

- Live DB `twt-test-pg`:5433; suite-level `{ timeout: 20000 }`; own-committing writers ⇒ assert
  **membership, not counts** ([[project_live_db_test_gotchas]]).
- **No migration should be needed.** The table, guard, trigger, schema and reducer all exist. If one
  appears necessary, that is a finding.

### References

- `8-1-alert-state-machine-cycle-open-trigger.md:96,150,236` — the emitter forward-assignment
- `8-9-calendar-aware-close-of-cycle-timing.md` — scope table (the false premise), AC3 (the fence)
- `packages/events/src/registry.ts:406-407,429,435` — owner attributions
- `packages/domain/src/alert/project.ts:431` (`openCycleAlert`), `:86` (generic `eventType`)
- `packages/domain/src/alert/state.ts:78,109` — the `closed` / `settled` arms
- `packages/domain/src/alert/events.ts:140` — `AlertClosedPayloadSchema`
- `apps/jobs/src/scheduler/cycle-open-alert.ts` — the sibling sweep to mirror
- `apps/jobs/src/boot.ts:92,584` — the boot-time registration call site (`registerCycleOpenAlertWorkers`);
  the new sweep needs a symmetric import + call or it never runs
- `packages/contracts/src/alerts/contribution-loop-templates.ts:43,44-48,61` — `CYCLE_WINDOW_DAYS`, UTC-safe math
- `prd.md:524,531` — FR-22, the hard Day-15 close

---

## Dev Agent Record

### Agent Model Used

`claude-opus-5` (Claude Code, `bmad-dev-story`), 2026-08-08.

### Debug Log References

**Task 1 — the pre-edit baseline (AC8).** `DATABASE_URL=…:5433 pnpm ci:local` at `aa94822` +
the story-file working change: **30 of 31 jobs green**, including `integration-tests` (the live-DB
job) and `alert-state-invariant`. The single failing job was `test (unit)`, and its failures are the
two documented local-harness classes, not regressions:

- `@twt/validity-service` — 3 failures in `tests/integration/validity-cache.spec.ts` (TTL drift guard,
  isolated-connection cache-write, audit-on-access). The `ci:local` double-run class: `test (unit)`
  and `integration-tests` both run live-DB specs against the SAME persistent `twt-test-pg`
  ([[project_ci_local_double_run_pollution]]).
- `@twt/admin` — 10 RTL/`userEvent` failures across 5 files (add-pariwar-form, banners-page,
  custom-fields-page, ground-inspection-page, helpline-claim-page), all in the 11s–40s range. The
  concurrency-oversubscription class ([[project_ci_local_concurrency_oversubscription]]).
- `@twt/jobs` and `@twt/domain` reported `ELIFECYCLE` with **no test summary at all** — turbo
  interrupted them when the run failed. They produced no results at baseline, so no baseline claim is
  made about them.

**⭐ AC6 revert-probe — the load-bearing evidence.** With the emitter removed from the sweep
(`closeCycleAlert` call replaced by a no-op, i.e. the pre-8.14 state) and nothing else changed, the
end-to-end gate went **RED 3/3**:

```
× ⭐ real cycle-open → assigned member → sweep → closed + real alert.closed event + skipsCurrentYear = 1
    → expected 0 to be greater than or equal to 1
× AC4: a second sweep tick is a no-op — no second alert.closed is ever appended
    → expected +0 to be 1
× AC5: the Day-15 boundary is exact — an alert one second SHORT of it is left `live`
    → expected 'live' to be 'closed'
```

The probe edit was reverted from the backup and the gate re-confirmed green (`git diff --stat` on the
sweep reports 0 changes vs. the pre-probe file). **This is the property Story 8.9's AC3 fence could
not have: a gate that stays green with the feature reverted proves nothing.**

**A real defect the vitest runs could not catch.** The first full `ci:local` after implementation
failed `typecheck` + `build` (and cascaded into `crypto-check` / `test (unit)` / `integration-tests`,
which depend on `build`): `close-of-cycle.spec.ts` compared a plain `string` against the branded
`alerts.alert_id` column in three `eq(...)` calls. Per-package `vitest` does not typecheck, and the
per-package `pnpm --filter @twt/jobs typecheck` I had run did not cover `@twt/domain`'s tests. Fixed
by typing the helper's return as `AlertId`. **Recorded because the near-miss is the lesson: a green
targeted test run is not a green typecheck.**

**An assertion of mine that was wrong (the code was right).** The E2E gate initially asserted
`opportunitiesSinceLast === 1` and got `0`. `contribution/facts.ts` gates that count on
`last_confirmed_at IS NOT NULL AND closed_at > last_confirmed_at` — it counts misses *since a
member's last live contribution*, and this member has never contributed, so there is no "since". The
expectation was corrected to `0` **with the semantics pinned in a comment**, so a future reader does
not mistake the zero for the emitter failing to reach the second R7 fact.

**A structural finding the DB-free tests forced out.** The first sweep draft resolved due-ness
*inside* the per-tenant transaction, so a tenant whose candidates all turned out to be not-yet-due
still opened a connection, and a fake-pool test could not reach the filtering logic at all. Restructured
to resolve due-ness (anchor readability + the payload-anchored Day-15 comparison) **before** any
transaction opens. Better on both counts: no wasted connections, and the due-ness decision is now
provable without a database.

### Completion Notes List

**What was built.** `alert.closed` now has a production emitter. Two pieces:

1. **`alert.closeCycleAlert(client, { cycleId, closeAt })`** (`packages/domain/src/alert/project.ts`)
   — resolves the alert by the 8.1 deterministic `deriveAlertId`, applies the asymmetric not-`live`
   precondition, and drives the transition **through the existing `projectAlertState`**. ⛔
   `projectAlertState` is **byte-unchanged** — no second write path, no edit to its genesis rules or
   `alert.frozen` cross-validation, and `alerts.current_state` remains projector-only (the
   `alert-state-invariant` gate is green and still names exactly one allowlisted writer).
2. **`runCloseCycleAlertSweep` / `registerCloseCycleAlertWorkers`**
   (`apps/jobs/src/scheduler/close-cycle-alert.ts`) — the hourly IST cross-tenant sweep, **wired into
   `apps/jobs/src/boot.ts`** beside `registerCycleOpenAlertWorkers`. The wiring is the load-bearing
   half of AC2: an exported registration nobody calls is byte-for-byte the defect this story corrects.

**AC-by-AC.**

- **AC1** ✅ Reuses the existing projector. Asymmetric precondition proven by test:
  `closed`/`settled` → no-op success, `draft`/`frozen`/`published` → error, no alert row → error.
- **AC2** ✅ Sweep mirrors `CYCLE_OPEN_ALERT_SWEEP`'s shape (bounded batch with a non-silent cap
  alarm, BYPASSRLS cross-tenant scan then `withPariwarScope` per tenant write, IST cron,
  env-overridable via `CLOSE_CYCLE_ALERT_SWEEP_CRON`), **and is documented at the top of the file as
  PRIMARY, not recovery** — a time boundary has nothing to hook post-commit. Registered in
  `QUEUE_NAMES` and called from `boot.ts`.
- **AC3** ✅ The close instant is computed in `apps/jobs` from `@twt/contracts`' `CYCLE_WINDOW_DAYS`
  and passed in as an explicit `Date`. The domain never re-derives it, reads no clock, and contains no
  `15`; `@twt/domain` still does not import `@twt/contracts`. Window arithmetic is fixed-ms UTC. The
  SQL prefilter binds the derived instant as a **parameter** — there is no `interval '15 days'`
  literal to drift (pinned by test).
- **AC4** ✅ Sequential redelivery short-circuits to a no-op success; a genuine two-connection race
  surfaces `PoolStreamConcurrencyError` to the loser, which the sweep treats as benign. **Exactly one
  `alert.closed` per stream**, pinned at both the domain and the sweep level.
- **AC5** ✅ Nothing moved. `CYCLE_WINDOW_DAYS`, `computeDaysRemaining`, the My Pool card window and
  the deadline-reminder sweep window are untouched (no diff). The exact-boundary regression proves
  one second short stays `live` and the boundary instant itself closes, and a dedicated test asserts
  the sweep is **calendar-blind** — no reconciliation-tail resolver reaches the close instant.
- **AC6** ✅ End-to-end, revert-probed RED (see Debug Log). The gate drives the real spawn saga → real
  `cycle.frozen` → the shipped `runCycleOpenAlert` worker → a real `member_pool_assignments` row →
  the actual sweep, then asserts `alerts.current_state = 'closed'`, a real schema-validated
  **non-fixture** `alert.closed` payload at stream version 4, and **`skipsCurrentYear = 1`**. It also
  asserts `skipsCurrentYear === 0` **before** the sweep, so the green cannot be a pre-existing value.
  The existing fixture-based specs were left untouched.
- **AC7** ✅ Unconditional: no floor instant, no backfill switch. The pre-launch reasoning is stated
  at the sweep's definition site so its absence does not read as an oversight. ⚠ **Empirically, the
  test-isolation concern did not materialize:** `twt-test-pg` holds **zero** `cycle.frozen` events, so
  the payload-anchored scan finds no fixture candidates at all (verified live before and after).
- **AC8** — see the verification section below.

**⚠ One deliberate departure from the AC text, raised rather than absorbed (AC1 invites this).**
AC3 says the caller-supplied close instant is passed into the domain, but the `alert.closed` payload
is the pre-registered `{ ...auditShape }.strict()` schema with nowhere to carry an instant, and
writing it to `events_log.occurred_at` would require modifying `projectAlertState`, which AC1 freezes.
So **`occurred_at` stays the DB default — the RECORDING instant**, consistent with every other alert
lifecycle event, and `closeAt` is made load-bearing a different way: the domain cross-checks it
against the cycle's own durable `cycle.frozen` attestation and refuses an instant that could not be
this cycle's Day-15 boundary. That is D3's exact hazard (a caller anchored on the wrong cycle, on the
`defaultNow()` column, or on a skewed clock) caught before anything reaches an append-only log.
Consequence: with an hourly sweep, a recorded close trails its boundary by at most one tick. Every
consumer of the close instant uses it for windowing/ordering; the member-facing deadline remains
`committed_at + CYCLE_WINDOW_DAYS`, untouched. **Flagged for review as a judgement call, not
presented as required by the AC.**

**Stale attributions corrected (comments only, no behaviour change).** `packages/events/src/registry.ts`
described `alert.closed` as *"Story 8.9 owns the emitter"* — false for four stories. That line, plus
the matching claims in `alert/events.ts`, `alert/state.ts` and `schema/alerts.ts`, now name Story
8.14. A standing caveat was added beside the registry block: **an owner named there is an assertion
nothing verifies**. Leaving them would have re-armed the exact failure this story corrects.

**Scope discipline.** No migration was needed (none added). `alert.settled` was **not** emitted —
Epic 9's, recorded in `deferred-work.md`. The owner-gap **detector was not built** — recorded as a
retrospective/process finding. Stories 10.23 and 10.27 were **not modified**. **No governance decision
was opened**, and none was needed.

**⛔ Sequencing — what must happen next (recorded, not merely intended).** 8.14 is green, so the next
step is **re-running the real downstream chain through Story 10.23 against production-produced
`alert.closed` facts** — its whole suite passed against raw-SQL fixtures inserted below the projector,
so `scanR7ViolatorCandidates` / `imposesRestorationObligation` / the overlay have never met a state
the system could reach. **Expect findings.** Only then resume **Story 10.27**. Both are recorded in
`deferred-work.md` so the commitment survives this session ([[feedback_record_unattested_no_backfill]]).

**⚠ Commit ordering (not performed — commits are the user's call).** The governance-shaped record
(`_bmad-output/implementation-artifacts/deferred-work.md`) must commit **separately and FIRST** with a
`governance:` prefix; the implementation rides a later `story(8.14):` commit
([[feedback_governance_commits_precede_implementation]]).

### File List

**New**

- `apps/jobs/src/scheduler/close-cycle-alert.ts` — the close-of-cycle sweep (the PRIMARY `alert.closed` producer)
- `apps/jobs/tests/close-cycle-alert-live.test.ts` — ⭐ the AC6 end-to-end gate (live DB), + AC4/AC5/D3 regressions
- `apps/jobs/tests/close-cycle-alert.test.ts` — DB-free sweep tests (bounding, prefilter, anchor refusal, calendar-blindness)
- `packages/domain/tests/integration/alert/close-of-cycle.spec.ts` — `closeCycleAlert` domain suite (AC1/AC3/AC4)
- `packages/domain/migrations/0098_story-8-14-close-cycle-alert-indexes.sql` — Review Finding: `alerts_current_state_live_idx` (partial, `WHERE current_state = 'live'`) + `cycle_freeze_commits_committed_at_idx`, hand-authored per the 0021-0097 convention

**Modified**

- `packages/domain/src/alert/project.ts` — `closeCycleAlert` + `CLOSE_OF_CYCLE_TRIGGER` (⛔ `projectAlertState` byte-unchanged); Review Finding: tightened the D3 docstring/error message to stop overclaiming what the guard checks
- `packages/domain/src/alert/events.ts` — corrected the `alert.closed` owner attribution (comment only)
- `packages/domain/src/alert/state.ts` — corrected three `alert.closed` owner attributions (comments only)
- `packages/domain/src/schema/alerts.ts` — corrected the `closed`/`settled` emitter note (comment only); Review Finding: added `alerts_current_state_live_idx`
- `packages/domain/src/schema/cycle_freeze_commits.ts` — Review Finding: added `cycle_freeze_commits_committed_at_idx`
- `packages/domain/migrations/meta/_journal.json` — Review Finding: manual entry for migration 0098 (hand-authored, no snapshot emitted)
- `packages/events/src/registry.ts` — corrected the `alert.closed` description + added the "a named owner is an unverified assertion" caveat
- `packages/queue/src/index.ts` — `QUEUE_NAMES.CLOSE_CYCLE_ALERT_SWEEP`
- `apps/jobs/src/boot.ts` — import, `CLOSE_CYCLE_ALERT_SWEEP_CRON`, and the `registerCloseCycleAlertWorkers` call (AC2's load-bearing wiring)
- `packages/domain/tests/integration/alert/alert-stream-concurrency.spec.ts` — added the two-connection CLOSE race (AC4)
- `_bmad-output/implementation-artifacts/deferred-work.md` — Escalations 2 and 3 + the post-8.14 validation pass
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status flip + ledger entry
- `_bmad-output/implementation-artifacts/8-14-close-of-cycle-emitter.md` — this file

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-08 | 1.1 | **Code review (`bmad-code-review`) — all 8 non-dismissed findings resolved.** 3 layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) produced 15 unified findings after dedup; 5 dismissed as false positives or already-handled elsewhere (verified live against the schema/code rather than taken at face value — e.g. the claimed "signature diverges from sibling" finding was checked and found FALSE). Both `decision-needed` findings were resolved by the user: the D3 anchor-validation gap was resolved as **docstring/error-message only** (the check itself can't be tightened without a bigger `@twt/contracts` boundary change, not taken on here); the `closeAt`-not-persisted gap was **accepted as the documented tradeoff** the implementer's own Completion Notes already reasoned through. All 6 `patch` findings applied: tightened the D3 docstring/error message; added a 4th cohort cycle + a live-DB test pinning the prefilter's dangerous direction (a `committed_at` column drifted into the future silently excludes an otherwise-due alert — `scanned: 0`, no alarm); added 3 DB-free tests exercising `registerCloseCycleAlertWorkers`'s actual pg-boss wiring (queue/cron/tz + the env-override seam + the registered handler invoking the real sweep); added hand-authored migration 0098 (`alerts_current_state_live_idx` partial index + `cycle_freeze_commits_committed_at_idx` — the sweep's own comment called the column "an indexed prefilter," it wasn't) — applied and verified against `twt-test-pg`:5433, snapshot-free per the 0021-0097 convention; replaced the fragile `not.toMatch(/15/)` test with a structural `interval '...'`-literal check; fixed a test-cleanup ordering bug where `alerts` was deleted in autocommit mode before the `events_log` transaction opened. 3 findings deferred to `deferred-work.md` as pre-existing, system-wide `apps/jobs` conventions (no real `onAlarm` channel wired anywhere in the job suite; no backoff/circuit-breaker family-wide; the SAVEPOINT-outside-try shape reused verbatim from `restoration-discipline.ts`/`claim-ocr-parity.ts`/`claim-peer-mesh.ts`/several domain write functions). All touched packages typecheck and lint clean; `close-cycle-alert.test.ts` (9/9), `close-cycle-alert-live.test.ts` (5/5), `close-of-cycle.spec.ts` (6/6), and `alert-stream-concurrency.spec.ts` (2/2) all pass against `twt-test-pg`:5433. | BigDev |
| 2026-08-08 | 1.0 | **Implemented via `bmad-dev-story` — `ready-for-dev` → `in-progress` → `review`.** ⭐ **`alert.closed` now has a production emitter.** Two pieces: `@twt/domain`'s `alert.closeCycleAlert` (deterministic `deriveAlertId` resolution, the asymmetric not-`live` precondition, the transition driven **through the existing `projectAlertState`**) and `apps/jobs/src/scheduler/close-cycle-alert.ts` (the hourly IST cross-tenant sweep) — **wired into `boot.ts`** beside `registerCycleOpenAlertWorkers`, which is AC2's load-bearing half. ⛔ `projectAlertState` is **byte-unchanged**; `alerts.current_state` stays projector-only and the `alert-state-invariant` gate is green with exactly one allowlisted writer. **The sweep is documented as PRIMARY, not recovery** — a time boundary has nothing to hook post-commit. **D3 held and is pinned by a regression that drags the `committed_at` COLUMN a year into the past and proves the cycle still does not close until the PAYLOAD boundary.** ⭐ **AC6's gate is end-to-end and was revert-probed RED (3/3)**: real spawn saga → real `cycle.frozen` → the shipped `runCycleOpenAlert` worker → a real assignment → the actual sweep → `closed` + a schema-validated non-fixture payload at stream version 4 + **`skips_current_year = 1`** (with `= 0` asserted *before* the sweep, so the green cannot be pre-existing). AC7 is unconditional — no floor, no backfill switch — and **empirically the test-isolation concern did not materialize**: `twt-test-pg` holds zero `cycle.frozen` events, so the payload-anchored scan sees no fixture candidates. ⚠ **One deliberate departure, raised not absorbed:** the caller's close instant cannot become `events_log.occurred_at` without modifying `projectAlertState` (frozen by AC1) and the pre-registered `.strict()` payload has nowhere to carry it, so `occurred_at` stays the recording instant and `closeAt` is made load-bearing by cross-checking it against the cycle's own `cycle.frozen` attestation — flagged for review as a judgement call. **Stale attributions corrected** in `registry.ts` + three domain files (they named Story 8.9 as the emitter's owner), with a standing caveat that *an owner named in the registry is an assertion nothing verifies*. **Scope held:** no migration, `alert.settled` not emitted, the owner-gap detector not built, 10.23/10.27 unmodified, **no governance decision opened**. **Verification (AC8):** baseline 30/31 (`test (unit)` failing on the documented double-run + RTL-contention classes); after, 30/31 with the failing job **inverted** — `test (unit)` now green, `integration-tests` failing on **five timeouts, zero assertion failures** (a 20 s test took 121 s). Innocence proven by isolation per [[project_ci_local_double_run_pollution]]: validity-service 284/284 in 11.7 s, jobs 320/320, api 871/871, channels 204/204, domain 2549/2549; all 26 static gates green. Escalations 2 and 3 and the post-8.14 downstream validation pass recorded in `deferred-work.md`. | BigDev |
| 2026-08-08 | 0.4 | **Validation pass (`bmad-create-story validate`).** Every factual claim was checked live against the repository and the `twt-test-pg` DB — registry lines, `openCycleAlert`/`projectAlertState`, `CYCLE_WINDOW_DAYS`, the domain→contracts boundary, `state.ts`/`events.ts` reducer arms, the sole bounded `reconciliation.*` append site, `history.ts`/`facts.ts` consumer citations, ADR-0035/architecture.md/launch-gate-inventory citations, the 8.1/8.9 quoted claims, and the empirical corroboration (1,246 `alert.closed` events / 1 distinct payload / 0 distinct actors; 1,287 `alerts.current_state = 'live'`, zero closed/settled) — **all confirmed accurate, no drift found.** One critical miss found and fixed: AC2, Task 3, and References named the sweep module and its `boss.schedule` registration but never named `apps/jobs/src/boot.ts` — the **only** process-boot call site that actually invokes a sweep's registration function (`registerCycleOpenAlertWorkers` at `boot.ts:584`, imported `:92`, alongside `registerNewsPublishWorker`/`registerModerationNotifyWorker`). A sweep module that exports a registration function nobody calls from `boot.ts` would exist in code and never run — the exact "committed, never executes" defect class this story exists to correct. AC2 and Task 3 now require the symmetric `boot.ts` wiring explicitly. | BigDev |
| 2026-08-08 | 0.3 | **Escalation 1 WITHDRAWN — the premise was false; the story is fully unblocked.** The backfill question was raised on the strength of 1,287 `live` alert rows that are in the **TEST database**. The system has never run in production (`docs/launch-gate-inventory/inventory-roster.md:197-202` — pre-launch throughout, 4L measurement un-executed), so there is no historical member data and **"backfill" has no referent**. The v0.2 routing note was **withdrawn the same day, unsent and uncommitted**. ⚠ **The reasoning error is recorded rather than quietly removed:** test-DB counts were read as a description of a live member population, and the caveat *"this is the test DB; it cannot prove what production has done"* — correctly stated during the investigation — was dropped one step later at write-up. Any future claim about member-facing historical state must name the database it came from. **Consequences:** AC7 rewritten — the emitter is **unconditional**, no floor instant, no backfill switch, with the pre-launch reasoning stated at the definition site so its absence does not read as an oversight; the only residue is a **test-isolation** concern (dev/CI DBs hold fixture-seeded `live` alerts a sweep would close in bulk — handled in test setup, never by a production floor). **Task 3 is NOT blocked** and AC7 needs no ratified disposition. Escalations 2 (record-only, Epic 9's) and 3 (retrospective/process) are unchanged. **No governance decision was created, and none is needed** — this is exactly the cascade the sequencing instruction exists to stop. | BigDev |
| 2026-08-08 | 0.2 | *(superseded by 0.3 — the routing described here was withdrawn before it was sent.)* **Escalation dispositions fixed; Escalation 1 ROUTED.** Q1 (historical backfill) raised to the Trustee Panel via `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-08-story-8-14.md` — **Task 3 is BLOCKED until it is ruled**, and **AC7 was rewritten as deliberately incomplete**, to be amended with the ratified disposition before dev begins (the pattern Decision `2026-08-07-088` set for Story 10.23). ⛔ **No backfill is implemented unless the Panel explicitly authorizes it**; absent a ruling the floor makes the emitter forward-acting only, and the floor is a NAMED CONSTANT, never an accident of deploy timing. The note surfaces two things the story did not: the blast radius is **asymmetric across clauses** (`skips_current_year` is IST-year-bounded; `opportunities_since_last` is **lifetime**-scoped and feeds R7(C)/(F), so a ruling reasoning only about "this year's skips" would understate what it authorizes), and options (b)/(c) force a lose-lose `occurred_at` choice for backfilled events — true historical Day-15 (writes past-dated events into an append-only log) vs. run-time (collapses the sequence `opportunities_since_last` depends on) — which option (a) never faces. **Escalation 2 → RECORD ONLY** (`alert.settled` is Epic 9's exclusive; 8.14 unblocks it without supplying it; scope NOT expanded). **Escalation 3 → RETROSPECTIVE/PROCESS FINDING** (the owner-detector is explicitly out of scope). Task 7 gained the "do NOT open a new governance decision unless implementation exposes a genuinely new policy question" constraint. Added a **Sequencing** section recording the post-green order: 8.14 green → **re-run the real downstream chain through Story 10.23 against production-produced `alert.closed` facts** (its whole suite passed against raw-SQL fixtures inserted below the projector; expect findings) → **only then** resume 10.27. 10.23 and 10.27 remain unmodified. | BigDev |
| 2026-08-08 | 0.1 | Story authored via `bmad-create-story` off `feat/10-27-member-missed-cycle-visibility` @ `d3d8e92`, following a focused substrate-integrity investigation. **Classification B — committed but never implemented.** `alert.closed` has no production emitter anywhere; the only alert types appended in `apps/*/src` + `packages/*/src` are `frozen`/`published`/`live`, the sole dynamic append site is bounded to `reconciliation.*` on the pool stream, and no scheduled job closes an alert. `alert.settled` is transitively dead (`state.ts:109`, `from: 'closed'`). ⭐ **Root cause is a circular attribution between two `done` stories:** 8.1 assigned the emitter forward (*"the reducer arms exist, the emitters don't"*, `:96`) while 8.9's scope table asserted *"Story 8.1 (shipped) — Alert lifecycle already implements `live → closed`"* and on that false premise ratified *"Do not touch `live → closed` timing"*; 8.9's file contains **zero** occurrences of `alert.closed` or "emitter" and none of its five ACs is a producer AC. **No decision or ADR ever removed the producer** — absence is omission, not design. ⚠ **The mechanization lesson is built into AC6:** 8.9's AC3 fence asserted the transition was *"byte-unchanged"* and passed — byte-unchanged is satisfied by code that never runs — so this story's gate is **end-to-end** (real cycle-open → assign → sweep → `closed` + real event + `skips_current_year = 1`) and **revert-probed RED**. Live corroboration: test DB holds 1,246 `alert.closed` events, all `actor_id` NULL with one distinct payload, while all 1,287 alerts sit `live` — the fixtures `INSERT` around the projector, which is also why the `alert-state-invariant` gate never caught it. **The implementation is small** — `projectAlertState` is already generic over all five event types and does append + replay + guarded upsert; the missing piece is a caller. **D3:** the close instant is computed in `apps/jobs` (domain must not import contracts, `errors.ts:41`) and anchored on `cycle.frozen`'s `attestation.committed_at`, not the `defaultNow()` column, so a member's deadline cannot disagree with the countdown they were shown. Eight ACs, seven tasks. ⛔ **Escalation 1 is a genuine policy question and blocks nothing else:** every cycle ever run is still `live`, so the first sweep would close all of them at once — retroactively materializing `skips_current_year` for members never told a cycle closed. Routed as three options with forward-only recommended pending a ruling; the implementer must not default. | BigDev |
