// The field-worker MOVE REQUEST state table — Story 13.1d (decision `2026-11-08-458` AD3). PURE: reads no clock, no payload, no I/O.
//
//   (none)              ─ opened ──────────▶ pending
//   pending             ─ accepted / refused ▶ accepted / refused        (the counterpart's District Admin, never the opener)
//   pending, escalated  ─ withdrawn ───────▶ withdrawn                   (the opener)
//   pending             ─ escalated ───────▶ escalated                   (SYSTEM: 7 × 24 h, or no other District Admin at the other end)
//   escalated           ─ closed ──────────▶ closed                      (a Pariwar Admin)
//   pending, escalated  ─ superseded ──────▶ superseded                  (a direct move or an ending, in its own transaction)
//
// Once `escalated`, the counterpart can no longer answer — the request has "gone to the Pariwar Admin" (AD3). The five final states are
// FROZEN (0205's guard trigger refuses any update of one). `opened` has ⛔ table row: its legality is "the stream is empty", checked by
// the opening projector.

import {
  FIELD_WORKER_MOVE_REQUEST_OPEN_STATES,
  type FieldWorkerMoveRequestState,
} from '../schema/field_worker_move_requests.js';
import type { FieldWorkerMoveRequestEventType } from './move-request-events.js';

export {
  FIELD_WORKER_MOVE_ESCALATION_CAUSES,
  FIELD_WORKER_MOVE_OPENED_AT_ENDS,
  FIELD_WORKER_MOVE_REFUSAL_REASONS,
  FIELD_WORKER_MOVE_REQUEST_OPEN_STATES,
  FIELD_WORKER_MOVE_REQUEST_STATES,
  FIELD_WORKER_MOVE_SUPERSEDE_CAUSES,
  type FieldWorkerMoveEscalationCause,
  type FieldWorkerMoveOpenedAtEnd,
  type FieldWorkerMoveRefusalReason,
  type FieldWorkerMoveRequestState,
  type FieldWorkerMoveSupersedeCause,
} from '../schema/field_worker_move_requests.js';

/** A transition event type (`opened` is the genesis). */
export type FieldWorkerMoveRequestTransitionEventType = Exclude<FieldWorkerMoveRequestEventType, 'field_worker_move_request.opened'>;

/** The legal arms (AD3) — ONE table, the runtime lookup and the documentation matrix. */
export const FIELD_WORKER_MOVE_REQUEST_TRANSITIONS = [
  { from: 'pending', event: 'field_worker_move_request.accepted', to: 'accepted' },
  { from: 'pending', event: 'field_worker_move_request.refused', to: 'refused' },
  { from: 'pending', event: 'field_worker_move_request.withdrawn', to: 'withdrawn' },
  { from: 'escalated', event: 'field_worker_move_request.withdrawn', to: 'withdrawn' },
  { from: 'pending', event: 'field_worker_move_request.escalated', to: 'escalated' },
  { from: 'escalated', event: 'field_worker_move_request.closed', to: 'closed' },
  { from: 'pending', event: 'field_worker_move_request.superseded', to: 'superseded' },
  { from: 'escalated', event: 'field_worker_move_request.superseded', to: 'superseded' },
] as const satisfies ReadonlyArray<{
  from: FieldWorkerMoveRequestState;
  event: FieldWorkerMoveRequestTransitionEventType;
  to: FieldWorkerMoveRequestState;
}>;

/** The target state of `eventType` applied to `state`, or `null` when the pair is not legal (PURE). */
export function nextMoveRequestState(state: FieldWorkerMoveRequestState, eventType: string): FieldWorkerMoveRequestState | null {
  const arm = FIELD_WORKER_MOVE_REQUEST_TRANSITIONS.find((t) => t.from === state && t.event === eventType);
  return arm ? arm.to : null;
}

/** `pending` or `escalated` — the states the one-open partial unique covers (I4) and a direct move or an ending supersedes. */
export function isMoveRequestOpen(state: FieldWorkerMoveRequestState): boolean {
  return (FIELD_WORKER_MOVE_REQUEST_OPEN_STATES as readonly string[]).includes(state);
}
