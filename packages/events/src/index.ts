// @twt/events — event log primitive + state machine framework + canonical-JSON.
// Story 1.3 substrate per AR-8 + AR-14 + AR-57 + UX-DR74.

export {
  appendEvent,
  loadEvents,
  replayState,
  ConcurrencyError,
} from './events-log.js';
export type {
  EventRow,
  AppendResult,
  AppendEventInput,
  LoadEventsOptions,
} from './events-log.js';

export { EVENT_TYPE_REGISTRY } from './registry.js';
export type { EventTypeRegistryEntry } from './registry.js';

export {
  StateMachine,
  defineStateMachine,
} from './state-machine.js';
export type { StateMachineConfig } from './state-machine.js';

export { canonicalJsonStringify } from './canonical-json.js';
export type { CanonicalJsonValue } from './canonical-json.js';
