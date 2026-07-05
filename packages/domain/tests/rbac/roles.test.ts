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

  it('sparse/empty bundles are allowed (finance_officer, media_comms, field_worker)', () => {
    // helpline_operator gained member.view_validity at Story 4.6 (it reads a caller's validity),
    // so it is no longer empty; the remaining three keep empty bundles at v1.
    for (const role of ['finance_officer', 'media_comms', 'field_worker'] as const) {
      expect(bundleForRole(role)?.permissions).toEqual([]);
    }
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
