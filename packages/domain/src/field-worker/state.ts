// Field-worker lifecycle state machine + pure reducer — Story 13.1 (QE5; AC4).
//
// THE source of truth for a field worker's state. `field_workers.current_state` (+ `state_event_version`, `kyc_status`,
// `state_reason_code`, `district`, `ended_on`) is a projection of replaying this reducer over the worker's `events_log`
// stream (stream_id = field_worker_id). The reducer is the runtime authority; the `transitions` table is documentation
// only — and a unit test asserts the two agree on EVERY (state × event type) pair. Twin of marketplace/state.ts — the
// SEVENTH primitive.
//
// ── PURE + DETERMINISTIC + TOTAL ──────────────────────────────────────────────────────────────────
// `reduce(state, event)` reads no clock, no randomness, no I/O. It never throws on a well-formed event: an event that does
// not apply returns the state unchanged (identity). Whether a transition SHOULD be emitted — the KYC guard, the reason,
// the district, the IST bounds of `ended_on` — is the COMMAND's concern (commands.ts), never the reducer's.
//
// ── ⚠ TWO SAME-STATE LEGAL EVENTS (TR1) ───────────────────────────────────────────────────────────
// `field_worker.kyc_completed` is `pending_kyc → pending_kyc`, and `field_worker.posted` keeps whatever state it finds
// (`pending_kyc` / `active` / `suspended`). So "is this transition legal?" is `nextFieldWorkerState(from, type) !== null`,
// ⛔ `to !== from` — the member "NON-TRANSITION MARKER" (`member.posting_updated`) is the precedent.
//
// ── Pre-genesis initial `pending_kyc` (the alert / module precedent) ────────────────────────────────
// A stream's fold starts at `pending_kyc`; `field_worker.registered` is identity from there (its `from` is the conceptual
// "(none)"). Genesis legality is "the stream is empty", checked by `projectFieldWorkerGenesis` — `registered` is NEVER
// legal through `projectFieldWorkerTransition`, so it has ⛔ table row.
//
// ── TERMINAL `terminated` (QE5, I6) ───────────────────────────────────────────────────────────────
// No event leaves it — `posted` included. A worker taken back is a NEW registration (a new id, a new code).

import { z } from 'zod';

import { defineStateMachine, type StateMachine } from '../state-machine.js';
import type { eventsLog } from '../schema/events_log.js';
import type { FieldWorkerKycStatus, FieldWorkerReasonCode, FieldWorkerState } from '../schema/field_workers.js';
import {
  fieldWorkerDistrictSchema,
  fieldWorkerEndedOnSchema,
  fieldWorkerSuspendReasonSchema,
  fieldWorkerTerminateReasonSchema,
  type FieldWorkerEventType,
} from './events.js';

/**
 * What the FOLD reads from each payload — ONLY the fields it projects (review R4-10). ⛔ The full write schemas: since R3-16 they pin the
 * `trigger` audit note to today's exact text, so a stored event written under another trigger text (a later rename) would fail them and
 * fold its district / reason / last day to null — silently, while the row keeps the real value (an I4 divergence with no signal). The
 * WRITE path (the projector) still parses the full strict schema (I8). Unknown keys are ignored here, never refused.
 */
const FoldRegisteredSchema = z.object({ district: fieldWorkerDistrictSchema });
const FoldTerminatedSchema = z.object({ reason_code: fieldWorkerTerminateReasonSchema, ended_on: fieldWorkerEndedOnSchema });
const FoldPostedSchema = z.object({ to_district: fieldWorkerDistrictSchema });

export {
  FIELD_WORKER_KYC_STATUSES,
  FIELD_WORKER_REASON_CODES,
  FIELD_WORKER_STATES,
  type FieldWorkerKycStatus,
  type FieldWorkerReasonCode,
  type FieldWorkerState,
} from '../schema/field_workers.js';

/** The live-DB event row shape (Drizzle camelCase), derived locally — domain cannot import @twt/events. */
type EventRow = typeof eventsLog.$inferSelect;

/** The reducer's event input (`StateMachineConfig` requires `{ type: string }`). */
export interface FieldWorkerEventInput {
  readonly type: string;
  readonly payload: unknown;
}

/** A replayable event: the reducer input plus its stream version (what `foldFieldWorkerProjection` reads). */
export interface FieldWorkerReplayEvent extends FieldWorkerEventInput {
  readonly eventVersion: number;
}

/** The legal arms (QE5). ONE table feeds both the documentation matrix and the runtime lookup. */
const FIELD_WORKER_TRANSITIONS = [
  { from: 'pending_kyc', event: 'field_worker.kyc_completed', to: 'pending_kyc' },
  { from: 'pending_kyc', event: 'field_worker.activated', to: 'active' },
  { from: 'active', event: 'field_worker.suspended', to: 'suspended' },
  { from: 'suspended', event: 'field_worker.reactivated', to: 'active' },
  { from: 'pending_kyc', event: 'field_worker.posted', to: 'pending_kyc' },
  { from: 'active', event: 'field_worker.posted', to: 'active' },
  { from: 'suspended', event: 'field_worker.posted', to: 'suspended' },
  { from: 'pending_kyc', event: 'field_worker.terminated', to: 'terminated' },
  { from: 'active', event: 'field_worker.terminated', to: 'terminated' },
  { from: 'suspended', event: 'field_worker.terminated', to: 'terminated' },
] as const satisfies ReadonlyArray<{
  from: FieldWorkerState;
  event: Exclude<FieldWorkerEventType, 'field_worker.registered'>;
  to: FieldWorkerState;
}>;

