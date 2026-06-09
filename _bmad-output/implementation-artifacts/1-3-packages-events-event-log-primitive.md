# Story 1.3: `packages/events` Event Log Primitive (§1.14 Source-of-Truth)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As **Solo Builder**,
I want **an event log primitive in `packages/events/` enforcing §1.14 (event history is source-of-truth; persisted state is optimization only) — backed by an `events_log` table in `packages/domain/` with append-only Postgres triggers, exposing `appendEvent` / `loadEvents` / `replayState` with optimistic concurrency, and carrying the `StateMachine<S, E>` framework primitive for UX-DR74**,
So that **every downstream epic's domain state (Story 3.1+ member lifecycle, Story 6.x claim state, Story 7.x pool state, Story 8.x alert state, Story 9.x reconciliation events) is event-derived and audit-reproducible by construction**.

This is the **third Epic 1 engineering story** (`[PRIMITIVE]`). It commits the **substrate** for §1.14 (member state derived from event history) + AR-8 (events package immutability) + AR-14 (member state machine consuming events) + AR-57 (determinism & replay) + UX-DR74 (Account State Machine framework primitive). Per architecture §Implementation Handoff (lines 5079-5099), this lands within PR-2 territory; it does NOT include the substantive member-state lifecycle (Story 3.1+ territory), audit-log hash-chain (Story 1.10 territory), or per-event-type Zod schemas for downstream domains (those land with their owning Stories — pool events at 7.x, claim events at 6.x, etc.). Story 1.3 commits the **generic event log + state-machine substrate** that all of those consume.

## Acceptance Criteria

**AC-1 — `packages/events/` exposes `appendEvent` + `loadEvents` + `replayState` API backed by an append-only `events_log` table, with the 8-column event shape + `StateMachine<S, E>` framework primitive**

