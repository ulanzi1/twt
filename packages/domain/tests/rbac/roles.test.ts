// Seeded-role-bundle unit tests — Story 1.8 (AC-3, Task 7.1c + 7.1d).
//
// (c) referential integrity — every role's permission keys ∈ PERMISSION_CATALOG.
// (d) seed idempotency — seedRoles() re-applied is deterministic / a no-op.

import { describe, expect, it } from 'vitest';

import { PERMISSION_CATALOG, isCatalogKey } from '../../src/rbac/permissions.js';
import {
  bundleForRole,
  defaultRoleBundles,
  seedRoles,
  type SeededRole,
} from '../../src/rbac/roles.js';
import { SCOPE_DIMENSIONS } from '../../src/rbac/scope.js';

const TWELVE_ROLES: SeededRole[] = [
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
];

describe('defaultRoleBundles — the 12 seeded roles (FR-46)', () => {
  it('defines exactly the 12 named roles', () => {
    expect(defaultRoleBundles).toHaveLength(12);
    expect(defaultRoleBundles.map((b) => b.role).sort()).toEqual([...TWELVE_ROLES].sort());
  });

  it('every scopeCeiling is a canonical scope dimension', () => {
    for (const bundle of defaultRoleBundles) {
      expect(SCOPE_DIMENSIONS).toContain(bundle.scopeCeiling);
    }
  });

  it('REFERENTIAL INTEGRITY: every permission key in every bundle ∈ PERMISSION_CATALOG', () => {
    for (const bundle of defaultRoleBundles) {
      for (const key of bundle.permissions) {
        expect(isCatalogKey(key)).toBe(true);
      }
    }
  });

  it('Super Admin is the only global role and carries the FULL catalog', () => {
    const globalRoles = defaultRoleBundles.filter((b) => b.scopeCeiling === 'global');
    expect(globalRoles.map((b) => b.role)).toEqual(['super_admin']);
    expect([...globalRoles[0]!.permissions].sort()).toEqual(
      [...PERMISSION_CATALOG.keys].sort(),
    );
  });

  it('Field Worker scope is self (FR-53 field_worker_self) — proves the enum needs self', () => {
    expect(bundleForRole('field_worker')?.scopeCeiling).toBe('self');
  });

  it('Block Admin exists at block scope — proves the enum needs block', () => {
    expect(bundleForRole('block_admin')?.scopeCeiling).toBe('block');
  });

  it('sparse/empty bundles are allowed (media_comms, field_worker)', () => {
    // helpline_operator gained member.view_validity at Story 4.6; finance_officer gained
    // reconciliation.review at Story 9.8 (the FR-50 "designated reconciliation reviewer"); the
    // remaining two keep empty bundles at v1.
    for (const role of ['media_comms', 'field_worker'] as const) {
      expect(bundleForRole(role)?.permissions).toEqual([]);
    }
  });

  it('finance_officer carries the Story 9.8 reconciliation review key at pariwar ceiling (FR-50)', () => {
    const bundle = bundleForRole('finance_officer');
    expect(bundle?.permissions.map((p) => String(p))).toContain('reconciliation.review');
    expect(bundle?.scopeCeiling).toBe('pariwar');
  });

  it('bundleForRole returns undefined for an unknown role (fail-closed at the lookup)', () => {
    expect(bundleForRole('nonexistent_role')).toBeUndefined();
  });

  it('Story 4.6 — member.view_validity is granted to exactly the read-capable FR-46 roles', () => {
    const KEY = 'member.view_validity';
    // The read-capable set (D5): admin surfaces + verifier/auditor/helpline + super_admin (full catalog).
    const readCapable = [
      'super_admin',
      'pariwar_admin',
      'state_trustee',
      'district_admin',
      'block_admin',
      'verifier',
      'auditor',
      'helpline_operator',
    ].sort();
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(readCapable);
    // The non-read roles (finance_officer, it_cell, media_comms, field_worker) do NOT hold it.
    for (const role of ['finance_officer', 'it_cell', 'media_comms', 'field_worker'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 4.8 code review — validity.invalidate_cache is granted ONLY to pariwar_admin (+ super_admin)', () => {
    const KEY = 'validity.invalidate_cache';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // Every OTHER read-capable role (incl. state_trustee, district_admin, block_admin, verifier,
    // auditor, helpline_operator) may still read validity but may NOT force a tenant-wide invalidation.
    // state_trustee in particular COULD NOT hold it even if granted: its `state` scopeCeiling is
    // structurally narrower than the `pariwar`-dimension check this action requires.
    for (const role of [
      'state_trustee',
      'district_admin',
      'block_admin',
      'verifier',
      'auditor',
      'helpline_operator',
    ] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 5.3 — pariwar.configure_channels is granted ONLY to pariwar_admin (+ super_admin)', () => {
    const KEY = 'pariwar.configure_channels';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // A PARIWAR-WIDE config action — state_trustee's narrower `state` ceiling cannot satisfy it even if
    // granted (same rationale as validity.invalidate_cache).
    expect((bundleForRole('state_trustee')?.permissions as readonly string[]).includes(KEY)).toBe(false);
  });

  it('Story 5.8 — pariwar.declare_degraded_mode is granted ONLY to pariwar_admin (+ super_admin)', () => {
    const KEY = 'pariwar.declare_degraded_mode';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // The AC's "trustees" resolves to pariwar_admin — state_trustee's `state` ceiling cannot hold a
    // `pariwar`-scoped grant (same rationale as pariwar.configure_channels / validity.invalidate_cache).
    expect((bundleForRole('state_trustee')?.permissions as readonly string[]).includes(KEY)).toBe(false);
  });

  it('Story 6.13 (D-B) — cycle.freeze is granted ONLY to pariwar_admin (+ super_admin), NOT state_trustee', () => {
    const KEY = 'cycle.freeze';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // The story's "State Trustee" actor DEFERS to Epic 3 — a `state`-ceiling grant cannot satisfy a
    // pariwar-dimension check pre-Epic-3 (the 6.7 block_admin / 6.10 state_trustee deferral precedent). v1
    // gates on pariwar_admin acting as Trustee-Lite; NO inert state_trustee grant is seeded.
    expect((bundleForRole('state_trustee')?.permissions as readonly string[]).includes(KEY)).toBe(false);
  });

  it('Story 6.14 (D-B) — claim.r9_vote is granted ONLY to pariwar_admin (+ super_admin), NOT state_trustee', () => {
    const KEY = 'claim.r9_vote';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // Same Trustee-Lite posture as cycle.freeze — direct state_trustee gating DEFERRED to the Epic-3 geo-tree
    // resolver; NO inert state_trustee grant is seeded.
    expect((bundleForRole('state_trustee')?.permissions as readonly string[]).includes(KEY)).toBe(false);
  });

  it('Story 6.3 — claim.file is granted ONLY to helpline_operator (+ super_admin)', () => {
    const KEY = 'claim.file';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(['helpline_operator', 'super_admin']);
    // The intake/FILE key is distinct from the verifier/trustee APPROVE key: roles that may
    // APPROVE a claim (pariwar_admin, state_trustee, district_admin) do NOT gain intake-filing in v1.
    for (const role of ['pariwar_admin', 'state_trustee', 'district_admin', 'verifier'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 6.7 — claim.conduct_ground_inspection is granted to district_admin (+ super_admin); block_admin DEFERRED', () => {
    const KEY = 'claim.conduct_ground_inspection';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // D1 reconciliation: district_admin only in v1 (+ super_admin, full catalog). block_admin is
    // DEFERRED — a block-scoped grant cannot satisfy the D6 dimension:'district' gate under the
    // current scope model (see check.test.ts for the pinning assertion + roles.ts for the rationale).
    expect(holders).toEqual(['district_admin', 'super_admin']);
    expect((bundleForRole('block_admin')?.permissions as readonly string[]).includes(KEY)).toBe(false);
    // NOT the verifier/trustee/pariwar APPROVE roles, and NOT field_worker (deferred to Epic 12).
    for (const role of ['pariwar_admin', 'state_trustee', 'verifier', 'field_worker'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 6.7 — claim.override_ground_inspection is granted ONLY to pariwar_admin (+ super_admin)', () => {
    const KEY = 'claim.override_ground_inspection';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // The D6 supervisor override — a pariwar-ceiling authority above the district inspector.
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // The district inspector role itself does NOT hold the override (it acts as itself, not over peers).
    for (const role of ['district_admin', 'block_admin', 'state_trustee', 'verifier'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 6.8 code review — claim.manage_nominee_bank is granted ONLY to helpline_operator (+ super_admin)', () => {
    const KEY = 'claim.manage_nominee_bank';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(['helpline_operator', 'super_admin']);
    // Replaces an initial claim.file reuse — pariwar_admin (an APPROVE-capable role) does NOT gain
    // ordinary nominee-bank collection/edit, the same posture as claim.file itself.
    for (const role of ['pariwar_admin', 'state_trustee', 'district_admin', 'verifier'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 6.8 code review — claim.correct_nominee_bank is granted to helpline_operator AND pariwar_admin (+ super_admin)', () => {
    const KEY = 'claim.correct_nominee_bank';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // helpline_operator: preserves the exact pre-review capability (claim.file previously gated
    // both ordinary collection AND correction). pariwar_admin: the supervisor-escalation grant —
    // the claim.override_ground_inspection rationale — though a pure pariwar_admin still cannot
    // reach the route without ALSO holding claim.manage_nominee_bank (it does not carry that key).
    expect(holders).toEqual(['helpline_operator', 'pariwar_admin', 'super_admin']);
    for (const role of ['state_trustee', 'district_admin', 'verifier'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 6.9 — claim.manage_dpdpa_consent is granted to helpline_operator AND pariwar_admin (+ super_admin)', () => {
    const KEY = 'claim.manage_dpdpa_consent';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // The DPDPA consent REVOCATION key (D5a) — the RECORD path reuses claim.file (consent capture is
    // part of filing). helpline_operator honors a family's later takedown request; pariwar_admin is
    // the supervisor-escalation grant (the claim.manage_nominee_bank/override_ground_inspection shape).
    expect(holders).toEqual(['helpline_operator', 'pariwar_admin', 'super_admin']);
    for (const role of ['state_trustee', 'district_admin', 'verifier'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 6.10 — claim.verify is granted to district_admin AND verifier (+ super_admin); NOT state_trustee (D3a)', () => {
    const KEY = 'claim.verify';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // The verifier-console READ key. Anita (district_admin) + verifier hold it — both `district`
    // ceiling, so the dimension:'district' gate is meaningful. + super_admin (full catalog).
    expect(holders).toEqual(['district_admin', 'super_admin', 'verifier']);
    // D3a — state_trustee is NOT granted claim.verify: a `state`-ceiling grant cannot satisfy a
    // district-dimension check under the deny-deeper geo resolver (Epic 3). Their concealment-detail +
    // escalation decisions live in the dedicated 6.13/6.15 State-Trustee surfaces (the block_admin
    // deferral precedent). block_admin / pariwar_admin / field_worker do not hold it either.
    for (const role of ['state_trustee', 'block_admin', 'pariwar_admin', 'field_worker'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
    // Distinct from the pre-existing claim.approve WRITE (the 6.11 adjudication action) — a role may
    // hold the READ key without the WRITE and vice-versa; verifier holds verify but NOT approve.
    expect((bundleForRole('verifier')?.permissions as readonly string[]).includes('claim.approve')).toBe(false);
  });

  it('Story 6.9 code review — no seeded non-catalog role holds claim.file WITHOUT claim.manage_dpdpa_consent', () => {
    // The RECORD-vs-REVOKE permission split (D5a) is only meaningful if SOME actor can hold claim.file
    // alone: otherwise "claim.file is insufficient to revoke" is unfalsifiable against real grants (the
    // live-DB dpdpa-consent-helpline.spec.ts NOTE documents this exact gap — no seeded role currently
    // demonstrates it). This structurally confirms every claim.file holder (besides the full-catalog
    // super_admin) also holds claim.manage_dpdpa_consent today, and stands as the trip-wire: if a future
    // role ever gains claim.file without claim.manage_dpdpa_consent, this test starts failing and should
    // be read as a prompt to add the live-DB negative test the helpline spec's NOTE describes.
    const fileHolders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes('claim.file'))
      .filter((b) => b.role !== 'super_admin')
      .map((b) => b.role);
    for (const role of fileHolders) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes('claim.manage_dpdpa_consent')).toBe(
        true,
      );
    }
  });
});

describe('seedRoles — idempotent + deterministic (AC-3)', () => {
  it('re-applying produces structurally identical bundles every time', () => {
    const a = seedRoles();
    const b = seedRoles();
    expect(a).toEqual(b);
    expect(a).toEqual(defaultRoleBundles);
  });

  it('returns a fresh DEEP COPY — inner permission arrays are new instances, not shared refs', () => {
    // Proves the FR-44 editability path is safe: a caller that replaces a bundle's
    // permissions on the returned copy cannot corrupt the canonical default,
    // because every bundle object AND its permissions array is a fresh instance.
    const seeded = seedRoles();
    const seededAuditor = seeded.find((b) => b.role === 'auditor')!;
    const defaultAuditor = defaultRoleBundles.find((b) => b.role === 'auditor')!;
    expect(seededAuditor.permissions).toEqual(defaultAuditor.permissions); // same contents
    expect(seededAuditor.permissions).not.toBe(defaultAuditor.permissions); // different instance
    expect(seededAuditor).not.toBe(defaultAuditor); // different bundle object
  });
});
