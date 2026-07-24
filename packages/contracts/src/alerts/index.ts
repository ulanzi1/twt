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
// Story 8.9 — the reconciliation-tail-window SEAM (UX-DR77): the POST-CLOSE matching window shape
// Epic 9's matcher-tail scheduler and Epic 11b Story 11b.3's Sahyog Vivran auto-publish gate consume.
// NO live caller yet (the declared-seam convention). Strictly distinct from the D5 CONTRIBUTION window
// above — the Day-15 close stays hard (FR-22). Same posture as alert.ts: NO `.openapi()` registration.
export * from './reconciliation-tail.js';
