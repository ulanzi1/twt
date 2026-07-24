// Barrel for the alerts/ channel-primitive transport contracts — Story 5.1 (AC1).
// Re-exported from `@twt/contracts` (see ../index.ts). The `Alert` payload is the shape the central
// dispatcher (`@twt/channels`) fans out and the shape the FR-23 nudge seam maps into. Internal queue
// seam, NOT an HTTP endpoint → NO `.openapi()` registration, so openapi/v1.yaml stays byte-identical.

export * from './alert.js';
// Story 8.8 — the contribution-loop COPY CONTRACT: the D5 cycle-window/cycle-day arithmetic, Story
// 8.2's tone-gradient authority (moved here from apps/mobile, which the server cannot import — D1),
// the four-send-day template-key registry, and the pure `payload_data` builders. Producer-side copy
// resolution only; the Epic 5 renderers stay pure functions of the frozen payload. Same posture as
// alert.ts — internal queue seam, NO `.openapi()` registration.
export * from './contribution-loop-templates.js';
