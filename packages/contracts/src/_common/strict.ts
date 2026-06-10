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
  // Unwrap any ZodEffects layers (.refine()/.transform() chained after .strict())
  // to reach the underlying ZodObject whose _def.unknownKeys carries the 'strict'
  // flag. ZodEffects stores its base schema at _def.schema; iterating handles
  // arbitrary nesting. The Zod internal shape is not documented so we access it
  // via defensive casting.
  let inner: unknown = schema;
  while (
    typeof inner === 'object' &&
    inner !== null &&
    typeof (inner as Record<string, unknown>)._def === 'object' &&
    (inner as { _def: Record<string, unknown> })._def.schema !== undefined
  ) {
    inner = (inner as { _def: { schema: unknown } })._def.schema;
  }
  const unknownKeys = (inner as { _def?: { unknownKeys?: string } })?._def?.unknownKeys;
  if (unknownKeys !== 'strict') {
    throw new Error(
      'assertStrict: schema must end with .strict() per packages/contracts/ convention',
    );
  }
  return schema;
}
