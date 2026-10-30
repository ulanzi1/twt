// Barrel for the versioned QUESTIONNAIRE engine — Story 6.27a PM23 (`2026-10-10-311`; the questions `2026-10-10-304`).
// Re-exported from @twt/domain as the `questionnaires` namespace.
//
// ⭐ SHARED by two consumers (the neighbours' questionnaire — 6.27a; the inspector's — row 6-32), so it is a module of
// its own ([[feedback_no_premature_package]] — a namespace, ⛔ not a package).
// ⛔ PURE and pg-free: it imports ONLY import-free leaves (`cycle-calendar/holiday-resolver.ts`) — ⛔ never `db.ts`,
// `pg`, `drizzle-orm`, `claim/events.ts` or `claim/nominee-determination-persist.ts` (F38). 6.23a's NW1 transitive scan
// lists this file as an entry, and a reachability test proves it reaches ⛔ no `db.ts`, `pg` or `drizzle-orm`.
// The event-response MAPPING lives in `claim/peer-mesh-reply.ts`, ⛔ never here (a type import from `claim/events.ts`
// alone would trip NW1).

export * from './types.js';
export * from './keys.js';
export * from './validator.js';
export * from './peer-mesh.js';
export * from './ground-inspection.js';
export * from './registry.js';
export * from './answers.js';
export * from './derive.js';
