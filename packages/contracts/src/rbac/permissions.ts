// packages/contracts/src/rbac/permissions.ts
//
// Transport contracts for permission keys + the versioned catalog (Story 1.8,
// AC-6 + AC-1). The `<resource>.<action>` regex is brand-aligned with the domain
// `PermissionKey` (packages/domain/src/rbac/permissions.ts) — name-aligned Zod
// brand, not symbol-identical (the PariwarIdSchema precedent). The regex is kept
// in lockstep with the domain `PERMISSION_KEY_REGEX`; tests/rbac.test.ts asserts
// parity.

import { z } from 'zod';

/**
 * Canonical `<resource>.<action>` matcher: lowercase letters/DIGITS/underscores, a
 * single dot. Mirrors domain `PERMISSION_KEY_REGEX` (packages/domain/src/rbac/permissions.ts).
 * ⚠ Story 6.14 widened this to allow digits (`[a-z0-9_]`) for the R9 key `claim.r9_vote`
 * — kept in lockstep with the domain regex (tests/rbac.test.ts asserts parity).
 */
const PERMISSION_KEY_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+$/;

/** A permission key — `<resource>.<action>`, branded `PermissionKey` (name-aligned). */
export const PermissionKeySchema = z
  .string()
  .regex(PERMISSION_KEY_PATTERN, 'must be a <resource>.<action> permission key')
  .brand<'PermissionKey'>();
export type PermissionKeySchema = z.output<typeof PermissionKeySchema>;

/**
 * The versioned, append-only permission-key catalog (AC-1). `catalogVersion` is a
 * positive integer; `keys` is the enumerated set. The catalog grows per-epic — the
 * transport shape is stable while the contents extend.
 */
export const PermissionCatalogSchema = z
  .object({
    catalogVersion: z.number().int().positive(),
    keys: z.array(PermissionKeySchema),
  })
  .strict();
export type PermissionCatalogSchema = z.output<typeof PermissionCatalogSchema>;
