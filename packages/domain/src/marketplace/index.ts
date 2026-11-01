// Barrel for the Module Marketplace primitive — Story 12.1.
//
// Re-exported from @twt/domain as the `marketplace` namespace (see ../index.ts) so consumers call
// `marketplace.authorModule(...)` / `marketplace.parseModuleManifest(...)` / `marketplace.getModule(...)`.
// Mirrors the `helpdesk/` + `alert/` + `pool/` module shape. The SIXTH event-derived-state primitive.
//
// ⛔ The projectors (`projectModuleGenesis` / `projectModuleTransition`, project.ts) are deliberately NOT
// re-exported: the five commands are the public write entry points — they take the row lock and check
// the guards the projector assumes (QE7, I10). Specs import the projector from `src/marketplace/project.js`.

// The module.* vocabulary + .strict() payload schemas (consumed by packages/events' registry + the projector).
export * from './events.js';
// The closed, versioned filter / branding grammars + parseModuleManifest (validated at write, ⛔ evaluated).
export * from './filters.js';
// The pure lifecycle reducer (draft → scheduled → active → archived) + foldModuleProjection.
export * from './state.js';
// The five commands (the only public writers) + the read-only lead pre-check.
export * from './commands.js';
// The read accessors (getModule / listModulesForPariwar / getModuleStateAt; Story 12.2: pageModulesForPariwar + the
// strict cursor, getModuleAuthorActorId, countModuleLeads).
export * from './read.js';
// The typed domain errors.
export * from './errors.js';
// ── Story 12.2 (`2026-11-01-433`) — the first production caller's additions ──
// The per-Pariwar partner registry (QE3 (A)).
export * from './partners.js';
// The publish record + the tone content hash + the audit locators (QE4).
export * from './publication.js';
// The audience options + the author-time C11 check (QE5).
export * from './scope-options.js';
// The activation sweep's SCAN + CLASSIFIER only — ⛔ an audit wrapper in the domain (QE7 (A), I11).
export * from './activation-sweep.js';
