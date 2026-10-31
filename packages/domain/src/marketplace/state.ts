// Module lifecycle state machine + pure reducer — Story 12.1 (QE6; AC4).
//
// THE source of truth for a module's state. `marketplace_modules.current_state` (+ `state_event_version`,
// `slots_remaining`, `archive_reason`) is a projection of replaying this reducer over the module's
// `events_log` stream (stream_id = module_id). The reducer is the runtime authority; the `transitions`
// table is documentation only — and a unit test asserts the two agree on EVERY (state × event type) pair.
// Twin of helpdesk/state.ts + alert/state.ts — the SIXTH primitive.
//
// ── PURE + DETERMINISTIC + TOTAL ──────────────────────────────────────────────────────────────────
// `reduce(state, event)` reads no clock, no randomness, no I/O. It never throws on a well-formed event:
// an event that does not apply returns the state unchanged (identity). Whether a transition SHOULD be
// emitted — the window, the archive reason, the places — is the COMMAND's concern (commands.ts), against
// DB `now()`, never the reducer's.
//
// ── ⚠ A SAME-STATE LEGAL EVENT ─────────────────────────────────────────────────────────────────────
// `module.lead_submitted` is `active → active`. So "is this transition legal?" is
// `nextModuleState(from, type) !== null`, ⛔ `to !== from` — copying the helpdesk projector's identity
// check would make every lead illegal (TR1). The member "NON-TRANSITION MARKER" is the precedent for a
// same-state event with a version bump.
//
// ── Pre-genesis initial `draft` (the alert precedent) ──────────────────────────────────────────────
// A stream's fold starts at `draft`; `module.authored` is identity from there (its `from` is the
// conceptual "(none)"). Genesis legality is "the stream is empty", checked by `projectModuleGenesis` —
// `module.authored` is NEVER legal through `projectModuleTransition` (TR2), so it has ⛔ table row.

import { defineStateMachine, type StateMachine } from '../state-machine.js';
import type { eventsLog } from '../schema/events_log.js';
import type { MarketplaceModuleArchiveReason, MarketplaceModuleState } from '../schema/marketplace_modules.js';
import { ModuleAuthoredPayloadSchema, moduleArchiveReasonSchema, type ModuleEventType } from './events.js';

export {
  MARKETPLACE_MODULE_ARCHIVE_REASONS,
  MARKETPLACE_MODULE_STATES,
  type MarketplaceModuleArchiveReason,
  type MarketplaceModuleState,
} from '../schema/marketplace_modules.js';

/** The live-DB event row shape (Drizzle camelCase), derived locally — domain cannot import @twt/events. */
type EventRow = typeof eventsLog.$inferSelect;

/** The reducer's event input (`StateMachineConfig` requires `{ type: string }`). */
export interface ModuleEventInput {
  readonly type: string;
  readonly payload: unknown;
}

/** A replayable event: the reducer input plus its stream version (what `foldModuleProjection` reads). */
export interface ModuleReplayEvent extends ModuleEventInput {
  readonly eventVersion: number;
}

/** The legal arms (QE6). ONE table feeds both the documentation matrix and the runtime lookup. */
const MODULE_TRANSITIONS = [
  { from: 'draft', event: 'module.scheduled', to: 'scheduled' },
  { from: 'draft', event: 'module.activated', to: 'active' },
  { from: 'scheduled', event: 'module.activated', to: 'active' },
  { from: 'active', event: 'module.lead_submitted', to: 'active' },
  { from: 'draft', event: 'module.archived', to: 'archived' },
  { from: 'scheduled', event: 'module.archived', to: 'archived' },
  { from: 'active', event: 'module.archived', to: 'archived' },
] as const satisfies ReadonlyArray<{
  from: MarketplaceModuleState;
  event: Exclude<ModuleEventType, 'module.authored'>;
  to: MarketplaceModuleState;
}>;

/**
 * The target state of `eventType` applied to `state`, or `null` when the pair is not a legal transition
 * (PURE; reads no payload). The transition projector's legality check is `!== null` (TR1).
 */
export function nextModuleState(state: MarketplaceModuleState, eventType: string): MarketplaceModuleState | null {
  const arm = MODULE_TRANSITIONS.find((t) => t.from === state && t.event === eventType);
  return arm ? arm.to : null;
}

function reduce(state: MarketplaceModuleState, event: ModuleEventInput): MarketplaceModuleState {
  return nextModuleState(state, event.type) ?? state;
}

/** The module lifecycle state machine (`initial: 'draft'`, the alert pre-genesis precedent). */
export const moduleStateMachine: StateMachine<MarketplaceModuleState, ModuleEventInput> = defineStateMachine<
  MarketplaceModuleState,
  ModuleEventInput
>({
  initial: 'draft',
  reduce,
  // Documentation-only matrix (`module.authored` omitted — its `from` is "(none)"). Runtime authority: `reduce`.
  transitions: MODULE_TRANSITIONS,
});

/** Map a live-DB event row to a replayable event (the mandatory `eventType` → `type` bridge). */
export function toModuleEvent(row: Pick<EventRow, 'eventType' | 'payload' | 'eventVersion'>): ModuleReplayEvent {
  return { type: row.eventType, payload: row.payload, eventVersion: row.eventVersion };
}

/** Replay an ordered (by `event_version`) stream to the module's lifecycle state. */
export function replayModuleState(rows: readonly EventRow[]): MarketplaceModuleState {
  return moduleStateMachine.fold(rows.map(toModuleEvent));
}

/** What a module's row projects to — the four replay-derived values I4 compares. */
export interface ModuleProjection {
  readonly state: MarketplaceModuleState;
  /** The last event's `event_version` (0 for an empty stream). */
  readonly version: number;
  /** `slot_capacity − (count of applied lead events)`, or null when uncapped or the genesis is unreadable. */
  readonly slotsRemaining: number | null;
  readonly archiveReason: MarketplaceModuleArchiveReason | null;
}

/**
 * Fold an ordered stream to the full projection (I4). PURE and NEVER throws: `slot_capacity` is read from
 * the genesis through `ModuleAuthoredPayloadSchema.safeParse` (a malformed genesis yields
 * `slotsRemaining: null`), and an archive's `reason` is read on its own (an unknown value yields
 * `archiveReason: null`). Only events the reducer actually APPLIES count — an inapplicable lead in a corrupt
 * stream takes no place.
 */
export function foldModuleProjection(rows: readonly ModuleReplayEvent[]): ModuleProjection {
  let state: MarketplaceModuleState = moduleStateMachine.initial;
  let capacity: number | null = null;
  let leads = 0;
  let archiveReason: MarketplaceModuleArchiveReason | null = null;

  for (const row of rows) {
    if (row.type === 'module.authored') {
      const parsed = ModuleAuthoredPayloadSchema.safeParse(row.payload);
      capacity = parsed.success ? parsed.data.slot_capacity : null;
      continue;
    }
    const next = nextModuleState(state, row.type);
    if (next === null) continue;
    if (row.type === 'module.lead_submitted') leads += 1;
    if (row.type === 'module.archived') {
      const raw = typeof row.payload === 'object' && row.payload !== null ? (row.payload as { reason?: unknown }).reason : undefined;
      const parsed = moduleArchiveReasonSchema.safeParse(raw);
      archiveReason = parsed.success ? parsed.data : null;
    }
    state = next;
  }

  const last = rows[rows.length - 1];
  return {
    state,
    version: last ? last.eventVersion : 0,
    slotsRemaining: capacity === null ? null : capacity - leads,
    archiveReason,
  };
}
