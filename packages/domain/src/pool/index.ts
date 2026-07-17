// Barrel for the pool-lifecycle module — Story 7.1.
// Re-exported from @twt/domain as the `pool` namespace (see ../index.ts) so consumers
// call `pool.projectPoolState(...)` / `pool.replayPoolState(...)` /
// `pool.POOL_EVENT_PAYLOAD_SCHEMAS`. Mirrors the `claim/` + `member/` module shape.
// The THIRD event-derived-state primitive.

export * from './state.js';
export * from './events.js';
export * from './project.js';
export * from './errors.js';
// Story 7.1 (Task 6) — the versioned canonical snapshot serializer + integrity hash
// (the DOMAIN half of the snapshot storage abstraction). The migration adapter lives in
// ../snapshot-adapters/ (exposed via the @twt/domain `snapshotAdapters` namespace).
export * from './snapshot.js';
// Story 7.2 — the pool naming service: the canonical `P-YYYY-MM-###` allocator (pure
// formatter + transactional range allocator), the bijective base-26 member-facing letter
// code, and the dual-representation resolver (canonical for audit/system/regulator,
// shortform for member surfaces).
export * from './naming.js';
// Story 7.2 (Task 5) — the per-Pariwar curated-name registry CAPABILITY: the
// deterministic ordering/reservation service over `pool_names`. TWT-Bihar's registry is
// empty at launch, so its pools display letter codes (the tested launch invariant).
export * from './names.js';
