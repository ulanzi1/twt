// Barrel for the tone-review publish-gate primitive — Story 2.2 substrate.
//
// The HUMAN layer above the Story 1.17 automated `microcopy` floor (docs/tone-guide.md
// + docs/tone-review-checklist.md). Consumed via the top-level `toneReview.*` namespace
// re-export in packages/domain/src/index.ts (`export * as toneReview from
// './tone-review/index.js'`); `ToneReviewRequiredError` is ALSO surfaced at the top
// level (mirroring `AuthorizationDeniedError`) so the apps/api error-mapping middleware
// imports it from `@twt/domain` without reaching into the sub-path.
//
//   errors.ts — ToneReviewRequiredError (+ toErrorResponse 409 projector) + denial type
//   gate.ts   — ToneReviewSignoff value type + pure evaluateToneReviewGate (fail-closed)

export * from './errors.js';
export * from './gate.js';
