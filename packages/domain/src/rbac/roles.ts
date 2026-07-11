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
// Story 6.7 — the FR-40 ground-inspection ACTION key + the D6 supervisor-OVERRIDE key.
const CLAIM_CONDUCT_GROUND_INSPECTION = permissionKey('claim.conduct_ground_inspection');
const CLAIM_OVERRIDE_GROUND_INSPECTION = permissionKey('claim.override_ground_inspection');
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
// Story 6.8 code review — the nominee-bank tier-1 (ordinary) + tier-2 (correction) keys,
// replacing an initial CLAIM_FILE reuse (see permissions.ts's version-bump note).
const CLAIM_MANAGE_NOMINEE_BANK = permissionKey('claim.manage_nominee_bank');
const CLAIM_CORRECT_NOMINEE_BANK = permissionKey('claim.correct_nominee_bank');
// Story 6.9 (D5a) — the claim-time DPDPA consent REVOCATION key (the RECORD path reuses claim.file).
const CLAIM_MANAGE_DPDPA_CONSENT = permissionKey('claim.manage_dpdpa_consent');
// Story 6.10 — the verifier-console READ key (district-dimension; distinct from the claim.approve WRITE).
const CLAIM_VERIFY = permissionKey('claim.verify');

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
      // Story 6.7 — the D6 supervisor override for ground inspection (author evidence on an
      // assignment you are not the assigned inspector of). A supervisory `pariwar`-ceiling
      // authority above the district inspector; checked at the assignment's district.
      CLAIM_OVERRIDE_GROUND_INSPECTION,
      // Story 6.8 code review — the D3 tier-2 nominee-bank correction escalation (the
      // claim.override_ground_inspection rationale: a supervisor above the routine helpline
      // operator). Checked inside the handler once the claim is confirmed to be in the
      // post-approval correction window; a pure pariwar_admin still cannot reach the route without
      // ALSO holding a claim.manage_nominee_bank grant (this role does not carry that key).
      CLAIM_CORRECT_NOMINEE_BANK,
      // Story 6.9 (D5a) — the DPDPA consent revocation key (a later consent-management action). A
      // supervisor-escalation grant alongside helpline_operator — the claim.correct_nominee_bank /
      // claim.override_ground_inspection shape (both roles hold it), NOT the helpline_operator-only
      // claim.manage_nominee_bank shape.
      CLAIM_MANAGE_DPDPA_CONSENT,
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
    // Story 6.7 — the FR-40 ground-inspection ACTION key (schedule/findings/complete/photo/
    // refusal), checked at `dimension: 'district'` against the assignment's own district; a
    // `district` scopeCeiling is exactly what makes that gate meaningful (an exact-node match
    // authorizes an assignment in the same district). See the D1-reconciliation note in
    // permissions.ts for why block_admin is DEFERRED (a block grant cannot satisfy a district check).
    permissions: [
      CLAIM_APPROVE,
      MEMBER_SUSPEND,
      MEMBER_VIEW_VALIDITY,
      CLAIM_CONDUCT_GROUND_INSPECTION,
      // Story 6.10 — the verifier-console READ key (Anita). Checked at `dimension: 'district'` against
      // the deceased member's server-derived posting district; the `district` scopeCeiling makes that
      // exact-node gate meaningful. Distinct from the CLAIM_APPROVE write above (6.11 owns the verdict).
      CLAIM_VERIFY,
    ],
    scopeCeiling: 'district',
  },
  {
    role: 'block_admin',
    // Story 6.7 D1 RECONCILIATION — block_admin ground-inspection scheduling is DEFERRED (NOT
    // granted). PRD FR-40 names block- and district-level admins as ground-inspection actors, but
    // ground-inspection assignments authorize at `dimension: 'district'` while block_admin has
    // `scopeCeiling: 'block'`: a block-scoped grant cannot satisfy a district-scoped resource check
    // (a block is NARROWER than a district → the district target is "broader than the grant" → deny),
    // and granting district scope would VIOLATE the block ceiling. No geo-tree resolver exists yet to
    // prove block→parent-district ancestry (denyDeeperGeoResolver, until Epic 3). So NO inert conduct
    // grant is seeded here. ACCEPTANCE CONDITION: block_admin support may be enabled only when the
    // authorization layer can resolve a block grant through verified block→district ancestry while
    // preserving the role's `scopeCeiling: 'block'` — and enabling it must require no district-scoped
    // grant to the block administrator. (See check.test.ts for the explicit block-grant-fails-district
    // assertion that pins this behaviour.)
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
    // Story 6.10 — CLAIM_VERIFY: the verifier-console read key. A `district` ceiling makes the
    // district-dimension gate meaningful (exact-node match on the deceased's posting district).
    // NOT state_trustee (D3a — a state-ceiling grant cannot satisfy a district check until Epic 3).
    permissions: [MEMBER_MODERATE, MEMBER_VIEW_VALIDITY, CLAIM_VERIFY],
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
    //
    // Story 6.8 code review — CLAIM_MANAGE_NOMINEE_BANK (tier-1 ordinary bank collection/edit) +
    // CLAIM_CORRECT_NOMINEE_BANK (tier-2 post-approval correction) REPLACE an initial CLAIM_FILE
    // reuse for these two actions (CLAIM_FILE itself stays — it still gates the intake route).
    // helpline_operator keeps BOTH new keys: this preserves the exact pre-review functional
    // capability (any claim.file-holding operator could always do both actions before), while
    // giving each action its own semantically-scoped key.
    // Story 6.9 (D5a) — the operator records consent at intake (via CLAIM_FILE) and honors a later
    // family revocation request (CLAIM_MANAGE_DPDPA_CONSENT — the revoke path's dedicated key).
    permissions: [
      MEMBER_VIEW_VALIDITY,
      CLAIM_FILE,
      CLAIM_MANAGE_NOMINEE_BANK,
      CLAIM_CORRECT_NOMINEE_BANK,
      CLAIM_MANAGE_DPDPA_CONSENT,
    ],
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
