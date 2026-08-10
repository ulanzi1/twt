// packages/contracts/src/rbac/scope.ts
//
// Transport contract for the RBAC scope-dimension enum (Story 1.8, AC-6). Mirrors
// the domain canonical set (packages/domain/src/rbac/scope.ts `SCOPE_DIMENSIONS`)
// and the `scope_dimension` pgEnum — the reconciled UNION the seeded roles
// require: `global | pariwar | state | district | block | self` (ordered ceiling,
// high→low). The literal is REDECLARED here (the LocaleDefault precedent in
// pariwar-passport/passport.ts) rather than imported, so the OpenAPI emit stays
// free of domain runtime coupling; tests/rbac.test.ts asserts byte-parity with the
// domain `SCOPE_DIMENSIONS` tuple so the two can never drift.

import { z } from 'zod';

/** The canonical scope dimension (high→low ceiling). Mirrors domain SCOPE_DIMENSIONS. */
export const ScopeDimensionSchema = z.enum([
  'global',
  'pariwar',
  'state',
  'district',
  'block',
  'self',
]);
export type ScopeDimensionSchema = z.output<typeof ScopeDimensionSchema>;
