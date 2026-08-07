// The per-Pariwar custom-fields `[PRIMITIVE]` — Story 10.12.
//
// Barrelled from the domain root as `customFields`. What lives here, and in what order it matters:
//
//   · frozen-governance.ts — ⭐ THE FENCE. Layer 1 of AC3: a custom field can never name a frozen
//     governance control, and a key or label can never be naked PII. Read this module first; the
//     registry is the easy half, the fence is the hard half.
//   · types.ts             — the FIXED type/tier vocabulary + the member envelope shape.
//   · limits.ts            — the three §1.7 frozen limit classes as named constants, with the
//     Trustee-Panel review path and the honest coverage admission in its header.
//   · validate.ts          — two hand-written imperative validators (story D3: NO runtime Zod).
//   · registry.ts          — the append-only versioned definitions registry. THE SOLE sanctioned
//     writer of `pariwar_custom_field_definitions`, asserted by the custom-field-governance gate.
//   · member-write.ts      — the validated `members.custom_fields` read/write path + the GIN budget
//     observer.
//
// ⚠ NOT event-derived state. There is no event, no projector and no `current_state` — the registry
// ROW is the record (the 10.8 Decision-3 split: a ticket is event-derived, a registry is not).

export * from './errors.js';
export * from './frozen-governance.js';
export * from './limits.js';
export * from './member-write.js';
export * from './registry.js';
export * from './types.js';
export * from './validate.js';
