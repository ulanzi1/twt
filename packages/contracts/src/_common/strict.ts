// packages/contracts/src/_common/strict.ts
//
// The architecturally-canonical enforcement of `.strict()` default lives in
// an ESLint rule (Story 1.16a friction-budget CI gate territory). Story 1.4
// commits a runtime helper that downstream Stories MAY call to assert at
// module load that a schema is strict; the helper is opt-in (it cannot
// structurally prevent a missing `.strict()`).
//
// Architecture §Format patterns line 3824-3826:
//   "All packages/contracts/ schemas default to .strict(). .passthrough()
//    only at explicit provider-controlled boundaries (webhook payloads
//    beyond the spec). CI lint enforces."

import { z } from 'zod';

export function assertStrict<T extends z.ZodObject<z.ZodRawShape>>(schema: T): T {
  // Zod's ZodObject carries an internal `_def.unknownKeys` field; 'strict' is
  // the canonical 'reject unknown keys' setting. The shape is z-internal so
  // we treat the inspection defensively.
  const unknownKeys = (schema as unknown as { _def: { unknownKeys?: string } })._def
    ?.unknownKeys;
  if (unknownKeys !== 'strict') {
    throw new Error(
      'assertStrict: schema must end with .strict() per packages/contracts/ convention',
    );
  }
  return schema;
}
