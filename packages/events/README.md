# @twt/events

Event log primitive + Account State Machine framework + canonical-JSON serializer.

Authored at Story 1.3 per AR-8 (events immutability), AR-14 (member lifecycle
state machine), AR-57 (determinism & replay), AR-58 (idempotency-keyed store),
UX-DR74 (Account State Machine framework primitive), and architecture
§Package Boundary Rationale line 428-431:

> `packages/events` holds internal event contracts for replay/audit. Events
> are immutable: a correction emits a *new* event referring to the original;
> no event row is ever rewritten. This rule protects the replay foundation
> that Pool Engine determinism and audit log integrity both depend on.

## Workspace boundary

The `events_log` storage table itself lives in `@twt/domain` per the
architecture-canonical commitment that all Drizzle schema lives in
`packages/domain/src/schema/` (architecture lines 4341-4356). `@twt/events`
depends on `@twt/domain` for the `Db` client type + the `schema.eventsLog`
import; the API surface (`appendEvent` / `loadEvents` / `replayState`) is
in `@twt/events` because the operations are reusable across domains and
don't belong to any one downstream module.

## API

```ts
import {
  appendEvent,
  loadEvents,
  replayState,
  ConcurrencyError,
  canonicalJsonStringify,
  defineStateMachine,
} from '@twt/events';
```

### `appendEvent(db, input): Promise<EventRow>`

Inserts a single event at `event_version = expectedVersion + 1`. The DB-layer
`UNIQUE(stream_id, event_version)` index enforces optimistic concurrency; on
duplicate version, the API throws a typed `ConcurrencyError`.

```ts
const event = await appendEvent(db, {
  streamId: memberId,
  eventType: 'member.signup_initiated', // dotted resource.action
  payload: { name, phone },
  expectedVersion: 0, // brand-new stream
  actorId: null,      // null = system / SIE per architecture §1.14
  pariwarId,
});
```

Optional fields:

- `eventId?: string` — supply an explicit UUID for idempotent re-append
  (AR-58 idempotency-keyed-store). Omit to let the DB default
  `gen_random_uuid()` fire.
- `payloadSchema?: z.ZodTypeAny` — optional Zod schema; when provided,
  `payloadSchema.parse(payload)` runs BEFORE the INSERT — fail-fast at
  the application boundary, defense-in-depth alongside the DB JSONB
  column type. Per-event-type Zod schemas are downstream-Story territory
  (Story 3.1+ `member.*`, 6.x `claim.*`, etc.).

### `loadEvents(db, streamId, opts?): Promise<EventRow[]>`

Returns all events for `streamId` ordered ascending by `event_version`.
Supports `{ fromVersion?, toVersion? }` slicing for incremental projections
and dispatchers.

### `replayState<S, E>(db, streamId, reducer, initialState): Promise<S>`

