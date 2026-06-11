// The 12 seeded role bundles (FR-46) — Story 1.8 substrate (AC-3).
//
// ⚠ PROVISIONAL PENDING OQ-3. The Trustee Panel confirms/revises the 12-role set
// + their permission bundles pre-launch (OQ-3 "Blocks: RBAC seed in production").
// These bundles are the recommended v1 starting point — NOT immutable constants.
// FR-44 requires Super-Admin editability; the `rbac-seed-reset` runbook requires a
// deterministic, re-runnable seed. So the bundles are exposed as DATA
// (`defaultRoleBundles` + `seedRoles()`), never frozen behind a hard-coded gate
// the admin path (Story 1.9+) can never edit.
//
// The matrix is intentionally SPARSE — most permissions don't exist yet (the
// catalog grows per-epic). Empty/sparse rows are CORRECT at 1.8; do NOT pad them
// with invented keys to look complete. Each row = `{ role, permissions, scopeCeiling }`
// where every permission key MUST exist in PERMISSION_CATALOG (a unit test asserts
// referential integrity — tests/rbac/roles.test.ts).

import {
  PERMISSION_CATALOG,
  permissionKey,
  type PermissionKey,
} from './permissions.js';
import type { ScopeDimension } from './scope.js';

/**
 * The 12 seeded role names (FR-46). Stored as `snake_case` strings — these are the
 * `role` value in `role_grants` (a plain `text` column, NOT a pgEnum, precisely so
 * OQ-3 can revise the set without an enum migration; see ADR-0008). The union is a
 * compile-time aid; the DB column trusts the seed/admin layer.
 */
export type SeededRole =
  | 'super_admin'
  | 'pariwar_admin'
  | 'state_trustee'
  | 'district_admin'
  | 'block_admin'
  | 'finance_officer'
  | 'it_cell'
  | 'media_comms'
  | 'field_worker'
  | 'verifier'
  | 'auditor'
  | 'helpline_operator';

/** A declarative role bundle: its permission-key set + its scope ceiling. */
export interface RoleBundle {
  readonly role: SeededRole;
  readonly permissions: readonly PermissionKey[];
  /** The broadest scope the role may be granted at (the role's ceiling). */
  readonly scopeCeiling: ScopeDimension;
}

// Local key handles, validated through the smart constructor so a typo here is a
// load-time throw, not a silent dead key. (Referential integrity to the catalog
// is additionally asserted by tests/rbac/roles.test.ts.)
const CLAIM_APPROVE = permissionKey('claim.approve');
const MEMBER_SUSPEND = permissionKey('member.suspend');
const MEMBER_MODERATE = permissionKey('member.moderate');
const PARIWAR_AMEND_RULE = permissionKey('pariwar.amend_rule');
const PARIWAR_PROVISION = permissionKey('pariwar.provision');
const NIYAMAVALI_AMEND = permissionKey('niyamavali.amend');
const NIYAMAVALI_REVIEW = permissionKey('niyamavali.review');
const AUDIT_EXPORT = permissionKey('audit.export');
const AUDIT_VERIFY = permissionKey('audit.verify');

/**
 * The recommended v1 role→permission matrix (provisional pending OQ-3). Roles from
 * FR-46; keys from the v1 catalog; scope = the role's ceiling. Super Admin is the
 * only `global` (cross-Pariwar) role and carries the full catalog.
 */
export const defaultRoleBundles: readonly RoleBundle[] = [
  {
    role: 'super_admin',
    // The only global role: cross-Pariwar, every catalog key. Deriving from the
    // catalog (not a hand-copied list) keeps Super Admin exhaustive as the catalog
    // grows per-epic.
    permissions: PERMISSION_CATALOG.keys,
    scopeCeiling: 'global',
  },
  {
    role: 'pariwar_admin',
    permissions: [
      PARIWAR_AMEND_RULE,
      MEMBER_SUSPEND,
      MEMBER_MODERATE,
      CLAIM_APPROVE,
      NIYAMAVALI_AMEND,
      NIYAMAVALI_REVIEW,
    ],
    scopeCeiling: 'pariwar',
  },
  {
    role: 'state_trustee',
    permissions: [CLAIM_APPROVE, MEMBER_SUSPEND, NIYAMAVALI_REVIEW],
    scopeCeiling: 'state',
  },
  {
    role: 'district_admin',
    permissions: [CLAIM_APPROVE, MEMBER_SUSPEND],
    scopeCeiling: 'district',
  },
  {
    role: 'block_admin',
    permissions: [MEMBER_SUSPEND],
    scopeCeiling: 'block',
  },
  {
    role: 'finance_officer',
    // Finance keys land Epic 7/9 — seed empty at v1 (refine vs claim.approve per
    // Trustee at OQ-3). An empty bundle is correct, not a gap.
    permissions: [],
    scopeCeiling: 'pariwar',
  },
  {
    role: 'it_cell',
    permissions: [PARIWAR_PROVISION],
    scopeCeiling: 'pariwar',
  },
  {
    role: 'media_comms',
    // News/blog keys land Epic 1.x/10 — seed empty at v1.
    permissions: [],
    scopeCeiling: 'pariwar',
  },
  {
    role: 'field_worker',
    // Dispatch keys land Epic 12; scope `self` = `field_worker_self` (FR-53).
    permissions: [],
    scopeCeiling: 'self',
  },
  {
    role: 'verifier',
    permissions: [MEMBER_MODERATE],
    scopeCeiling: 'district',
  },
  {
    role: 'auditor',
    // The cross-cutting read role (FR-47 / Story 1.11b gates the verify UI on
    // audit.verify).
    permissions: [AUDIT_EXPORT, AUDIT_VERIFY],
    scopeCeiling: 'pariwar',
  },
  {
    role: 'helpline_operator',
    // Helpdesk keys land Epic 10 — seed empty at v1.
    permissions: [],
    scopeCeiling: 'pariwar',
  },
];

/**
 * The deterministic, idempotent seed (AC-3). Returns a fresh deep copy of
 * `defaultRoleBundles` every call — re-applying it is a no-op against any store
 * keyed by `role` (the admin path at Story 1.9+ and the `rbac-seed-reset` runbook
 * both rely on this re-runnability). Returning a copy (not the frozen module
 * constant) is deliberate: the caller may mutate its result before persisting
 * (FR-44 Super-Admin editability) without corrupting the canonical default.
 */
export function seedRoles(): RoleBundle[] {
  return defaultRoleBundles.map((b) => ({
    role: b.role,
    permissions: [...b.permissions],
    scopeCeiling: b.scopeCeiling,
  }));
}

/** Index `defaultRoleBundles` by role name for O(1) lookup in the guard. */
const BUNDLE_BY_ROLE: ReadonlyMap<string, RoleBundle> = new Map(
  defaultRoleBundles.map((b) => [b.role, b]),
);

/**
 * Resolve a role name to its default bundle, or `undefined` for an unknown role.
 * The fail-closed guard treats an unknown role as carrying NO permissions (deny).
 * Accepts a raw string (the `role_grants.role` column is plain text).
 */
export function bundleForRole(role: string): RoleBundle | undefined {
  return BUNDLE_BY_ROLE.get(role);
}
