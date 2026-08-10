// RBAC contract tests — Story 1.8 (AC-6).
//
// (1) `.strict()` discipline: every rbac object rejects unknown keys.
// (2) permission-key `<resource>.<action>` regex.
// (3) DRIFT LOCKSTEP: the transport enums/regex are byte-parity with the domain
//     canonical sources (packages/domain/src/rbac/*) — the contract redeclares the
//     literals for OpenAPI-emit decoupling, so a parity test is what prevents drift.
// (4) the committed openapi/v1.yaml carries the 5 rbac component schemas
//     (the emit landed); byte-determinism itself is the
//     `contracts:check-openapi-determinism` gate.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import { rbac } from '@twt/domain';

import { assertStrict } from '../src/_common/strict.js';
import {
  PermissionCatalogSchema,
  PermissionKeySchema,
  RoleBundleSchema,
  RoleGrantSchema,
  ScopeDimensionSchema,
  SeededRoleSchema,
} from '../src/rbac/index.js';

const VALID_GRANT = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: '22222222-2222-2222-2222-222222222222',
  pariwarId: '33333333-3333-3333-3333-333333333333',
  role: 'district_admin',
  scopeDimension: 'district',
  scopeValue: 'Patna',
  createdAt: '2026-06-11T00:00:00.000Z',
  createdBy: null,
};

const VALID_BUNDLE = {
  role: 'auditor',
  permissions: ['audit.export', 'audit.verify'],
  scopeCeiling: 'pariwar',
};

const VALID_CATALOG = {
  catalogVersion: 1,
  keys: ['claim.approve', 'audit.verify'],
};

describe('rbac contracts — .strict() discipline (AC-6)', () => {
  it('every rbac object is .strict() (assertStrict does not throw)', () => {
    expect(() => assertStrict(RoleBundleSchema)).not.toThrow();
    expect(() => assertStrict(RoleGrantSchema)).not.toThrow();
    expect(() => assertStrict(PermissionCatalogSchema)).not.toThrow();
  });

  it('RoleGrantSchema rejects an unknown key', () => {
    expect(RoleGrantSchema.safeParse({ ...VALID_GRANT, __extra: 'x' }).success).toBe(false);
  });

  it('RoleBundleSchema rejects an unknown key', () => {
    expect(RoleBundleSchema.safeParse({ ...VALID_BUNDLE, __extra: 'x' }).success).toBe(false);
  });

  it('PermissionCatalogSchema rejects an unknown key', () => {
    expect(PermissionCatalogSchema.safeParse({ ...VALID_CATALOG, __extra: 'x' }).success).toBe(false);
  });

  it('parses valid payloads', () => {
    expect(RoleGrantSchema.safeParse(VALID_GRANT).success).toBe(true);
    expect(RoleBundleSchema.safeParse(VALID_BUNDLE).success).toBe(true);
    expect(PermissionCatalogSchema.safeParse(VALID_CATALOG).success).toBe(true);
  });
});

describe('PermissionKeySchema — <resource>.<action> regex', () => {
  it('accepts canonical keys', () => {
    expect(PermissionKeySchema.safeParse('claim.approve').success).toBe(true);
    expect(PermissionKeySchema.safeParse('pariwar.amend_rule').success).toBe(true);
  });

  it.each(['claim', 'claim.', '.approve', 'claim.approve.now', 'Claim.Approve', 'claim approve'])(
    'rejects malformed key %j',
    (bad) => {
      expect(PermissionKeySchema.safeParse(bad).success).toBe(false);
    },
  );

  it('a grant with a non-enum scope dimension is rejected', () => {
    expect(RoleGrantSchema.safeParse({ ...VALID_GRANT, scopeDimension: 'national' }).success).toBe(false);
  });

  it('a grant with an unknown role is rejected (provisional seeded-role enum)', () => {
    expect(RoleGrantSchema.safeParse({ ...VALID_GRANT, role: 'emperor' }).success).toBe(false);
  });

  it('a grant broader than the seeded role scope ceiling is rejected', () => {
    expect(
      RoleGrantSchema.safeParse({
        ...VALID_GRANT,
        role: 'district_admin',
        scopeDimension: 'global',
        scopeValue: null,
      }).success,
    ).toBe(false);
  });

  it('a non-global grant with null scopeValue is rejected', () => {
    expect(
      RoleGrantSchema.safeParse({
        ...VALID_GRANT,
        scopeDimension: 'district',
        scopeValue: null,
      }).success,
    ).toBe(false);
  });

  it('a pariwar grant scopeValue must match pariwarId', () => {
    expect(
      RoleGrantSchema.safeParse({
        ...VALID_GRANT,
        role: 'pariwar_admin',
        scopeDimension: 'pariwar',
        scopeValue: VALID_GRANT.pariwarId,
      }).success,
    ).toBe(true);
    expect(
      RoleGrantSchema.safeParse({
        ...VALID_GRANT,
        role: 'pariwar_admin',
        scopeDimension: 'pariwar',
        scopeValue: '44444444-4444-4444-4444-444444444444',
      }).success,
    ).toBe(false);
  });
});

