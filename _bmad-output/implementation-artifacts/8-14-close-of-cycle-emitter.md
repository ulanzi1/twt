---
baseline_commit: d3d8e92
---

# Story 8.14: Close-of-Cycle Emitter — `alert.closed` `[SUBSTRATE / CORRECTIVE]`

Status: ready-for-dev

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

- [ ] **Task 1 — Baseline** (AC8): capture a full `ci:local` + live-DB baseline BEFORE any edit.
- [ ] **Task 2 — Domain `closeCycleAlert`** (AC1, AC3, AC4)
  - [ ] Add to `packages/domain/src/alert/project.ts`, mirroring `openCycleAlert` (`:431`)
  - [ ] Not-`live` precondition: `closed`/`settled` → no-op success; pre-`live` → error
  - [ ] Explicit close-instant parameter; no clock read, no `15` in domain
  - [ ] Export via `packages/domain/src/alert/index.ts`
- [ ] **Task 3 — The sweep** (AC2, AC3, AC7) — **not blocked**
  - [ ] Unconditional emitter: **no floor instant, no backfill switch** (AC7); state the pre-launch reasoning at the definition site
  - [ ] New module in `apps/jobs/src/scheduler/`, mirroring `cycle-open-alert.ts`
  - [ ] Anchor on `cycle.frozen`'s `attestation.committed_at` (D3); table column as prefilter only
  - [ ] Per-candidate `SAVEPOINT`; bounded batch; full-batch logging
  - [ ] Register the queue + `boss.schedule` (IST cron, env-overridable); add to `QUEUE_NAMES`
  - [ ] Header comment: **this sweep is PRIMARY, not recovery** (AC2)
- [ ] **Task 4 — The end-to-end gate** (AC6)
  - [ ] Live-DB test: real cycle-open → assign → advance → run sweep → `closed` + real event + `skips_current_year = 1`
  - [ ] **Revert-probe it RED**
