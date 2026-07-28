// `@twt/contracts/helpdesk` barrel — Story 10.1 (Task 1).
//
// Substantive transport contracts for the Helpdesk first-class subsystem (FR-52 / AR-47),
// replacing the reserved README-only placeholder. Pure Zod — NO @twt/domain import in any
// shipped file (the RN Metro bundle boundary; the tests/helpdesk.test.ts sync-guard is the
// only place domain tuples are imported, and tests never ship).

export * from './category.js';
export * from './status.js';
export * from './routing.js';
export * from './ticket.js';
export * from './create-ticket.js';
