// Barrel for the pool-snapshot migration adapters — Story 7.1 (Task 6).
// Re-exported from @twt/domain as the `snapshotAdapters` namespace (see ../index.ts).
// The FIRST real adapter (pool v1); a future v2 shape adds its adapter here + registers
// it in POOL_SNAPSHOT_ADAPTERS.

export * from './pool-v1.js';