- [ ] **Task 5 — Idempotency + concurrency tests** (AC4)
- [ ] **Task 6 — Boundary regression** (AC5): Day-15 math and the four consumer windows behave unchanged
- [ ] **Task 7 — Records** (AC7, Escalations)
  - [ ] `deferred-work.md`: Escalation 2 (**record only** — Epic 9's, do not expand scope)
  - [ ] `deferred-work.md`: Escalation 3 (**retrospective/process finding** — do not build the detector)
  - [ ] `sprint-status.yaml` — one combined ledger entry at completion ([[project_sprint_status_ledger]])
  - [ ] ⚠ Governance-shaped records commit separately and FIRST ([[feedback_governance_commits_precede_implementation]])
  - [ ] ⛔ **Do NOT open a new governance decision** unless implementation exposes a genuinely new policy question

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
- `packages/contracts/src/alerts/contribution-loop-templates.ts:43,44-48,61` — `CYCLE_WINDOW_DAYS`, UTC-safe math
- `prd.md:524,531` — FR-22, the hard Day-15 close

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-08 | 0.3 | **Escalation 1 WITHDRAWN — the premise was false; the story is fully unblocked.** The backfill question was raised on the strength of 1,287 `live` alert rows that are in the **TEST database**. The system has never run in production (`docs/launch-gate-inventory/inventory-roster.md:197-202` — pre-launch throughout, 4L measurement un-executed), so there is no historical member data and **"backfill" has no referent**. The v0.2 routing note was **withdrawn the same day, unsent and uncommitted**. ⚠ **The reasoning error is recorded rather than quietly removed:** test-DB counts were read as a description of a live member population, and the caveat *"this is the test DB; it cannot prove what production has done"* — correctly stated during the investigation — was dropped one step later at write-up. Any future claim about member-facing historical state must name the database it came from. **Consequences:** AC7 rewritten — the emitter is **unconditional**, no floor instant, no backfill switch, with the pre-launch reasoning stated at the definition site so its absence does not read as an oversight; the only residue is a **test-isolation** concern (dev/CI DBs hold fixture-seeded `live` alerts a sweep would close in bulk — handled in test setup, never by a production floor). **Task 3 is NOT blocked** and AC7 needs no ratified disposition. Escalations 2 (record-only, Epic 9's) and 3 (retrospective/process) are unchanged. **No governance decision was created, and none is needed** — this is exactly the cascade the sequencing instruction exists to stop. | BigDev |
| 2026-08-08 | 0.2 | *(superseded by 0.3 — the routing described here was withdrawn before it was sent.)* **Escalation dispositions fixed; Escalation 1 ROUTED.** Q1 (historical backfill) raised to the Trustee Panel via `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-08-story-8-14.md` — **Task 3 is BLOCKED until it is ruled**, and **AC7 was rewritten as deliberately incomplete**, to be amended with the ratified disposition before dev begins (the pattern Decision `2026-08-07-088` set for Story 10.23). ⛔ **No backfill is implemented unless the Panel explicitly authorizes it**; absent a ruling the floor makes the emitter forward-acting only, and the floor is a NAMED CONSTANT, never an accident of deploy timing. The note surfaces two things the story did not: the blast radius is **asymmetric across clauses** (`skips_current_year` is IST-year-bounded; `opportunities_since_last` is **lifetime**-scoped and feeds R7(C)/(F), so a ruling reasoning only about "this year's skips" would understate what it authorizes), and options (b)/(c) force a lose-lose `occurred_at` choice for backfilled events — true historical Day-15 (writes past-dated events into an append-only log) vs. run-time (collapses the sequence `opportunities_since_last` depends on) — which option (a) never faces. **Escalation 2 → RECORD ONLY** (`alert.settled` is Epic 9's exclusive; 8.14 unblocks it without supplying it; scope NOT expanded). **Escalation 3 → RETROSPECTIVE/PROCESS FINDING** (the owner-detector is explicitly out of scope). Task 7 gained the "do NOT open a new governance decision unless implementation exposes a genuinely new policy question" constraint. Added a **Sequencing** section recording the post-green order: 8.14 green → **re-run the real downstream chain through Story 10.23 against production-produced `alert.closed` facts** (its whole suite passed against raw-SQL fixtures inserted below the projector; expect findings) → **only then** resume 10.27. 10.23 and 10.27 remain unmodified. | BigDev |
| 2026-08-08 | 0.1 | Story authored via `bmad-create-story` off `feat/10-27-member-missed-cycle-visibility` @ `d3d8e92`, following a focused substrate-integrity investigation. **Classification B — committed but never implemented.** `alert.closed` has no production emitter anywhere; the only alert types appended in `apps/*/src` + `packages/*/src` are `frozen`/`published`/`live`, the sole dynamic append site is bounded to `reconciliation.*` on the pool stream, and no scheduled job closes an alert. `alert.settled` is transitively dead (`state.ts:109`, `from: 'closed'`). ⭐ **Root cause is a circular attribution between two `done` stories:** 8.1 assigned the emitter forward (*"the reducer arms exist, the emitters don't"*, `:96`) while 8.9's scope table asserted *"Story 8.1 (shipped) — Alert lifecycle already implements `live → closed`"* and on that false premise ratified *"Do not touch `live → closed` timing"*; 8.9's file contains **zero** occurrences of `alert.closed` or "emitter" and none of its five ACs is a producer AC. **No decision or ADR ever removed the producer** — absence is omission, not design. ⚠ **The mechanization lesson is built into AC6:** 8.9's AC3 fence asserted the transition was *"byte-unchanged"* and passed — byte-unchanged is satisfied by code that never runs — so this story's gate is **end-to-end** (real cycle-open → assign → sweep → `closed` + real event + `skips_current_year = 1`) and **revert-probed RED**. Live corroboration: test DB holds 1,246 `alert.closed` events, all `actor_id` NULL with one distinct payload, while all 1,287 alerts sit `live` — the fixtures `INSERT` around the projector, which is also why the `alert-state-invariant` gate never caught it. **The implementation is small** — `projectAlertState` is already generic over all five event types and does append + replay + guarded upsert; the missing piece is a caller. **D3:** the close instant is computed in `apps/jobs` (domain must not import contracts, `errors.ts:41`) and anchored on `cycle.frozen`'s `attestation.committed_at`, not the `defaultNow()` column, so a member's deadline cannot disagree with the countdown they were shown. Eight ACs, seven tasks. ⛔ **Escalation 1 is a genuine policy question and blocks nothing else:** every cycle ever run is still `live`, so the first sweep would close all of them at once — retroactively materializing `skips_current_year` for members never told a cycle closed. Routed as three options with forward-only recommended pending a ruling; the implementer must not default. | BigDev |
