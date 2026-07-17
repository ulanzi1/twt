// Pool lifecycle state machine + pure reducer — Story 7.1 (Task 3; AC2/AC5).
//
// THE source of truth for a pool's state. The persisted `pools.current_state` column
// is a projection of replaying this reducer over the pool's `events_log` stream
// (stream_id = pool_id; architecture §1.6 Pool Engine + §1.14 line 1229). The reducer
// is the runtime authority; the `transitions` table is documentation only. Twin of
// claim/state.ts + member/state.ts — the THIRD event-derived-state primitive.
//
// ── PURE + DETERMINISTIC + IDEMPOTENT + TOTAL (AC2 — load-bearing) ─────────────
// `reduce(state, event)` MUST be pure: no Date.now(), no randomness, no I/O, no reads
// of mutable module state. Replaying a stream from event 1..N produces the SAME final
// state every time, on every machine — that is what makes Epic 7's pool-binding +
// Epic 9's reconciliation audit-reproducibility free for the ₹50L/decision flow. A
// non-pure reducer silently breaks it.
//
// ── Total reducer: illegal/inapplicable transitions are IDENTITY (no-op) ──────
// The reducer never throws on a well-formed event. An event that does not apply to the
// current state returns the state unchanged. This keeps replay robust and forward-
// compatible (an event type a LATER story adds replays as identity here). Whether a
// transition SHOULD be emitted is the EMITTER's concern (the spawn saga 7.3, the
// contribution-window scheduler, disbursement), not the reducer's.

import { defineStateMachine, type StateMachine } from '../state-machine.js';
import { eventsLog } from '../schema/events_log.js';
import { type PoolLifecycleState } from '../schema/pools.js';

export { POOL_LIFECYCLE_STATES, type PoolLifecycleState } from '../schema/pools.js';

/** The live-DB event row shape (Drizzle camelCase). Derived locally so the reducer
 * has no `@twt/events` dependency (domain↔events would cycle). */
type EventRow = typeof eventsLog.$inferSelect;

/**
 * The reducer's event input. `StateMachineConfig<S, E>` requires `E extends { type:
 * string }`, but `EventRow` carries `eventType` (Drizzle camelCase of `event_type`),
 * NOT `type` — so `machine.fold(rows)` would fail type-check. `toPoolEvent` is the
 * mandatory bridge. Unit tests construct `PoolEventInput` objects directly (DB-free).
 */
export interface PoolEventInput {
  readonly type: string;
  readonly payload: unknown;
}

/**
 * The canonical pool-lifecycle reducer. Encodes the authoritative transition graph
 * (linear: spawned → live → closed → settled). Every transition derives the next
 * state from `(current_state, event.type)` alone — the pool machine reads NO payload
 * content (unlike claim/state.ts's appeal-review `decision` branch).
 */
function reduce(state: PoolLifecycleState, event: PoolEventInput): PoolLifecycleState {
  switch (event.type) {
    // Creation: only legal as the FIRST event of a stream. The machine starts at
    // `spawned` (= initial), so this is a no-op from initial. From any other state it
    // returns state unchanged (IDENTITY contract — a corrupt replay must not regress a
    // live pool back to spawned). Mirrors claim.intake_initiated.
    case 'pool.spawned':
      return state;

    // Contribution window opens (the delimiter-reconciled name — see events.ts PINNED
    // SEAM header). Only from `spawned`.
    case 'pool.opened_for_contributions':
      if (state === 'spawned') return 'live';
      return state;

    // Contribution window closes. Only from `live`.
    case 'pool.closed':
      if (state === 'live') return 'closed';
      return state;

    // Disbursed to the deceased's nominee accounts → terminal. Only from `closed`.
    case 'pool.settled':
      if (state === 'closed') return 'settled';
      return state;

    // Any unknown/forward-compat event type → identity.
    default:
      return state;
  }
}

/**
 * The pool lifecycle state machine. `initial` is `spawned`: a pool only exists once
 * `pool.spawned` is appended, and that event projects to `spawned`, so a real stream's
 * fold begins effectively at `spawned`. The transition table's conceptual `(none)`
 * pre-state is not a persisted enum label.
 */
export const poolStateMachine: StateMachine<PoolLifecycleState, PoolEventInput> =
  defineStateMachine<PoolLifecycleState, PoolEventInput>({
    initial: 'spawned',
    reduce,
    // Documentation-only transition matrix. Creation (pool.spawned → spawned) is
    // omitted: its `from` is the conceptual `(none)`, which is not a valid persisted
    // state. The runtime authority is `reduce`.
    transitions: [
      { from: 'spawned', event: 'pool.opened_for_contributions', to: 'live' },
      { from: 'live', event: 'pool.closed', to: 'closed' },
      { from: 'closed', event: 'pool.settled', to: 'settled' },
    ],
  });

/** Map a live-DB `EventRow` to the reducer's `PoolEventInput` (the mandatory bridge —
 * `eventType` → `type`). */
function toPoolEvent(row: EventRow): PoolEventInput {
  return { type: row.eventType, payload: row.payload };
}

/**
 * Replay an ordered event stream to the pool's current lifecycle state. Callers load
 * the rows (PK-ordered by `event_version`) and fold them through the machine.
 * Deterministic + idempotent (AC2): replaying 1..N twice yields the same state.
 */
export function replayPoolState(rows: readonly EventRow[]): PoolLifecycleState {
  return poolStateMachine.fold(rows.map(toPoolEvent));
}