Deterministic fold over an event stream. Equivalent to
`loadEvents().then(events => events.reduce(reducer, initialState))` with
byte-deterministic semantics — same stream + same `(reducer, initial)`
produces byte-identical state on every invocation (architecture
§Cross-Cutting #4 line 284-285; line 1229-1234 "Member state is derived
from event history. Persisted state is an optimization only").

### `ConcurrencyError`

Typed return for the optimistic-concurrency failure mode per architecture
§Process patterns line 3873-3884. Concurrent appends are an EXPECTED
failure mode (two callers race; one wins, one retries) — not exceptional.
The handler at `apps/api` (Story 1.6+ territory) translates
`ConcurrencyError` → HTTP 409 Conflict.

Callers needing the current stream version for retry logic should call
`loadEvents(db, streamId)` and inspect the last row — not inspect the
error. The error deliberately does not carry `currentVersion`; looking
it up inside the same transaction requires savepoints (the unique-
violation aborts the surrounding transaction in pg).

## `events_log` table contract

8 columns (snake_case DB / camelCase TS per architecture line 3663-3677):

| Column | Type | Notes |
|---|---|---|
| `event_id` | `uuid PK` | DB default `gen_random_uuid()`; caller MAY supply explicit value for idempotent re-append. |
| `stream_id` | `uuid NOT NULL` | Opaque to `@twt/events`; downstream consumers choose what a stream is (member_id / claim_id / pool_id / etc.). |
| `event_type` | `text NOT NULL` | Dotted resource.action convention per architecture line 3830-3833 (`member.signup_initiated`, `pool.spawned`, …). |
| `payload` | `jsonb NOT NULL` | DB stores parsed JSONB; canonical-JSON serializer is invoked at the read-and-hash boundary by audit-log writers (Story 1.10) + Pool Engine snapshot writers (Story 7.x). |
| `event_version` | `bigint NOT NULL` | Monotonically increasing per stream starting at 1. CHECK constraint enforces `>= 1`. |
| `occurred_at` | `timestamptz NOT NULL DEFAULT now()` | Database-authoritative time per architecture §1.11. |
| `actor_id` | `uuid NULL` | NULL = system / SIE per architecture §1.14 line 1262-1268. |
| `pariwar_id` | `uuid NOT NULL` | Multi-tenant scoping per architecture §1.2. First-class column; Story 1.6 attaches the RLS pgPolicy. |

Indexes:

- `UNIQUE (stream_id, event_version)` — structural optimistic-concurrency enforcement.
- `(pariwar_id, stream_id, event_version)` — per-tenant per-stream replay loads.
- `(pariwar_id, occurred_at)` — per-tenant tail reads (alert dispatcher, reconciliation matcher).

### Append-only structural guarantee

Migration 0001 hand-supplements the drizzle-kit emit with three triggers:

```
CREATE TRIGGER events_log_no_update    BEFORE UPDATE   ON events_log …
CREATE TRIGGER events_log_no_delete    BEFORE DELETE   ON events_log …
CREATE TRIGGER events_log_no_truncate  BEFORE TRUNCATE ON events_log …
```

Each fires `RAISE EXCEPTION 'events_log is append-only — corrections emit a
new event (AR-8)'`. The application API does not expose `UPDATE` / `DELETE`
paths; the triggers are the structural defense per AR-8 + architecture
§Package Boundary Rationale.

## Stream-key conventions

`@twt/events` is agnostic about what a `streamId` is. Downstream Stories
choose per-domain conventions (expected, not enforced):

- **Member stream**: `streamId = member_id` (Story 3.1+).
- **Claim stream**: `streamId = claim_id` (Story 6.x).
- **Pool stream**: `streamId = pool_id` (Story 7.x).
- **Alert stream**: `streamId = alert_id` (Story 8.x).
- **Reconciliation stream**: `streamId = reconciliation_run_id` or per-Pariwar
  per-cycle hash (Story 9.x decides).

## StateMachine framework primitive (UX-DR74)

```ts
import { defineStateMachine } from '@twt/events';

const memberSm = defineStateMachine<MemberState, MemberEvent>({
  initial: 'pending-fee',
  reduce: (state, event) => { /* … */ },
  transitions: [
    { from: 'pending-fee', event: 'fee.paid', to: 'lock-in' },
    // …
  ],
});
```

Generic `StateMachine<S extends string, E extends { type: string }>`
interface — concrete state lifecycles live with their owning domain:

- **Member state**: `packages/domain/src/member/state.ts` — architecture §1.14
  line 1227 canonical home; Story 3.1+ landing per architecture §1.14
  line 1238-1246 (`pending-fee → lock-in → (pending-valid | active) →
  active_in_grace → lapsed_unpaid → withdrawn`).
- **Claim state**: Story 6.x.
- **Pool state**: Story 7.x.
- **Alert state**: Story 8.x.

The **full composition** of Account State (architecture §3.4 end states
`claim-filed-frozen`, `disbursed-frozen-readable`, `disabled-T+90`,
`public-record-∞`) is a focused follow-up architectural workload flagged
in architecture §Gap Analysis (line 4802-4815). Story 1.3 commits the
interface; composition is downstream.

## Canonical JSON

`canonicalJsonStringify` implements an RFC 8785 JCS subset — deterministic
property ordering, no whitespace, no insignificant zeros. See
[ADR-0004](../../docs/adr/ADR-0004-canonical-json.md) for the algorithm,
alternatives, constraints, and the forward-path commitment to a library
swap when the subset bites.

Cross-consumer "one library, one version" property per architecture line
898-902: the build will fail if any workspace re-implements the algorithm
or pulls in a second canonicalization library (Story 1.16c commits the
forbidden-pattern assert).

## Numerics

`event_version` is stored as Postgres `bigint` but exposed at the TS layer
as `number` via Drizzle's `mode: 'number'` option. JavaScript safe-integer
range (2^53 − 1) is well beyond v1 envelope. If Story 1.10's audit-log
hash chain requires `BigInt` at the TS layer for any reason, revisit this
choice + add a per-Story migration note.

## Testing

Unit tests (no DB) always run:

- `tests/state-machine.test.ts` — generic `StateMachine<S, E>` interface.
- `tests/canonical-json.test.ts` — RFC 8785 JCS subset conformance.
- `tests/smoke.test.ts` — Story 1.1 placeholder; asserts the workspace module loads.

Live-DB integration tests (per-test transaction-rollback isolation, Story 1.3
Task 5.6 choice (a)) SKIP via `describe.skipIf(!DATABASE_URL)` when
`DATABASE_URL` is unset (CI default):

- `tests/append-event.test.ts`
- `tests/replay-state.test.ts`
- `tests/append-only.test.ts`

See `tests/README.md` for the local Docker Postgres invocation. Live-DB CI
is Story 1.6 territory (deferred-work D2-1.3; the same service-container
substrate also gates the cross-Pariwar RLS adversarial test).

## Package ownership

- **Owner**: Solo Builder.
- **Purpose**: event log primitive + state machine framework + canonical-JSON serializer.
- **Promotion rule**: substantive event-type schemas (Story 3.1+, 6.x, 7.x, …)
  live under `packages/events/src/<domain>/`; the storage table + triggers
  live in `packages/domain/src/schema/events_log.ts`.

Per architecture §Package ownership declaration line 4499-4509.