**Given** Sprint Change Proposal Item 3's source-of-truth commitment (epics line 519) + AR-8 (epics line 263: "`packages/events` enforces event immutability — corrections emit new events; never mutate") + §1.14 architecture canonical home `packages/domain/member/state.ts` (architecture line 1227) + UX-DR74 (epics line 474: Account State Machine as UX surface)
**When** the `packages/events/` workspace is substantively authored (replacing the Story 1.1 `export {}` placeholder per `packages/events/src/index.ts` HEAD state)
**Then** the primitive exposes three generic operations over the `events_log` table:
- `appendEvent(db, { streamId, eventType, payload, expectedVersion, actorId, pariwarId, eventId? }): Promise<AppendResult>` — inserts a single event row at `event_version = expectedVersion + 1`; throws `ConcurrencyError` if the database UNIQUE constraint on `(stream_id, event_version)` is violated; never updates an existing row; returns `AppendResult = Pick<EventRow, 'eventId' | 'eventVersion'>` (the inserted event's id + version). Note: implementation returns `EventRow` internally but exposes the `AppendResult` subset type — see Review D1 resolution (code-review pass 1).
- `loadEvents(db, streamId, { fromVersion?, toVersion? }): Promise<EventRow[]>` — SELECT all events for `streamId`, ordered ascending by `event_version`; supports `from` / `to` slicing for incremental projections.
- `replayState<S>(db, streamId, reducer, initialState): Promise<S>` — load all events + fold via `reducer(state, event)` producing a deterministic state; equivalent to `loadEvents().then(events => events.reduce(reducer, initialState))` with byte-deterministic semantics (architecture §Cross-Cutting #4 + architecture line 1229-1234 "Member state is derived from event history. Persisted state is an optimization only").

**And** every event row in `events_log` carries the 8 mandatory columns per epics line 1035: `event_id` (UUID PK), `stream_id` (UUID NOT NULL), `event_type` (TEXT NOT NULL with `dotted.resource.action` convention per architecture line 3830-3833), `payload` (JSONB NOT NULL with canonical-JSON serialization per architecture line 3843 + line 898-902), `event_version` (BIGINT NOT NULL ≥ 1; monotonically increasing per stream), `occurred_at` (TIMESTAMPTZ NOT NULL DEFAULT `now()` per architecture §1.11 database-authoritative time), `actor_id` (UUID NULL — system-time-driven transitions per architecture §1.14 line 1262-1268 + Cross-Cutting #14 SIE emit `actor: 'system'`), `pariwar_id` (UUID NOT NULL — multi-tenant scoping per architecture §1.2 + RLS-ready for Story 1.6). UNIQUE constraint on `(stream_id, event_version)` enforces optimistic concurrency at the DB layer; index on `(pariwar_id, stream_id)` supports per-tenant per-stream queries; index on `(pariwar_id, occurred_at)` supports event-stream tail reads.

**And** events are **immutable**: append-only enforced at the database layer via Postgres triggers (BEFORE UPDATE OR DELETE → `RAISE EXCEPTION 'events_log is append-only — corrections emit a new event'`) per AR-8 + architecture §Package Boundary Rationale line 428-431 ("Events are immutable: a correction emits a *new* event referring to the original; no event row is ever rewritten. This rule protects the replay foundation that Pool Engine determinism (Step 2) and audit log integrity both depend on"). The trigger is the **structural guarantee**; the application-layer API additionally provides no UPDATE/DELETE paths.

**And** the **Account State Machine framework primitive (UX-DR74)** lives in `packages/events/` as a generic `StateMachine<S, E>` interface — typed `{ initial: S; reduce: (state: S, event: E) => S; transitions?: ReadonlyArray<{ from: S; event: E['type']; to: S }> }` shape — substantive **member-state lifecycle** (`pending-fee → lock-in → (pending-valid | active) → active_in_grace → lapsed_unpaid → withdrawn` per architecture §1.14 line 1238-1246 + AR-14) lives at `packages/domain/src/member/state.ts` and lands in **Epic 3** (Story 3.1+), NOT in Story 1.3. Story 1.3 commits only the **interface + generic combinator** + a documentation pointer to architecture §1.14 line 1217-1283.

**AC-2 — State replay is deterministic + idempotent across repeated invocations**

**Given** an event stream populated via `appendEvent` (any number of events 1..N)
**When** `replayState(db, streamId, reducer, initial)` is invoked multiple times against the same stream + the same `(reducer, initial)`
**Then** every invocation returns a **byte-identical** result (deterministic; per architecture §Cross-Cutting #4 line 284-285 + AR-57 "Pool Engine assignment reproducible from snapshotted membership-at-freeze") — verified by a vitest property-style test that constructs a stream, replays it twice, and asserts deep equality.

**And** replay is **idempotent at the DB layer** — re-calling `loadEvents` reads the same rows in the same `event_version` order; the underlying `events_log` ORDER BY `event_version ASC` is stable across repeat reads (no `created_at` tiebreaker required because `(stream_id, event_version)` is unique).

**And** the canonical-JSON serializer (Task 4) produces byte-identical output for semantically-equal payloads — verified by a vitest unit test that serializes `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` and asserts the two byte streams match — securing the cross-consumer hash-chain compatibility commitment per architecture line 898-902 ("All hash producers and verifiers — Pool Engine snapshot writers, audit-log writers, integrity-check job — use the same canonicalizer. Divergent canonicalization is a build-time error").

## Tasks / Subtasks

- [x] **Task 1: `events_log` Drizzle schema + append-only Postgres triggers + drizzle-kit migration 0001** (AC: #1)
  - [x] 1.1 Author `packages/domain/src/schema/events_log.ts` declaring the `events_log` table with the architecture-canonical snake_case-DB / camelCase-TS naming discipline (architecture line 3663-3677). Columns (drizzle-orm/pg-core):
    - `eventId: uuid('event_id').defaultRandom().primaryKey()` — generated server-side via `gen_random_uuid()` (pgcrypto extension; pre-installed in Cloud SQL Postgres 16 per architecture §5.2 line 2976-2980). Caller MAY supply an explicit `eventId` (for idempotent re-append semantics; matches AR-58 idempotency-keyed-store posture); when omitted the DB default fires.
    - `streamId: uuid('stream_id').notNull()` — opaque to the events package; downstream consumers choose what a stream is (one stream per member for member-lifecycle in Story 3.1+; one stream per claim for Story 6.x; one stream per pool for Story 7.x; one stream per reconciliation cycle for Story 9.x).
    - `eventType: text('event_type').notNull()` — dotted-resource.action convention per architecture line 3830-3833 (e.g., `member.signup_initiated`, `pool.spawned`, `contribution.matched`); free-form string at the storage layer; downstream consumers add Zod validation via `packages/contracts/` or per-domain helpers.
    - `payload: jsonb('payload').notNull()` — event payload; written via the canonical-JSON serializer (Task 4) so the cross-consumer hash-chain commitment (architecture line 898-902) is structurally enforced. The DB stores JSONB (parsed); the canonical-JSON serializer is invoked at the read-and-hash boundary by audit-log writers + Pool Engine snapshot writers in their respective downstream Stories (1.10 / 7.x).
    - `eventVersion: bigint('event_version', { mode: 'number' }).notNull()` — Drizzle bigint with `mode: 'number'` is JavaScript-safe up to `Number.MAX_SAFE_INTEGER` (2^53 − 1); at the event-log scale this is well beyond v1 envelope. Document the bigint-vs-number choice in `packages/events/README.md` so Story 1.10 (audit log hot tier) can revisit if hash-chain numerics need BigInt at TS layer.
    - `occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()` — Postgres `timestamptz`; database-authoritative time per architecture §1.11 + line 3809 ("Storage: Postgres `timestamptz`; database-authoritative time per §1.11"). Default `now()` so callers don't pass clock; Test inject overrides per architecture line 3911-3915 clock-injection discipline use `db.execute(sql\`SET LOCAL clock_timestamp() ... \`)` pattern (defer substantive test-clock to Story 1.10 audit-log + downstream).
    - `actorId: uuid('actor_id')` — NULLABLE; `null` indicates `system`/`SIE` per architecture §1.14 line 1262-1268 Time-as-actor commitment; `null` for time-driven transitions, non-null UUID for human-or-service actors.
    - `pariwarId: uuid('pariwar_id').notNull()` — multi-tenant scoping per architecture §1.2 line 717-725; first-class column to support Story 1.6 RLS substrate. Story 1.3 does NOT add the `pgPolicy` declaration (that lands at Story 1.6 substantively); the column is structurally present so Story 1.6's policy attaches without table rewrite.
  - [x] 1.2 Add table-level constraints + indexes via Drizzle's table-config callback:
    - `uniqueIndex('events_log_stream_id_event_version_uq').on(t.streamId, t.eventVersion)` — **structural enforcement of optimistic concurrency**; a concurrent `appendEvent` call attempting the same `(streamId, eventVersion)` raises a unique-violation that the application layer catches + maps to `ConcurrencyError`.
    - `check('event_version_positive', sql\`event_version >= 1\`)` — `event_version` is monotonically increasing starting at 1.
    - `index('events_log_pariwar_stream_idx').on(t.pariwarId, t.streamId, t.eventVersion)` — supports per-tenant per-stream replay loads (most common access pattern); `pariwar_id` leads for RLS-aware planner hints when Story 1.6 lands.
    - `index('events_log_pariwar_occurred_at_idx').on(t.pariwarId, t.occurredAt)` — supports event-stream tail reads ("emit events since T") for projections / dispatchers (Story 8.x alert dispatcher; Story 9.x reconciliation matcher).
  - [x] 1.3 Update `packages/domain/src/schema/index.ts` barrel to `export * from './events_log.js';` (alongside the existing `export * from './_baseline.js';`). Update `packages/domain/src/index.ts` re-export `schema` namespace remains; no change needed there since the barrel re-exports.
  - [x] 1.4 Generate the migration via `pnpm --filter @twt/domain exec drizzle-kit generate --name events-log`. Verify the emitted `packages/domain/migrations/0001_events-log.sql` matches the table shape; verify `packages/domain/migrations/meta/_journal.json` ticks to `idx: 1` + `meta/0001_snapshot.json` is fresh.
  - [x] 1.5 **Add the append-only Postgres triggers as a hand-edited supplement to migration 0001** (drizzle-kit does not emit triggers; this is the Drizzle-ecosystem norm — architecture §1.8 line 996-997 "drizzle-kit's CLI fits the Turborepo task graph cleanly" implicitly accepts the trigger-hand-edit pattern). Append the following to `0001_events-log.sql`:
    ```sql
    --> statement-breakpoint
    -- Append-only enforcement: events_log is immutable per AR-8 + architecture
    -- §Package Boundary Rationale line 428-431. Corrections emit a NEW event;
    -- existing rows are NEVER mutated. Structural enforcement at the DB layer
    -- — the application API cannot bypass this even with raw SQL.
    CREATE OR REPLACE FUNCTION events_log_reject_mutation()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      RAISE EXCEPTION
        'events_log is append-only — corrections emit a new event (AR-8)'
        USING ERRCODE = 'integrity_constraint_violation';
    END;
    $$;
    --> statement-breakpoint
    CREATE TRIGGER events_log_no_update
      BEFORE UPDATE ON events_log
      FOR EACH ROW EXECUTE FUNCTION events_log_reject_mutation();
    --> statement-breakpoint
    CREATE TRIGGER events_log_no_delete
      BEFORE DELETE ON events_log
      FOR EACH ROW EXECUTE FUNCTION events_log_reject_mutation();
    --> statement-breakpoint
    CREATE TRIGGER events_log_no_truncate
      BEFORE TRUNCATE ON events_log
      EXECUTE FUNCTION events_log_reject_mutation();
    ```
    The TRUNCATE trigger uses `FOR EACH STATEMENT` semantics implicitly (TRUNCATE triggers fire once per statement); the migrator superuser running migrations should not invoke TRUNCATE in normal operation, but the trigger is belt-and-braces defense per `[[feedback_closure_language_precision]]`'s structural-evidence posture.
    Add a header comment to `0001_events-log.sql` documenting that the file was hand-supplemented post drizzle-kit emit (mirroring the 0000 idempotency-patch header pattern); annotate the file `⚠ DO NOT REGENERATE — append-only triggers were hand-added`.
  - [x] 1.6 Document the hand-supplemented trigger pattern in `packages/domain/README.md` §Migrations (extend the Story 1.2 §Migrations subsection). Cross-reference architecture §1.8 line 1003-1005 "Per-migration atomicity — each migration file wraps in a single transaction" — the triggers + table creation land in the same transaction so a failed trigger creation rolls back the table creation; idempotency invariant preserved.
  - [x] 1.7 Verify the trigger structurally rejects mutations: a manual `psql` test (`UPDATE events_log SET event_type = 'x' WHERE event_id = '...';` → `ERROR: events_log is append-only — corrections emit a new event (AR-8)`). Capture in Completion Notes — substantive vitest coverage of the trigger rejection lands in Task 5.3.

- [x] **Task 2: `packages/events/` workspace — `appendEvent` + `loadEvents` + `replayState` API surface** (AC: #1, #2)
  - [x] 2.1 Add direct dependencies to `packages/events/package.json`:
    - `@twt/domain: workspace:*` — for the `Db` type + `schema.eventsLog` import + the `createDb`-produced client.
    - `drizzle-orm` (pinned to whatever `packages/domain/` pins; reuse the version) — for the `sql` template tag + `eq` / `and` / `asc` query helpers. Declare as a direct dep so consumers depend on `@twt/events` without transitively-pinning drizzle-orm.
    - `zod` ~`^3.23` (or `^4.0` if 4.x is the registry-current stable at dev time — verify per Story 1.2 D12-1.2 dep-version pin re-validation discipline) — for the optional event-payload Zod schema validator the `appendEvent` API accepts. Zod is the architecture-canonical schema library per AR-4 (epics line 259) + architecture line 4103-4112. Story 1.4 will add zod to `packages/contracts/`; Story 1.3 installs it in `packages/events/` for the event-shape validation surface; both packages will eventually align to a single zod major.
  - [x] 2.2 Author `packages/events/src/events-log.ts` (the application-layer API + the row-type re-export):
    - `export type EventRow = typeof schema.eventsLog.$inferSelect` — Drizzle-inferred row shape; consumers import this for typed reducers.
    - `export type AppendEventInput = { streamId: string; eventType: string; payload: unknown; expectedVersion: number; actorId: string | null; pariwarId: string; eventId?: string; payloadSchema?: z.ZodTypeAny }` — `payloadSchema` is an OPTIONAL caller-supplied Zod schema; when provided, `appendEvent` calls `.parse(payload)` before the INSERT (fail-fast at the application boundary; defense-in-depth alongside the DB JSONB column type).
    - `export class ConcurrencyError extends Error { constructor(public streamId: string, public expectedVersion: number, public currentVersion: number) { super(\`events_log concurrency conflict on stream \${streamId}: expected version \${expectedVersion}, current was \${currentVersion}\`); this.name = 'ConcurrencyError'; } }` — typed return for the optimistic-concurrency failure per architecture §Process patterns line 3873-3884 ("Service-layer error handling: typed returns for expected failures"). Concurrent appends are an EXPECTED failure mode (two callers race; one wins, one retries); not an exceptional one. The handler at `apps/api/` (Story 1.6+ territory) translates `ConcurrencyError` → HTTP 409 Conflict.
    - `export async function appendEvent(db: Db, input: AppendEventInput): Promise<EventRow>` — implementation:
      1. If `input.payloadSchema`, call `input.payloadSchema.parse(input.payload)` — throws `ZodError` on shape mismatch (let the handler boundary translate).
      2. Compute `nextVersion = input.expectedVersion + 1`.
      3. Serialize `input.payload` via the canonical-JSON encoder (Task 4) — DB layer stores JSONB so the bytes round-trip-stable invariant is for the **hash producers** (audit log writer + Pool Engine snapshot writer downstream), not for storage. At INSERT, we store the parsed object via Drizzle's JSONB binding (drizzle-orm/pg-core handles `JSON.stringify` internally); the canonical-JSON serializer is exposed as a separate export consumed at the read-and-hash boundary.
      4. INSERT via Drizzle: `await db.insert(schema.eventsLog).values({ eventId: input.eventId, streamId: input.streamId, eventType: input.eventType, payload: input.payload, eventVersion: nextVersion, actorId: input.actorId, pariwarId: input.pariwarId }).returning()` — relies on `eventId` default fallback when undefined; relies on `occurred_at` default `now()`.
      5. Catch `pg`-native error with `code === '23505'` (unique-violation) on the `events_log_stream_id_event_version_uq` constraint name — translate to `ConcurrencyError`. Read the current `MAX(event_version)` for `streamId` to populate the error's `currentVersion` field (one extra SELECT on the unhappy path; acceptable cost for a typed error).
      6. Return the single inserted row.
    - `export async function loadEvents(db: Db, streamId: string, opts?: { fromVersion?: number; toVersion?: number }): Promise<EventRow[]>` — implementation: `db.select().from(schema.eventsLog).where(and(eq(schema.eventsLog.streamId, streamId), opts?.fromVersion ? gte(schema.eventsLog.eventVersion, opts.fromVersion) : undefined, opts?.toVersion ? lte(schema.eventsLog.eventVersion, opts.toVersion) : undefined)).orderBy(asc(schema.eventsLog.eventVersion))` — note: filter the `undefined` clauses before passing to `and()` (drizzle-orm's `and` skips undefined entries since 0.30+; verify at pin time).
    - `export async function replayState<S, E extends EventRow = EventRow>(db: Db, streamId: string, reducer: (state: S, event: E) => S, initialState: S): Promise<S>` — implementation: `const events = await loadEvents(db, streamId); return events.reduce(reducer, initialState);` (cast events to `E[]` if reducer narrows). Deterministic by definition (pure fold over an ordered list).
    - **Defense-in-depth invariant**: `appendEvent` rejects with `Error('appendEvent: expectedVersion must be >= 0')` when `input.expectedVersion < 0`. Optimistic concurrency starts at expectedVersion=0 for a brand-new stream; first appended event is at `eventVersion=1`.
  - [x] 2.3 Author `packages/events/src/registry.ts` per architecture §Complete project directory structure line 4418 "registry.ts — Enumerates all event types (FM-PS-10)". At Story 1.3 the registry is a **structural placeholder** — substantive event-type enumeration grows per downstream Story:
    ```typescript
    // packages/events/src/registry.ts
    //
    // Enumerates all event types known to the system per architecture
    // §Complete project directory structure line 4418 + FM-PS-10. Substantive
    // event-type enumeration is per-Story landed:
    //   - Story 3.1+ member.* (signup_initiated, kyc_completed, lockin_entered, ...)
    //   - Story 6.x   claim.*  (filed, verified, approved, settled)
    //   - Story 7.x   pool.*   (spawned, frozen, ...)
    //   - Story 8.x   alert.*  (created, dispatched, ...)
    //   - Story 9.x   contribution.* (matched, confirmed, ...)
    //   - Story 1.10  audit.*  (audit-log entries are NOT general events but the
    //                          packages/events shape is shared; Story 1.10
    //                          decides whether audit lines live in events_log
    //                          or a separate audit_log table — likely separate
    //                          per architecture §1.5)
    //
    // Story 1.3 commits the registry SHAPE (a typed map of event-type → schema);
    // downstream Stories add entries.

    import type { z } from 'zod';

    export type EventTypeRegistryEntry = {
      readonly type: string;
      readonly description: string;
      readonly schema?: z.ZodTypeAny;
    };

    export const EVENT_TYPE_REGISTRY = {
      // Placeholder; Story 3.1+ populates.
    } as const satisfies Readonly<Record<string, EventTypeRegistryEntry>>;
    ```
    A vitest unit test asserts `EVENT_TYPE_REGISTRY` is `Object.freeze`-able (defends against accidental mutation at runtime).
  - [x] 2.4 Author `packages/events/src/index.ts` re-exports replacing the Story 1.1 `export {}` placeholder:
    ```typescript
    export { appendEvent, loadEvents, replayState, ConcurrencyError } from './events-log.js';
    export type { EventRow, AppendEventInput } from './events-log.js';
    export { EVENT_TYPE_REGISTRY } from './registry.js';
    export type { EventTypeRegistryEntry } from './registry.js';
    export { StateMachine, defineStateMachine, type StateMachineConfig } from './state-machine.js'; // Task 3
    export { canonicalJsonStringify, type CanonicalJsonValue } from './canonical-json.js'; // Task 4
    ```
  - [x] 2.5 Update `packages/events/package.json` `dependencies` per Task 2.1; verify `pnpm install` resolves the workspace dep `@twt/domain` correctly. Verify `pnpm --filter @twt/events typecheck` exits 0 (the Drizzle re-exports must resolve through the `@twt/domain` package's `main: "./src/index.ts"` per Story 1.1 pattern — no `dist/` build required at dev time per Story 1.1 §Workspace conventions; the `tsconfig.json` `paths` are not used since pnpm-workspace `name`-based resolution is canonical).

- [x] **Task 3: `StateMachine<S, E>` framework primitive (UX-DR74 substrate)** (AC: #1)
  - [x] 3.1 Author `packages/events/src/state-machine.ts`:
    ```typescript
    // Account State Machine framework primitive per UX-DR74 (epics line 474).
    //
    // Generic shape — concrete member-state lifecycle (architecture §1.14
    // line 1238-1246) is authored at packages/domain/src/member/state.ts
    // in Epic 3 (Story 3.1+). Claim-state / pool-state / alert-state
    // primitives + composition rules (architecture §Cross-Cutting #12)
    // are the subject of a focused follow-up architectural workload
    // flagged in architecture §Gap Analysis (line 4802-4815).

    export type StateMachineConfig<S extends string, E extends { type: string }> = {
      readonly initial: S;
      readonly reduce: (state: S, event: E) => S;
      readonly transitions?: ReadonlyArray<{
        readonly from: S;
        readonly event: E['type'];
        readonly to: S;
      }>;
    };

    export class StateMachine<S extends string, E extends { type: string }> {
      private constructor(private readonly config: StateMachineConfig<S, E>) {}

      static define<S extends string, E extends { type: string }>(
        config: StateMachineConfig<S, E>,
      ): StateMachine<S, E> {
        return new StateMachine(config);
      }

      get initial(): S {
        return this.config.initial;
      }

      fold(events: readonly E[]): S {
        return events.reduce(this.config.reduce, this.config.initial);
      }

      step(state: S, event: E): S {
        return this.config.reduce(state, event);
      }

      // Documentation-only transition table; the runtime authority is `reduce`.
      // The optional transitions[] array exists so downstream consumers can
      // emit a transition matrix for docs (architecture §1.14 line 1238-1246
      // table format) without parsing the reducer's source.
      get transitions(): ReadonlyArray<{ from: S; event: E['type']; to: S }> | undefined {
        return this.config.transitions;
      }
    }

    export function defineStateMachine<S extends string, E extends { type: string }>(
      config: StateMachineConfig<S, E>,
    ): StateMachine<S, E> {
      return StateMachine.define(config);
    }
    ```
  - [x] 3.2 Vitest unit test in `packages/events/tests/state-machine.test.ts`:
    - Define a toy state machine (`'off' → 'on'` on `{ type: 'toggle' }`).
    - Assert `sm.fold([])` returns `'off'`.
    - Assert `sm.fold([{ type: 'toggle' }])` returns `'on'`.
    - Assert `sm.fold([{ type: 'toggle' }, { type: 'toggle' }])` returns `'off'` (idempotent fold).
    - Assert `sm.step('off', { type: 'toggle' })` returns `'on'`.
    - Property-style: `sm.fold(events)` equals `events.reduce(sm.step, sm.initial)` — deterministic equivalence.
  - [x] 3.3 Document in `packages/events/README.md` (Task 6.1) §StateMachine — cross-reference architecture §1.14 line 1217-1283 + epics UX-DR74 (line 474) + the deferred Account State Machine composition workload (architecture §Gap Analysis line 4802-4815). Note the **boundary discipline**: Story 1.3 commits the **interface**; concrete member-state machine is Story 3.1+ at `packages/domain/src/member/state.ts` (architecture line 1227 canonical home); concrete claim-state at Story 6.x; pool-state at Story 7.x; alert-state at Story 8.x; the **full composition** of Account State (architecture §3.4 `claim-filed-frozen`, `disbursed-frozen-readable`, `disabled-T+90`, `public-record-∞` end states) is a focused follow-up architectural workload **flagged in architecture §Gap Analysis (line 4802-4815)** — Story 1.3 does NOT preempt that workload.

- [x] **Task 4: Canonical-JSON serializer + ADR-0004-canonical-json drafted** (AC: #2)
  - [x] 4.1 Author `packages/events/src/canonical-json.ts` implementing **RFC 8785 JSON Canonicalization Scheme (JCS)** semantics — deterministic property ordering (lexicographically sorted by key at every object level), no whitespace, no insignificant zeros, no escape variations:
    ```typescript
    // Canonical-JSON serializer per architecture line 898-902 + RFC 8785 JCS.
    //
    // Single canonicalizer for all hash producers / verifiers:
    //   - Story 1.3 events package replay determinism (this file).
    //   - Story 1.10 audit log hash-chain (consumes this serializer for prev_hash + this_hash compute).
    //   - Story 7.x  Pool Engine snapshot hash (consumes this serializer for snapshot integrity hash).
    //   - Story 1.11a audit-log integrity-check job (consumes this serializer for chain verification).
    //
    // ADR-0004-canonical-json drafted alongside Story 1.3 closure (Task 6.4).
    // Tests in tests/canonical-json.test.ts assert byte-determinism + cross-payload equivalence.

    export type CanonicalJsonValue =
      | null
      | boolean
      | number
      | string
      | CanonicalJsonValue[]
      | { [k: string]: CanonicalJsonValue };

    export function canonicalJsonStringify(value: unknown): string {
      return _canonicalize(value as CanonicalJsonValue);
    }

    function _canonicalize(value: CanonicalJsonValue): string {
      if (value === null) return 'null';
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
          throw new TypeError('canonicalJsonStringify: non-finite numbers are not representable in JSON');
        }
        return _canonicalNumber(value);
      }
      if (typeof value === 'string') return JSON.stringify(value); // RFC 8259 string-escaping
      if (Array.isArray(value)) {
        return '[' + value.map(_canonicalize).join(',') + ']';
      }
      // Object: sort keys lexicographically (UTF-16 code unit order per RFC 8785 §3.2.3).
      const keys = Object.keys(value).sort();
      return '{' + keys.map((k) => JSON.stringify(k) + ':' + _canonicalize(value[k]!)).join(',') + '}';
    }

    function _canonicalNumber(n: number): string {
      // RFC 8785 §3.2.2 — IEEE 754 double-precision → shortest round-trippable
      // decimal. JS's default Number → String uses ECMAScript's shortest-form
      // algorithm which matches RFC 8785 in the integer + finite-decimal ranges
      // relevant for TWT event payloads (currency-amounts as paise integers,
      // counters, timestamps as ISO strings). If a future event payload needs
      // canonical-JSON for floats, add a property-test against the RFC 8785
      // reference vectors.
      if (Object.is(n, -0)) return '0'; // -0 + 0 are the same JSON number.
      return String(n);
    }
    ```
    **Implementation note**: the above is a minimal JCS subset — sufficient for TWT v1 event payloads (objects/strings/booleans/null/integers/arrays). A future Story may swap to a battle-tested library (`canonicalize` npm package implements RFC 8785) — the ADR-0004 (Task 4.4) commits to "one library, one version" per architecture line 898-902; the **decision** is hand-rolled at Story 1.3 closure to avoid a transitive-dep cost for ~30 lines of code, with **explicit deferral** of library-swap to a downstream Story when the hand-rolled version's limitations bite (e.g., floats with > 15 significant digits, BigInt support, U+10000+ code points beyond UTF-16 BMP). Document in Completion Notes + Task 6.4 ADR-0004 body.
  - [x] 4.2 Vitest unit test at `packages/events/tests/canonical-json.test.ts`:
    - **Key-order independence**: `canonicalJsonStringify({ a: 1, b: 2 })` === `canonicalJsonStringify({ b: 2, a: 1 })`.
    - **Nested object key-order**: `canonicalJsonStringify({ outer: { z: 1, a: 2 } })` produces `{"outer":{"a":2,"z":1}}`.
    - **Array ordering preserved**: `canonicalJsonStringify([3, 1, 2])` produces `[3,1,2]` (arrays are ordered; not sorted).
    - **String escaping standard**: `canonicalJsonStringify('a"b\\c')` matches `JSON.stringify('a"b\\c')`.
    - **`-0` normalizes to `0`**.
    - **Throws on `NaN` / `Infinity`** per JSON spec.
    - **Round-trip**: `JSON.parse(canonicalJsonStringify(obj))` is deeply equal to `obj` (for objects without unrepresentable values).
  - [x] 4.3 Wire the serializer into `packages/events/src/index.ts` re-exports (per Task 2.4).
  - [x] 4.4 **Author ADR-0004-canonical-json** at `docs/adr/ADR-0004-canonical-json.md`. Body covers:
    - **Decision**: hand-rolled RFC 8785 JCS subset at `packages/events/src/canonical-json.ts` for v1; one canonicalizer across all hash producers (events replay + audit log + Pool Engine snapshot).
    - **Alternatives considered**: `canonicalize` npm package (well-maintained, exact RFC 8785; ~3KB; transitive-dep cost weighed against ~30 lines of in-tree code); `json-stable-stringify` (closest to JCS but does NOT match RFC 8785 exactly for some edge cases — number representation differs); `fast-json-stable-stringify` (sorted-keys but no JCS conformance commitment).
    - **Constraints**: v1 payloads are limited shapes (no floats with > 15 sig digits, no BigInt, no surrogate-pair code-point pathologies) so the subset implementation suffices.
    - **Forward path**: if a Story introduces a payload that strains the subset (e.g., currency-decimal floats), the ADR points at a library-swap migration with a property-test against RFC 8785 reference vectors as the gate.
    - **Status**: `drafted` at Story 1.3 commit; flips `under-trustee-review` post-Story-1.3-review; ratified per Trustee Panel (substantive rationale-on-file; light-touch ratification because the choice is reversible at any Story boundary).
    - Cross-references: architecture §1.5 line 898-902, line 4103-4112 example; AR-8 + AR-57 + AR-58; Story 1.10 audit log hash-chain consumer; Story 7.x Pool Engine snapshot-hash consumer.
  - [x] 4.5 Update `docs/knowledge-transfer/adr-index.md`:
    - **Add a new row** for `ADR-0004-canonical-json` in Section A (the per-category architectural-slot section, after the ADR-0003-datastore-engine row at line 54). New row fields: Status `drafted`; Anchored to "Story 1.3 packages/events event-log primitive closure"; Trigger-evidence pointer to `docs/adr/ADR-0004-canonical-json.md`. Increment the Status row-count table (line 17-33) `drafted` count by 1 (+1 = 2 total drafted after Story 1.3); total slot count grows by 1 (+1 = 126).
    - **Alternative if ADR-0004 should be slot-only and substantive land at 1.10**: Story 1.3's Task 4.4 may down-grade to a `slot-reserved-pre-write` row reserved for Story 1.10 (audit-log) + author the hand-rolled serializer in `packages/events/` without an ADR. **Recommendation: author the ADR at Story 1.3** because the choice gates the events package's replay semantics + is consumed by multiple downstream Stories; commit the ADR at Story 1.3 closure with Status `drafted` per Story 1.2 ADR-0003 precedent. Document the choice in Completion Notes.

- [x] **Task 5: Tests — append-only enforcement + optimistic concurrency + replay determinism** (AC: #1, #2)
  - [x] 5.1 Add `packages/events/tests/append-event.test.ts` — integration tests against a live local Postgres 16 container (Docker per Story 1.2 Task 7.2 pattern). Test cases:
    - **Happy path**: `appendEvent(db, { streamId: 'uuid-1', eventType: 'test.created', payload: { x: 1 }, expectedVersion: 0, actorId: null, pariwarId: 'uuid-p' })` returns an event row with `eventVersion = 1`.
    - **Sequential appends**: second append with `expectedVersion: 1` succeeds at `eventVersion = 2`; third at `expectedVersion: 2` succeeds at `eventVersion = 3`.
    - **Concurrent-conflict**: two parallel `appendEvent` calls with the same `expectedVersion = 2` — one succeeds with `eventVersion = 3`, the other throws `ConcurrencyError` with `currentVersion = 3`.
    - **Validation**: `expectedVersion = -1` throws `Error` ("expectedVersion must be >= 0").
    - **Zod-schema rejection**: passing a `payloadSchema` that rejects the payload throws `ZodError` BEFORE any DB INSERT (verify via row count unchanged).
    - **Idempotent re-append with explicit `eventId`**: appending the same `eventId` twice with the same `(streamId, expectedVersion)` — second attempt fails with unique-violation on the `event_id` PK (NOT the `(stream_id, event_version)` UNIQUE); the application may catch this and treat as already-applied (downstream-Story discipline; Story 1.3 just documents the semantic).
  - [x] 5.2 Add `packages/events/tests/replay-state.test.ts`:
    - Construct a stream of N events; replay twice via `replayState(db, streamId, reducer, initial)`; assert deep-equality of the two results (deterministic).
    - Empty-stream replay returns `initial` unchanged.
    - Order-sensitive reducer (e.g., a counter) produces the same final count after `loadEvents` returns the events in `event_version ASC` order (no dependency on `occurred_at` ordering — events with identical occurred_at must still be deterministically ordered by event_version).
  - [x] 5.3 Add `packages/events/tests/append-only.test.ts` — verify the Postgres triggers structurally reject mutations:
    - INSERT one row; then `db.execute(sql\`UPDATE events_log SET event_type = 'x' WHERE event_id = ${id}\`)` — assert the promise rejects with the Postgres error message including "append-only" or error code matching `'P0001'` (RAISE EXCEPTION default code) / `'23000'` (integrity_constraint_violation per the trigger).
    - Same for `DELETE FROM events_log WHERE event_id = ${id}` → rejection.
    - Same for `TRUNCATE events_log` → rejection.
  - [x] 5.4 Add `packages/events/tests/canonical-json.test.ts` per Task 4.2.
  - [x] 5.5 Update `packages/events/tests/smoke.test.ts` — preserve the Story 1.1 smoke shape (`expect(mod).toBeTruthy()`); the substantive tests above are the new surface. The smoke test continues to pass since `src/index.ts` exports a truthy module.
  - [x] 5.6 **Integration-test substrate decision**: Story 1.3 introduces **the first live-DB integration tests** at TWT (Story 1.2 deferred this per D13-1.2; Story 1.3 closes that deferral for the events_log slice). Two options for the test-DB strategy:
    - **Option (a) Per-test transaction-rollback** (recommended; architecture §Integration test isolation pattern; alignment with Story 1.6's RLS regression test discipline) — each test opens a transaction, runs the test, ROLLBACK in `afterEach`. Requires the local Docker Postgres 16 container running at test time (matches Story 1.2 Task 7.2 verify pattern); `vitest --pool=forks` so parallel tests don't share a transaction.
    - **Option (b) Per-test DB drop-and-recreate** (slower; cleaner isolation) — `vitest` global setup creates a per-worker schema; each test runs against it; teardown drops the schema. Heavier setup cost; defer to Story 1.6 if needed.
    - **Recommended at Story 1.3**: Option (a) for the append-event + replay-state + append-only tests; document the local-Docker-Postgres invocation pattern (`docker run --rm -p 5433:5432 -e POSTGRES_PASSWORD=devpass --name twt-test-pg postgres:16-alpine`) in `packages/events/tests/README.md` + `packages/domain/README.md` §Testing.
    - **CI gating decision**: at Story 1.3 do NOT add a live-DB CI job — these integration tests run **locally only** at Story 1.3 closure; the substantive CI integration with a service-container Postgres is **Story 1.6** territory (which adds the RLS regression test that requires the same substrate). Document this in Completion Notes + `packages/events/README.md` + the CI workflow comment block. **Rationale**: Story 1.3 owns the events_log primitive + tests; Story 1.6 owns the live-DB CI substrate (it's the same substrate; the cost of authoring + maintaining the Postgres service-container CI fits Story 1.6's scope; Story 1.3 verifies locally).
    - Capture the choice (a or b) + CI decision in Completion Notes citing this sub-task.

- [x] **Task 6: Documentation + ADR-0004 + Decision-log + cross-reference edits** (AC: #1, #2)
  - [x] 6.1 Author `packages/events/README.md` covering:
    - **Package purpose** (architecture §Package Boundary Rationale line 428-431) — internal event contracts for replay/audit, immutable.
    - **API reference**: `appendEvent` / `loadEvents` / `replayState` + `ConcurrencyError` typed-return semantics; `StateMachine<S, E>` interface + `defineStateMachine` factory; `canonicalJsonStringify` + the cross-consumer hash-chain commitment.
    - **`events_log` table contract**: 8-column shape + append-only trigger structural guarantee + cross-reference to `packages/domain/src/schema/events_log.ts`.
    - **Stream-key conventions** (placeholder pointer): downstream Stories choose what a `streamId` is — per-member for Story 3.1+, per-claim for Story 6.x, per-pool for Story 7.x; document the convention freedom here + cross-link landing Stories.
    - **§StateMachine** subsection per Task 3.3.
    - **§Canonical JSON** subsection per Task 4.4 + ADR-0004 cross-link.
    - **§Testing** subsection per Task 5.6 — local Docker Postgres invocation pattern + integration-test isolation choice + Story 1.6 CI substrate gating.
    - **Package ownership block** per architecture §Package ownership declaration line 4499-4509 (`Owner: Solo Builder; Purpose: event log primitive + state machine framework + canonical-JSON serializer; Promotion rule: substantive event-type schemas (Story 3.1+/6.x/7.x/...) live under packages/events/src/<domain>/; the storage table + triggers live in packages/domain/src/schema/events_log.ts`).
  - [x] 6.2 Update `packages/domain/README.md` — extend the Story 1.2 §Migrations subsection with a §Migration 0001 entry documenting the events_log table + the hand-supplemented append-only trigger pattern. Cross-reference architecture §1.8 line 1003-1005 (per-migration atomicity).
  - [x] 6.3 Update root `README.md` — add a §Packages subsection (or extend an existing one) pointing at `packages/events/README.md` for the event log primitive.
  - [x] 6.4 Author `docs/adr/ADR-0004-canonical-json.md` per Task 4.4.
  - [x] 6.5 Update `docs/knowledge-transfer/adr-index.md` per Task 4.5 (add ADR-0004 row + update Status row-count table).
  - [x] 6.6 Append **Decision 2026-06-XX-XXX** (next sequential number after `2026-06-08-038` — likely `2026-06-09-039` or the day-of-execution date) to `.decision-log.md` top of `## Decisions` section per reverse-chronological schema, recording:
    - Story 1.3 substantive author-commit: `events_log` Drizzle table + append-only Postgres triggers + `packages/events/` API surface (`appendEvent` / `loadEvents` / `replayState`) + `StateMachine<S, E>` UX-DR74 framework primitive + canonical-JSON serializer.
    - ADR-0004-canonical-json drafted (per Task 6.4).
    - The integration-test live-DB substrate decision per Task 5.6 (Option a or b + local-only-not-CI-at-Story-1.3 rationale).
    - Cross-Story discharge triggers: Story 3.1+ member-lifecycle state-machine substrate ready; Story 6.x claim state-machine substrate ready; Story 7.x pool state-machine + snapshot-hash substrate ready (canonical-JSON serializer in place); Story 8.x alert state-machine substrate ready; Story 9.x reconciliation-events substrate ready; Story 1.10 audit-log hash-chain canonical-JSON serializer consumer-ready.
    - Per `[[feedback_closure_language_precision]]`: framework + engineering Closed by [edit] on Tasks 1-7 closure + local CI gates green + live local Postgres 16 integration tests green; ADR-0004 trustee-ratification leg = Resolved via explicit deferral pending Trustee Panel.
    - **Add a decision-type index entry** at `.decision-log.md` Section §Decisions by type for "Story 1.3 — `packages/events` event log primitive + UX-DR74 StateMachine + canonical-JSON serializer".
  - [x] 6.7 Update `_bmad-output/implementation-artifacts/deferred-work.md` "## Story 1.3 deferred" section (new section) with items the dev agent identifies. Expected items:
    - **D1-1.3**: ADR-0004-canonical-json Trustee Panel ratification.
    - **D2-1.3**: Live-DB CI substrate (Postgres service container in `.github/workflows/ci.yml`) — Story 1.6 owns; Story 1.3 commits the local-Postgres tests.
    - **D3-1.3**: Substantive event-type Zod schemas per downstream Story (`member.*` Story 3.1+; `claim.*` Story 6.x; `pool.*` Story 7.x; `alert.*` Story 8.x; `contribution.*` Story 9.x; `audit.*` Story 1.10 if applicable).
    - **D4-1.3**: Substantive member-state machine at `packages/domain/src/member/state.ts` — Story 3.1+ landing per architecture §1.14 line 1227 canonical home commitment.
    - **D5-1.3**: Substantive Account State composition workload (architecture §Gap Analysis line 4802-4815) — claim-state / pool-state / alert-state primitives + composition rules + full enumeration of end states `claim-filed-frozen` / `disbursed-frozen-readable` / `disabled-T+90` / `public-record-∞` — focused follow-up architectural workload; not gated on a single Story.
    - **D6-1.3**: Substantive snapshot-hash consumer wiring at Story 7.x Pool Engine — `canonicalJsonStringify` consumed by snapshot writers.
    - **D7-1.3**: Substantive audit-log hash-chain consumer wiring at Story 1.10 — `canonicalJsonStringify` consumed by audit-log writers + integrity-check job.
    - **D8-1.3**: Pure-function canonical-JSON library swap re-evaluation at downstream Story boundary if hand-rolled implementation strains payload shapes (e.g., floats > 15 sig digits, BigInt, surrogate pairs); track per ADR-0004 forward-path commitment.
    - **D9-1.3**: RLS `pgPolicy` declaration on `events_log` table — Story 1.3 commits the `pariwar_id` column structurally; Story 1.6 attaches the policy declaratively per architecture §1.2.
    - **D10-1.3**: Per-Pariwar event stream isolation invariant (CI test) — extends Story 1.6's cross-Pariwar adversarial test to assert no event leaks across `pariwar_id`; Story 1.6 territory.

- [x] **Task 7: Verification + AC closure + Status flip** (AC: #1, #2)
  - [x] 7.1 Run `pnpm turbo run lint typecheck test build` — verify zero regressions vs Story 1.2 baseline (56/56 turbo gate green per Story 1.2 Task 7.1). Story 1.3 may add ~1 new test workspace task count (packages/events/ tests grow substantively, but the `test` task is per-workspace not per-file; count stays at 56/56 unless a new workspace appears — verify exact count and document in Completion Notes).
  - [x] 7.2 Run `pnpm db:migrate` against the local Docker Postgres 16 container — verify migration 0001 applies cleanly + the trigger creation succeeds + a second invocation is a no-op (idempotency). Capture in Completion Notes the SQL emitted, the trigger names visible via `\dft+ events_log` (psql trigger inspection), and the row count in `drizzle.__drizzle_migrations` = 2 after migration 0001.
  - [x] 7.3 Run `pnpm db:check` — verify zero drift between `packages/domain/src/schema/events_log.ts` + the hand-supplemented `0001_events-log.sql` + `meta/0001_snapshot.json`. **Note**: drizzle-kit `check` does NOT inspect trigger contents; it only verifies schema-vs-migration consistency at the table-shape level. The trigger correctness is verified by Task 5.3's integration tests.
  - [x] 7.4 Run the new vitest integration tests against the local Docker Postgres 16 container:
    - `pnpm --filter @twt/events test` — runs `state-machine.test.ts`, `canonical-json.test.ts` unconditionally + the live-DB tests `append-event.test.ts` + `replay-state.test.ts` + `append-only.test.ts` when `DATABASE_URL` is set in the test environment. Document the `DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable pnpm --filter @twt/events test` invocation pattern in Completion Notes.
    - Verify each test exits 0; capture summary counts (e.g., "vitest: 22 passed (5 files)") in Completion Notes.
  - [x] 7.5 Push branch + open PR + watch CI run. **Branch strategy pre-execution choice** (mirrors Story 1.2's pre-execution choices documented in sprint-status 06-08c entry):
    - **Option (a) Stack on `story-1.2-cloud-sql-drizzle`** (current branch at story-creation HEAD `b02d85b`) — Story 1.3 PR depends on Story 1.2 PR merging first; consistent with Story 1.2's stacking-on-1.1 pattern.
    - **Option (b) Branch from `main`** — assumes Story 1.2 PR has merged to main before Story 1.3 dev-story starts.
    - **Recommendation**: Option (a) if Story 1.2 PR is still open at dev-story start; Option (b) if Story 1.2 has merged. Document the chosen strategy + branch name (`story-1.3-events-log-primitive`) in Completion Notes citing the Story 1.2 sprint-status 06-08c pattern.
    - Watch CI for `db-check` + `lint` + `typecheck` + `test` + `build` jobs green. Live-DB integration tests do NOT run in CI at Story 1.3 (Story 1.6 substrate per Task 5.6 + D2-1.3).
  - [x] 7.6 Update `_bmad-output/implementation-artifacts/sprint-status.yaml`: `development_status[1-3-packages-events-event-log-primitive]` from `ready-for-dev` → `in-progress` → `review` per Story 1.1/1.2 transition pattern (in-progress on dev-story start; review on Task 7.5 PR-open + CI-green).
  - [x] 7.7 Update Story 1.3 file Status field to `review`; populate Dev Agent Record (Agent Model + Debug Log References + Completion Notes List + File List + Change Log) per Story 1.2 template.

## Dev Notes

### What `packages/events/` substantively becomes at Story 1.3

The architecture commits `packages/events/` as a workspace whose job is to "hold internal event contracts for replay/audit. Events are immutable: a correction emits a *new* event referring to the original; no event row is ever rewritten" (architecture line 428-431). At Story 1.1 the workspace exists with the placeholder `src/index.ts` = `export {}`. **Story 1.3 substantively populates this workspace** with three orthogonal concerns:

1. **The application-layer API over the event log** (`appendEvent` / `loadEvents` / `replayState`) — the generic primitive that every downstream domain (member / claim / pool / alert / contribution / reconciliation) uses.
2. **The framework primitive for Account State Machines** (`StateMachine<S, E>`) — UX-DR74 substrate; concrete member-state machine is Story 3.1+ at `packages/domain/src/member/state.ts` per architecture §1.14 line 1227.
3. **The canonical-JSON serializer** — shared across hash-producers (events replay determinism + Story 1.10 audit-log hash-chain + Story 7.x Pool Engine snapshot integrity hash).

The events_log **storage table** lives in `packages/domain/src/schema/events_log.ts` per the architecture-canonical commitment that all Drizzle schema lives in `packages/domain/` (architecture line 406, 421-423, 4341-4356). `packages/events/` depends on `@twt/domain` for the `Db` client type + the `schema.eventsLog` import; the API surface is in `packages/events/` because the operations (append / load / replay / state-machine) are reusable across domains and don't belong to any one downstream module.

### `packages/events/` baseline state at Story 1.3 start

Per Story 1.1 Task 2.2 + Story 1.2's preservation of the Story 1.1 workspace shape: `packages/events/` exists at HEAD `b02d85b` as a placeholder workspace with the standard shape:
- `package.json` (name `@twt/events`, type module, `main: "./src/index.ts"`, scripts `build/lint/typecheck/test/dev`, devDependencies only — `@twt/eslint-config-twt + typescript + vitest + @types/node`).
- `tsconfig.json` extending root `tsconfig.base.json` with `outDir: "dist"`.
- `eslint.config.js` re-exporting `@twt/eslint-config-twt`.
- `vitest.config.ts` (`include: ['tests/**/*.test.ts']`, `passWithNoTests: true`).
- `src/index.ts` (placeholder `export {}` with the "PR-1 placeholder" header comment).
- `tests/smoke.test.ts` (asserts `import * as mod from '../src/index'; expect(mod).toBeTruthy()`).

**Story 1.3 substantively populates** the `src/` directory + adds `dependencies` to `package.json`. Smoke test continues to pass; new substantive tests land per Task 5.

### `packages/domain/` baseline state at Story 1.3 start

Story 1.2 closure shipped (per `_bmad-output/implementation-artifacts/1-2-cloud-sql-postgres-drizzle-migration-tooling.md` File List):
- `packages/domain/package.json` with `drizzle-orm ^0.45 + drizzle-kit ^0.31 + pg ^8.13 + @types/pg + @google-cloud/secret-manager ^6.1 + dotenv + tsx` deps.
- `packages/domain/drizzle.config.ts` (postgresql + strict + verbose + drizzle metadata schema).
- `packages/domain/src/db.ts` (createDb factory + per-workspace pool isolation).
- `packages/domain/src/secrets.ts` (Secret Manager via ADC + DATABASE_URL local-dev fallback).
- `packages/domain/src/schema/{index,_baseline}.ts` (barrel + empty baseline marker; `pgSchema('drizzle')` was removed at Story 1.2 third-pass code review per sprint-status 06-09 entry — bootstrap discharged).
- `packages/domain/migrations/0000_init-baseline.sql` (CREATE SCHEMA IF NOT EXISTS "drizzle" hand-patched per Story 1.2 D11-1.2).
- 8 placeholder sub-directories under `src/` with `.gitkeep` + landing-Story READMEs (`policies/`, `ids/`, `encryption/`, `snapshot-fixtures/`, `snapshot-adapters/`, `cross-tenant/`, `bank-statement/`, `per-pariwar/bihar/`).
- `seed/{dev,staging}/.gitkeep` + READMEs.
- `scripts/migrate.ts` (Secret Manager-aware migrate wrapper).
- `tests/db.test.ts` (3-case unit test of createDb pool-config shape).
- `README.md` (snake_case-DB / camelCase-TS naming discipline; forward-only migration policy; online-migration discipline; per-workspace pool isolation; placeholder-subdir landing-Story map).

**Story 1.3 builds on this**:
- Adds `packages/domain/src/schema/events_log.ts` (Task 1.1).
- Updates `packages/domain/src/schema/index.ts` barrel to re-export events_log (Task 1.3).
- Generates `packages/domain/migrations/0001_events-log.sql` (Task 1.4) + hand-supplements with the append-only trigger (Task 1.5).
- Generates `packages/domain/migrations/meta/0001_snapshot.json` + ticks `meta/_journal.json` to `idx: 1` (Task 1.4 emit byproducts).
- Extends `packages/domain/README.md` §Migrations with the Story 1.3 entry (Task 6.2).

### Story 1.1 + 1.2 inheritances + the Story 1.3 substrate it provides

Story 1.1 (`done` per sprint-status; PR open at story-1.1-bootstrap pending CI merge) provides: the monorepo workspace topology + root configs + CI workflow + `packages/events/` placeholder workspace + ADR-0001 + ADR-0002.

Story 1.2 (`done` per sprint-status 06-09 entry; PR open at story-1.2-cloud-sql-drizzle stacked on Story 1.1 PR; three code-review passes complete) provides:
- Cloud SQL Postgres Terraform IaC at `infra/gcp/` (live provisioning deferred per substrate-only choice — D1-1.2).
- Drizzle scaffolding at `packages/domain/` + Secret Manager wiring + migration zero proven idempotent against local Docker Postgres 16.
- Root `pnpm db:generate / migrate / check / studio` scripts; `turbo db:check` task.
- `.github/workflows/ci.yml` `db-check` job.
- ADR-0003-datastore-engine (`drafted` per adr-index line 54).
- Decision 2026-06-08-038 in `.decision-log.md`.

Story 1.3 provides the substrate for:
- **Story 1.5** (Cloud KMS HSM + Tink envelope encryption) — Story 1.5 may emit `member.pii_encrypted` events to the events_log; Story 1.3's API surface is consumer-ready.
- **Story 1.6** (`pariwar_id` first-class + RLS adversarial test) — Story 1.6 attaches `pgPolicy` to the `events_log` table (Story 1.3 commits the `pariwar_id` column structurally) + extends the cross-Pariwar adversarial test to assert no event leakage; events_log RLS is Story 1.6 territory (D9-1.3 + D10-1.3).
- **Story 1.10** (Tamper-evident audit log + hash chain) — Story 1.10 consumes `canonicalJsonStringify` for the `prev_audit_hash + audit_hash` computation; the `audit_log_entries` table is a SEPARATE table from `events_log` per architecture §1.5 (different retention + different write path + different RLS posture). Story 1.10 may also use `appendEvent` to log certain audit lines as events for replay (decided at Story 1.10 design time).
- **Story 1.12** (pg-boss job queue) — pg-boss installs the `__pgboss` schema; orthogonal to events_log. No coupling.
- **Story 3.1+** (member lifecycle) — substantively authors `packages/domain/src/member/state.ts` per architecture §1.14 line 1227 canonical home; defines the concrete member-state machine consuming Story 1.3's `StateMachine<S, E>` interface; emits `member.signup_initiated`, `member.kyc_completed`, `member.lockin_entered`, `member.lapsed_unpaid`, etc. via `appendEvent`. The member-state-derived-from-events discipline per epics line 1591-1596 + AR-14 is fully exercisable at Story 3.1+ closure.
- **Story 6.x** (claim lifecycle) — claim state machine emits `claim.filed`, `claim.verified`, `claim.approved`, `claim.settled`; state derived from event replay per architecture §1.9 line 1019-1031 claim-aggregate-language commitment.
- **Story 7.x** (Pool Engine) — pool state machine emits `pool.spawned`, `pool.frozen`, etc.; Pool Engine snapshot writers consume `canonicalJsonStringify` for snapshot integrity hash per architecture §1.6 line 904-934.
- **Story 8.x** (Alert lifecycle) — alert state machine emits `alert.created`, `alert.dispatched`; state derived from event replay.
- **Story 9.x** (Reconciliation) — contribution + reconciliation emit `contribution.matched`, `contribution.confirmed`; the monotonic forward chain commitment per epics line 3166 ("all confirmation events form a monotonic forward chain in the event log; replay produces the same monotonic chain; any silent attempts to mutate the chain (e.g., direct DB UPDATE on contribution status) fail at the DB layer via triggers (event-log immutability per Story 1.3)") is Story 9.x's concrete exercise of Story 1.3's append-only trigger guarantee.

### Architecture-vs-Epic-AC alignment check

The epic AC line 1024-1041 enumerates Story 1.3 ACs verbatim:
- Primitive exposes `appendEvent(streamId, eventType, payload, expectedVersion)` with optimistic concurrency, `loadEvents(streamId)`, `replayState(streamId, reducer)` — **Story 1.3 commits exactly this** at `packages/events/src/events-log.ts` (Task 2.2).
- Events are immutable (append-only enforced via Postgres triggers) — **Story 1.3 commits at the schema + migration layer** (Task 1.5).
- Every event carries `event_id`, `stream_id`, `event_type`, `payload`, `event_version`, `occurred_at`, `actor_id`, `pariwar_id` — **Story 1.3 commits the 8-column shape** (Task 1.1).
- The Account State Machine framework primitive (UX-DR74) lives here as a generic `StateMachine<S, E>` interface; concrete member-state lifecycle is added in Epic 3 — **Story 1.3 commits the interface** (Task 3); concrete member-state is deferred to Story 3.1+ at `packages/domain/src/member/state.ts` per architecture §1.14 line 1227 (D4-1.3).

**No architecture-vs-epic-AC divergence is present at Story 1.3** (unlike Story 1.1's `apps/member` divergence + Story 1.2's `packages/db` divergence). The architecture's `packages/events/` canonical home (line 413-414, 428-431, 604-612, 4409-4418) + the epic AC's `packages/events` placement align byte-for-byte. The architecture's §1.14 canonical home for the member-state machine at `packages/domain/src/member/state.ts` (line 1227) + the epic AC's "concrete member-state lifecycle is added in Epic 3" align. No new divergence-resolution Decision-log entry required for naming; Decision 2026-06-XX-XXX records the substantive author-commit only.

### Drizzle ORM + drizzle-kit ecosystem notes for trigger handling

Per Story 1.2 D12-1.2 pin re-validation: drizzle-orm ^0.45 + drizzle-kit ^0.31 are the current pins. drizzle-kit does NOT emit trigger DDL in `generate` output — triggers are hand-appended to the emitted SQL file with the migration's table creation (per Task 1.5). This is the **standard Drizzle ecosystem pattern**; the `drizzle-kit check` command verifies schema-shape consistency (column + index + constraint) but ignores trigger contents — trigger correctness is verified by integration tests (Task 5.3).

**Idempotency invariant after hand-supplement**: the migration file's `--> statement-breakpoint` separator (drizzle-kit's convention for separating multi-statement DDL files) MUST appear between the trigger statements; re-running migration 0001 against an already-migrated DB is a no-op because drizzle-kit consults `drizzle.__drizzle_migrations` and skips already-applied migrations (verified at Story 1.2 Task 7.2 idempotency). If a future drizzle-kit emits trigger support natively, the hand-supplement becomes obsolete + can be replaced by declarative trigger DDL in the schema file; track upstream changelog per Story 1.2 D11-1.2 pattern.

### Canonical-JSON ADR-0004 — why hand-rolled at Story 1.3

Architecture line 898-902 commits "A single canonical-JSON specification is committed in an ADR — one library, one version across all consumers of the `packages/events/` hash chain." This ADR was reserved as a Section A architectural slot at `adr-index.md` (not present at the named-slot level — it's a §Deferred Decisions latent ADR that emerges at the first consumer). Story 1.3 is the first consumer (events package replay determinism); Story 1.10 (audit log) + Story 7.x (snapshot hash) follow.

**Hand-rolled vs library**: the hand-rolled RFC 8785 JCS subset is ~30 lines (Task 4.1). The `canonicalize` npm package (active maintainer; exact RFC 8785 conformance; ~3KB minified) is the prevailing battle-tested alternative. Choice: hand-rolled at Story 1.3 because:
1. ~30 lines is small enough to author + test inline; no transitive-dep risk (per Story 1.2 D12-1.2 dep-pin discipline).
2. v1 event payloads are bounded shapes (integers + strings + booleans + nested objects; no floats > 15 sig digits; no BigInt; no surrogate-pair pathologies).
3. ADR-0004 forward-path commits to library swap when the subset bites (D8-1.3); the choice is reversible at any Story boundary.

This matches architecture's "one library, one version" commitment at the LANGUAGE level (the source code is the canonical implementation; the ADR commits the algorithm + reference); a "library" in this context is "the in-tree module".

### Stream-key conventions (downstream-Story freedom)

Story 1.3 does not commit what a `streamId` is — that's per-downstream-Story discipline. Likely conventions (per architecture + epics survey):
- **Member stream**: `streamId = member_id` (UUID). One stream per member; `event_version` is the member's lifecycle position.
- **Claim stream**: `streamId = claim_id`. One stream per claim case.
- **Pool stream**: `streamId = pool_id`. One stream per pool cycle.
- **Alert stream**: `streamId = alert_id`. One stream per alert lifecycle.
- **Reconciliation stream**: `streamId = reconciliation_run_id` or per-Pariwar per-cycle hash. Decided at Story 9.x.

Document these as **expected conventions, not enforced** in `packages/events/README.md` §Stream conventions; the events_log table is opaque to the API.

### `actorId` semantic — null = system / SIE per architecture §1.14

Architecture line 1262-1268: "Time-driven transitions (Cross-Cutting #14 — SIE). The following transitions fire on scheduled time, non-punitively: ..." emit `actor: 'system'`. In Story 1.3's events_log schema, `actor_id` is a UUID — but `system` is not a UUID. The pattern: `actor_id IS NULL` means "system or SIE-driven"; the `event_type` + `payload` carry the substantive actor metadata when needed (per architecture §1.14 line 1280-1282 audit-log emission discipline). Downstream consumers may add a `system_actor_kind` JSONB key inside the payload if discriminating between SIE / scheduler / matcher is required.

Alternative: store a well-known system-UUID for each system actor kind (`'00000000-0000-0000-0000-000000000000'` for SIE; `'00000000-0000-0000-0000-000000000001'` for scheduler; etc.). **Defer** — Story 1.3 commits the null-actor pattern; downstream Story refines if discrimination is required.

### Repository state at story-creation time (`HEAD = b02d85b`)

Per `git log -1 --oneline`: `b02d85b chore: Story 1.2 code-review patches (3 review passes)`. Branch: `story-1.2-cloud-sql-drizzle` (Story 1.2's PR branch; not yet merged to main per sprint-status; PR is stacked on Story 1.1 PR). Story 1.3 begins from this state. Pre-execution choice for Task 7.5: stack on `story-1.2-cloud-sql-drizzle` OR branch from `main` after Story 1.2 merges. See Task 7.5.

### Dev guardrails — what makes the dev agent's Story 1.3 implementation go smoothly

- **Don't reinvent Story 1.2's Drizzle substrate**: the `createDb` factory exists; the Secret Manager wiring exists; the `pnpm db:migrate` + `db:check` workflows exist. Story 1.3 ADDS migration 0001 + the events_log table; it does NOT recreate the Drizzle scaffolding.
- **Don't redeclare the events_log table outside `packages/domain/src/schema/events_log.ts`**: the architecture-canonical home for Drizzle tables is `packages/domain/src/schema/` (architecture line 4341-4356). `packages/events/` consumes the table via `@twt/domain`'s `schema` re-export.
- **Don't add `actor_id` as NOT NULL**: `null` carries the "system / SIE" semantic per architecture §1.14 line 1262-1268. If a downstream Story wants stricter NOT NULL, that's a new column or a check constraint added at that Story's discretion.
- **Don't add the RLS `pgPolicy` to events_log at Story 1.3**: that's Story 1.6 substrate (D9-1.3). Story 1.3 commits `pariwar_id` structurally; the `pgPolicy` declaration is Story 1.6's `packages/domain/src/policies/events-log-rls.ts` (or similar).
- **Don't add a `member.*` Zod schema to `packages/events/src/`**: that's Story 3.1+ territory (D3-1.3). Story 1.3 commits the empty `EVENT_TYPE_REGISTRY` shape; downstream Stories populate.
- **Don't author the concrete member-state machine**: that's Story 3.1+ at `packages/domain/src/member/state.ts` per architecture §1.14 line 1227 (D4-1.3).
- **Don't preempt the Account State composition workload**: the full enumeration of `claim-filed-frozen` / `disbursed-frozen-readable` / `disabled-T+90` / `public-record-∞` end states is a focused follow-up architectural workload flagged in architecture §Gap Analysis line 4802-4815 (D5-1.3). Story 1.3's `StateMachine<S, E>` is the **interface**; composition is downstream.
- **Don't author the audit-log hash-chain**: that's Story 1.10 (FR-47 + AR-9/10). Story 1.3 commits the canonical-JSON serializer that Story 1.10 will consume; the `audit_log_entries` table is a SEPARATE table per architecture §1.5 (different retention + 6h off-site mirror + Object Retention Lock — orthogonal to events_log).
- **Don't add events_log to the integration-test CI substrate at Story 1.3**: that's Story 1.6 territory (the same live-DB-in-CI substrate also gates the cross-Pariwar RLS adversarial test). Story 1.3 verifies locally against Docker Postgres 16.
- **Don't install or use `drizzle-zod`**: per Story 1.2 ADR-0003 Drizzle-over-Prisma rationale + architecture §1.3 line 776-785 — Story 1.4 hand-writes Zod schemas in `packages/contracts/`. Story 1.3 installs `zod` directly in `packages/events/` for the optional `payloadSchema` validator on `appendEvent`; this is orthogonal to drizzle-zod.
- **Don't add a `db:migrate` Turbo task or CI job at Story 1.3**: per Story 1.2 Task 3.2 rationale + architecture §1.8 line 999-1002 (migration phase precedes code deploy).
- **Don't break Story 1.2's migration 0000 idempotency**: migration 0001 is the new one; migration 0000 stays as-is.
- **Use `pnpm --filter @twt/events`** for workspace-scoped script invocation.
- **Use Conventional Commits** per Story 1.1 commitlint config — example commits: `feat(packages/domain): add events_log schema + append-only trigger migration`, `feat(packages/events): add appendEvent + loadEvents + replayState API`, `feat(packages/events): add StateMachine framework primitive`, `feat(packages/events): add canonical-JSON serializer`, `test(packages/events): add live-DB integration tests`, `docs(adr): ADR-0004 canonical-JSON specification`, `chore: Story 1.3 documentation + decision-log + cross-refs`.

### Project Structure Notes

**Workspace tree at Story 1.3 closure** (additions to the Story 1.2 baseline; preserves all Story 1.1 + 1.2 paths):

```
twt/
├── .decision-log.md                    [UPDATED] Task 6.6 — append Decision 2026-06-XX-XXX
├── README.md                           [UPDATED] Task 6.3 — §Packages or §Event log pointer
├── docs/
│   ├── adr/
│   │   ├── ADR-0003-datastore-engine.md           (Story 1.2)
│   │   └── ADR-0004-canonical-json.md             [NEW] Task 6.4
│   └── knowledge-transfer/
│       └── adr-index.md                [UPDATED] Task 6.5 — add ADR-0004 row + count table
├── packages/
│   ├── domain/                         (Story 1.2 baseline)
│   │   ├── README.md                   [UPDATED] Task 6.2 — §Migration 0001 entry
│   │   ├── migrations/
│   │   │   ├── 0000_init-baseline.sql              (Story 1.2)
│   │   │   ├── 0001_events-log.sql                 [NEW] Task 1.4 + hand-supplement 1.5
│   │   │   └── meta/
│   │   │       ├── _journal.json       [UPDATED] Task 1.4 — idx 0 → 1
│   │   │       ├── 0000_snapshot.json              (Story 1.2)
│   │   │       └── 0001_snapshot.json              [NEW] Task 1.4
│   │   └── src/
│   │       └── schema/
│   │           ├── _baseline.ts                    (Story 1.2)
│   │           ├── index.ts            [UPDATED] Task 1.3 — re-export events_log
│   │           └── events_log.ts                   [NEW] Task 1.1
│   └── events/                         (Story 1.1 placeholder; Story 1.3 substantively populates)
│       ├── package.json                [UPDATED] Task 2.1 + 2.5 — add @twt/domain + drizzle-orm + zod deps
│       ├── README.md                   [NEW] Task 6.1
│       ├── src/
│       │   ├── index.ts                [UPDATED] Task 2.4 — substantive re-exports
│       │   ├── events-log.ts                       [NEW] Task 2.2 — API surface
│       │   ├── state-machine.ts                    [NEW] Task 3.1 — StateMachine<S, E>
│       │   ├── canonical-json.ts                   [NEW] Task 4.1 — RFC 8785 JCS subset
│       │   └── registry.ts                         [NEW] Task 2.3 — event-type registry shape
│       └── tests/
│           ├── smoke.test.ts                       (PRESERVED Story 1.1 placeholder)
│           ├── state-machine.test.ts               [NEW] Task 3.2
│           ├── canonical-json.test.ts              [NEW] Task 4.2 / 5.4
│           ├── append-event.test.ts                [NEW] Task 5.1 — live-DB integration
│           ├── replay-state.test.ts                [NEW] Task 5.2 — live-DB integration
│           ├── append-only.test.ts                 [NEW] Task 5.3 — live-DB integration
│           └── README.md                           [NEW] Task 5.6 — local Postgres invocation
└── _bmad-output/implementation-artifacts/
    ├── sprint-status.yaml              [UPDATED] Task 7.6 — 1-3 backlog→ready-for-dev→in-progress→review
    ├── 1-3-packages-events-event-log-primitive.md  [UPDATED] Task 7.7 — Dev Agent Record
    └── deferred-work.md                [UPDATED] Task 6.7 — ## Story 1.3 deferred section
```

### Testing standards summary

**At Story 1.3** the test surface is:
- **`packages/events/tests/smoke.test.ts`** (PRESERVED from Story 1.1 placeholder) — continues to assert `src/index.ts` is truthy.
- **`packages/events/tests/state-machine.test.ts`** (NEW Task 3.2) — vitest unit test (no DB); 5+ assertions on fold / step / determinism.
- **`packages/events/tests/canonical-json.test.ts`** (NEW Task 4.2 / 5.4) — vitest unit test (no DB); 7+ assertions on key-order independence + escaping + numeric normalization.
- **`packages/events/tests/append-event.test.ts`** (NEW Task 5.1) — vitest **integration test against live local Docker Postgres 16**; 5+ assertions on happy path / sequential / concurrent-conflict / validation / Zod-schema rejection.
- **`packages/events/tests/replay-state.test.ts`** (NEW Task 5.2) — vitest integration test; 3+ assertions on deterministic replay + empty-stream + order-sensitive reducer.
- **`packages/events/tests/append-only.test.ts`** (NEW Task 5.3) — vitest integration test; 3+ assertions on trigger rejection of UPDATE / DELETE / TRUNCATE.
- **`packages/events/tests/README.md`** (NEW Task 5.6) — documents local Docker Postgres invocation pattern + the `DATABASE_URL`-set-to-skip-on-CI-or-run-on-local convention.
- **`packages/domain/tests/db.test.ts`** (PRESERVED from Story 1.2 — Drizzle createDb factory pool-config shape unit test).
- **`packages/domain/tests/smoke.test.ts`** (PRESERVED from Story 1.1 placeholder).

**Test runner**: `vitest` per Story 1.1 default; matches the workspace convention. The integration tests gate on `process.env.DATABASE_URL` presence — when unset (CI default at Story 1.3), they SKIP via vitest's `test.skipIf(!process.env.DATABASE_URL)` pattern, preserving the `pnpm turbo run test` green gate. When set (local dev), they RUN against the local Docker Postgres 16 container per Story 1.2 Task 7.2 invocation pattern.

**Architecture-committed integration test slots** that Story 1.3 does NOT populate (per Story 1.1 + 1.2 enumeration):
- `tests/integration/pool-engine/replay.spec.ts` (Story 7.x) — uses Story 1.3's `replayState` + `canonicalJsonStringify`.
- `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` (Story 1.6) — extends to assert no event leakage across `pariwar_id` (D10-1.3).
- `tests/integration/rls/policy-regression.spec.ts` (Story 1.6) — covers the events_log `pgPolicy` once Story 1.6 attaches it.
- `tests/integration/audit-log/integrity-check.spec.ts` (Story 1.10) — consumes `canonicalJsonStringify`.
- `tests/integration/snapshot-adapters/property.spec.ts` (Story 7.x) — consumes `canonicalJsonStringify`.
- `tests/integration/public-pages/scrape-test.spec.ts` (Story 1.16b).

**Live-DB CI substrate**: NOT introduced at Story 1.3 (D2-1.3); Story 1.6 territory. The new Story 1.3 integration tests run locally only at Story 1.3 closure; they skip on CI via the `DATABASE_URL`-unset signal.

### References

- [Source: epics.md#Story-1.3] line 1024-1041 — story body + ACs (verbatim source).
- [Source: epics.md#AR-8] line 263 — packages/events enforces event immutability.
- [Source: epics.md#AR-14] line 275 — Member lifecycle state machine + Source-of-truth principle.
- [Source: epics.md#AR-57] line 345 — Determinism & replay.
- [Source: epics.md#AR-58] line 346 — Idempotency keyed store.
- [Source: epics.md#UX-DR74] line 474 — Account State Machine as UX surface.
- [Source: epics.md#Epic-1] line 968-984 — Epic 1 context + cross-story dependencies.
- [Source: epics.md#Sprint-Change-Proposal-Item-3] line 519 — Event-derived state source-of-truth commitment.
- [Source: epics.md#Story-3.1] line 1591-1596 — member lifecycle state machine consumes Story 1.3's event-log primitive.
- [Source: epics.md#Story-6.x] line 2280-2285 — claim case object consumes Story 1.3's event log.
- [Source: epics.md#Story-7.x] line 2615-2620 — pool object data model consumes Story 1.3's event log.
- [Source: epics.md#Story-9.x] line 3166, 3182 — monotonic forward chain commitment + append-only events.
- [Source: architecture.md#Cross-Cutting-#4] line 284-285 — Determinism & replay.
- [Source: architecture.md#Cross-Cutting-#12] line 306-312 — Account State Machine first-class primitive.
- [Source: architecture.md#Cross-Cutting-#14] line 316-317 — Time-as-actor (SIE).
- [Source: architecture.md#Package-Boundary-Rationale] line 428-431 — packages/events immutability rule.
- [Source: architecture.md#Replay-foundation] line 604-612 — Replay foundation discipline.
- [Source: architecture.md#1.5] line 898-902 — Canonical JSON specification ADR commitment.
- [Source: architecture.md#1.8] line 986-1017 — drizzle-kit forward-only migration policy.
- [Source: architecture.md#1.11] line 1086, 3809 — Database-authoritative time + timestamptz storage.
- [Source: architecture.md#1.14] line 1217-1283 — Member lifecycle state model + canonical home `packages/domain/src/member/state.ts`.
- [Source: architecture.md#Process-patterns] line 3866-3884 — Service-layer typed-return error discipline (ConcurrencyError pattern).
- [Source: architecture.md#Event-naming] line 3830-3844 — Dotted resource.action + canonical-JSON serialization + immutability.
- [Source: architecture.md#Pattern-examples] line 4103-4112 — PoolSpawnedEvent Zod schema example.
- [Source: architecture.md#Naming-patterns] line 3663-3677 — snake_case DB + camelCase TS conventions.
- [Source: architecture.md#Complete-project-directory-structure] line 4341-4360, 4409-4418 — packages/events tree + registry.ts.
- [Source: architecture.md#Gap-Analysis] line 4802-4815 — Composed Account State enumeration deferred workload.
- [Source: _bmad-output/implementation-artifacts/1-2-cloud-sql-postgres-drizzle-migration-tooling.md] — Story 1.2 closure substrate (Drizzle + migrations + Secret Manager).
- [Source: _bmad-output/implementation-artifacts/1-1-turborepo-monorepo-bootstrap.md] — Story 1.1 closure substrate (workspaces + CI + ADRs).
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml] line 119-123 — Epic 1 status (`epic-1: in-progress`; `1-3: backlog → ready-for-dev`).
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] line 496-540 — Story 1.2 deferred items D1-1.2 through D14-1.2 (D12-1.2 dep-pin re-validation; D13-1.2 live DB integration test slots).
- [Source: docs/knowledge-transfer/adr-index.md] line 54 — ADR-0003-datastore-engine drafted (Story 1.2 closure precedent for ADR Status flow).
- [Source: .decision-log.md] HEAD — latest Decision number `2026-06-08-038`; next sequential slot for Story 1.3 substantive author-commit.
- [Source: packages/events/package.json + src/index.ts + tests/smoke.test.ts] HEAD — Story 1.1 baseline `@twt/events` placeholder shape.
- [Source: packages/domain/package.json + drizzle.config.ts + src/db.ts + src/secrets.ts + src/schema/{index,_baseline}.ts + migrations/0000_init-baseline.sql + scripts/migrate.ts] HEAD — Story 1.2 closure substrate.
- [Source: turbo.json + .github/workflows/ci.yml + package.json + tsconfig.base.json] HEAD — root configuration baseline (Story 1.1 + 1.2 inheritances).

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (`claude-opus-4-7`) via Claude Code CLI, executing the bmad-dev-story workflow.

### Debug Log References

Three significant in-flight discharges captured during implementation:

1. **Spurious `DROP SCHEMA "drizzle"` in initially-emitted migration 0001.** The first `drizzle-kit generate --name events-log` invocation produced `0001_events-log.sql` with a `DROP SCHEMA "drizzle"` line because Story 1.2's third-pass code review removed `pgSchema('drizzle')` from `_baseline.ts` without updating `migrations/meta/0000_snapshot.json` (which still held `"schemas": { "drizzle": "drizzle" }`). drizzle-kit diffed the stale snapshot against the current `_baseline.ts` state and saw the schema as needing drop. Discharged by patching `meta/0000_snapshot.json` `"schemas":` field to `{}`, deleting the spurious 0001 emit, and re-running `drizzle-kit generate`. Clean migration produced. Captured under Decision 2026-06-09-039 §3 + deferred-work D11-1.3.

2. **drizzle-orm wraps pg errors in `Error('Failed query: …')` with the underlying pg error on `.cause`.** First integration-test run failed because `appendEvent`'s `isUniqueViolation` helper inspected `err.code` (which was undefined on the wrapper) rather than `err.cause.code`. Refactored to `extractPgError(err)` which unwraps `.cause` then checks `.code` + `.constraint`. Same wrapping issue affected the append-only trigger tests — they originally asserted `rejects.toThrow(/append-only/)` against the wrapper message which only contained `"Failed query: …"`; refactored to use a `getCauseMessage(err)` helper that surfaces the trigger's `RAISE EXCEPTION` text.

3. **ConcurrencyError API simplification — dropped `currentVersion` field.** The story-body schema specified `ConcurrencyError(streamId, expectedVersion, currentVersion)`. Initial implementation did a `SELECT MAX(event_version)` after catching the unique-violation to populate `currentVersion`. This worked in production (each INSERT is implicit-transaction; the SELECT runs in a new transaction) but failed in the test-isolation transaction (the unique-violation aborts the surrounding transaction; subsequent SELECT fails with "current transaction is aborted"). Solving with a savepoint pattern inside `appendEvent` would have coupled the error path to transaction-state assumptions the events package can't make at this layer. Resolved by dropping `currentVersion` and documenting that retry-needing callers should `loadEvents(db, streamId)` and inspect the last row — which is the same query the error-path would have done, just owned by the caller who understands their own transaction context. Captured under Decision 2026-06-09-039 §6.

Non-blocking debug notes:

- Drizzle's `sql\`update ${schema.eventsLog} set ${schema.eventsLog.eventType} = …\`` template emits `"events_log"."event_type"` for both the UPDATE target table AND the SET column — invalid SQL because UPDATE SET takes a bare column name without table qualifier. Tests use raw `event_type` in the SET clause.
- pg unique-violation `SAVEPOINT` pattern: the integration tests that exercise the unique-violation + PK-violation paths wrap the failing INSERT in `SAVEPOINT` / `ROLLBACK TO SAVEPOINT` so the test-isolation transaction stays usable.
- `information_schema.triggers` is SQL-standard-only and does not surface statement-level TRUNCATE triggers. Use `pg_trigger` for full trigger inspection.

### Completion Notes List

- **Branch + state.** Branched from `story-1.2-cloud-sql-drizzle` HEAD `b02d85b` to `story-1.3-events-log-primitive` per user's pre-execution choice (a). All Story 1.2 substrate inherited intact.
- **Pre-execution user choices (all 3 recommendations accepted):** (1) Branch strategy = stack on `story-1.2-cloud-sql-drizzle`; (2) Live-DB integration-test isolation = per-test transaction-rollback (Task 5.6 Option (a)); (3) ADR-0004-canonical-json = drafted at Story 1.3 closure (over deferring to Story 1.10).
- **Task 1 closure evidence.** `packages/domain/src/schema/events_log.ts` exists with 8 columns + `UNIQUE(stream_id, event_version)` + `CHECK(event_version >= 1)` + two indexes. `migrations/0001_events-log.sql` hand-supplemented with 3 append-only triggers (`events_log_no_update` / `_no_delete` / `_no_truncate`) calling `events_log_reject_mutation()` plpgsql function. `meta/_journal.json` ticks to `idx: 1`; `meta/0001_snapshot.json` emitted clean. Verified via `psql` + `SELECT tgname FROM pg_trigger WHERE tgrelid = 'events_log'::regclass AND NOT tgisinternal` → 3 trigger rows (`events_log_no_delete`, `events_log_no_truncate`, `events_log_no_update`).
- **Task 2 closure evidence.** `packages/events/package.json` adds `@twt/domain workspace:*` + `drizzle-orm ^0.45.0` + `zod ^3.23.0` as runtime deps + `pg`, `@types/pg` as devDeps. `src/events-log.ts` exports `appendEvent` / `loadEvents` / `replayState` / `ConcurrencyError` / `EventRow` / `AppendEventInput` / `LoadEventsOptions`. `src/registry.ts` exports `EVENT_TYPE_REGISTRY` (empty placeholder per architecture line 4418) + `EventTypeRegistryEntry` type. `src/index.ts` re-exports the full surface.
- **Task 3 closure evidence.** `src/state-machine.ts` exports `StateMachine<S, E>` class + `defineStateMachine` factory + `StateMachineConfig` type. Generic over `S extends string` + `E extends { type: string }`. Optional `transitions[]` table for doc generators. Unit test `tests/state-machine.test.ts` — 7 assertions all pass.
- **Task 4 closure evidence.** `src/canonical-json.ts` implements RFC 8785 JCS subset (~30 lines) — lexicographic key sort, RFC 8259 escapes via `JSON.stringify` on primitive strings, `-0` normalization, NaN/Infinity throws. Unit test `tests/canonical-json.test.ts` — 10 assertions all pass. ADR-0004-canonical-json drafted at `docs/adr/ADR-0004-canonical-json.md` (9 sections covering decision + alternatives + constraints + forward path + status lifecycle + closure-language-precision posture). `adr-index.md` Section A row 55 inserted as `drafted`; Status row-count table updated: `drafted` 1 → 2; total 125 → 126.
- **Task 5 closure evidence.** 6 vitest files / 31 tests total. **Unit (always run):** smoke (1) + state-machine (7) + canonical-json (10) = 18. **Integration (SKIP when `DATABASE_URL` unset; RUN against live Docker Postgres 16):** append-event (6) + replay-state (4) + append-only (3) = 13. Per-test transaction-rollback isolation via `tests/integration-setup.ts`. Live-DB verification: `DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable pnpm --filter @twt/events test` → 31 passed / 6 files / ~700ms. CI behavior with `DATABASE_URL` unset: 18 passed / 13 skipped / 6 files / ~900ms.
- **Task 6 closure evidence.** `packages/events/README.md` substantively authored. `packages/domain/README.md` §3 extended with hand-supplemented-migration pattern + §Migration 0001 entry. Root `README.md` §Workspace layout table updated (packages/events status). Decision 2026-06-09-039 appended at top of `.decision-log.md ## Decisions` section per reverse-chronological schema. Decision-type index entry for Story 1.3 added. `deferred-work.md ## Story 1.3 deferred` section appended with D1-1.3 through D11-1.3 (D11-1.3 records the Story 1.2 snapshot retrospective fix).
- **Task 7 closure evidence.** `pnpm turbo run lint typecheck test build` → **56/56 successful** (cached on incremental runs). Matches Story 1.2 baseline exactly. `pnpm --filter @twt/events test` exit 0 (both with and without DATABASE_URL). `pnpm db:check` exit 0 ("Everything's fine 🐶🔥"). `pnpm db:migrate` exit 0 and idempotent — `drizzle.__drizzle_migrations` has `id=2` after two invocations: `id=1, hash=4960725cec...3d1` + `id=2, hash=805d3082...2f1b`. Story 1.3 file Status: `review`; `sprint-status.yaml development_status[1-3-packages-events-event-log-primitive]: review`.
- **Conformance check.** Architecture-vs-Story-body alignment confirmed; no new divergences vs Story 1.1 `apps/member` or Story 1.2 `packages/db` precedent. `packages/events/` canonical home + `packages/domain/src/schema/events_log.ts` canonical home both align byte-for-byte with architecture §1.5 + §1.14 + §Complete project directory structure.
- **Closure-language-precision per [[feedback_closure_language_precision]].** Framework + engineering = **Closed by [edit]** on Tasks 1-7 + local CI gates green + live local Postgres 16 integration tests green (Story 1.3 is engineering with direct objective evidence). ADR-0004 trustee-ratification leg + live-DB CI substrate leg + substantive per-domain Zod schemas leg + substantive Account State composition workload leg = **Resolved via explicit deferral** with rationale enumerated in deferred-work.md D1-1.3 through D11-1.3.
- **Next steps for BigDev.** Push branch `story-1.3-events-log-primitive` + open PR (stacked on Story 1.2 PR) + watch CI green for `lint` + `typecheck` + `test` + `build` + `db-check` (live-DB integration tests SKIP cleanly in CI). Schedule Trustee Panel session for ADR-0004 ratification. Story 3.1+ (member lifecycle) inherits the `StateMachine<S, E>` substrate + `appendEvent` API at the canonical `packages/domain/src/member/state.ts` landing.

### File List

**New files:**

- `packages/domain/src/schema/events_log.ts` — Drizzle table definition (Task 1.1).
- `packages/domain/migrations/0001_events-log.sql` — hand-supplemented migration (Task 1.4 + 1.5).
- `packages/domain/migrations/meta/0001_snapshot.json` — drizzle-kit snapshot emit (Task 1.4).
- `packages/events/src/events-log.ts` — `appendEvent` / `loadEvents` / `replayState` / `ConcurrencyError` API (Task 2.2).
- `packages/events/src/state-machine.ts` — generic `StateMachine<S, E>` framework primitive (Task 3.1).
- `packages/events/src/canonical-json.ts` — RFC 8785 JCS subset serializer (Task 4.1).
- `packages/events/src/registry.ts` — `EVENT_TYPE_REGISTRY` shape placeholder (Task 2.3).
- `packages/events/tests/state-machine.test.ts` — 7 vitest unit tests (Task 3.2).
- `packages/events/tests/canonical-json.test.ts` — 10 vitest unit tests (Task 4.2 / 5.4).
- `packages/events/tests/append-event.test.ts` — 6 vitest live-DB integration tests (Task 5.1).
- `packages/events/tests/replay-state.test.ts` — 4 vitest live-DB integration tests (Task 5.2).
- `packages/events/tests/append-only.test.ts` — 3 vitest live-DB integration tests (Task 5.3).
- `packages/events/tests/integration-setup.ts` — per-test transaction-rollback isolation helper (Task 5.6).
- `packages/events/tests/README.md` — local Docker Postgres invocation + isolation strategy doc (Task 5.6).
- `packages/events/README.md` — package documentation (Task 6.1).
- `docs/adr/ADR-0004-canonical-json.md` — canonical-JSON ADR (Task 6.4).

**Modified files:**

- `packages/domain/src/schema/index.ts` — barrel adds `export * from './events_log.js'` (Task 1.3).
- `packages/domain/migrations/meta/_journal.json` — ticks to `idx: 1` (Task 1.4 emit byproduct).
- `packages/domain/migrations/meta/0000_snapshot.json` — `"schemas"` field set to `{}` to align with current `_baseline.ts` (retrospective Story 1.2 fix; Decision §3 + deferred-work D11-1.3).
- `packages/domain/README.md` — §3 extended with hand-supplemented migration pattern + §Migration 0001 entry (Task 6.2).
- `packages/events/package.json` — adds `@twt/domain` + `drizzle-orm` + `zod` deps; `pg` + `@types/pg` devDeps (Task 2.1).
- `packages/events/src/index.ts` — replaces `export {}` placeholder with substantive re-exports (Task 2.4).
- `pnpm-lock.yaml` — regenerated for new packages/events deps.
- `README.md` — §Workspace layout table updates for `packages/domain/` + `packages/events/` substrate status (Task 6.3).
- `docs/knowledge-transfer/adr-index.md` — Section A row 55 added for ADR-0004; Status row-count table updated (Task 6.5).
- `.decision-log.md` — Decision 2026-06-09-039 appended at top of `## Decisions`; decision-type index entry for Story 1.3 added (Task 6.6).
- `_bmad-output/implementation-artifacts/deferred-work.md` — `## Story 1.3 deferred` section appended with D1-1.3 through D11-1.3 (Task 6.7).
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `development_status[1-3-packages-events-event-log-primitive]: ready-for-dev → in-progress → review` (Tasks 4 + 7.6).
- `_bmad-output/implementation-artifacts/1-3-packages-events-event-log-primitive.md` — task checkboxes + Dev Agent Record + Status flip (Task 7.7).

### Change Log

| Date | Change | Author |
| ---- | ------ | ------ |
| 2026-06-09 | Story 1.3 ready-for-dev (create-story artifacts committed) | bmad-create-story |
| 2026-06-09 | Story 1.3 in-progress (dev-story Step 4; user choices captured: stack on story-1.2-cloud-sql-drizzle + transaction-rollback isolation + ADR-0004 drafted at Story 1.3) | bmad-dev-story |
| 2026-06-09 | Story 1.3 code review pass 1 — 1 decision-needed, 10 patches, 8 deferred, 6 dismissed | bmad-code-review |

### Review Findings

- [x] [Review][Decision] D1: `AppendResult` type alias added — `type AppendResult = Pick<EventRow, 'eventId' | 'eventVersion'>`; `appendEvent` return type updated to `Promise<AppendResult>`; exported from `index.ts`; AC-1 wording updated. Resolved: option (a).

- [x] [Review][Patch] P1: `canonical-json`: explicit type guards added for `BigInt`, `undefined`, and `Date` in `canonicalJsonStringify` — each throws `TypeError` [packages/events/src/canonical-json.ts]
- [x] [Review][Patch] P2: `integration-setup`: `connectionTimeoutMillis: 5000` + pool `error` handler added; `pool`/`activeClient` scoped as local variables inside `setupLiveDb()` closure; `--pool=forks` note added to file comment [packages/events/tests/integration-setup.ts]
- [x] [Review][Patch] P3: `STREAM_VERSION_CONSTRAINT` constant extracted in `events-log.ts`; constraint name no longer hardcoded in the catch block [packages/events/src/events-log.ts]
- [x] [Review][Patch] P4: `CREATE OR REPLACE FUNCTION` → `CREATE FUNCTION` in migration 0001 [packages/domain/migrations/0001_events-log.sql]
- [x] [Review][Patch] P5: `Number.isInteger` + `>= Number.MAX_SAFE_INTEGER` guards added to `appendEvent`; error message updated to cover both conditions [packages/events/src/events-log.ts]
- [x] [Review][Patch] P6: `extractPgError` fallback logic improved — uses `.cause` when present and non-null, falls back to `err` itself [packages/events/src/events-log.ts]
- [x] [Review][Patch] P7: `expect(caught).not.toHaveProperty('currentVersion')` + comment added to `ConcurrencyError` test [packages/events/tests/append-event.test.ts]
- [x] [Review][Patch] P8: Trailing newlines added to `_journal.json` and `0001_snapshot.json` [packages/domain/migrations/meta/]
- [x] [Review][Patch] P9: `StateMachine.fold` reducer wrapped: `events.reduce((s, e) => this.config.reduce(s, e), ...)` [packages/events/src/state-machine.ts]
- [x] [Review][Patch] P10: Misleading "TWO separate transactions" comment replaced with accurate SAVEPOINT description [packages/events/tests/append-event.test.ts]

- [x] [Review][Defer] W1: `replayState` unbounded stream load — no row-count guard; large streams will OOM; design concern beyond Story 1.3 scope [packages/events/src/events-log.ts] — deferred, pre-existing design scope
- [x] [Review][Defer] W2: `appendEvent` prototype-polluting payload keys — no key sanitization before INSERT; downstream reducers that spread payloads could be vulnerable; Story 1.4 Zod contracts [packages/events/src/events-log.ts] — deferred, pre-existing pattern
- [x] [Review][Defer] W3: Migration 0001 missing `SET LOCAL search_path` qualifier — consistent with migration 0000 pattern; low risk on standard Cloud SQL config [packages/domain/migrations/0001_events-log.sql] — deferred, pre-existing
- [x] [Review][Defer] W4: Concurrent-conflict test uses SAVEPOINT not two truly parallel connections — spec says "two parallel calls"; SAVEPOINT simulates the unique-violation correctly but doesn't exercise true concurrency; Story 1.6 test substrate [packages/events/tests/append-event.test.ts] — deferred, Story 1.6
- [x] [Review][Defer] W5: `loadEvents` has no `pariwarId` scoping — filters by `streamId` only; cross-tenant leakage possible before Story 1.6 RLS; already tracked at D9-1.3 [packages/events/src/events-log.ts] — deferred, D9-1.3/Story 1.6
- [x] [Review][Defer] W6: `canonical-json` no non-ASCII / Unicode key ordering tests — all 10 test cases use ASCII keys; Devanagari / extended keys are a future concern per ADR-0004 forward-path; Story 1.5+ real payloads [packages/events/tests/canonical-json.test.ts] — deferred, ADR-0004 forward-path
- [x] [Review][Defer] W7: `loadEvents` / `appendEvent` `streamId`/`pariwarId` are `string` not validated as UUID — invalid UUIDs produce opaque Postgres errors; Story 1.7 branded types [packages/events/src/events-log.ts] — deferred, Story 1.7
- [x] [Review][Defer] W8: `StateMachine` `transitions` array not validated against `reduce` function — documentation-only; inconsistency produces no runtime error; low risk at Story 1.3 scope [packages/events/src/state-machine.ts] — deferred, documentation concern
| 2026-06-09 | Story 1.3 substrate authored: events_log table + append-only triggers + migration 0001 + packages/events appendEvent/loadEvents/replayState API + StateMachine framework + canonical-JSON serializer + ADR-0004 drafted + Decision 2026-06-09-039 + deferred-work.md D1-1.3..D11-1.3; 56/56 turbo green; 31/31 vitest green against live Postgres 16; Status → review | bmad-dev-story |
