// Barrel for the medical-disclosure accessors — Story 3.5 (Task 2).
// Re-exported from @twt/domain as the `medical` namespace (see ../index.ts) so consumers call
// `medical.appendMedicalDisclosure(...)` / `medical.getMedicalDisclosures(...)` /
// `medical.resolveImaList(...)`. Mirrors the `nominee/` write/read split behind a barrel. No
// `errors.ts` — these accessors return rows (or null), never throw typed domain errors (the
// route maps clause-resolution / lifecycle errors to HTTP).

export * from './disclosure-write.js';
export * from './disclosure-read.js';
export * from './ima-list.js';
export * from './concealment.js';
