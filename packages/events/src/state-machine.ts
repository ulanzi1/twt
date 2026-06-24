// State Machine framework — RE-EXPORT shim (Story 3.1).
//
// The framework was relocated to @twt/domain at Story 3.1 so the concrete member
// lifecycle reducer (packages/domain/src/member/state.ts) can consume it without a
// `@twt/domain → @twt/events` package cycle (`@twt/events` depends on @twt/domain).
// This file preserves the Story 1.3 public API: `@twt/events` still exports
// `StateMachine` / `defineStateMachine` / `StateMachineConfig` from its barrel, and
// the events state-machine.test.ts still imports from here. The single definition
// now lives at packages/domain/src/state-machine.ts.

export { StateMachine, defineStateMachine } from '@twt/domain';
export type { StateMachineConfig } from '@twt/domain';