/** The documentation matrix, exported for the table / reducer agreement test (AC4). */
export const FIELD_WORKER_TRANSITION_TABLE: ReadonlyArray<{
  readonly from: FieldWorkerState;
  readonly event: FieldWorkerEventType;
  readonly to: FieldWorkerState;
}> = FIELD_WORKER_TRANSITIONS;

/**
 * The target state of `eventType` applied to `state`, or `null` when the pair is not a legal transition (PURE; reads no
 * payload). The transition projector's legality check is `!== null` (TR1).
 */
export function nextFieldWorkerState(state: FieldWorkerState, eventType: string): FieldWorkerState | null {
  const arm = FIELD_WORKER_TRANSITIONS.find((t) => t.from === state && t.event === eventType);
  return arm ? arm.to : null;
}

function reduce(state: FieldWorkerState, event: FieldWorkerEventInput): FieldWorkerState {
  return nextFieldWorkerState(state, event.type) ?? state;
}

/** The field-worker lifecycle state machine (`initial: 'pending_kyc'`, the pre-genesis precedent). */
export const fieldWorkerStateMachine: StateMachine<FieldWorkerState, FieldWorkerEventInput> = defineStateMachine<
  FieldWorkerState,
  FieldWorkerEventInput
>({
  initial: 'pending_kyc',
  reduce,
  // Documentation-only matrix (`field_worker.registered` omitted — its `from` is "(none)"). Runtime authority: `reduce`.
  transitions: FIELD_WORKER_TRANSITIONS,
});

/** Map a live-DB event row to a replayable event (the mandatory `eventType` → `type` bridge). */
export function toFieldWorkerEvent(row: Pick<EventRow, 'eventType' | 'payload' | 'eventVersion'>): FieldWorkerReplayEvent {
  return { type: row.eventType, payload: row.payload, eventVersion: row.eventVersion };
}

/** What a worker's row projects to — the six replay-derived values I4 compares. */
export interface FieldWorkerProjection {
  readonly state: FieldWorkerState;
  /** The last event's `event_version` (0 for an empty stream). */
  readonly version: number;
  readonly kycStatus: FieldWorkerKycStatus;
  /** Non-null iff suspended or terminated; a `posted` event never changes it. */
  readonly reasonCode: FieldWorkerReasonCode | null;
  /** The genesis district, then the last APPLIED `posted` event's `to_district`; null if the genesis is unreadable. */
  readonly district: string | null;
  /** The terminated event's `ended_on` (`YYYY-MM-DD`), else null. */
  readonly endedOn: string | null;
}

/**
 * Fold an ordered (by `event_version`) stream to the full projection (I4). PURE and NEVER throws: every payload field is
 * read through `safeParse` (a malformed field yields `null`, never an exception). Only events the reducer actually APPLIES
 * count — an inapplicable event in a corrupt stream changes nothing.
 */
export function foldFieldWorkerProjection(rows: readonly FieldWorkerReplayEvent[]): FieldWorkerProjection {
  let state: FieldWorkerState = fieldWorkerStateMachine.initial;
  let kycStatus: FieldWorkerKycStatus = 'pending';
  let reasonCode: FieldWorkerReasonCode | null = null;
  let district: string | null = null;
  let endedOn: string | null = null;

  for (const row of rows) {
    if (row.type === 'field_worker.registered') {
      const parsed = FoldRegisteredSchema.safeParse(row.payload);
      district = parsed.success ? parsed.data.district : null;
      continue;
    }
    const next = nextFieldWorkerState(state, row.type);
    if (next === null) continue;
    switch (row.type) {
      case 'field_worker.kyc_completed':
        kycStatus = 'completed';
        break;
      case 'field_worker.suspended': {
        const raw = typeof row.payload === 'object' && row.payload !== null ? (row.payload as { reason_code?: unknown }).reason_code : undefined;
        const parsed = fieldWorkerSuspendReasonSchema.safeParse(raw);
        reasonCode = parsed.success ? parsed.data : null;
        break;
      }
      case 'field_worker.reactivated':
        reasonCode = null;
        break;
      case 'field_worker.terminated': {
        const parsed = FoldTerminatedSchema.safeParse(row.payload);
        reasonCode = parsed.success ? parsed.data.reason_code : null;
        endedOn = parsed.success ? parsed.data.ended_on : null;
        break;
      }
      case 'field_worker.posted': {
        // The reason of a posting lives in the EVENT only — a suspended worker who is moved keeps their suspension reason.
        const parsed = FoldPostedSchema.safeParse(row.payload);
        if (parsed.success) district = parsed.data.to_district;
        break;
      }
      default:
        break;
    }
    state = next;
  }

  const last = rows[rows.length - 1];
  return { state, version: last ? last.eventVersion : 0, kycStatus, reasonCode, district, endedOn };
}

/** Replay an ordered (by `event_version`) stream to the worker's lifecycle state. */
export function replayFieldWorkerState(rows: readonly EventRow[]): FieldWorkerState {
  return fieldWorkerStateMachine.fold(rows.map(toFieldWorkerEvent));
}

/**
 * ⭐ THE FR-85 CONTRACT for callers (QE11) — "is this field worker currently allowed to be credited with new members?"
 * `active` ONLY — settled by BigDev (2026-11-03: *"the implementation rule is active only"*) and CONFIRMED by the Panel
 * (`2026-11-03-441` Question 2 A). One predicate, so Story 13.8 and 13.5's backfill cannot each re-derive "deactivated".
 * Crediting ONLY: it revokes no access and gates no dispatch (C8). Existing attributions are never revisited (FR-85).
 */
export function acceptsNewAttributions(state: FieldWorkerState): boolean {
  return state === 'active';
}
