// Barrel for the field-worker primitive — Story 13.1.
//
// Re-exported from @twt/domain as the `fieldWorker` namespace (see ../index.ts) so consumers call
// `fieldWorker.registerFieldWorker(...)` / `fieldWorker.acceptsNewAttributions(...)` / `fieldWorker.getFieldWorkerStateAt(...)`.
// Mirrors the `marketplace/` module shape. The SEVENTH event-derived-state primitive.
//
// ⛔ The projectors (`projectFieldWorkerGenesis` / `projectFieldWorkerTransition`, project.ts) are deliberately NOT
// re-exported: the seven commands are the public write entry points — they take the row lock and check the guards the
// projector assumes (QE13). Specs import the projector from `src/field-worker/project.js`.
// ⛔ Anything from `attribution-code` (I9): the code is read only through 13.2's door, and by Story 13.1b's one reviewed job.

// The field_worker.* vocabulary + .strict() payload schemas (consumed by packages/events' registry + the projector).
export * from './events.js';
// The pure lifecycle reducer (pending_kyc → active ⇄ suspended → terminated) + foldFieldWorkerProjection + the FR-85
// predicate `acceptsNewAttributions`.
export * from './state.js';
// The seven commands (the only public writers).
export * from './commands.js';
// The read accessors (PII-free `FieldWorkerView`, the duplicate-mobile pre-check, the listed-district check, the as-of read).
export * from './read.js';
// The typed domain errors.
export * from './errors.js';
// The Tier-1 decrypt (moved from the API by Story 13.1b, AD6; the two callers audit first).
export * from './crypto.js';
// The code SMS send record's accessors, and the pure status (Story 13.1b).
export * from './code-sms.js';
