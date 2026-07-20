// Barrel for the alert-lifecycle module — Story 8.1.
// Re-exported from @twt/domain as the `alert` namespace (see ../index.ts) so consumers
// call `alert.projectAlertState(...)` / `alert.replayAlertState(...)` / `alert.deriveAlertId(...)`
// / `alert.mintAndOpenAlert(...)` / `alert.ALERT_EVENT_PAYLOAD_SCHEMAS`. Mirrors the
// `pool/` + `claim/` + `member/` module shape. The FOURTH event-derived-state primitive.

// Story 8.1 (Task 5) — the pure alert-lifecycle reducer (draft → frozen → published → live →
// closed → settled) + replayAlertState. All six arms authored; this story emits only the
// cycle-open transitions (frozen/published/live).
export * from './state.js';
// Story 8.1 (Task 2) — the alert.* event vocabulary + .strict() Zod payload schemas (the
// DOMAIN lifecycle events, NOT the Story 5.1 notification payloads — D6). Consumed by the
// registry (packages/events) + the projector.
export * from './events.js';
// Story 8.1 (Task 4) — deterministic alert_id derivation (deriveAlertId = UUIDv5 over the
// pinned namespace + cycle_id; 1:1 with the cycle → idempotent cycle-open by construction).
export * from './id.js';
// Story 8.1 (Task 6) — the persisted-state projector (the ONLY legitimate writer of
// alerts.current_state) + mintAndOpenAlert (the cycle-open driver: frozen → published → live).
export * from './project.js';
