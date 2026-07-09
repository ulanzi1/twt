// Barrel for the claim-lifecycle module — Story 6.1.
// Re-exported from @twt/domain as the `claim` namespace (see ../index.ts) so
// consumers call `claim.getClaimStateAt(...)` / `claim.projectClaimState(...)` /
// `claim.CLAIM_EVENT_PAYLOAD_SCHEMAS`. Mirrors the `member/` module shape.

export * from './state.js';
export * from './events.js';
export * from './project.js';
export * from './read.js';
export * from './errors.js';
// Story 6.4 — the Intake Convergence Point (ICP): tryConverge + the merge/override writers +
// the read accessors + CONVERGENCE_WINDOW_DAYS + the shared intakeAdvisoryLockKey.
export * from './icp.js';
