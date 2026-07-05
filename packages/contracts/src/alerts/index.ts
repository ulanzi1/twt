// Barrel for the alerts/ channel-primitive transport contracts — Story 5.1 (AC1).
// Re-exported from `@twt/contracts` (see ../index.ts). The `Alert` payload is the shape the central
// dispatcher (`@twt/channels`) fans out and the shape the FR-23 nudge seam maps into. Internal queue
// seam, NOT an HTTP endpoint → NO `.openapi()` registration, so openapi/v1.yaml stays byte-identical.

export * from './alert.js';
