# Story 3.1: Member Lifecycle State Machine + Event Stream `[PRIMITIVE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Solo Builder authoring the member lifecycle that every downstream surface (signup, lock-in, renewal, withdrawal, validity service, claim filing, Module Shelf) consumes,
I want a member lifecycle state machine + event stream that consumes Story 1.3's `@twt/events` event-log primitive — where the persisted `member.state` column is *derived from* event replay and is never directly mutated,
So that the §1.14 source-of-truth commitment (architectural-freeze row 2) is enforced **by construction**, not by convention.

This is the FIRST story of Epic 3 and a pure `[PRIMITIVE]`. It builds the substrate that Stories 3.2–3.12 (mobile auth, KYC, nominees, medical disclosure, payment, lock-in clock, renewal, Life Events, withdrawal, data export, RTBF) all wire into. **It builds the state machine, the reducer, the event vocabulary, the persisted-state projector, the time-travel query, the governance overlay, and the two enforcement guards (DB trigger + CI gate). It does NOT build any UI, any HTTP route, or the signup flow** — those emit the events defined here in later stories.

## Acceptance Criteria

> Lifted verbatim from epics.md §Story 3.1 (lines 1599–1625). FR/AR provenance and the canonical state model are in architecture §1.14 (lines 1219–1284) + PRD §4.1 FR-1/FR-1A (prd.md lines 220–256).

**AC1 — State machine + event vocabulary.**
**Given** Story 1.3's `@twt/events` primitive + AR-14 + architectural-freeze row 2
**When** the member lifecycle state machine is authored (see Project Structure Notes — canonical home is `packages/domain/src/member/`, NOT a new top-level package)
**Then** the state machine declares states (`pending-kyc`, `pending-fee`, `pending-valid`, `lock-in`, `active`, `active-in-grace`, `lapsed-unpaid`, `withdrawn`, `anonymized`) and legal transitions per PRD §1.14 + FR-1A grace semantics
**And** every transition emits a named event on the member's event stream: `member.signup_initiated`, `member.kyc_completed`, `member.kyc_manual_fallback`, `member.nominees_declared`, `member.medical_disclosed`, `member.vyawastha_shulk_paid`, `member.lock_in_entered`, `member.lock_in_expired`, `member.valid_through_reached`, `member.grace_entered`, `member.grace_expired`, `member.withdrawal_requested`, `member.withdrawal_completed`, `member.rtbf_anonymized` (dotted `resource.action` convention per architecture line 3830-3833 — see Dev Notes "Event naming" for the epic's bare-name → dotted-name mapping decision).

