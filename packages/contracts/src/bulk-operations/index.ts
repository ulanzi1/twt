// `@twt/contracts/bulk-operations` barrel — Story 10.6 (Task 5).
//
// Pure Zod — NO @twt/domain import in any shipped file (the RN Metro bundle boundary; the
// tests/bulk-operations.test.ts sync-guard is the only place domain tuples are imported, and
// tests never ship). No `apps/api` route ships this story — these DTOs are the wire shape a
// future consuming surface's route will use.

export * from './enums.js';
export * from './dto.js';
