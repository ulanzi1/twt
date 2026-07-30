// Barrel for the bulk-operations module — Story 10.6.
//
// Re-exported from @twt/domain as the `bulkOperations` namespace (see ../index.ts) so consumers
// call `bulkOperations.bulkExecute(...)` / `bulkOperations.createBulkOperationRegistry()`. A
// `[PRIMITIVE]`, not a `[SURFACE]` — the registry ships EMPTY; real operations (10.10 member
// moderation, 10.12 custom fields, the notification family) register into it in their own stories.
// The test-only fixture operations that exercise this harness live under
// packages/domain/tests/bulk-operations/, not here.

export * from './types.js';
export * from './registry.js';
export { bulkExecute, BULK_BATCH_CAP } from './execute.js';
export * from './csv.js';
export * from './errors.js';