**AC2 — State-mutation invariant (this story's load-bearing commitment).**
**Given** the state-mutation invariant
**When** the persisted `members.state` column is examined
**Then** it is **derived from event replay only** — never directly `UPDATE`d by any code path except the single projector
**And** a CI gate asserts no code outside the event-replay projector writes to `members.state`
**And** state replay is **deterministic and idempotent**: replaying a stream from event 1 to event N produces the same final state every time, on every machine.

**AC3 — DB-layer write rejection.**
**Given** any code path attempts to write to `members.state` outside the projector (synthetic test)
**When** the write is attempted
**Then** the write is rejected at the DB layer via a Postgres trigger (session-variable-guarded, mirroring the `app.pariwar_id` pattern)
**And** the rejection surfaces as a P0 architectural-violation audit line (see Dev Notes — the audit line is written by the application boundary that catches the trigger's SQLSTATE, NOT from inside the aborting trigger).

**AC4 — Time-travel query.**
**Given** a downstream consumer (Epic 4 validity service, Epic 6 claim filing, Epic 12 Module Shelf suppression) needs member state as of a given timestamp
**When** the consumer calls `getMemberStateAt(db, memberId, timestamp)`
**Then** the state is computed by replaying events up to but not exceeding `timestamp` — the canonical "what was this member's state on date X?" surface
**And** the replay is ordered by `event_version` (monotonic), NOT by `occurred_at` (which can tie) — ties in `occurred_at` must not make the result non-deterministic.

**AC5 — `account-frozen` governance overlay.**
**Given** the `account-frozen` derived governance overlay pattern (added per Epic 12 Story 12.4 dependency; load-bearing for Module Shelf suppression + future consumers)
**When** a `claim.intake_initiated` event exists for this member **as the deceased subject** (Story 6.1 — does NOT exist yet; build the seam, not the wiring)
**Then** the lifecycle service exposes `account-frozen` as a **derived overlay state** evaluated alongside the primary lifecycle state — **NOT a directly mutable terminal state** in the member's state machine
**And** the overlay is event-derived: `claim.intake_initiated` (this member as deceased) → `account-frozen = true`; claim-case resolution (`claim.settled`, `claim.denied_no_appeal`, configurable policy) → overlay removed per policy
**And** overlay evaluation is **replay-safe and deterministic**; consumers query it via `getMemberAccountOverlay(db, memberId, atTimestamp)` — no consumer re-implements claim-case-existence logic
**And** the architectural precision holds: `account-frozen` is a derived governance overlay emitted from claim-case lifecycle events, orthogonal to the primary state machine (`pending-kyc … withdrawn, anonymized`); both are queryable independently and together.

## Tasks / Subtasks

- [x] **Task 1 — `members` table + branded id + RLS (schema substrate)** (AC: #2, #3)
  - [x] Add `packages/domain/src/schema/members.ts` — Drizzle table `members`. Minimal lifecycle-anchoring shape ONLY (PII/profile/nominee/payment columns are downstream stories' to add): `member_id uuid PK` (= the member's event-stream `stream_id`), `pariwar_id uuid NOT NULL` (tenant), `state` (pgEnum `member_lifecycle_state`) NOT NULL, `state_event_version bigint NOT NULL` (the `event_version` the cached `state` was projected from — staleness/idempotency anchor; use `bigint('state_event_version', { mode: 'number' })` to match the `events_log.event_version` precedent — without `mode: 'number'` Drizzle returns a JS `BigInt` that breaks numeric comparisons with the `number` type `appendEvent` returns), `created_at` / `updated_at timestamptz` defaultNow. Follow the snake_case-column / camelCase-field naming discipline (architecture line 3663-3677); mirror `consent_records.ts` header style.
  - [x] Define the `member_lifecycle_state` pgEnum from a single exported `const` tuple (the one spelling authority — see Dev Notes "State naming"). Exact Drizzle pattern (mirrors `consentTypeEnum` in `consent_records.ts`):
    ```ts
    export const MEMBER_LIFECYCLE_STATES = ['pending-kyc', 'pending-fee', 'pending-valid', 'lock-in', 'active', 'active-in-grace', 'lapsed-unpaid', 'withdrawn', 'anonymized'] as const;
    export const memberLifecycleStateEnum = pgEnum('member_lifecycle_state', MEMBER_LIFECYCLE_STATES);
    export type MemberLifecycleState = typeof MEMBER_LIFECYCLE_STATES[number];
    ```
    Derive both the pgEnum and the TS union from the one `MEMBER_LIFECYCLE_STATES` tuple — no second list to drift. Reuse `MemberId` brand + `memberId()` smart constructor already in `packages/domain/src/ids/index.ts` (do NOT re-declare).
  - [x] Add `packages/domain/src/policies/members-rls.ts` — tenant-isolation SELECT + write policies, copy the `events-log-rls.ts` `nullif(current_setting('app.pariwar_id', true), '')::uuid` construct exactly. Register in `policies/index.ts`.
  - [x] Re-export the table from `packages/domain/src/schema/index.ts` (the Story 3.1 line is already stubbed: "Story 3.1+ members + lifecycle").
- [x] **Task 2 — Member event vocabulary + Zod payload schemas** (AC: #1)
  - [x] Author `member.*` event payload Zod schemas in `packages/domain/src/member/events.ts` (NOT in `@twt/contracts` — see Dev Notes "Dependency direction": domain must not import contracts). Each `z.object({...}).strict()`.
  - [x] Every transition payload carries the architecture §1.14 audit shape: `from_state`, `to_state`, `trigger`, `actor` (`member` | `system` | `trustee`), plus event-specific fields. `timestamp` + `pariwar_id` are columns on `events_log` (do not duplicate in payload).
  - [x] Register each `member.*` type in `EVENT_TYPE_REGISTRY` (`packages/events/src/registry.ts` — currently an empty placeholder awaiting "Story 3.1+ member.*"). `@twt/events` already depends on `@twt/domain`, so it can import these schemas. Each entry shape: `'member.signup_initiated': { type: 'member.signup_initiated', description: 'Member signup flow initiated; initial state → pending-kyc.', schema: SignupInitiatedPayloadSchema }` — the record key equals the `type` string; `schema` is the Zod schema imported from `packages/domain/src/member/events.ts`.
- [x] **Task 3 — State machine definition + pure reducer** (AC: #1, #2, #4)
  - [x] Author `packages/domain/src/member/state.ts` — the canonical home per architecture line 1229. Define the machine via `defineStateMachine({ initial, reduce, transitions })` from `@twt/events`. `transitions` is the documentation transition table (architecture §1.14 table); `reduce: (state, event) => nextState` is runtime authority.
  - [x] Encode the legal transitions from architecture §1.14 (lines 1242-1248) PLUS the epic's two extra states: `pending-kyc` (initial; PRD FR-1 "member created in pending-kyc on form completion") and `anonymized` (RTBF terminal, Story 3.12). See Dev Notes "Transition table" for the full authoritative graph.
  - [x] The `reduce` function MUST be a **pure** function: no `Date.now()`, no randomness, no I/O, no reads of mutable module state. Determinism + idempotency are AC2 — a non-pure reducer silently breaks audit-reproducibility for Epic 7.
  - [x] Add `replayMemberState(rows: EventRow[]): MemberLifecycleState` in `state.ts` — maps each `EventRow` to `{ type: row.eventType, payload: row.payload }` then folds through the state machine. **The bridge is mandatory:** `StateMachineConfig<S, E>` requires `E extends { type: string }` but `EventRow` has `eventType: string` (Drizzle camelCase), not `type` — `machine.fold(rows)` will fail type-check without the mapping step. See Dev Notes "EventRow → typed event bridge".
- [x] **Task 4 — Persisted-state projector (the ONLY writer to `members.state`)** (AC: #2, #3)
  - [x] Author `packages/domain/src/member/project.ts` — `projectMemberState(db, ...)`: in ONE transaction, `appendEvent(...)` (via `@twt/events`) AND update the cached `members.state` + `state_event_version` to the replayed result. This is the single legitimate writer.
  - [x] The projector sets the trigger's allow-guard session variable (`SET LOCAL app.member_state_writer = 'on'`) before the `members.state` write, inside its own transaction (mirror `setPariwarScope`'s `SET LOCAL` discipline — transaction-scoped, MUST be inside `BEGIN`). **Critical:** `SET LOCAL` requires a raw `pg.PoolClient` — call `client.query("SET LOCAL app.member_state_writer = 'on'")` exactly as `setPariwarScope` calls `client.query("SET LOCAL app.pariwar_id = '...'")`; the Drizzle `Db` handle does NOT expose raw `SET LOCAL`. The projector function signature therefore takes a `pg.PoolClient` (not `Db`) as its transaction parameter.
  - [x] Cache-invalidation invariant (architecture §1.14 line 1272-1275 + Cross-Cutting #18): transition emission and the state write are in the SAME transaction so FR-12A validity consumers never see a torn view.
- [x] **Task 5 — `getMemberStateAt` time-travel query** (AC: #4)
  - [x] Add `getMemberStateAt(db, memberId, atTimestamp): Promise<MemberLifecycleState>` in `packages/domain/src/member/read.ts`. Load events `WHERE stream_id = memberId AND occurred_at <= atTimestamp ORDER BY event_version ASC`, then `replayMemberState`.
  - [x] Decide the events-load mechanism (see Dev Notes "Timestamp-bounded replay"): RECOMMENDED — extend `@twt/events` `LoadEventsOptions` with `asOf?: Date` (adds `lte(schema.eventsLog.occurredAt, opts.asOf)` — use the Drizzle camelCase field `occurredAt`, not the SQL column `occurred_at`; the `lte` import is already present in `events-log.ts`; the `events_log_pariwar_occurred_at_idx` index covers it) and keep `ORDER BY event_version`. Do NOT order by `occurredAt`.
- [x] **Task 6 — `account-frozen` governance overlay** (AC: #5)
  - [x] Add `getMemberAccountOverlay(db, memberId, atTimestamp): Promise<{ accountFrozen: boolean; ... }>` in `packages/domain/src/member/overlay.ts`. Build the **deterministic evaluator + query seam**; the claim event source (`claim.intake_initiated` with this member as deceased) is Story 6.1 and does NOT exist yet.
  - [x] The overlay is orthogonal to the primary state machine — it is NOT a state in the `member_lifecycle_state` enum and is NEVER written to `members.state`. Document the claim-event-source seam clearly so Epic 6 / Epic 12 wire it without re-implementing claim-existence logic.
- [x] **Task 7 — DB-layer write-rejection trigger** (AC: #3)
  - [x] Generate the `members` table migration with `pnpm db:generate`, then HAND-SUPPLEMENT a `BEFORE UPDATE` trigger on `members` that `RAISE EXCEPTION` when `NEW.state IS DISTINCT FROM OLD.state` AND the projector guard (`current_setting('app.member_state_writer', true)`) is not `'on'`. Mirror `migrations/0001_events-log.sql` exactly (header warning + trigger function + `--> statement-breakpoint`). DO NOT regenerate 0001-style files. **Migration numbering:** `pnpm db:generate` assigns the next number after `0017_bumpy_norman_osborn.sql` with a Drizzle-flavored random name — find the highest-numbered new file after generation and hand-supplement it.
  - [x] The trigger RAISEs with `USING ERRCODE = 'P0001'` (default `RAISE EXCEPTION` class) and the unique message prefix `'members.state direct write rejected'`. The application boundary catches by matching this message prefix (SQLSTATE `P0001` is distinct from `23505` concurrency errors and `23000` integrity violations already handled in `events-log.ts`) and maps to `MemberStateDirectWriteError`. **P0 audit line is emitted by the application boundary** that catches it — the trigger aborts its own tx and cannot write durably (see Dev Notes "Why the trigger can't write audit").
- [x] **Task 8 — CI gate: "no code writes `members.state` outside the projector"** (AC: #2)
  - [x] Author `scripts/member-state-invariant/{lib.ts,lib.test.ts,check.ts,README.md}` — an AST scanner (TypeScript compiler API) mirroring `scripts/domain-accessor-invariants/`. Flag any `.update(members).set({ state: ... })` (or `members.state` assignment) outside the projector file allowlist.
  - [x] Register `member-state:check` / `member-state:test` in root `package.json`; add a `run "member-state-invariant" ...` line to `scripts/ci-local.sh`; add a gate job to `.github/workflows/ci.yml` mirroring the `domain-invariants` job.
- [x] **Task 9 — Tests** (AC: all)
  - [x] Unit (pure, DB-free): reducer determinism + idempotency (replay 1..N twice → identical); every legal transition; illegal transitions are no-ops or throw per the chosen reducer contract; `account-frozen` overlay evaluation replay-safety.
  - [x] Integration (live DB on :5433, per [[project_live_db_test_gotchas]]): projector writes state in-tx; the trigger REJECTS a direct `UPDATE members SET state` without the guard; `getMemberStateAt` returns historical state; RLS tenant isolation on `members`.
  - [x] CI-gate teeth: `lib.test.ts` asserts the scanner flags a known-bad fixture and passes a known-good one (self-green by construction, like domain-accessor-invariants).

### Review Findings

- [x] [Review][Patch] Reducer throws `ZodError` on malformed `lock_in_expired` payload — violates "never throws" total-reducer contract; replace `kycVerifiedSchema.parse()` with `.safeParse()` + fallback [`packages/domain/src/member/state.ts:86`]
- [x] [Review][Patch] `member.signup_initiated` reducer unconditionally resets to `'pending-kyc'` from any state — violates IDENTITY contract for illegal transitions; add `if (state !== 'pending-kyc') return state` guard [`packages/domain/src/member/state.ts:59`]
- [x] [Review][Patch] Missing cross-tenant overlay integration test — no test verifies a PARIWAR_B `claim.intake_initiated` event doesn't affect a PARIWAR_A member's overlay verdict [`packages/domain/tests/integration/member/member-lifecycle.spec.ts`]
- [x] [Review][Patch] `isMemberStateDirectWriteError` uses `.includes()` instead of `.startsWith()` — allows unrelated `P0001` errors to become false positives [`packages/domain/src/member/errors.ts:94`]
- [x] [Review][Patch] `getMemberAccountOverlay` JSONB comparison is case-sensitive — `payload ->> 'deceased_member_id' = memberId` silently misses UUIDs emitted with non-lowercase casing by Story 6.1 [`packages/domain/src/member/overlay.ts:97`]
- [x] [Review][Defer] `getMemberStateAt` returns `'pending-kyc'` for a non-existent or future member [`packages/domain/src/member/read.ts:44`] — deferred, pre-existing; by spec design (documented; consumers own the pre-existence check; Epic 4/6/12 inherit this contract)
- [x] [Review][Defer] CI gate scanner has bypass gaps — aliased imports and dynamic `.set()` patterns evade detection [`scripts/member-state-invariant/lib.ts`] — deferred, pre-existing; DB trigger (AC3) is the runtime backstop

## Dev Notes

### CRITICAL — package location (resolves an epic-vs-architecture conflict)
The epic AC text says author in `packages/member-lifecycle`. **Do NOT create that package.** The canonical home is **`packages/domain/src/member/`** because:
1. **Architecture §1.14 line 1229 is explicit and canonical:** "Canonical home: `packages/domain/member/state.ts` — single source of truth." Architecture commits structural location (per [[feedback_architecture_vs_prd_boundary]]); it is also newer than epics.md.
2. **The already-merged Story 1.3 substrate points there twice:** `packages/events/src/state-machine.ts` (lines 6-7) and `packages/events/src/events-log.ts` both say the concrete member lifecycle is "authored at `packages/domain/src/member/state.ts` in Epic 3."
3. **Codebase convention:** every domain module lives under `packages/domain/src/<feature>/` (`consent/`, `niyamavali/`, `terms-and-conditions/`, `pariwar-passport/`). There is zero precedent for a per-feature top-level package; one would break the dependency graph and the `@twt/domain` barrel pattern.

Record this as a deliberate variance in Project Structure Notes. (Flagged to the user — see end of story.)

### The load-bearing invariant (why this story exists)
`members.state` is a **read-optimization cache**, not the source of truth. The source of truth is the member's `events_log` stream replayed through the pure reducer (architecture §1.14 lines 1231-1236; Cross-Cutting #4 Determinism & replay). This makes Epic 7 (Pool Engine) audit-reproducibility free. Two guards enforce it: the **DB trigger** (AC3, runtime structural block) and the **CI gate** (AC2, static-scan prevention). Both are required — they are independent layers (the trigger catches raw SQL; the gate catches accidental Drizzle writes at authoring time).

### `@twt/events` substrate you are consuming (Story 1.3 — already merged)
Import surface (`packages/events/src/index.ts`):
- `appendEvent(db, input): Promise<AppendResult>` — optimistic-concurrency append. `input`: `{ streamId, eventType, payload, expectedVersion, actorId, pariwarId, eventId?, payloadSchema? }`. Pass `expectedVersion: 0` for a brand-new stream (first event lands at `event_version = 1`). Throws `ConcurrencyError` on a `(streamId, eventVersion)` collision — an EXPECTED failure; callers re-read and retry.
- `loadEvents(db, streamId, { fromVersion?, toVersion? }): Promise<EventRow[]>` — ordered by `event_version ASC`. **Note:** no `occurred_at` bound today (Task 5 adds one).
- `replayState(db, streamId, reducer, initialState): Promise<S>` — loads full stream + folds. Use for "current state"; use the timestamp-bounded variant for `getMemberStateAt`.
- `defineStateMachine({ initial, reduce, transitions? })` → `StateMachine<S,E>` with `.fold(events)`, `.step(state, event)`, `.initial`, `.transitions`. This is the framework AC1 wants you to use — do NOT hand-roll a switch outside it.
- `EVENT_TYPE_REGISTRY` — empty placeholder; you add the `member.*` entries.
- `canonicalJsonStringify` — for hash producers only (audit/snapshot); the DB stores parsed JSONB.

`events_log` columns (`packages/domain/src/schema/events_log.ts`): `event_id` (uuid PK, `gen_random_uuid()` default; you MAY pass an explicit `eventId` for idempotent re-append), `stream_id` (uuid; **one stream per member → `stream_id = member_id`**), `event_type` (text, dotted), `payload` (jsonb), `event_version` (bigint, monotonic per stream, `>= 1`), `occurred_at` (timestamptz, `now()` default — database-authoritative time), `actor_id` (uuid nullable; **NULL = system/SIE**), `pariwar_id` (uuid). Append-only is structurally enforced (BEFORE UPDATE/DELETE/TRUNCATE triggers in migration 0001) — corrections emit a NEW event, never mutate.

### Transition table (authoritative graph for the reducer)
From architecture §1.14 (lines 1242-1248), extended with the epic's `pending-kyc` (PRD FR-1) and `anonymized` (Story 3.12):

| From | Event (trigger) | To | FR |
|---|---|---|---|
| `(none/initial)` | `member.signup_initiated` | `pending-kyc` | FR-1 |
| `pending-kyc` | `member.kyc_completed` (DigiLocker verified) | `pending-fee` | FR-1, FR-2 |
| `pending-kyc` | `member.kyc_manual_fallback` | `pending-fee` (KYC unverified; resolves to `pending-valid` after lock-in) | FR-2 |
| `pending-fee` | `member.vyawastha_shulk_paid` (UPI Intent + UTR confirmed) | `lock-in` | FR-1, FR-3 |
| `lock-in` | `member.lock_in_expired` (DigiLocker verified) | `active` | FR-1, FR-3 |
| `lock-in` | `member.lock_in_expired` (KYC unverified) | `pending-valid` | FR-2 |
| `pending-valid` | trustee approves manual KYC (`member.kyc_completed` by trustee) | `active` | FR-2 |
| `active` | `member.valid_through_reached` → `member.grace_entered` (`valid_through + 1 day`) | `active-in-grace` | FR-1A |
| `active-in-grace` | renewal `member.vyawastha_shulk_paid` | `active` (NO re-lock-in) | FR-1A |
| `active-in-grace` | `member.grace_expired` (90-day grace elapsed) | `lapsed-unpaid` | FR-1A |
| `lapsed-unpaid` | renewal `member.vyawastha_shulk_paid` | `active` (NO re-lock-in) | FR-1A |
| `active` (or sub-states) | `member.withdrawal_requested` → `member.withdrawal_completed` | `withdrawn` | FR-6 |
| `withdrawn` | RTBF `member.rtbf_anonymized` | `anonymized` | FR-96 |

Reconciliation notes the reducer must encode: (a) `pending-kyc` is the initial state (PRD FR-1 line 227), absent from the architecture table which starts at `pending-fee`; (b) the `lock-in → pending-valid | active` branch depends on a `kycVerified: boolean` field in the `member.lock_in_expired` payload — the reducer produces `active` when `true`, `pending-valid` when `false`; this field MUST be included in the `LockInExpiredPayload` Zod schema and populated by whatever emits the event (SIE in Story 3.7); (c) time-driven transitions (`lock_in_expired`, `grace_entered`, `grace_expired`) are fired by the SIE scheduler in `apps/jobs/scheduler/` in LATER stories (3.7/3.8) — Story 3.1 only declares them as legal and replay-safe; (d) restoration from grace/lapsed does NOT re-apply lock-in (PRD FR-1A line 249); (e) **`member.nominees_declared` and `member.medical_disclosed` are emitted on the member's event stream per AC1 but are NOT state transitions** — the reducer returns the current state unchanged for these event types (no-ops); do NOT invent a phantom state or omit them from the event vocabulary.

### State naming (pick ONE delimiter — it becomes persisted data)
The docs are inconsistent: architecture's table uses underscores for two states (`active_in_grace`, `lapsed_unpaid`) but hyphens for the rest (`pending-fee`, `lock-in`, `pending-valid`); the epic AC + PRD FR-1 use hyphens throughout. Because state strings are persisted in event payloads (`from_state`/`to_state`) and as the pgEnum labels, ONE spelling must be frozen. **Recommendation: hyphenated everywhere** (`pending-kyc`, `pending-fee`, `pending-valid`, `lock-in`, `active`, `active-in-grace`, `lapsed-unpaid`, `withdrawn`, `anonymized`) — matches the epic AC and the majority form. Define them once as an exported `const` tuple → derive both the pgEnum and the TS union from it (no second list to drift). The architecture table's `active_in_grace`/`lapsed_unpaid` denote the SAME states. (Flagged to the user.)

### Event naming (bare → dotted)
The epic AC lists bare names (`lock-in.entered`, `kyc.completed`, …). The codebase convention is dotted `resource.action` snake_case (architecture line 3830-3833; events_log header examples `member.signup_initiated`). Use the dotted snake_case forms in AC1's list (`member.lock_in_entered`, `member.kyc_completed`, …) and register them in `EVENT_TYPE_REGISTRY`. Keep the `member.` resource prefix so streams are self-describing.

### EventRow → typed event bridge (reducer input type)

`StateMachineConfig<S, E>` requires `E extends { type: string }`. `EventRow` (the live-DB type) has field `eventType: string` (Drizzle camelCase of the `event_type` column), NOT `type`. These are incompatible — `machine.fold(eventRows)` fails type-check without a bridge.

Required pattern in `state.ts`:

```ts
type MemberEventInput = { type: string; payload: unknown };

function toMemberEvent(row: EventRow): MemberEventInput {
  return { type: row.eventType, payload: row.payload };
}

export function replayMemberState(rows: EventRow[]): MemberLifecycleState {
  return machine.fold(rows.map(toMemberEvent));
}
```

The reducer (`reduce(state, event)`) pattern-matches on `event.type` (the mapped field) and Zod-parses `event.payload` per branch using the schemas from `events.ts`. Unit tests construct `MemberEventInput` objects directly (no `EventRow` needed), keeping them DB-free. `getMemberStateAt` loads `EventRow[]` from DB and calls `replayMemberState(rows)`.

### Dependency direction (avoid a cycle)
`@twt/events` depends on `@twt/domain`. `@twt/contracts` may depend on `@twt/domain` (contracts → domain is the legal direction, per the `ClauseId`/`CLAUSE_ID_REGEX` precedent). Therefore **author the `member.*` event payload Zod schemas in `packages/domain/src/member/events.ts`**, where both the `@twt/events` registry and the reducer can import them. Do NOT put them in `@twt/contracts` and import contracts from domain — that reverses the legal direction. `packages/contracts/src/members/` (today a placeholder README) may later re-export or mirror these for transport; that is Story 3.2+/3.3 territory, not this story.

### Why the trigger can't write the audit line (AC3 nuance)
A `BEFORE UPDATE` trigger that `RAISE EXCEPTION` aborts the surrounding transaction — any audit row it tried to write would roll back with it. So the trigger is the **structural block**; the **P0 architectural-violation audit line is written by the application boundary that catches the trigger's SQLSTATE** (mirror how `@twt/events` `appendEvent` catches the unique-violation `23505` and maps it to `ConcurrencyError`). Expose a typed error (e.g. `MemberStateDirectWriteError`) from `packages/domain/src/member/errors.ts`, surfaced at the `@twt/domain` barrel top-level (mirror `ConsentStateError` / `ToneReviewRequiredError`), so the app-layer handler can recognize it and emit the audit line + return the right HTTP code. The synthetic test in AC3 asserts the trigger rejects the raw write; the audit-emission wiring is exercised where a catching boundary exists.

### Project Structure Notes
- **New files:** `packages/domain/src/schema/members.ts`, `packages/domain/src/policies/members-rls.ts`, `packages/domain/src/member/{state.ts,events.ts,project.ts,read.ts,overlay.ts,errors.ts,index.ts}`, `scripts/member-state-invariant/{lib.ts,lib.test.ts,check.ts,README.md}`, a new hand-supplemented migration under `packages/domain/migrations/`, and tests under `packages/domain/tests/member/`.
- **Edited files:** `packages/domain/src/schema/index.ts` (re-export members), `packages/domain/src/policies/index.ts` (register RLS), `packages/domain/src/index.ts` (export `member` namespace + the typed error at top-level), `packages/events/src/registry.ts` (member.* entries; possibly `LoadEventsOptions` `asOf` in `events-log.ts`), root `package.json` (gate scripts), `scripts/ci-local.sh`, `.github/workflows/ci.yml`.
- **Module shape:** mirror `consent/` — `index.ts` is a barrel (`export * from './read.js'`, etc.), surfaced as `export * as member from './member/index.js'` in the domain barrel (`packages/domain/src/index.ts`) so consumers call `member.getMemberStateAt(...)`. Add the line analogous to `export * as consent from './consent/index.js'` (line 95 of `index.ts`). Also surface the typed error at the top-level barrel (`MemberStateDirectWriteError` + `MEMBER_STATE_DIRECT_WRITE_CODE`) matching the `ConsentNotFoundError`/`CONSENT_NOT_FOUND_CODE` pattern at lines 79–84 of `index.ts` — so apps/api error-mapping middleware imports by code from `@twt/domain` directly.
- **Variance (recorded):** location moved from epic's `packages/member-lifecycle` → architecture-canonical `packages/domain/src/member/`. Rationale above.

### Testing standards summary
- Vitest. Unit tests are DB-free and pure (reducer/overlay). Integration tests need a live Postgres on **:5433** (`twt-test-pg` Docker) per [[project_live_db_test_gotchas]] — and observe its gotchas: never regenerate an applied migration (drizzle keys on journal `when`, not SQL hash → 42P07); never `DROP SCHEMA` to reset (strips `twt_app` USAGE → 42P01); own-committing writers accumulate rows, so assert membership not exact counts.
- RLS integration tests must `SET LOCAL ROLE twt_app` to shed superuser before asserting policy behaviour (local/CI login role is superuser and bypasses RLS — see `db.ts` lines 100-105 + test-utils).
- The merge gate is `pnpm ci:local` (mirrors all ci.yml jobs) per [[project_ci_actions_suspension_local_mirror]]; integration needs `DATABASE_URL` on :5433. Run it before declaring done; the new gate must be green by construction.
- New CI gate follows the precision-scan pattern (scan `packages/domain/src`, not a git-diff) — self-green by construction like `domain-accessor-invariants`.

### References
- [Source: epics.md#Story 3.1 (lines 1593-1625)] — ACs verbatim + `[PRIMITIVE]` label.
- [Source: epics.md#Epic 3 (lines 1567-1591)] — epic objectives, three demoable scenarios, dependencies (Epic 1 event log + Epic 2 registry).
- [Source: architecture.md#1.14 Member Lifecycle State Model (lines 1219-1284)] — canonical home (line 1229), source-of-truth principle, transition table, SIE time-driven transitions, cache-invalidation invariant, audit-emission shape.
- [Source: prds/prd-TWT-2026-05-22/prd.md#FR-1 / FR-1A / FR-3 (lines 220-274)] — `pending-kyc` initial state, grace-state semantics, `vyawastha_shulk_status` payload, no-re-lock-in-on-restoration.
- [Source: packages/events/src/{index,events-log,state-machine,registry}.ts] — the substrate API you consume.
- [Source: packages/domain/src/schema/events_log.ts + migrations/0001_events-log.sql] — events_log shape + the append-only trigger pattern to mirror for AC3.
- [Source: packages/domain/src/schema/consent_records.ts + consent/*] — the freshest `[PRIMITIVE]` module convention (table header style, read/write/errors/index split, typed-error-at-barrel-top pattern).
- [Source: packages/domain/src/ids/index.ts (lines 87, 103)] — `MemberId` brand + `memberId()` constructor already exist; reuse.
- [Source: packages/domain/src/policies/events-log-rls.ts + db.ts] — RLS `nullif(...)` construct + `SET LOCAL` session-variable discipline for the projector guard.
- [Source: scripts/domain-accessor-invariants/{lib,check}.ts + README.md] — the AST-gate pattern to clone for Task 8.
- [Source: packages/contracts/src/members/README.md] — `.strict()` Zod discipline, tenant-scoped path grammar, no-type-shadowing rule for downstream surfaces.

## Previous Story Intelligence

Story 3.1 is the first story of Epic 3, so there is no in-epic predecessor. Carry-forward from the just-closed Epic 2 (most recent merged work):
- **Domain `[PRIMITIVE]` shape is settled** by Story 2.7 (consent registry): table in `schema/`, RLS in `policies/`, accessors split `read.ts`/`write.ts`/`errors.ts` behind an `index.ts` barrel, typed errors re-surfaced at the `@twt/domain` top-level for the app-layer error-mapping middleware to import by code. Mirror it; do NOT invent a new shape.
- **Audit-or-throw is a CONSUMER obligation.** Like `consent`, the member accessors take a caller-supplied `auditId` and do NOT orchestrate audit/HTTP/auth — the signup route (Story 3.6) writes the audit line first and threads the id. Keep Story 3.1 transport-free.
- **AI-2-2 lesson (last-but-one commit):** the `domain-accessor-invariants` gate was added precisely because a recurring invariant ("clamp every dynamic `.limit`") was violated in 5 places that passed review. The takeaway for Task 8: a load-bearing invariant ("only the projector writes `members.state`") needs a *machine* guard, not a reviewer note — that is why AC2 requires the CI gate AND AC3 the DB trigger.

## Git Intelligence Summary

Last 5 commits: `f974689` AI-2-3 test-quality checkpoint · `56fff0e` AI-2-2 domain-accessor pagination invariant gate (+ fixed 5 bypasses) · `aa34a08` Epic 2 retrospective + retire AI-cadence instrument (ADR-0025) · `92e0806` ratify ADR-0022/0023/0024 · `bab4465` flip 2.6 → done. Signal: Epic 2 is closed and retro'd; the codebase is at a clean Epic-3 starting line. The two most recent substantive commits both concern *enforcing domain invariants by machine* — directly the posture Story 3.1's two guards adopt.

## Latest Tech Information

No new external libraries are introduced. Stack is pinned and in-repo: `drizzle-orm ^0.45.0`, `drizzle-kit ^0.31.0`, `zod ^3.23.0`, `typescript ~5.9.2`, `vitest ^2.1.8`, Postgres 16 (Cloud SQL; local Docker on :5433), `pg ^8.13.0`. Reuse the existing `defineStateMachine` framework and `appendEvent`/`loadEvents`/`replayState` API rather than adding any state-machine or event-sourcing dependency. `pgcrypto` (`gen_random_uuid()`) is pre-installed. pgEnum labels may contain hyphens (Postgres treats enum labels as opaque strings) — no escaping concern.

## Project Context Reference

No `project-context.md` is present in the repo. Cross-cutting conventions are carried in CLAUDE.md + the auto-memory index (see the `[[…]]` links above). Honour: the architecture/PRD/ADR three-way boundary ([[feedback_architecture_vs_prd_boundary]], [[feedback_architecture_vs_adr_boundary]]); live-DB test gotchas ([[project_live_db_test_gotchas]]); ESLint per-package cwd rule globs ([[project_eslint_config_per_package_cwd]]) if adding a rule carve-out; the `pnpm ci:local` merge gate ([[project_ci_actions_suspension_local_mirror]]); sprint-status ledger convention ([[project_sprint_status_ledger]]) for the eventual status flip.

## Story Completion Status

Ultimate context engine analysis completed — comprehensive developer guide created. Status: ready-for-dev.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story workflow).

### Debug Log References

- `pnpm --filter @twt/domain db:generate` → emitted `migrations/0018_ordinary_venom.sql` (hand-supplemented).
- `DATABASE_URL=…:5433 pnpm --filter @twt/domain db:migrate` → applied 0018; `db:check` → "Everything's fine".
- `pnpm member-state:test` (9) + `pnpm member-state:check` (green) — gate self-green by construction.
- `DATABASE_URL=…:5433 pnpm ci:local` → **17/17 jobs green** (16 static + integration). One earlier `test (unit)` flake was transient shared-test-DB contention (exporting DATABASE_URL globally makes ci:local's unit job — DB-free in real GitHub CI — run all packages' integration suites at full parallelism); re-ran clean. New member integration specs use BEGIN/ROLLBACK isolation (no committing writers), so they are not a contention source.

### Completion Notes List

All 5 ACs satisfied; all 9 tasks complete. Key implementation decisions + discovered variances:

- **AC1** — 14 `member.*` events authored as strict Zod payload schemas (`member/events.ts`) + registered in `EVENT_TYPE_REGISTRY`. Reducer (`member/state.ts`) via `defineStateMachine`, encoding the architecture §1.14 transition table + `pending-kyc` (FR-1 initial) + `anonymized` (RTBF terminal). Non-transition markers (`nominees_declared`, `medical_disclosed`, `lock_in_entered`, `valid_through_reached`, `withdrawal_requested`) are reducer identity (no-ops), per Dev Notes note (e); documented in `events.ts`.
- **AC2** — `members.state` is replay-derived; the projector (`member/project.ts`) is the single writer. Two independent guards: the DB trigger (AC3) + the `member-state-invariant` CI gate (static TS-AST scan, allowlisting only the projector). Reducer determinism + idempotency proven in `tests/member/state.test.ts` (replay 1..N twice, prefix-fold consistency, fold≡reduce).
- **AC3** — `BEFORE UPDATE` trigger on `members` (migration 0018) RAISEs `P0001` + prefix `members.state direct write rejected` unless `app.member_state_writer='on'` (the projector's tx-scoped guard). `MemberStateDirectWriteError` + `isMemberStateDirectWriteError` detector at the `@twt/domain` top-level barrel for the future catching boundary (Story 3.6) to emit the P0 audit line. Synthetic rejection asserted in the integration spec.
- **AC4** — `getMemberStateAt` (`member/read.ts`) replays `occurred_at <= atTimestamp` ordered by `event_version` (NOT `occurred_at`); the tie-determinism is asserted with two same-`occurred_at` events.
- **AC5** — `account-frozen` is a derived overlay (`member/overlay.ts`), orthogonal to the state machine, never written to `members.state`. Pure `evaluateAccountOverlay` + the single query surface `getMemberAccountOverlay`; the claim-event source is the Story 6.1 seam (`claim.intake_initiated` carrying `deceased_member_id`). End-to-end seam asserted in the integration spec.

**Discovered architectural variances (beyond the story's pre-flagged ones), recorded for trustee/review awareness:**

1. **State-machine framework relocated `@twt/events` → `@twt/domain`** (`packages/domain/src/state-machine.ts`; `@twt/events` now re-exports it). Story Task 3 says use `defineStateMachine` "from `@twt/events`", but `@twt/events` depends on `@twt/domain`, and a `@twt/domain → @twt/events` dependency would create a **turbo task cycle** (`build`/`typecheck`/`test` all use `dependsOn:["^…"]`) that breaks `pnpm ci:local`. The framework is pure (zero imports), so moving it down to the shared base layer is cycle-free, DRY (one definition), and API-preserving (Story 1.3 consumers + the `@twt/events` barrel unchanged; its `state-machine.test.ts` still green via the re-export). Honors "use the framework, don't hand-roll."
2. **Projector + reads query `events_log` directly via Drizzle, NOT via `@twt/events` `appendEvent`/`loadEvents`** — same cycle constraint. `@twt/domain` *owns* the `events_log` table, so direct insert/select is legitimate; the projector mirrors `appendEvent`'s optimistic-concurrency contract (`MemberStreamConcurrencyError` on the `(stream_id,event_version)` unique-index race). This also aligns with Task 8 (the gate scans `packages/domain/src` and allowlists the domain projector). Consequently the recommended `LoadEventsOptions.asOf` extension to `@twt/events` was NOT made (unnecessary — no consumer routes through `events.loadEvents`).
3. **Package location** — implemented at `packages/domain/src/member/` per architecture §1.14 (the story's pre-flagged epic-vs-architecture resolution), NOT `packages/member-lifecycle`.
4. **State naming** — hyphenated everywhere (`active-in-grace`, `lapsed-unpaid`), the one frozen spelling (pre-flagged in Dev Notes "State naming"). **Event naming** — dotted snake_case `member.*` (pre-flagged).

`getMemberStateAt` degenerate case: an instant before any event replays to the machine initial (`pending-kyc`) — documented in `read.ts` (consumers query for members that exist at the instant).

### File List

**New — `@twt/domain`:**
- `packages/domain/src/schema/members.ts`
- `packages/domain/src/policies/members-rls.ts`
- `packages/domain/src/state-machine.ts` (framework relocated from `@twt/events`)
- `packages/domain/src/member/state.ts`
- `packages/domain/src/member/events.ts`
- `packages/domain/src/member/project.ts`
- `packages/domain/src/member/read.ts`
- `packages/domain/src/member/overlay.ts`
- `packages/domain/src/member/errors.ts`
- `packages/domain/src/member/index.ts`
- `packages/domain/migrations/0018_ordinary_venom.sql` (hand-supplemented: GRANT/FORCE + write-rejection trigger)
- `packages/domain/migrations/meta/0018_snapshot.json` (drizzle-generated)
- `packages/domain/tests/member/state.test.ts`
- `packages/domain/tests/member/overlay.test.ts`
- `packages/domain/tests/integration/member/member-lifecycle.spec.ts`
- `packages/domain/tests/integration/rls/members-policy-regression.spec.ts`

**New — CI gate:**
- `scripts/member-state-invariant/lib.ts`
- `scripts/member-state-invariant/lib.test.ts`
- `scripts/member-state-invariant/check.ts`
- `scripts/member-state-invariant/README.md`

**Edited:**
- `packages/domain/src/schema/index.ts` (re-export `members`)
- `packages/domain/src/policies/index.ts` (register `members-rls`)
- `packages/domain/src/index.ts` (export framework + `member` namespace + top-level `MemberStateDirectWriteError`)
- `packages/domain/tests/integration/_helpers.ts` (`seedMember` helper + `memberId` import)
- `packages/domain/migrations/meta/_journal.json` (drizzle-generated 0018 entry)
- `packages/events/src/state-machine.ts` (now a re-export shim of `@twt/domain`)
- `packages/events/src/registry.ts` (14 `member.*` `EVENT_TYPE_REGISTRY` entries)
- `package.json` (`member-state:check` / `member-state:test` scripts)
- `scripts/ci-local.sh` (member-state-invariant job + job-count comments)
- `.github/workflows/ci.yml` (member-state-invariant job)

## Change Log

| Date | Change |
|---|---|
| 2026-06-24 | Story 3.1 implemented — member lifecycle state machine + event stream `[PRIMITIVE]`. members table + `member_lifecycle_state` pgEnum + tenant-isolation RLS; 14 `member.*` events (strict Zod) registered in `EVENT_TYPE_REGISTRY`; pure deterministic reducer + state machine; single-writer projector (events_log append + state projection in one tx); `getMemberStateAt` time-travel; `account-frozen` derived overlay + Story-6.1 seam; AC3 DB write-rejection trigger (migration 0018) + `MemberStateDirectWriteError`; `member-state-invariant` CI gate (static scan, allowlisting the projector). Relocated the pure state-machine framework `@twt/events` → `@twt/domain` to break a turbo dependency cycle (re-exported, API-preserving). 20 unit + 11 integration tests; `pnpm ci:local` 17/17 green. Status → review. |
