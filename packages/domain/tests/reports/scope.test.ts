// Reports actor-scope resolution — the scope-as-predicate input (Story 10.7, AC3).

import { describe, expect, it } from 'vitest';

import type { EffectiveGrant } from '../../src/rbac/check.js';
import { resolveActorReportScope } from '../../src/reports/index.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const OTHER_PARIWAR = '22222222-2222-2222-2222-222222222222';

const districtAdminGrant = (pariwarId: string, district: string): EffectiveGrant => ({
  pariwarId,
  role: 'district_admin',
  scopeDimension: 'district',
  scopeValue: district,
});
const pariwarAdminGrant = (pariwarId: string): EffectiveGrant => ({
  pariwarId,
  role: 'pariwar_admin',
  scopeDimension: 'pariwar',
  scopeValue: pariwarId,
});

describe('resolveActorReportScope', () => {
  it('resolves a district_admin to their own district (the roster narrows WHERE district = value)', () => {
    const scope = resolveActorReportScope(
      [districtAdminGrant(PARIWAR, 'Patna')],
      'member.export_roster',
      PARIWAR,
    );
    expect(scope).toEqual({ dimension: 'district', value: 'Patna' });
  });

  it('resolves a pariwar_admin to pariwar scope (sees the whole tenant — no district narrowing)', () => {
    const scope = resolveActorReportScope(
      [pariwarAdminGrant(PARIWAR)],
      'member.export_roster',
      PARIWAR,
    );
    expect(scope).toEqual({ dimension: 'pariwar', value: PARIWAR });
  });

  it('returns null when the actor holds the key at NO scope (fail-closed → 403 upstream)', () => {
    // A district_admin does NOT hold audit.export → no scope resolves.
    expect(
      resolveActorReportScope([districtAdminGrant(PARIWAR, 'Patna')], 'audit.export', PARIWAR),
    ).toBeNull();
    // No grants at all.
    expect(resolveActorReportScope([], 'member.export_roster', PARIWAR)).toBeNull();
  });

  it('ignores a grant from ANOTHER Pariwar (cross-scope inheritance forbidden)', () => {
    expect(
      resolveActorReportScope(
        [districtAdminGrant(OTHER_PARIWAR, 'Patna')],
        'member.export_roster',
        PARIWAR,
      ),
    ).toBeNull();
  });

  it('picks the BROADEST authorized scope when an actor holds several grants', () => {
    const scope = resolveActorReportScope(
      [districtAdminGrant(PARIWAR, 'Patna'), pariwarAdminGrant(PARIWAR)],
      'member.export_roster',
      PARIWAR,
    );
    // pariwar is broader than district → the actor sees the whole tenant.
    expect(scope).toEqual({ dimension: 'pariwar', value: PARIWAR });
  });
});
