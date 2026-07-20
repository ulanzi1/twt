// Alert lifecycle state machine + pure reducer — Story 8.1 (Task 5; AC1).
//
// THE source of truth for an alert's state. The persisted `alerts.current_state` column
// is a projection of replaying this reducer over the alert's `events_log` stream
// (stream_id = alert_id; §1.14 event-derived-state invariant). The reducer is the runtime
// authority; the `transitions` table is documentation only. Twin of pool/state.ts +
// claim/state.ts + member/state.ts — the FOURTH event-derived-state primitive.
//
// ── PURE + DETERMINISTIC + IDEMPOTENT + TOTAL (AC1 — load-bearing) ─────────────
// `reduce(state, event)` MUST be pure: no Date.now(), no randomness, no I/O, no reads of
// mutable module state. Replaying a stream from event 1..N produces the SAME final state
// every time, on every machine — that is what makes the (member_id, alert_id) `tr=`
// binding + Epic 9's reconciliation audit-reproducibility free for the ₹50L/decision flow.
// A non-pure reducer silently breaks it.
//
// ── Total reducer: illegal/inapplicable transitions are IDENTITY (no-op) ──────
// The reducer never throws on a well-formed event. An event that does not apply to the
// current state returns the state unchanged. This keeps replay robust and forward-
// compatible. Whether a transition SHOULD be emitted is the EMITTER's concern (the
// cycle-open trigger this story owns for frozen/published/live; Story 8.9 for closed;
// Epic 9 for settled), not the reducer's.
//
// ── This story authors the COMPLETE reducer, emits only the cycle-open arms ────
// All six states + all five transition arms are authored here (D3). This story's
// cycle-open trigger emits only `alert.frozen`/`alert.published`/`alert.live`
// (draft → frozen → published → live). `alert.closed` is Story 8.9; `alert.settled` is
// Epic 9's exclusive — the reducer arms exist, the emitters don't (the pool/state.ts
// "authored `settled` arm, Epic 9 emits it" precedent).

import { defineStateMachine, type StateMachine } from '../state-machine.js';
import { eventsLog } from '../schema/events_log.js';
import { type AlertLifecycleState } from '../schema/alerts.js';

export { ALERT_LIFECYCLE_STATES, type AlertLifecycleState } from '../schema/alerts.js';

/** The live-DB event row shape (Drizzle camelCase). Derived locally so the reducer has
 * no `@twt/events` dependency (domain↔events would cycle). */
type EventRow = typeof eventsLog.$inferSelect;

/**
 * The reducer's event input. `StateMachineConfig<S, E>` requires `E extends { type:
 * string }`, but `EventRow` carries `eventType` (Drizzle camelCase of `event_type`), NOT
 * `type` — so `machine.fold(rows)` would fail type-check. `toAlertEvent` is the mandatory
 * bridge. Unit tests construct `AlertEventInput` objects directly (DB-free).
 */
export interface AlertEventInput {
  readonly type: string;
  readonly payload: unknown;
}

/**
 * The canonical alert-lifecycle reducer. Encodes the authoritative transition graph
 * (linear: draft → frozen → published → live → closed → settled). Every transition
 * derives the next state from `(current_state, event.type)` alone — the alert machine
 * reads NO payload content.
 */
function reduce(state: AlertLifecycleState, event: AlertEventInput): AlertLifecycleState {
  switch (event.type) {
    // Genesis: draft → frozen (the cycle-freeze was consumed). Only legal as the FIRST
    // event of a stream, from the initial `draft` fold state. From any other state it
    // returns state unchanged (IDENTITY contract — a corrupt replay must not regress a
    // live alert back to frozen). Mirrors pool.spawned / claim.intake_initiated.
    case 'alert.frozen':
      if (state === 'draft') return 'frozen';
      return state;

    // Member-visible. Only from `frozen`.
    case 'alert.published':
      if (state === 'frozen') return 'published';
      return state;

    // Contribution window open. Only from `published`.
    case 'alert.live':
      if (state === 'published') return 'live';
      return state;

    // Contribution window closes (Story 8.9 emits it). Only from `live`.
    case 'alert.closed':
      if (state === 'live') return 'closed';
      return state;

    // Reconciliation complete + disbursed → terminal (Epic 9 emits it). Only from `closed`.
    case 'alert.settled':
      if (state === 'closed') return 'settled';
      return state;

    // Any unknown/forward-compat event type → identity.
    default:
      return state;
  }
}

/**
 * The alert lifecycle state machine. `initial` is `draft`: an alert stream's fold begins
 * at `draft` (the pre-genesis trustee-preparing state), and the genesis `alert.frozen`
 * event moves it to `frozen`. The transition `draft → frozen` IS part of the runtime
 * reducer (unlike pool, whose initial `spawned` was the creation state itself).
 */
export const alertStateMachine: StateMachine<AlertLifecycleState, AlertEventInput> =
  defineStateMachine<AlertLifecycleState, AlertEventInput>({
    initial: 'draft',
    reduce,
    // Documentation-only transition matrix. The runtime authority is `reduce`.
    transitions: [
      { from: 'draft', event: 'alert.frozen', to: 'frozen' },
      { from: 'frozen', event: 'alert.published', to: 'published' },
      { from: 'published', event: 'alert.live', to: 'live' },
      { from: 'live', event: 'alert.closed', to: 'closed' },
      { from: 'closed', event: 'alert.settled', to: 'settled' },
    ],
  });

/** Map a live-DB `EventRow` to the reducer's `AlertEventInput` (the mandatory bridge —
 * `eventType` → `type`). */
function toAlertEvent(row: EventRow): AlertEventInput {
  return { type: row.eventType, payload: row.payload };
}

/**
 * Replay an ordered event stream to the alert's current lifecycle state. Callers load the
 * rows (PK-ordered by `event_version`) and fold them through the machine. Deterministic +
 * idempotent (AC1): replaying 1..N twice yields the same state.
 */
export function replayAlertState(rows: readonly EventRow[]): AlertLifecycleState {
  return alertStateMachine.fold(rows.map(toAlertEvent));
}
