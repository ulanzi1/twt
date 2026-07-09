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
// Story 6.3 — the helpline/operator claim-INTAKE key (distinct from CLAIM_APPROVE).
const CLAIM_FILE = permissionKey('claim.file');
const MEMBER_SUSPEND = permissionKey('member.suspend');
const MEMBER_MODERATE = permissionKey('member.moderate');
const MEMBER_VIEW_VALIDITY = permissionKey('member.view_validity');
const VALIDITY_INVALIDATE_CACHE = permissionKey('validity.invalidate_cache');
const PARIWAR_CONFIGURE_CHANNELS = permissionKey('pariwar.configure_channels');
const PARIWAR_DECLARE_DEGRADED_MODE = permissionKey('pariwar.declare_degraded_mode');
const PARIWAR_AMEND_RULE = permissionKey('pariwar.amend_rule');
const PARIWAR_PROVISION = permissionKey('pariwar.provision');
const NIYAMAVALI_AMEND = permissionKey('niyamavali.amend');
const NIYAMAVALI_REVIEW = permissionKey('niyamavali.review');
const TC_PUBLISH = permissionKey('tc.publish');
const TC_APPROVE = permissionKey('tc.approve');
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
    // Story 4.8 code review — the emergency cache "invalidate all" WRITE (AC3) is a PARIWAR-WIDE action
    // (the route's permission check runs at `pariwar` scope dimension), so only a role whose scopeCeiling
    // is `pariwar` or broader can ever satisfy it (`scopeWithinCeiling` fail-closes any narrower-ceiling
    // role, e.g. `state_trustee` at `state`, regardless of what grant row exists for it) — pariwar_admin
    // is this system's pariwar-wide administrative authority, so it (+ super_admin, which carries the full
    // catalog) is the correct holder, not `state_trustee`.
    permissions: [
      PARIWAR_AMEND_RULE,
      MEMBER_SUSPEND,
      MEMBER_MODERATE,
      // Story 4.6 — reads the FR-12A Member Validity payload (admin surfaces).
      MEMBER_VIEW_VALIDITY,
      VALIDITY_INVALIDATE_CACHE,
      // Story 5.3 — the FR-72 per-Pariwar WhatsApp Business config write (a pariwar-wide config action,
      // same ceiling rationale as validity.invalidate_cache).
      PARIWAR_CONFIGURE_CHANNELS,
      // Story 5.8 — the AR-20 degraded-mode declaration write (a pariwar-wide governance action; the AC's
      // "trustees" resolves to pariwar_admin here — state_trustee's `state` ceiling cannot hold a
      // `pariwar`-scoped grant, same rationale as pariwar.configure_channels / validity.invalidate_cache).
      PARIWAR_DECLARE_DEGRADED_MODE,
      CLAIM_APPROVE,
      NIYAMAVALI_AMEND,
      NIYAMAVALI_REVIEW,
      // Story 2.6 — the Pariwar admin authors + approves T&C versions.
      TC_PUBLISH,
      TC_APPROVE,
    ],
    scopeCeiling: 'pariwar',
  },
  {
    role: 'state_trustee',
    // Story 2.6 — the "Trustee Panel" approves T&C versions (tc.approve). Story 4.6 —
    // reads FR-12A validity + is the ONLY role that sees the pending_concealment_flag
    // (gated by role/scope in the validity service, NOT a second permission key).
    permissions: [CLAIM_APPROVE, MEMBER_SUSPEND, MEMBER_VIEW_VALIDITY, NIYAMAVALI_REVIEW, TC_APPROVE],
    scopeCeiling: 'state',
  },
  {
    role: 'district_admin',
    permissions: [CLAIM_APPROVE, MEMBER_SUSPEND, MEMBER_VIEW_VALIDITY],
    scopeCeiling: 'district',
  },
  {
    role: 'block_admin',
    permissions: [MEMBER_SUSPEND, MEMBER_VIEW_VALIDITY],
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
    // Story 4.6 — the verifier console (Epic 6) reads FR-12A validity to verify standing.
    permissions: [MEMBER_MODERATE, MEMBER_VIEW_VALIDITY],
    scopeCeiling: 'district',
  },
  {
    role: 'auditor',
    // The cross-cutting read role (FR-47 / Story 1.11b gates the verify UI on
    // audit.verify). Story 4.6 — reads FR-12A validity as part of the audit read surface.
    permissions: [AUDIT_EXPORT, AUDIT_VERIFY, MEMBER_VIEW_VALIDITY],
    scopeCeiling: 'pariwar',
  },
  {
    role: 'helpline_operator',
    // Helpdesk keys land Epic 10 — but the helpline reads a caller's member validity to
    // assist them (Story 4.6, FR-12A "consistent across admin and member apps") AND, from
    // Story 6.3, FILES a claim on a bereaved caller's behalf (the freeze-firing helpline
    // intake, gated on the operator's own admin step-up). `claim.file` is the intake key,
    // distinct from `claim.approve` (verifier/trustee approval) which this role does NOT hold.
    permissions: [MEMBER_VIEW_VALIDITY, CLAIM_FILE],
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
