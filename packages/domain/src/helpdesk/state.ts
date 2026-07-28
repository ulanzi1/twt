// Helpdesk ticket lifecycle state machine + pure reducer — Story 10.1 (Task 3; AC4).
//
// THE source of truth for a ticket's state. The persisted `helpdesk_tickets.current_state`
// column is a projection of replaying this reducer over the ticket's `events_log` stream
// (stream_id = ticket_id; §3.5a + Cross-Cutting #4 event-derived-state invariant). The reducer
// is the runtime authority; the `transitions` table is documentation only. Twin of
// alert/state.ts + pool/state.ts + claim/state.ts + member/state.ts — the FIFTH primitive.
//
// ── PURE + DETERMINISTIC + IDEMPOTENT + TOTAL (AC4 — load-bearing) ─────────────
// `reduce(state, event)` MUST be pure: no Date.now(), no randomness, no I/O, no reads of
// mutable module state. Replaying a stream 1..N produces the SAME final state every time, on
// every machine. A non-pure reducer silently breaks replay-reproducibility.
//
// ── Total reducer: illegal/inapplicable transitions are IDENTITY (no-op) ──────
// The reducer never throws on a well-formed event. An event that does not apply to the current
// state returns the state unchanged. Whether a transition SHOULD be emitted is the EMITTER's
// concern (the pick-up/resolve/close surfaces of 10.2/10.4 + the auto-close job), not the reducer's.
//
// ── This story authors the COMPLETE reducer, emits only the genesis ───────────
// All six states + all transition arms are authored here (the ratified state-set UNION; see
// schema/helpdesk_tickets.ts). This story's create-ticket route emits ONLY `helpdesk.ticket_created`
// (→ open). The pick-up/awaiting/resolve/close/reopen emitters land with their surfaces (10.2/10.4 +
// the auto-close job) — the reducer arms exist, the emitters don't (the alert/pool "author-all-arms,
// emit-genesis" precedent).

import { defineStateMachine, type StateMachine } from '../state-machine.js';
import { eventsLog } from '../schema/events_log.js';
import { type HelpdeskTicketState } from '../schema/helpdesk_tickets.js';

export { HELPDESK_TICKET_STATES, type HelpdeskTicketState } from '../schema/helpdesk_tickets.js';

/** The live-DB event row shape (Drizzle camelCase). Derived locally so the reducer has no
 * `@twt/events` dependency (domain↔events would cycle). */
type EventRow = typeof eventsLog.$inferSelect;

/**
 * The reducer's event input. `StateMachineConfig<S, E>` requires `E extends { type: string }`,
 * but `EventRow` carries `eventType` (Drizzle camelCase of `event_type`) — so `toHelpdeskEvent`
 * is the mandatory bridge. Unit tests construct `HelpdeskEventInput` objects directly (DB-free).
 */
export interface HelpdeskEventInput {
  readonly type: string;
  readonly payload: unknown;
}

/**
 * The canonical ticket-lifecycle reducer. Encodes the ratified transition graph. Every transition
 * derives the next state from `(current_state, event.type)` alone — the ticket machine reads NO
 * payload content.
 */
function reduce(state: HelpdeskTicketState, event: HelpdeskEventInput): HelpdeskTicketState {
  switch (event.type) {
    // Creation: only legal as the FIRST event of a stream. The machine starts at `open` (=
    // initial), so this is a no-op from initial. From any other state it returns state unchanged
    // (IDENTITY — a corrupt replay must not regress a ticket back to open). Mirrors pool.spawned.
    case 'helpdesk.ticket_created':
      return state;

    // An assignee picks the ticket up. From `open` (fresh) or `reopened` (a member reopened it).
    case 'helpdesk.picked_up':
      if (state === 'open' || state === 'reopened') return 'in_progress';
      return state;

    // The assignee needs member input → the resolution SLA pauses. From `open` or `in_progress`.
    case 'helpdesk.awaiting_member':
      if (state === 'open' || state === 'in_progress') return 'awaiting_member';
      return state;

    // The member replied → back to active work. Only from `awaiting_member`.
    case 'helpdesk.member_replied':
      if (state === 'awaiting_member') return 'in_progress';
      return state;

    // The assignee resolved it. From `in_progress` or `awaiting_member`.
    case 'helpdesk.resolved':
      if (state === 'in_progress' || state === 'awaiting_member') return 'resolved';
      return state;

    // Auto-close (7 days no member reply). Only from `resolved`.
    case 'helpdesk.closed':
      if (state === 'resolved') return 'closed';
      return state;

    // The member reopened (within 30 days post-close). From `resolved` or `closed`. A subsequent
    // `helpdesk.picked_up` moves reopened → in_progress.
    case 'helpdesk.reopened':
      if (state === 'resolved' || state === 'closed') return 'reopened';
      return state;

    // Any unknown/forward-compat event type → identity.
    default:
      return state;
  }
}

/**
 * The ticket lifecycle state machine. `initial` is `open`: a ticket only exists once
 * `helpdesk.ticket_created` is appended, and that genesis projects to `open`, so a real stream's
 * fold begins effectively at `open` (the pool `spawned`-is-initial precedent — the 6-state enum
 * has no pre-genesis label, unlike alert's `draft`).
 */
export const helpdeskTicketStateMachine: StateMachine<HelpdeskTicketState, HelpdeskEventInput> =
  defineStateMachine<HelpdeskTicketState, HelpdeskEventInput>({
    initial: 'open',
    reduce,
    // Documentation-only transition matrix. Creation (helpdesk.ticket_created → open) is omitted:
    // its `from` is the conceptual `(none)`. The runtime authority is `reduce`.
    transitions: [
      { from: 'open', event: 'helpdesk.picked_up', to: 'in_progress' },
      { from: 'reopened', event: 'helpdesk.picked_up', to: 'in_progress' },
      { from: 'open', event: 'helpdesk.awaiting_member', to: 'awaiting_member' },
      { from: 'in_progress', event: 'helpdesk.awaiting_member', to: 'awaiting_member' },
      { from: 'awaiting_member', event: 'helpdesk.member_replied', to: 'in_progress' },
      { from: 'in_progress', event: 'helpdesk.resolved', to: 'resolved' },
      { from: 'awaiting_member', event: 'helpdesk.resolved', to: 'resolved' },
      { from: 'resolved', event: 'helpdesk.closed', to: 'closed' },
      { from: 'resolved', event: 'helpdesk.reopened', to: 'reopened' },
      { from: 'closed', event: 'helpdesk.reopened', to: 'reopened' },
    ],
  });

/** Map a live-DB `EventRow` to the reducer's `HelpdeskEventInput` (the mandatory `eventType` →
 * `type` bridge). */
function toHelpdeskEvent(row: EventRow): HelpdeskEventInput {
  return { type: row.eventType, payload: row.payload };
}

/**
 * Replay an ordered event stream to the ticket's current lifecycle state. Callers load the rows
 * (PK-ordered by `event_version`) and fold them through the machine. Deterministic + idempotent
 * (AC4): replaying 1..N twice yields the same state.
 */
export function replayTicketState(rows: readonly EventRow[]): HelpdeskTicketState {
  return helpdeskTicketStateMachine.fold(rows.map(toHelpdeskEvent));
}
