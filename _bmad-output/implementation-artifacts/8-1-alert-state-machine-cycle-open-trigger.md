---
baseline_commit: 5bb4d83ea8ee05c96773f7f05cb02a43b9f7dfca
---

# Story 8.1: Alert State Machine + Cycle-Open Trigger

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Solo Builder authoring the alert lifecycle for the contribution loop,
I want an alert state machine (`draft → frozen → published → live → closed → settled`) + a cycle-open trigger that consumes Epic 7's `cycle.frozen` event, mints the cycle's canonical `alert_id`, and drives the alert to `live`,
so that downstream contribution-loop surfaces (My Pool card, Yogdaan Bahi, contributor list) all read from a single canonical alert state, AND the `alert_id` that binds Story 7.7's idempotent `tr=` (`(member_id, alert_id)`) first physically exists — de-risking the AI-7-4 first-live-caller seam before the running surface trusts it.

> **This story discharges action item AI-7-4** (Epic 7 retrospective, `epic-7-retro-2026-07-20.md:138`). AI-7-4 is *explicitly* the first-live-caller handoff into Story 8.1. Read the **AI-7-4 de-risk** section (AC6 + Task 8 + Dev Note D5) as the load-bearing commitment of this story — not an afterthought.

**Non-negotiables (restated across ACs/Tasks/Dev Notes — read once here, don't re-derive):**
- `alert_id` is deterministic (`deriveAlertId(cycleId)` = UUIDv5, pinned namespace, never changes) — redelivery of `cycle.frozen` must no-op, never mint a second alert.
- The projector is the ONLY writer of `alerts.current_state` — enforced by BOTH a DB trigger and an AST CI gate.
- The cycle-open trigger fires via BOTH a primary enqueue (from `finalizeCycleIfComplete`) AND a recovery sweep (cron) — not either alone.
- The reducer is authored complete (all six states) but this story emits only `draft→frozen→published→live`; `closed` is Story 8.9, `settled` is Epic 9's exclusively.
- Frozen seeded vectors are mandatory for both `deriveAlertId` and the `tr=` binding — a green "it's deterministic" test with no pinned bytes proves nothing.

## Scope — what belongs to 8.1 vs what is a reserved seam

Story 8.1 is `[CONSUMER]`. It authors the **alert lifecycle primitive + the cycle-open trigger** that consumes `cycle.frozen`. It follows the **same primitive/consumer seam discipline** the pool engine used (7.1→7.7): it commits the domain building block downstream stories read; it does **not** build those consumers.

| Belongs to 8.1 (this story) | Deferred — reserved seam (do NOT build here) |
|---|---|
| The **alert state machine** — pure/total/deterministic reducer over the alert event stream (`draft → frozen → published → live → closed → settled`), twin of `pool/state.ts` / `claim/state.ts` / `member/state.ts` | The **My Pool card** that reads `live` alert state → **Story 8.2** (`<ActiveContributionCard>`) |
| The **`alert.*` event vocabulary** (`alert.frozen`, `alert.published`, `alert.live`, `alert.closed`, `alert.settled`) + `.strict()` Zod payload schemas in `@twt/domain`, registered in `packages/events/src/registry.ts` | The **live contributor list** that reads the alert's pools → **Story 8.3** |
| The **deterministic `alert_id` derivation** `deriveAlertId(cycleId)` (UUIDv5, the `derivePoolId` precedent) — so `alert_id` is 1:1 with the cycle and consuming `cycle.frozen` is idempotent | The **`<UPIIntentButton>` / `upi://pay?…tr=…`** string construction that calls `deriveContributionReference` → **Story 8.4** |
| The **cycle-open trigger** — consumes `cycle.frozen`, mints the alert, appends `alert.frozen → alert.published → alert.live`, and marks the cycle-open **trigger delivered** | The **notification dispatch + copy templates** (cycle-open push / 15-day deadline cadence / contribution-confirmed) → **Story 8.8** (Epic 8 owns triggers+copy, Epic 5 owns delivery) |
| The **`alerts` hot projection table** (`current_state` read model) + projector + **BEFORE-UPDATE trigger guard** + **`alert-state-invariant` AST CI gate** (projector-only, the pool/member/claim AC5 discipline) | The **reconciliation `settled` transition** (`alert.settled` emitter) → **Epic 9** (yellow→green flip + disbursement is Epic 9's closure; 8.1 authors the reducer arm but emits no `settled`) |
| The **AI-7-4 controlled de-risk test** — proves (a) `cycle.frozen` fires the alert path and (b) the `(member_id, alert_id)` `tr=` binding wires now that `alert_id` exists | The **`pool.closed` deadline / close-of-cycle** window-close emitter → **Story 8.9** (calendar-aware close-of-cycle) + Story 7.8 framing |

## Acceptance Criteria

**AC1 — Alert state machine (event-derived, pure/total/deterministic).**
Given FR-22 + Epic 7's `cycle.frozen` event + Story 1.3 event-log primitive + the §1.14 event-derived-state invariant,
When the alert state machine is authored (recommended home `packages/domain/src/alert/` — see D1),
Then states are `draft` (trustee preparing — the initial/pre-genesis fold state) → `frozen` (cycle-freeze consumed) → `published` (member-visible) → `live` (contributions accepted) → `closed` (no more contributions) → `settled` (Epic 9 reconciliation complete + disbursement);
And every transition emits a named event (`alert.frozen`, `alert.published`, `alert.live`, `alert.closed`, `alert.settled`); state is derived from event replay per §1.14 (same pattern as Story 3.1 / 6.1 / 7.1 — the **fourth** event-derived-state primitive);
And the reducer is **PURE + TOTAL + DETERMINISTIC + IDEMPOTENT**: no clock/randomness/I/O; an inapplicable or forward-compat event is **identity** (never throws); replaying `1..N` twice yields the same state (the `pool/state.ts` contract, verbatim in spirit).

**AC2 — `alert_id` is 1:1 with the cycle, deterministically derived (the AI-7-4 binding foundation).**
Given architecture's canonical idempotency key `(alert_id, claim_id) → pool_id` (`architecture.md:821`, `:4583`) + Story 7.3's deferral of the `alert_id` binding (it used `(cycle_id, pool_index)` as a placeholder — `epic-7-retro-2026-07-20.md:71`) + Story 7.7's `deriveContributionReference({ memberId, alertId })` shipped with no live call site (`7-7…:38`),
When the alert is minted from `cycle.frozen`,
Then there is **exactly one alert per cycle** (`alert_id` 1:1 with `cycle_id`; `claim_id`/`pool_index` distinguish the N pools *within* the alert — architecture's `(alert_id, claim_id)` model);
And `alert_id` is derived **deterministically** as `deriveAlertId(cycleId)` = UUIDv5 over a pinned namespace UUID + the canonical `cycle_id` (the `derivePoolId` / `POOL_ID_NAMESPACE_UUID` precedent, `pool/spawn.ts:86-117`) — so a **redelivered** `cycle.frozen` recomputes the identical `alert_id`, re-appends the `alert.frozen` genesis, loses the `(stream_id, event_version=0)` optimistic-concurrency race, and **no-ops** (idempotent trigger; no second alert);
And the pinned `ALERT_ID_NAMESPACE_UUID` is a module constant, **part of the replay identity — never change it**;
And `alert_id` reuses the pre-reserved branded `AlertId` + `alertId` smart constructor (`ids/index.ts:90,109`) — do NOT re-declare.

**AC3 — Cycle-open trigger consumes `cycle.frozen` and drives the alert to `live`.**
Given the alert state machine + `cycle.frozen` emitted exactly once by the Story 7.3 spawn saga's last-child finalize (`pool/spawn.ts:531 finalizeCycleIfComplete`),
When the cycle-open trigger runs for a `cycle.frozen` event,
Then it mints `alert_id = deriveAlertId(cycle_id)` and appends, on the **alert stream** (`stream_id = alert_id`), the genesis `alert.frozen` (carrying `cycle_id`, `pariwar_id`, `pool_ids`, `pool_count`, and the trustee attestation **copied from the `cycle.frozen` payload** — `pool/cycle-events.ts CycleFrozenPayloadSchema`), then `alert.published`, then `alert.live` (contribution window open);
And **`alert.frozen` / `alert.published` / `alert.live` are DOMAIN LIFECYCLE events on the alert's own `events_log` stream** — the state-machine transitions this story owns — **NOT Story 5.1 notification/dispatch alerts** (the `AlertCategory` payloads in `contracts/src/alerts/alert.ts`). The notification whose category is `alert_published` is a *separate* artifact Story 8.8 dispatches when it observes the `alert.published` **lifecycle** event; do not conflate the lifecycle event with the notification payload (see D6);
And the `alerts` hot projection row is upserted to `current_state = 'live'` inside the same transaction as the last appended event (the projector cache-invalidation invariant);
And **"dispatches the cycle-open notification via Story 8.8" is satisfied by emitting `alert.published`** — Story 8.8's trigger subscribes to `alert.published` and performs the Story 5.1-dispatcher fan-out (the FR-23 nudge seam: 8.1 emits the event, 8.8 owns trigger-logic+copy, Epic 5 owns delivery). 8.1 does **not** build the dispatch, the copy templates, or call `@twt/channels`;
And the trigger is **POST-COMMIT + best-effort + idempotent** (the `PoolSpawnTrigger` seam shape, `apps/jobs/src/pool-spawn-trigger.ts`): a slow/failed trigger never rolls back a durable freeze; **trigger failures are logged and retried by redelivery** (which self-heals via AC2's deterministic-`alert_id` genesis race — no fake alert is ever reconstructed).

**AC4 — Degraded-mode cycle-open (AR-66 disaster handling).**
Given AR-66 (disaster handling reads here) + Story 5.8 Pariwar-degraded-mode declaration + Story 3.x `degraded-mode` domain (`packages/domain/src/degraded-mode`),
When a Pariwar-degraded-mode declaration (mode `cycle_open_sms_bridge`) is active for the cycle's Pariwar at cycle-open,
Then the trigger reads the degraded-mode state and the `alert.published` it emits carries `time_critical: true` (the AR-18 cost-optimization override), and the alert path **enables the SMS bridge via Story 5.8** — i.e. 8.1 sets the `time_critical` signal that Story 8.8's dispatcher + Story 5.8's bridge consume; 8.1 does not itself send SMS.

**AC5 — State-mutation invariant (the projector is the exclusive writer of `alerts.current_state` + CI gate).**
Given the state-mutation invariant (same as Story 3.1 / 6.1 / 7.1),
When `alerts.current_state` is examined,
Then it is derived from event replay only, and **the projector is the exclusive writer of `alerts.current_state`** — no other code path may `UPDATE` it; a BEFORE-UPDATE DB trigger (`app.alert_state_writer` guard) **and** a static AST CI gate (`scripts/alert-state-invariant`, twin of `scripts/pool-state-invariant`) both assert it; a new CI job `alert-state-invariant` runs `pnpm alert-state:check` + `pnpm alert-state:test`.

**AC6 — AI-7-4 first-live-caller de-risk (the load-bearing controlled test — MUST pass before the running surface trusts the seam).**
Given the AI-7-4 mandate (`epic-7-retro-2026-07-20.md:138`, `:122`, I-3 `:93`) — *confirm in a controlled test, before the running surface, that the seam wires*,
And **the controlled test is the acceptance of the integration seam, NOT a re-verification of Story 7.3 or Story 7.7 in isolation** (those primitives are `done`; 8.1 proves they compose at the boundary `alert_id` now bridges),
When the de-risk test suite runs,
Then it proves **(a) the alert path fires**: consuming a real `cycle.frozen` (via `finalizeCycleIfComplete` under a live-DB harness) produces `alert.frozen` + `alert.published` (+ `alert.live`) on the alert stream and an `alerts.current_state = 'live'` projection — and a **redelivered** `cycle.frozen` is a clean no-op (exactly one alert, AC2);
And **(b) the `(member_id, alert_id)` `tr=` binding wires** now that `alert_id` first exists: for a member assigned to a pool in the cycle, resolving `alert_id = deriveAlertId(cycle_id)` and calling `deriveContributionReference({ memberId, alertId })` (`pool/contribution-reference.ts`) returns a **stable, bounded, version-pinned** `tr=` that is byte-identical across repeats **and matches a frozen seeded vector** (the 7.4/7.7 frozen-vector discipline — a green "it's deterministic" test proves nothing without the pinned bytes) — reconciling the `(cycle_id, pool_index)` placeholder key 7.3 used (H-2/I-3);
And the reconciliation is recorded in the Dev Agent Record and AI-7-4 is annotated as discharged (link the commit).

## Tasks / Subtasks

- [x] **Task 1 — Alert schema + `alerts` hot projection table + enums (AC1, AC2, AC5).** Author `packages/domain/src/schema/alerts.ts` (twin of `schema/pools.ts`).
  - [x] Declare `ALERT_LIFECYCLE_STATES` tuple `['draft','frozen','published','live','closed','settled']` as the ONE spelling authority; derive `alertLifecycleStateEnum = pgEnum('alert_lifecycle_state', …)` AND the `AlertLifecycleState` TS union from that single tuple (no second list to drift). Underscore/no-delimiter labels (each state is a single word).
  - [x] Columns: `alert_id` (UUID PK, branded `AlertId`, **caller-minted** = the `events_log.stream_id`; NO `gen_random_uuid()` default — the pools/claims posture), `cycle_id` (branded `CycleFreezeCommitId`, NOT NULL, **unFK'd** — no `cycles` table exists, `ids/index.ts:462`), `pariwar_id` (branded uuid NOT NULL, RLS predicate column, unFK'd), `pool_count int NOT NULL`, `current_state alertLifecycleStateEnum NOT NULL` (**NO default** — projector-written), `state_event_version bigint` (the `events_log.event_version` the cache was projected from — the pools/claims precedent), `created_at timestamptz NOT NULL defaultNow()`, `created_by_actor text NOT NULL`, `audit_id`. Add a **UNIQUE index on `cycle_id`** (enforces the one-alert-per-cycle invariant, AC2). Header comment: `current_state` = READ-OPTIMIZATION CACHE, projector-written, guarded by trigger + AST gate (copy the `pools.ts` header block in spirit).
  - [x] Add RLS policy `packages/domain/src/policies/alerts-rls.ts` (pariwar_id predicate; mirror `pools-rls.ts`) + a policy regression test. Every RLS policy in `packages/domain/` ships with positive/negative assertions (architecture.md:745, paraphrased).
- [x] **Task 2 — Alert event vocabulary + `.strict()` payload schemas (AC1).** Author `packages/domain/src/alert/events.ts` (twin of `pool/cycle-events.ts`).
  - [x] Event types `alert.frozen`, `alert.published`, `alert.live`, `alert.closed`, `alert.settled` (single-dot snake_case — the merged-registry convention; contrast the epic prose). `alert.frozen` genesis payload carries `cycle_id`, `pariwar_id`, `pool_count`, `pool_ids`, and the `CycleFreezeAttestation` **copied from `cycle.frozen`** (reuse `pool/cycle-events.ts CycleFreezeAttestationSchema` — do NOT re-declare an attestation shape). Later-transition payloads carry the §1.14 audit shape (`from_state`, `to_state`, `trigger`, `actor`). `.strict()` everywhere.
  - [x] These schemas live in `@twt/domain`, NOT `@twt/contracts` — `@twt/events` depends on `@twt/domain`; the registry + reducer import them (the `pool/events.ts` rationale). Provide a `CYCLE_EVENT_PAYLOAD_SCHEMAS`-style `type → schema` map with a `satisfies` exhaustiveness guard.
- [x] **Task 3 — Register `alert.*` in `packages/events/src/registry.ts` (AC1).** Mirror the Story 7.3 `cycle.*` block (`registry.ts:326-349`) — one `EVENT_TYPE_REGISTRY` entry per event with a description + the domain schema. Keep the `as const satisfies Readonly<Record<string, EventTypeRegistryEntry>>` tail intact.
- [x] **Task 4 — Deterministic `alert_id` derivation (AC2).** Author `packages/domain/src/alert/id.ts` — `deriveAlertId(cycleId): AlertId` = UUIDv5 over a pinned `ALERT_ID_NAMESPACE_UUID` module constant + the canonical `cycle_id` bytes. **Copy the `derivePoolId` implementation pattern verbatim** (`pool/spawn.ts:86-123`: `node:crypto`, namespace-bytes concat, v5 shaping). Pin the namespace as a module constant with a "part of replay identity — never change" comment. Reuse the `AlertId` brand + `alertId` ctor (`ids/index.ts:90,109`). Add a DB-free unit test: determinism (same cycle → same id), distinctness (different cycles → different ids), and a **frozen seeded vector** for the exact bytes.
- [x] **Task 5 — Alert state machine + pure reducer (AC1).** Author `packages/domain/src/alert/state.ts` (twin of `pool/state.ts`).
  - [x] `import { defineStateMachine } from '../state-machine.js'`. `initial: 'draft'` (the pre-genesis fold state; `alert.frozen` is the genesis event, `draft → frozen`, analogous to `pool.spawned` from initial). Reducer is PURE + TOTAL + DETERMINISTIC + IDEMPOTENT; inapplicable/forward-compat event → identity (never throws). Derive `EventRow` locally from `eventsLog.$inferSelect` (do NOT import `@twt/events` — domain↔events cycle). Provide the `toAlertEvent(row)` bridge (`eventType` → `type`) + `replayAlertState(rows)`.
  - [x] Transitions (documentation-only matrix + the runtime `reduce`): `draft →(alert.frozen)→ frozen →(alert.published)→ published →(alert.live)→ live →(alert.closed)→ closed →(alert.settled)→ settled`. **Author the complete reducer** (all transition arms, forward-compat); **this story emits only the cycle-open transitions** `alert.frozen/published/live` (Task 6). `alert.closed` is Story 8.9, `alert.settled` is Epic 9 — the reducer arms exist, the emitters don't (the `pool/state.ts` "authored `settled` arm, Epic 9 emits it" precedent).
  - [x] DB-free unit test constructing `AlertEventInput` objects directly (the pool/claims/members test pattern): happy path `draft→…→settled`, identity on inapplicable events, forward-compat unknown event → identity, no regression from a corrupt replay.
- [x] **Task 6 — Alert state projector (AC3, AC5).** Author `packages/domain/src/alert/project.ts` (twin of `pool/project.ts`).
  - [x] The ONE legitimate writer of `alerts.current_state`. Appends the alert's next lifecycle event to `events_log` **directly** (domain owns the table — the `pool/project.ts:10-16` rationale; do NOT `import '@twt/events'`), using the same optimistic-concurrency `(stream_id, event_version)` contract (`pool/project.ts:170`). Writes `current_state` + `state_event_version` in the SAME transaction. Sets the `app.alert_state_writer` session variable so the DB trigger accepts the write.
  - [x] Provide a `mintAndOpenAlert(tx, { cycleFrozenPayload })` (or similar) that appends `alert.frozen` (genesis, version 0) → `alert.published` → `alert.live` and upserts the projection to `live` — idempotent under redelivery (the genesis append loses the version-0 race → clean no-op, AC2).
- [x] **Task 7 — DB migration + AST gate + DB trigger (AC1, AC5).** Add migration `packages/domain/migrations/0078_alerts-lifecycle.sql` (next free — current tail is `0077`). **Do NOT regenerate an already-applied migration** (`[[project_live_db_test_gotchas]]` — drizzle skips by journal `when`, not SQL hash → 42P07; hand-add the `meta/_journal.json` entry).
  - [x] `CREATE TYPE alert_lifecycle_state`, `CREATE TABLE alerts`, unique index on `cycle_id`, `pariwar_id` lead index. `ALTER TABLE alerts ENABLE ROW LEVEL SECURITY` + the pariwar_id policy (mirror the `pools` migration RLS block; **grant `twt_app` USAGE/privileges** — `[[project_live_db_test_gotchas]]`).
  - [x] BEFORE-UPDATE trigger `alerts_state_writer_guard` (model on the `pools`/`members`/`claims` triggers): reject any UPDATE that changes `current_state` unless the `app.alert_state_writer` session var is set. Include the trigger function + attach.
  - [x] Author `scripts/alert-state-invariant/` (twin of `scripts/pool-state-invariant/`): AST scan asserting `alerts.current_state` is written only by the projector. Wire `pnpm alert-state:check` + `pnpm alert-state:test` scripts + a CI job `alert-state-invariant` in `.github/workflows/ci.yml` (mirror the `claim-state-invariant` job at `ci.yml:477-503` and the `pool-state-invariant` job at `ci.yml:504-530`). Add to `pnpm ci:local`'s mirror if it enumerates jobs (`[[project_ci_actions_suspension_local_mirror]]`).
- [x] **Task 8 — Cycle-open trigger + `cycle.frozen` consumption seam (AC3, AC4, AC6).**
  - [x] Wire the trigger so it fires when `cycle.frozen` is emitted. **Per D4 (DECIDED — build BOTH):** (1) the **primary execution path** — chain off `finalizeCycleIfComplete` (`pool/spawn.ts:531`): when it returns `emitted: true`, enqueue a `CYCLE_OPEN_ALERT` pg-boss job carrying `{ cycle_id, pariwar_id }`; the job worker (in `apps/jobs/src/scheduler/`, architecture §4.4 `:4320`) loads the `cycle.frozen` payload and calls `mintAndOpenAlert`. (2) the **recovery path (NOT the primary)** — a **self-healing sweep** cron that scans cycle streams with a `cycle.frozen` but no minted alert, following the `cycle_freeze_commits.trigger_delivered` sweep pattern (`schema/cycle_freeze_commits.ts:56,66`). The sweep exists only to recover a dropped/failed enqueue; the enqueue is the normal route. Post-commit + best-effort; **trigger failures are logged and retried by redelivery** (never roll back the committed freeze), per the `pool-spawn-trigger.ts` seam.
  - [x] The API service surface goes in `apps/api/src/modules/alert/` (architecture §4.4 `:4272`, `:4522`): `alert.types.ts` + `alert.service.ts` (thin — orchestrates the domain projector; the reducer/projector are the domain authority).
  - [x] AC4 degraded-mode: read the Pariwar's `degraded-mode` state (`packages/domain/src/degraded-mode`) at cycle-open; set `time_critical: true` on the emitted `alert.published` when `cycle_open_sms_bridge` is active. Do NOT send SMS (Story 5.8/8.8).
- [x] **Task 9 — AI-7-4 controlled de-risk test suite (AC6 — load-bearing).** Live-DB integration under `twt-test-pg` on :5433 (`describe.skipIf(!hasDatabase)` + `setupLiveDb()` + `getTx()`; reuse `PARIWAR_A`/`enterAppScope`/`seedPool` from `tests/integration/_helpers.ts`; the `tests/integration/pool/pool-lifecycle.spec.ts` harness template).
  - [x] **(a) Alert path fires:** drive a real cycle through `finalizeCycleIfComplete` → assert `alert.frozen` + `alert.published` + `alert.live` on the alert stream, `alerts.current_state = 'live'`, and the attestation copied from `cycle.frozen`. Then **redeliver** the same `cycle.frozen` and assert exactly one alert (no duplicate stream, genesis race no-ops).
  - [x] **(b) `tr=` binding wires:** for a member in one of the cycle's pools, resolve `alert_id = deriveAlertId(cycle_id)`, call `deriveContributionReference({ memberId, alertId })`, assert the `tr=` is stable across repeats, bounded (≤ NPCI ceiling), and **matches a frozen seeded vector**. Assert the member→pool resolution is the `contribution-binding.ts resolveAssignedPoolForMember` path (never a naive re-hash).
  - [x] Record the `(cycle_id, pool_index)`-placeholder → `(member_id, alert_id)` reconciliation in the Dev Agent Record; annotate AI-7-4 discharged.
- [x] **Task 10 — Sprint-status ledger + regression.** Flip `development_status[8-1-alert-state-machine-cycle-open-trigger]` to the completion state + add the top-of-file reverse-chron COMMENT ledger entry (`[[project_sprint_status_ledger]]`). Run `pnpm ci:local` (all 14 jobs; DB-gated suites need `DATABASE_URL` on :5433 — `[[project_ci_actions_suspension_local_mirror]]`).

### Review Findings

_bmad-code-review, 3-layer adversarial (Blind Hunter + Edge Case Hunter + Acceptance Auditor incl. load-bearing-invariant checklist lens), 2026-07-20. Top claims independently re-verified against the actual diff/repo before triage (transaction boundaries, AST gate reachability, precedent-pattern checks, and a standalone re-derivation of the frozen UUIDv5 vectors)._

- [x] [Review][Patch] AC4's `time_critical: true` branch is never exercised via the real domain path — every test (unit + live-DB) only seeds "no active degraded-mode," so the SMS-bridge signal's true branch is untested [packages/domain/tests/integration/alert/cycle-open-derisk.spec.ts] — applied: added a live-DB test that seeds an active `cycle_open_sms_bridge` declaration via `declareDegradedMode` and asserts `openCycleAlert`'s real result + the persisted `alert.published` event both carry `time_critical: true`
- [x] [Review][Patch] True two-connection concurrent redelivery race is never proven live — the only redelivery test calls `openCycleAlert` twice sequentially on the same transaction, which short-circuits at the fast-path existence check and never exercises the genesis-version-conflict catch branch [packages/domain/tests/integration/alert/cycle-open-derisk.spec.ts] — applied: new twin suite `packages/domain/tests/integration/alert/alert-stream-concurrency.spec.ts` (own-committing, two real pooled connections racing `projectAlertState`'s genesis append — the `pool-stream-concurrency.spec.ts` pattern), proves one wins (`eventVersion: 1`) and the other throws `PoolStreamConcurrencyError`
- [x] [Review][Defer] `CYCLE_OPEN_ALERT` batch worker has no per-job error isolation — one throwing job aborts the whole loop, failing/retrying the entire batch including already-succeeded jobs [apps/jobs/src/scheduler/cycle-open-alert.ts:208-214] — deferred, pre-existing (identical `for (const job of jobs) { results.push(await ...) }` pattern with no try/catch already exists in the sibling `registerCycleSpawnWorkers` child/parent workers in `apps/jobs/src/cycle-spawn.ts:379-397`; not introduced by this story)
- [x] [Review][Patch] Recovery-sweep query has no `ORDER BY` before `LIMIT` — repeated ticks aren't guaranteed a stable/progressing slice of frozen-but-unminted cycles [apps/jobs/src/scheduler/cycle-open-alert.ts:162-169] — applied: added `ORDER BY e.occurred_at ASC`; test asserts the query string
- [x] [Review][Patch] `runCycleOpenAlertSweep`'s return value contradicts its own doc comment ("returns the number of cycles re-enqueued") — it returns candidates scanned, not successes; per-row failures are caught/logged but not subtracted [apps/jobs/src/scheduler/cycle-open-alert.ts:150,171-193] — applied: now returns a `reEnqueued` counter incremented only on a successful `enqueueCycleOpenAlert`; the pre-existing test asserting `count === 2` when one of two enqueues failed was corrected to `count === 1`
- [x] [Review][Patch] `sweepLimit` isn't guarded against 0 or a negative value — produces a misleading alarm (0) or a malformed SQL `LIMIT` (negative) [apps/jobs/src/scheduler/cycle-open-alert.ts:158] — applied: `Math.max(1, deps.sweepLimit ?? DEFAULT_...)`; new test covers both 0 and -5
- [x] [Review][Patch] The load-bearing AC6 de-risk suite only ever drives a single-pool cycle (`poolCount: 1`) — can't fail to resolve the right pool with one candidate, so it never proves the `(member_id, alert_id)` binding disambiguates across multiple pools within one alert — the entire point of the reconciliation this story claims [packages/domain/tests/integration/alert/cycle-open-derisk.spec.ts] — applied: new `driveMultiPoolCycleToFrozen` helper + test driving a 2-claim/2-pool cycle with 2 members, proving the members land in distinct pools sharing one `alert_id`, and their `tr=` references are distinct
- [x] [Review][Patch] `mintAndOpenAlert`'s single try/catch wraps all three appends (genesis/published/live); a conflict at the published/live step would be (mis)diagnosed identically to a genesis-race no-op. Verified structurally unreachable today (atomic transaction; only one writer can ever pass genesis) — narrow the catch to the genesis call alone for defense-in-depth [packages/domain/src/alert/project.ts:329-367] — applied: the try/catch now wraps only the genesis `alert.frozen` append; the published/live appends run unguarded, so a future conflict there propagates instead of being silently diagnosed as an idempotent no-op
- [x] [Review][Patch] `AlertFrozenPayloadSchema` validates `pool_ids.length === pool_count` but never uniqueness — a payload with a duplicated pool id passes silently [packages/domain/src/alert/events.ts:88-100] — applied: added a `new Set(v.pool_ids).size !== v.pool_ids.length` `superRefine` check + a negative unit test
- [x] [Review][Patch] `loadCycleFrozenPayload` lets a malformed stored payload's `ZodError` bubble up raw instead of a diagnosable wrapped error, making an already-rare failure mode opaque under pg-boss retry [packages/domain/src/alert/project.ts:377-389] — applied: wrapped the `.parse()` call in try/catch, rethrowing a message-prefixed `[loadCycleFrozenPayload] malformed cycle.frozen payload for cycle <id>: ...`
- [x] [Review][Defer] AST gate's `chainTargetsAlerts` doesn't resolve chain roots through an intermediate variable assignment (e.g. `const q = db.update(alerts); q.set(...)`) [scripts/alert-state-invariant/lib.ts:112-136] — deferred, pre-existing (identical limitation in the twin `pool-state-invariant` scanner; not introduced by this story)
- [x] [Review][Defer] AST gate's allowlist matches by `(file, functionName)` string equality, not declaration identity — a second same-named function would be incorrectly allowlisted [scripts/alert-state-invariant/lib.ts:233-244] — deferred, pre-existing (identical to the twin `pool-state-invariant` design)
- [x] [Review][Defer] Trigger function `alerts_reject_unguarded_state_write()` has no pinned `SET search_path` [packages/domain/migrations/0078_alerts-lifecycle.sql:78] — deferred, pre-existing (every prior state-invariant trigger function — members/claims/pools — has the same omission)
- [x] [Review][Defer] `trigger` field on alert event payloads is unconstrained free text (`z.string().min(1)`) [packages/domain/src/alert/events.ts:68] — deferred, pre-existing (identical convention in pool/claim/member event schemas)
- [x] [Review][Defer] `enqueueCycleOpenAlert`'s pg-boss `singletonKey` has no `singletonSeconds` tuning [apps/jobs/src/scheduler/cycle-open-alert.ts:75-93] — deferred, efficiency nuance only (AC2's DB-level idempotency is the real correctness backstop regardless of queue-level dedup; a tuned window needs operational judgment, not a code fix)
- [x] [Review][Defer] The `operator`/`trustee` (non-`system`) branch of `projectAlertState`'s actor/actorId cross-check is untested [packages/domain/src/alert/project.ts] — deferred, pre-existing scope gap (this story only ever emits `system`-actor events; Story 8.9/Epic 9 will exercise the other branch when they add operator/trustee-triggered transitions)

**Dismissed as noise/false-positive (4):** AST gate "doesn't cover apps/jobs/scheduler or apps/api/alert" — verified false, neither module imports the `alerts` Drizzle table so they're structurally incapable of writing `current_state` (identical scope discipline to the pool/claim/member gates). "Alerts row can persist stuck below `live`" — verified false, `withPariwarScope` wraps the entire mint sequence in one transaction; any failure rolls back everything including genesis. "UUIDv5 derivation logic duplicated instead of shared" — this is explicit Dev Note guidance (Task 4: copy `derivePoolId` verbatim), matching the established per-domain independent-derivation precedent. "Frozen-vector constants unverifiable" — independently re-derived both pinned vectors with a standalone UUIDv5 implementation outside the codebase; both match exactly.

## Dev Notes

### D1 — Home: `packages/domain/src/alert/` (ratified variance from the epic's `packages/alert-lifecycle`)

The epic AC says "the alert state machine is authored in `packages/alert-lifecycle`." **Home it in `packages/domain/src/alert/` instead** — the identical ratified variance the pool primitive took (`packages/pool-lifecycle` → `packages/domain/src/pool/`, `[[project_pool_primitive_substrate]]`). Reason: an **event-derived-state reducer must live at/below `@twt/domain`** because `@twt/events` depends on `@twt/domain` (turbo cycle events→domain), and the registry + reducer import the schemas. `member/state.ts`, `claim/state.ts`, `pool/state.ts` all live in domain for exactly this reason (`state-machine.ts:1-18`, `[[project_member_lifecycle_domain_substrate]]`). The architecture's `apps/api/src/modules/alert/` (§4.4) is the **service/orchestration** layer that consumes the domain reducer; the `apps/jobs/src/scheduler/` (`architecture.md:4320`) is the trigger driver. Flag this variance in the Dev Agent Record (the pool precedent makes it low-risk).

### D2 — Alert cardinality: ONE alert per cycle; `alert_id` 1:1 with `cycle_id` (DECIDED — architecture-grounded)

Architecture keys pool-spawn idempotency on `(alert_id, claim_id) → pool_id` (`:821`, `:4583`), where `claim_id` (one per approved claim, one per pool) distinguishes the N pools **within a single `alert_id`**. Therefore **one alert per cycle** (per `cycle.frozen`), and `alert_id` is 1:1 with `cycle_id`. A member is assigned to exactly one pool per cycle (`assignability_predicate…`, `contribution-binding.ts resolveAssignedPoolForMember`), so `(member_id, alert_id)` uniquely identifies a member's contribution in a cycle — which is exactly what Story 7.7's `tr=` needs. Deriving `alert_id = UUIDv5(cycle_id)` (Task 4) makes the cycle→alert mapping a **pure function** (no lookup table needed to go cycle→alert) and makes the cycle-open trigger idempotent by construction (redelivery recomputes the same id → genesis version-0 race → no-op). This is the `derivePoolId` idempotency mechanism reused (`pool/spawn.ts:104-117`, `[[project_pool_spawn_saga_atomicity]]`).

### D3 — The reducer mirrors `pool/state.ts`; author the complete reducer, this story emits only the cycle-open transitions

`pool/state.ts` is the closest twin (`spawned/live/closed/settled`). The alert adds `draft`+`frozen`+`published` in front. **Author the complete reducer** (the full six-state total transition graph); **this story emits only the cycle-open transitions** — cycle-open drives `draft→frozen→published→live`; `alert.closed` is Story 8.9 (deadline/close-of-cycle, with Story 7.8 framing); `alert.settled` is **Epic 9's exclusive** (yellow→green flip + disbursement — the epic is explicit that reconciliation-confirmed state ownership belongs to Epic 9, `epics.md:2855`). Authoring the arm without the emitter is the established pattern (pool authored `settled` though Epic 9 emits it).

### D4 — `cycle.frozen` consumption + the trigger seam (DECIDED — BOTH; enqueue is primary, sweep is recovery)

There is no generic events_log fan-out subscriber; the existing precedent is the **post-commit best-effort trigger** (`pool-spawn-trigger.ts`) plus the **self-healing `trigger_delivered` sweep** (`cycle_freeze_commits.ts:56,66`). Note: the `cycle_freeze_commits.trigger_delivered` flag is **already spent by the pool-spawn trigger** (7.3) — do NOT reuse that exact flag; 8.1 consumes the `cycle.frozen` **event**.

**Decision (not a recommendation — build both, with distinct roles):**
1. **Primary execution path — post-commit enqueue from `finalizeCycleIfComplete`** (`pool/spawn.ts:531`), which already knows the instant `cycle.frozen` is emitted (`emitted: true`): enqueue a `CYCLE_OPEN_ALERT` job (at-least-once). This is the normal route by which every cycle-open alert is minted.
2. **Recovery path — a periodic self-healing sweep** (cron scanning cycle streams that have a `cycle.frozen` but no minted alert). This is **recovery only** — it exists to heal a dropped/failed enqueue, NOT to be the primary execution path.

**Implementation note — the sweep is net-new, not a code twin.** `cycle_freeze_commits.ts:66`'s index comment *describes* the self-healing scan's intended shape, but no cron/scheduler anywhere in `apps/jobs` implements it today — the only existing self-heal for `trigger_delivered` is the synchronous idempotent-`commit_id`-replay path in `apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts`. `apps/jobs/src/scheduler/` does not yet exist either. Treat Task 8's recovery sweep as new scheduling work sized from the *pattern*, not as lifting working code — do not search the repo for a cron to copy.

Idempotency is guaranteed by AC2's deterministic `alert_id`, so at-least-once delivery from either path is safe (a redelivery genesis-races to a no-op). **This is a fixed decision, not an implementer's choice** — enqueue-only, sweep-only, or "either" are all NON-conforming: enqueue-only has no recovery for a dropped job; sweep-only makes recovery the hot path (latency + wasted scans). Both, with the sweep subordinate, is the contract.

### D5 — AI-7-4: the first-live-caller de-risk (THE load-bearing commitment)

`epic-7-retro-2026-07-20.md` is unambiguous: **8.1 is the first live caller of both `cycle.frozen`-as-consumer AND the `alert_id`-bound `tr=`** (`:71`, `:93` I-3, `:122`, `:138` AI-7-4). The discipline (I-3): *the seam existed as a primitive for an epic before anything fired it; confirm the first live caller in a controlled test before the running surface trusts it* — the same caution AI-5-2 gave `dispatch` and 7.3 gave `cycle.frozen`. So AC6/Task 9 is not optional polish — it is the reason this story is where it is in the plan. Two things must be proven in a controlled test **before** 8.2/8.4 build on the seam:
1. **`cycle.frozen` actually fires the alert path** (`alert.published` emitted, alert reaches `live`) — and redelivery is a clean no-op.
2. **The `(member_id, alert_id)` binding wires** now that `alert_id` first physically exists — `deriveContributionReference` produces a stable, frozen-vector-matching `tr=`, reconciling the `(cycle_id, pool_index)` placeholder 7.3 used (H-2).
Record the reconciliation and mark AI-7-4 discharged (`[[project_epic7_carries_into_epic8]]`). **Integrity posture** (`[[feedback_record_unattested_no_backfill]]`): if any part of the seam can't be proven, record it as un-attested + carry it — never reconstruct a passing result.

### D6 — `alert_id` reconciliation with the Story 5.1 notification payload (`alert_id` envelope)

Story 5.1's `Alert` payload (`packages/contracts/src/alerts/alert.ts`) already carries an `alert_id` envelope field + `provenance_refs.pool_id`. For the contribution loop, **the lifecycle `alert_id` minted here IS the `alert_id` the cycle-open notification payload carries** (Story 8.8 populates it from this alert) — one identity, so the notification's provenance ties back to the alert object and the `tr=` binding. 8.1 is the first producer of a *contribution-cycle* `alert_id` with real lifecycle semantics (Epic 3 renewal + Epic 6 claim alerts populate the envelope field for their own categories, but those aren't lifecycle-alert ids). Keep the field name/shape aligned; do not fork a second id concept.

### D7 — Gate-scope note (do NOT create a silently-unscanned module; add the alert-state gate)

The `pool-support-category-invariant` gate walks `packages/domain/src/pool` **recursively** only (`scripts/pool-support-category-invariant/check.ts SCAN_DIRS`) — a new `packages/domain/src/alert/` sibling is **outside** that scan. That is fine: the alert lifecycle is **not** a pool support-category surface, so it does not need the death-branch gate (`[[feedback_gate_scope_semantic_coverage]]` — extend a gate only when an invariant has meaningful semantic coverage of the new surface; a vacuous green scan proves nothing — the AI-5-1 trap). What the alert **does** need is the **state-mutation gate** (`alerts.current_state` projector-only), Task 7 — the `pool/member/claim-state-invariant` discipline. Author `scripts/alert-state-invariant` + its CI job; do NOT bolt the alert module onto the support-category gate.

### D8 — AI-6-3-carry: the `alerts` projection is a new compound-read-model surface

The Epic 6/7 carry AI-6-3-carry (`[[project_epic7_carries_into_epic8]]`) — compound-read-model **shape tests** — becomes live as Epic 8's read surfaces land. 8.1 introduces the `alerts` hot projection (a read model). Keep 8.1's projection **single-table** (alert state only); the compound joins (pool × alert × member for the My Pool card / contributor list) are 8.2/8.3, where the AI-6-3-carry shape tests belong. Note the seam so 8.2/8.3 pick up the shape-test obligation.

### D9 — architecture.md's data-flow diagram is stale relative to this story's (and Epic 7's shipped) design — epics.md + shipped code are authoritative

`architecture.md:4576-4591` ("Data flow — monthly contribution cycle (canonical)") narrates `alert.frozen` at cycle-freeze **triggering** pool-spawn ("`alert.frozen` event → scheduler spawns N pool-spawn jobs"). That is the **inverse** of what Epic 7 actually shipped and what this story builds: the pool-spawn saga runs first and its last-child-finalize emits `cycle.frozen` exactly once (`pool/spawn.ts:531`, `[[project_pool_spawn_saga_atomicity]]`); the alert is minted **after**, consuming `cycle.frozen` (AC3). There is no `alert.frozen`-triggers-spawn code anywhere in the repo — the diagram predates Epic 7's `cycle.frozen`-based atomicity design. Do not use that diagram's ordering as a reference when implementing Task 8; epics.md's Epic 8 framing + the shipped `pool/spawn.ts`/`pool/cycle-events.ts` are authoritative. (The nearby line citations this story relies on — `:821`, `:4583`, `:1923`, `:4272/4522`, `:4320` — were individually verified accurate; only the narrative data-flow diagram itself is stale.)

### D10 — AC3's `alert.live` emission is an intentional, ratified extension of the epic's literal AC text

epics.md's Story 8.1 AC literally requires only that the trigger emit `alert.published` + dispatch the cycle-open notification. AC3/Task 5/Task 8 extend this so the cycle-open trigger also drives the alert to `alert.live` (contribution window open). This is not scope creep: nothing else in Epic 8 would ever fire `alert.live`, and 8.2's My Pool card (`[[project_epic7_carries_into_epic8]]`) needs a `live` alert to read from. Flagged here the way D1 flags the module-home variance, so a reviewer reads it as a deliberate, reasoned extension rather than an unlogged deviation from the epic.

### Testing standards

- DB-free unit + property tests in `packages/domain/tests/alert/` (vitest, `vitest run`): reducer purity/totality/idempotency, `deriveAlertId` determinism + **frozen vector**, event-schema `.strict()` rejection.
- Live-DB integration in `packages/domain/tests/integration/` / `apps/jobs/tests/`: the AC6 de-risk suite (Task 9). `twt-test-pg` Docker on :5433; never regenerate an applied migration; never `DROP SCHEMA` reset; own-committing writers accumulate rows → assert membership not counts (`[[project_live_db_test_gotchas]]`). If a suite trips the concurrent-load timeout class, apply suite-level `{ timeout: 20000 }` (`[[project_known_livedb_test_failures]]`).
- The frozen-vector discipline is mandatory for BOTH `deriveAlertId` and the `tr=` binding — a "it's deterministic" green without pinned bytes catches no silent drift (7.4/7.7 lesson).

### Project Structure Notes

- **New:** `packages/domain/src/alert/{events.ts,state.ts,project.ts,id.ts,index.ts}`, `packages/domain/src/schema/alerts.ts`, `packages/domain/src/policies/alerts-rls.ts`, `packages/domain/migrations/0078_alerts-lifecycle.sql`, `scripts/alert-state-invariant/`, `apps/api/src/modules/alert/{alert.types.ts,alert.service.ts}`, `apps/jobs/src/scheduler/` cycle-open worker.
- **Edit:** `packages/events/src/registry.ts` (register `alert.*`), `packages/domain/src/schema/index.ts` (export alerts), `apps/jobs/src/boot.ts` (+ `index.ts`) (register the cycle-open worker/cron), `.github/workflows/ci.yml` (+ `package.json` scripts) (the `alert-state-invariant` job), the `pool/spawn.ts` finalize seam (enqueue the cycle-open job) — a minimal, additive touch; do not alter the frozen `cycle.frozen` payload or the spawn atomicity.
- **Reuse, do NOT re-declare:** `defineStateMachine` (`state-machine.ts`), `AlertId`/`alertId` (`ids/index.ts:90,109`), `CycleFreezeCommitId` (`ids/index.ts:462`), `CycleFreezeAttestationSchema`/`CycleFrozenPayloadSchema` (`pool/cycle-events.ts`), `derivePoolId` pattern (`pool/spawn.ts`), `deriveContributionReference` (`pool/contribution-reference.ts`), `resolveAssignedPoolForMember` (`pool/contribution-binding.ts`), the `Alert` payload contract (`contracts/src/alerts/alert.ts`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.1] (`:2859-2876`) — the alert state machine + cycle-open trigger AC; the FR-22 states; "dispatches via Story 8.8"; the degraded-mode (Story 5.8) arm.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8] (`:2839-2857`) — Epic 8 framing, dependencies (Epic 7 pool spawn + idempotent `tr=`), "closes at yellow pill — green flip is Epic 9".
- [Source: _bmad-output/planning-artifacts/epics.md] (`:58` FR-17 `tr=` per `(member_id, alert_id)`, `:66` FR-22 alert state machine, `:2760-2767` Story 7.7 `tr=`).
- [Source: _bmad-output/planning-artifacts/architecture.md] (`:821` `(alert_id, claim_id)→pool_id`, `:1923` Canonical Alert carries alert_id, `:4272/4522` §4.4 Alert Lifecycle home, `:4320` scheduler + alert state machine, `:4583` pool-spawn idempotency, `:4802-4815` composed Account State deferral).
- [Source: _bmad-output/implementation-artifacts/epic-7-retro-2026-07-20.md] (`:71` H-2, `:93` I-3, `:122`, `:138` **AI-7-4**, `:194-200` next actions) — the first-live-caller mandate this story discharges.
- [Source: _bmad-output/implementation-artifacts/7-3-…md] (`:23,29,31,54-55` `cycle.frozen` exactly-once + `(cycle_id,pool_index)` key + downstream-consumer freeze; `:154-160` idempotency-key reconciliation).
- [Source: _bmad-output/implementation-artifacts/7-7-…md] (`:35-38` pure version-pinned `tr=`, `alertId` opaque, no live call site; `:91-97` D1 bounded derivation; `:99` NPCI carry-forward to Epic 8).
- [Source: packages/domain/src/pool/state.ts] — the reducer twin. [Source: packages/domain/src/pool/project.ts] — the projector twin (`:10-16` events_log direct-append rationale, `:170` insert). [Source: packages/domain/src/pool/cycle-events.ts] — `cycle.frozen` payload + attestation. [Source: packages/domain/src/pool/spawn.ts:86-123,531] — `derivePoolId` UUIDv5 precedent + `finalizeCycleIfComplete`.
- [Source: packages/domain/src/pool/contribution-reference.ts] — `deriveContributionReference`. [Source: packages/domain/src/pool/contribution-binding.ts] — `resolveAssignedPool`. [Source: packages/domain/src/ids/index.ts:90,109,462] — `AlertId`/`alertId`/`CycleFreezeCommitId`.
- [Source: packages/domain/src/schema/cycle_freeze_commits.ts:56,66] — `trigger_delivered` + self-healing sweep pattern. [Source: apps/jobs/src/pool-spawn-trigger.ts] — post-commit best-effort trigger seam. [Source: packages/contracts/src/alerts/alert.ts] — Story 5.1 `Alert` payload (`alert_id` envelope, `AlertCategory`, `provenance_refs.pool_id`). [Source: packages/events/src/registry.ts:326-350] — the `cycle.*` registration template. [Source: scripts/pool-state-invariant + .github/workflows/ci.yml:477-503,504-530] — the claim/pool state-invariant gates + CI jobs to mirror.

## Dev Agent Record

### Agent Model Used

Opus 4.8 (BMad dev-story workflow).

### Debug Log References

- `pnpm --filter @twt/domain typecheck` — green.
- `pnpm --filter @twt/domain exec vitest run tests/alert` — 52 DB-free unit tests (reducer, id + frozen vectors, event schemas) green.
- `pnpm alert-state:test` (24) + `pnpm alert-state:check` (green, 324 files scanned, self-green) — the AST gate has teeth (known-bad fixtures) + a clean live scan.
- `DATABASE_URL=…:5433 pnpm --filter @twt/domain exec vitest run --pool=forks tests/integration/alert tests/integration/rls/alerts-policy-regression.spec.ts` — 15 live-DB tests green (AC6 de-risk ×6, AC5 trigger ×4, RLS ×5).
- `pnpm --filter @twt/{domain,events,queue,jobs,api} typecheck` + `lint` — all green.
- Migration 0078 applied to `twt-test-pg` (:5433); `alerts` table + `alerts_state_write_guard` trigger + `alert_lifecycle_state` enum verified present.
- `pnpm ci:local` (all 14 jobs, DATABASE_URL on :5433): 13/14 green — **`alert-state-invariant` gate passed**, **`integration-tests` passed** (the alert live-DB de-risk + RLS + trigger regression ran within it), `pool-state-invariant`/`determinism-replay`/`channels-determinism`/lint/typecheck/build all green. The ONLY red was `test (unit)`, caused SOLELY by `apps/jobs/tests/measured-validation-pool-spawn.test.ts` (the Story 7.9 AI-7-3 p95 gate) hitting the 60s ceiling at 243s under full concurrent ci:local saturation (`niyamavali-workflow.spec` also took 226s in the same run). **Innocence confirmed** ([[project_known_livedb_test_failures]]): re-run in ISOLATION → p95 = 7.4s (4/4 pass). My `enqueueCycleOpenAlert` seam is provably inert in that test (its `childDeps` never wires the seam → the `if (fin.frozen && deps.enqueueCycleOpenAlert)` guard is skipped). Not a regression attributable to this story — the known machine-load-sensitive AI-7-3 gate under oversubscribed local CI.

### Completion Notes List

**All 6 ACs satisfied; all 10 tasks complete.** The FOURTH event-derived-state primitive (member → claim → pool → alert), homed in `packages/domain/src/alert/` (the ratified D1 variance from the epic's `packages/alert-lifecycle`, mirroring the pool precedent — flagged as deliberate).

- **AC1 (state machine):** `alert/state.ts` — pure/total/deterministic/idempotent reducer over all six states (`draft→frozen→published→live→closed→settled`); inapplicable/forward-compat events are identity. All arms authored; this story emits only the cycle-open transitions (D3). `alert/events.ts` — the 5 `alert.*` `.strict()` payload schemas (DOMAIN lifecycle events, NOT the Story 5.1 notification payloads — D6), registered in `packages/events/src/registry.ts`.
- **AC2 (deterministic `alert_id`):** `alert/id.ts` — `deriveAlertId(cycleId)` = UUIDv5 over a pinned `ALERT_ID_NAMESPACE_UUID` (distinct from the pool namespace), 1:1 with the cycle → idempotent cycle-open by construction. Frozen seeded vectors pin the exact bytes. UNIQUE index on `alerts.cycle_id` is the DB backstop.
- **AC3 (cycle-open trigger):** `alert/project.ts` — `projectAlertState` (the sole `alerts.current_state` writer) + `mintAndOpenAlert` (genesis `alert.frozen`→`alert.published`→`alert.live`, projection upserted to `live` in one tx) + `openCycleAlert` (loads `cycle.frozen`, resolves degraded-mode, mints — the one definition both call sites use). Idempotent: sequential redelivery short-circuits at the existence check; concurrent redelivery loses the genesis version-1 race → no-op. "dispatches via 8.8" satisfied by emitting `alert.published` — NO dispatch/copy/@twt/channels built here.
- **AC4 (degraded-mode):** `openCycleAlert` reads `getActiveDegradedMode` at the cycle-freeze `committed_at`; a `cycle_open_sms_bridge` declaration ⇒ `time_critical: true` on `alert.published`. Reads the schema's `DEGRADED_MODE_MODES[0]` authority, never a literal. No SMS sent (5.8/8.8 own delivery).
- **AC5 (state-mutation invariant):** the projector is the exclusive writer, enforced by BOTH the `alerts_state_write_guard` BEFORE-INSERT-OR-UPDATE DB trigger (migration 0078, guards the `current_state`+`state_event_version` pair) AND the `scripts/alert-state-invariant` AST gate (twin of pool-state-invariant; its OWN gate per D7, not a bolt-on to the support-category gate). New CI job `alert-state-invariant` + `pnpm alert-state:{check,test}` + the ci:local mirror.
- **AC6 (AI-7-4 first-live-caller de-risk — DISCHARGED):** `tests/integration/alert/cycle-open-derisk.spec.ts` proves **(a)** a real `cycle.frozen` (via `finalizeCycleIfComplete`) fires the alert path (`alert.frozen`+`alert.published`+`alert.live`, `alerts.current_state='live'`, attestation copied verbatim) and a redelivery is a clean no-op (exactly one alert); **(b)** the `(member_id, alert_id)` `tr=` binding wires now that `alert_id` first physically exists — `resolveAssignedPoolForMember` (the persisted-snapshot path, never a re-hash) resolves the member's pool, and `deriveContributionReference` returns a stable, bounded (≤35), frozen-vector-matching `tr=`. **Reconciliation:** the `(cycle_id, pool_index)` placeholder key Story 7.3 used (H-2/I-3) is now reconciled to the architecture's `(alert_id, claim_id)` model — `alert_id` is minted at cycle-open and the `tr=` binds `(member_id, alert_id)` deterministically. **AI-7-4 is discharged** (commit on branch `story/8-1-alert-state-machine`).

**Trigger seam (D4 — BOTH built):** PRIMARY = the cycle-spawn CHILD worker enqueues `CYCLE_OPEN_ALERT` post-commit the instant it emits `cycle.frozen` (injected `enqueueCycleOpenAlert` seam in `cycle-spawn.ts`, best-effort — a failed enqueue never fails the committed freeze). RECOVERY = `runCycleOpenAlertSweep` cron scans `cycle.frozen`-but-no-alert cycles and re-enqueues (bounded, logs the cap — no silent truncation). Enqueue-only / sweep-only would be non-conforming.

**Architectural notes / variances flagged:** D1 (module home `alert/` not `alert-lifecycle`), D10 (`alert.live` emission is a ratified extension of the epic's literal AC — nothing else in Epic 8 fires it and 8.2 needs a `live` alert to read). D9 heeded — the stale `architecture.md:4576-4591` data-flow diagram (which inverts freeze/spawn ordering) was NOT used; `epics.md` + shipped `pool/spawn.ts` are authoritative. The composed `openCycleAlert` orchestration lives in `@twt/domain` (both the apps/jobs worker and the thin apps/api `alert.service.ts` call it — "one definition, both call sites") because apps/jobs cannot import apps/api; the story's "pool/spawn.ts finalize seam" enqueue is realised in the apps/jobs child worker (domain cannot enqueue pg-boss). D8 noted — `alerts` is a new single-table read-model surface; the compound-read-model shape tests (AI-6-3-carry) belong to 8.2/8.3.

### File List

**New — domain:**
- `packages/domain/src/schema/alerts.ts`
- `packages/domain/src/policies/alerts-rls.ts`
- `packages/domain/src/alert/events.ts`
- `packages/domain/src/alert/state.ts`
- `packages/domain/src/alert/id.ts`
- `packages/domain/src/alert/project.ts`
- `packages/domain/src/alert/index.ts`
- `packages/domain/migrations/0078_alerts-lifecycle.sql`

**New — AST gate:**
- `scripts/alert-state-invariant/lib.ts`
- `scripts/alert-state-invariant/check.ts`
- `scripts/alert-state-invariant/lib.test.ts`
- `scripts/alert-state-invariant/README.md`

**New — apps/jobs + apps/api:**
- `apps/jobs/src/scheduler/cycle-open-alert.ts`
- `apps/api/src/modules/alert/alert.types.ts`
- `apps/api/src/modules/alert/alert.service.ts`

**New — tests:**
- `packages/domain/tests/alert/state.test.ts`
- `packages/domain/tests/alert/id.test.ts`
- `packages/domain/tests/alert/events.test.ts`
- `packages/domain/tests/integration/alert/cycle-open-derisk.spec.ts`
- `packages/domain/tests/integration/alert/alert-state-trigger.spec.ts`
- `packages/domain/tests/integration/rls/alerts-policy-regression.spec.ts`
- `apps/jobs/tests/cycle-open-alert.test.ts`

**Edited:**
- `packages/domain/src/schema/index.ts` (export alerts)
- `packages/domain/src/policies/index.ts` (export alerts-rls)
- `packages/domain/src/index.ts` (export `alert` namespace)
- `packages/domain/migrations/meta/_journal.json` (hand-add entry 78)
- `packages/events/src/registry.ts` (register `alert.*`)
- `packages/queue/src/index.ts` (`CYCLE_OPEN_ALERT` + `CYCLE_OPEN_ALERT_SWEEP` queue names)
- `apps/jobs/src/cycle-spawn.ts` (primary cycle-open-alert enqueue seam)
- `apps/jobs/src/boot.ts` (register cycle-open workers + wire the enqueue seam)
- `apps/jobs/tests/cycle-spawn.test.ts` (enqueue-seam tests)
- `package.json` (`alert-state:{check,test}` scripts)
- `.github/workflows/ci.yml` (`alert-state-invariant` job)
- `scripts/ci-local.sh` (mirror the alert-state-invariant job)
- `packages/domain/tests/integration/_helpers.ts` (`seedAlert` helper)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (ledger)

### Change Log

- 2026-07-20 — Story 8.1 implemented: alert lifecycle primitive (4th event-derived-state) + cycle-open trigger; discharges AI-7-4. All 6 ACs + 10 tasks complete. Status → review.
