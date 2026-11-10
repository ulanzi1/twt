// Barrel for the field-worker primitive — Story 13.1.
//
// Re-exported from @twt/domain as the `fieldWorker` namespace (see ../index.ts) so consumers call
// `fieldWorker.registerFieldWorker(...)` / `fieldWorker.acceptsNewAttributions(...)` / `fieldWorker.getFieldWorkerStateAt(...)`.
// Mirrors the `marketplace/` module shape. The SEVENTH event-derived-state primitive.
//
// ⛔ The projectors (`projectFieldWorkerGenesis` / `projectFieldWorkerTransition`, project.ts) are deliberately NOT
// re-exported: the seven commands are the public write entry points — they take the row lock and check the guards the
// projector assumes (QE13). Specs import the projector from `src/field-worker/project.js`.
// Story 13.1d — ⛔ re-exported either: the move request's projector (move-request-project.ts), its row lock (move-request-lock.ts) and the
// supersede after a direct move or an ending (move-request-supersede.ts, called by `postFieldWorker` / `terminateFieldWorker` only).
// `export * from './commands.js'` below DOES carry two helpers the request commands import from `./commands.js` directly (Task 2.4; code
// review CR19): `lockFieldWorkerRow` (the worker's `SELECT … FOR UPDATE` — a lock, no write) and `verifiedSnapshot` (pure). Neither is a
// write entry point: nothing is written without a projector, and the projectors are not exported.
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
// Story 13.1d — the move request: its vocabulary, its state table, its commands (the only public writers), the notice kinds, and the
// reads (the lists, one request, the worker's work history — `-460` — and the officer's own notices).
export * from './move-request-events.js';
export * from './move-request-state.js';
export * from './move-request-commands.js';
// ⛔ The notices' writer (notices.ts) — only the commands write a notice, in the deciding transaction (AD9).
export { FIELD_WORKER_NOTICE_KINDS, type FieldWorkerNoticeKind } from './notices.js';
export * from './move-request-read.js';
