// packages/contracts/src/rbac/roles.ts
//
// Transport contracts for the role bundle + grant tuple (Story 1.8, AC-6 + AC-3 +
// AC-2). `RoleBundleSchema` is the declarative `{ role, permissions, scopeCeiling }`
// shape; `RoleGrantSchema` is the `(user_id, pariwar_id, role)` + `(dimension,
// value)` grant row the role-admin endpoint (Story 1.9+) reads/writes. Reuses
// `PariwarIdSchema` / `UuidString` / `Iso8601Datetime` from _common/primitives.
//
// The 12-role enum is PROVISIONAL pending OQ-3 (Trustee confirms/revises the set
// pre-launch). It mirrors the domain `SeededRole` union (packages/domain/src/rbac/
// roles.ts); tests/rbac.test.ts asserts byte-parity so the two cannot drift.

import { z } from 'zod';

import { Iso8601Datetime, PariwarIdSchema, UuidString } from '../_common/primitives.js';
import { PermissionKeySchema } from './permissions.js';
import { ScopeDimensionSchema } from './scope.js';

/** The 12 seeded role names (FR-46). Provisional pending OQ-3. Mirrors domain SeededRole. */
export const SeededRoleSchema = z.enum([
  'super_admin',
  'pariwar_admin',
  'state_trustee',
  'district_admin',
  'block_admin',
  'finance_officer',
  'it_cell',
  'media_comms',
  'field_worker',
  'verifier',
  'auditor',
  'helpline_operator',
]);
export type SeededRoleSchema = z.output<typeof SeededRoleSchema>;

/** A declarative role bundle: its permission-key set + its scope ceiling. */
export const RoleBundleSchema = z
  .object({
    role: SeededRoleSchema,
    permissions: z.array(PermissionKeySchema),
    scopeCeiling: ScopeDimensionSchema,
  })
  .strict();
export type RoleBundleSchema = z.output<typeof RoleBundleSchema>;

const SCOPE_RANK: Record<ScopeDimensionSchema, number> = {
  global: 0,
  pariwar: 1,
  state: 2,
  district: 3,
  block: 4,
  self: 5,
};

const SEEDED_ROLE_SCOPE_CEILING: Record<SeededRoleSchema, ScopeDimensionSchema> = {
  super_admin: 'global',
  pariwar_admin: 'pariwar',
  state_trustee: 'state',
  district_admin: 'district',
  block_admin: 'block',
  finance_officer: 'pariwar',
  it_cell: 'pariwar',
  media_comms: 'pariwar',
  field_worker: 'self',
  verifier: 'district',
  auditor: 'pariwar',
  helpline_operator: 'pariwar',
};

function scopeWithinCeiling(
  dimension: ScopeDimensionSchema,
  ceiling: ScopeDimensionSchema,
): boolean {
  return SCOPE_RANK[dimension] >= SCOPE_RANK[ceiling];
}

/**
 * A persisted grant row: the `(user_id, pariwar_id, role)` tuple (architecture
 * §3.13 L2420) + the `(scope_dimension, scope_value)` it is held at. Mirrors the
 * domain `role_grants` row; `scopeValue` is nullable only for `global`, `createdBy`
 * is nullable (null = system/seed). Timestamps are Iso8601 strings (apps/api
 * serialises Date at the boundary, Story 1.9+). The superRefine block enforces
 * fail-closed grant shape: scope cannot exceed the seeded role ceiling, non-global
 * grants need a concrete scope value, and pariwar grants must name their Pariwar.
 */
export const RoleGrantSchema = z
  .object({
    id: UuidString,
    userId: UuidString,
    pariwarId: PariwarIdSchema,
    role: SeededRoleSchema,
    scopeDimension: ScopeDimensionSchema,
    scopeValue: z.string().nullable(),
    createdAt: Iso8601Datetime,
    createdBy: UuidString.nullable(),
  })
  .strict()
  .superRefine((grant, ctx) => {
    const ceiling = SEEDED_ROLE_SCOPE_CEILING[grant.role];
    if (!scopeWithinCeiling(grant.scopeDimension, ceiling)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopeDimension'],
        message: `scopeDimension exceeds ${grant.role} scope ceiling (${ceiling})`,
      });
    }

    if (grant.scopeDimension === 'global') {
      if (grant.scopeValue !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scopeValue'],
          message: 'global grants must use null scopeValue',
        });
      }
      return;
    }

    if (grant.scopeValue === null || grant.scopeValue.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopeValue'],
        message: `${grant.scopeDimension} grants require a non-empty scopeValue`,
      });
      return;
    }

    if (grant.scopeDimension === 'pariwar' && grant.scopeValue !== grant.pariwarId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopeValue'],
        message: 'pariwar grants must use the same scopeValue as pariwarId',
      });
    }
  });
export type RoleGrantSchema = z.output<typeof RoleGrantSchema>;