describe('DRIFT LOCKSTEP — transport enums/regex match domain canonical sources', () => {
  it('ScopeDimensionSchema options === domain SCOPE_DIMENSIONS (order-exact)', () => {
    expect(ScopeDimensionSchema.options).toEqual([...rbac.SCOPE_DIMENSIONS]);
  });

  it('SeededRoleSchema options === the domain role names (order-exact)', () => {
    const domainRoles = rbac.defaultRoleBundles.map((b) => b.role);
    expect(SeededRoleSchema.options).toEqual(domainRoles);
  });

  it('Story 10.18 — every domain scopeCeiling agrees with the transport ceiling map (behavioural)', () => {
    // ⚠ WHY THIS IS BEHAVIOURAL RATHER THAN A DIRECT COMPARISON.
    // `SEEDED_ROLE_SCOPE_CEILING` is MODULE-PRIVATE in src/rbac/roles.ts and is deliberately left
    // that way — asserting against it directly would mean exporting it, widening this package's
    // public API for a test. Instead we exercise the one place it is consumed: `RoleGrantSchema`'s
    // superRefine, which looks the ceiling up and rejects a grant that exceeds it.
    //
    // The hazard this closes is NOT a missing map entry — that is a loud `TS2741` typecheck failure,
    // because the map is a total `Record` over the enum union. It is a WRONG entry: a ceiling that
    // typechecks but disagrees with the domain bundle silently makes the role INERT, rejecting every
    // grant it should hold. Before Story 10.18 nothing asserted the two agreed.
    //
    // Construction: for each bundle, build a grant AT that bundle's own declared ceiling. If the
    // transport map agrees, it parses. If the transport map is narrower, superRefine rejects it.
    for (const bundle of rbac.defaultRoleBundles) {
      const dim = bundle.scopeCeiling;
      const pariwarId = '00000000-0000-4000-8000-000000000001';
      const grant = {
        id: '00000000-0000-4000-8000-0000000000aa',
        userId: '00000000-0000-4000-8000-0000000000bb',
        pariwarId,
        role: bundle.role,
        scopeDimension: dim,
        // `global` requires a null scopeValue; `pariwar` must echo pariwarId; others take any non-empty.
        scopeValue: dim === 'global' ? null : dim === 'pariwar' ? pariwarId : 'probe-node',
        createdAt: '2026-08-10T00:00:00.000Z',
        createdBy: null,
      };
      const parsed = RoleGrantSchema.safeParse(grant);
      expect(
        parsed.success,
        `${bundle.role} declares scopeCeiling '${dim}' in defaultRoleBundles, but the transport ` +
          `ceiling map rejects a grant at that dimension — the two have drifted, and every ` +
          `${bundle.role} grant would be rejected at runtime while typecheck stays green.`,
      ).toBe(true);
    }
  });

  it('permission-key regex source === domain PERMISSION_KEY_REGEX source', () => {
    // The contract regex is private; prove parity by behaviour over a probe set.
    const probes = ['claim.approve', 'Claim.Approve', 'claim', 'claim.approve.now', 'pariwar.amend_rule'];
    for (const p of probes) {
      const contractOk = PermissionKeySchema.safeParse(p).success;
      const domainOk = rbac.PERMISSION_KEY_REGEX.test(p);
      expect(contractOk).toBe(domainOk);
    }
  });
});

describe('OpenAPI emit — rbac component schemas are committed', () => {
  it('openapi/v1.yaml registers all 5 rbac components', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const specPath = path.resolve(here, '../../../openapi/v1.yaml');
    const spec = readFileSync(specPath, 'utf8');
    for (const component of [
      'ScopeDimension:',
      'PermissionKey:',
      'PermissionCatalog:',
      'RoleBundle:',
      'RoleGrant:',
    ]) {
      expect(spec).toContain(component);
    }
  });
});
