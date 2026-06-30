// Barrel for the notifications/nudge transport seams — Story 3.8 (Task 5).
// Re-exported from `@twt/contracts` (see ../index.ts). The renewal-reminder nudge is the FIRST entry —
// the FR-23 producing seam the renewal-lifecycle scheduler publishes (Epic 5 subscribes later). No
// `.openapi()` registration (internal queue seam, not an HTTP endpoint) → openapi/v1.yaml unchanged.

export * from './renewal-reminder.js';
