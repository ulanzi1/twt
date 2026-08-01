// Barrel for the feature-flags module — Story 10.8.
//
// Re-exported from @twt/domain as the `featureFlags` namespace (see ../index.ts) so consumers call
// `featureFlags.evaluateFlag(...)` / `featureFlags.flagVersionInForce(...)` /
// `featureFlags.createFlagVersion(...)` / `featureFlags.FLAG_KEYS`. Mirrors the `helpdesk/` +
// `reports/` module shape.
//
// ⚠ THE GOVERNANCE-BOUNDARY INVARIANT (AC5 leg b) APPLIES TO THIS NAMESPACE. The
// `governance-boundary` CI gate fails the build if any import of this module — or of `evaluateFlag`
// by any route — appears inside `packages/domain/src/{audit,rbac,consent,contribution}`,
// `packages/validity-service/src`, or `scripts/`. That is what makes "a flag cannot bypass audit,
// consent, validity, RBAC, or a CI gate" structurally impossible rather than merely documented.
// If you need a flag inside one of those modules, you do not need a flag — you need a code change
// and a review. See governance_boundary.yaml.

// Task 2 — the domain types the registry persists and the pure evaluator consumes.
export * from './types.js';
// Task 2 — the versioned registry: code-default v1, three-tier in-force resolution, the flip write.
export * from './registry.js';
// Task 2 — the inventory READ accessors (registry-driven, so no flag can be omitted — AC4).
export * from './store.js';
// Task 3 — the PURE first-match evaluator. No clock, no I/O, no async, never throws.
export * from './evaluate.js';
// Task 3 — the capability-bar loader (governance_boundary.yaml), loud-throwing.
export * from './capability-bar.js';
// Task 3 — the Story 4.8-posture lookup cache; the audit/access layer stays OUTSIDE it (AC5c).
export * from './cache.js';
// The typed domain errors (version-conflict → the 409 seam; the loud capability-bar parse failure).
export * from './errors.js';
// Task 10 — the declared-but-unresolved automatic-rollback health signal (AC7).
export * from './health-signal.js';
