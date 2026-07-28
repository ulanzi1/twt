// Barrel for the helpdesk module — Story 10.1.
//
// Re-exported from @twt/domain as the `helpdesk` namespace (see ../index.ts) so consumers call
// `helpdesk.resolveRoute(...)` / `helpdesk.replayTicketState(...)` / `helpdesk.projectTicketGenesis(...)`
// / `helpdesk.routingPolicyVersionInForce(...)` / `helpdesk.DEFAULT_ROUTING_POLICY`. Mirrors the
// `alert/` + `pool/` + `claim/` module shape. The FIFTH event-derived-state primitive.

// Task 3 — the pure ticket-lifecycle reducer (open → in_progress → awaiting_member → resolved →
// closed → reopened) + replayTicketState. All arms authored; this story emits only the genesis.
export * from './state.js';
// Task 3 — the helpdesk.* event vocabulary + .strict() Zod payload schemas (consumed by the registry
// in packages/events + the projector). Only helpdesk.ticket_created is registered this story.
export * from './events.js';
// Task 4 — the deterministic routing resolver (resolveRoute) + the calendar-aware SLA due computation.
export * from './routing.js';
// Task 5 — the versioned routing-policy registry (default v1 code seed + create/amend + in-force resolve).
export * from './registry.js';
// Task 3 — the persisted-state projector (the ONLY legitimate writer of helpdesk_tickets.current_state;
// projectTicketGenesis, the create-ticket driver).
export * from './project.js';
// Task 5 — the ticket READ accessors the create-ticket route + the 10.2/10.4 surfaces consume.
export * from './read.js';
// The typed domain errors (routing-unresolved / scope-unresolved / version-conflict — the 409 seam).
export * from './errors.js';
