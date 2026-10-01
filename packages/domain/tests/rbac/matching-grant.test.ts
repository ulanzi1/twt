// `matchingGrantRole` — Story 6.19b (AC16, AC11b `-271`; `2026-09-29-270`). The permission checks return a boolean,
// `void` or `{ ok }` — ⛔ never the matching grant — so the mark's `set_by_role` needs this. A SCOPED grant is
// preferred over a `global` one: a Pariwar Admin who also holds `super_admin` records `pariwar_admin`.

import { describe, expect, it } from 'vitest';

import type { EffectiveGrant, ResourceLocator } from '../../src/rbac/check.js';
import { matchingGrantRole } from '../../src/rbac/matching-grant.js';
import { permissionKey } from '../../src/rbac/permissions.js';
import type { RoleBundle } from '../../src/rbac/roles.js';
import type { GeoTreeResolver } from '../../src/rbac/scope.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const PARIWAR_TARGET: ResourceLocator = { dimension: 'pariwar', value: PARIWAR, pariwarId: PARIWAR };

const pariwarAdmin: EffectiveGrant = { pariwarId: PARIWAR, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR };
const superAdmin: EffectiveGrant = { pariwarId: PARIWAR, role: 'super_admin', scopeDimension: 'global', scopeValue: null };

describe('matchingGrantRole', () => {
  it('⭐ a dual Pariwar-Admin + Super-Admin grant records pariwar_admin (the scoped grant wins), in either order', () => {
    expect(matchingGrantRole([superAdmin, pariwarAdmin], 'cycle.freeze', PARIWAR_TARGET)).toBe('pariwar_admin');
    expect(matchingGrantRole([pariwarAdmin, superAdmin], 'cycle.freeze', PARIWAR_TARGET)).toBe('pariwar_admin');
  });

  it('a Super Admin alone records super_admin (`-270`)', () => {
    expect(matchingGrantRole([superAdmin], 'cycle.freeze', PARIWAR_TARGET)).toBe('super_admin');
  });

  it('a district_admin at the claim district records district_admin', () => {
    const da: EffectiveGrant = { pariwarId: PARIWAR, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' };
    expect(
      matchingGrantRole([da], 'claim.check_nominee_name', { dimension: 'district', value: 'Patna', pariwarId: PARIWAR }),
    ).toBe('district_admin');
  });

  it('⭐ COMPETING grants that ALL satisfy the check: district > state > pariwar > global — in EVERY caller order', () => {
    // One key held by all four roles, each at its own ceiling, and a tree where Patna ∈ Bihar — so every grant below
    // satisfies the SAME check on a Patna target, and only the specificity rule can pick between them.
    const KEY = permissionKey('claim.approve');
    const bundles: RoleBundle[] = [
      { role: 'super_admin', permissions: [KEY], scopeCeiling: 'global' },
      { role: 'pariwar_admin', permissions: [KEY], scopeCeiling: 'pariwar' },
      { role: 'state_trustee', permissions: [KEY], scopeCeiling: 'state' },
      { role: 'district_admin', permissions: [KEY], scopeCeiling: 'district' },
    ];
    const resolver: GeoTreeResolver = {
      contains: (a, d) => a.dimension === 'state' && a.value === 'Bihar' && d.value === 'Patna',
    };
    const ctx = { bundles, resolver };
    const patna: ResourceLocator = { dimension: 'district', value: 'Patna', pariwarId: PARIWAR };
    const district: EffectiveGrant = { pariwarId: PARIWAR, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' };
    const state: EffectiveGrant = { pariwarId: PARIWAR, role: 'state_trustee', scopeDimension: 'state', scopeValue: 'Bihar' };
    const all = [superAdmin, pariwarAdmin, state, district];

    const permutations = (xs: readonly EffectiveGrant[]): EffectiveGrant[][] =>
      xs.length <= 1 ? [[...xs]] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
    for (const order of permutations(all)) {
      expect(matchingGrantRole(order, KEY, patna, ctx)).toBe('district_admin');
    }
    // Remove the winner each time — the next most specific wins.
    expect(matchingGrantRole([superAdmin, pariwarAdmin, state], KEY, patna, ctx)).toBe('state_trustee');
    expect(matchingGrantRole([state, pariwarAdmin, superAdmin], KEY, patna, ctx)).toBe('state_trustee');
    expect(matchingGrantRole([superAdmin, pariwarAdmin], KEY, patna, ctx)).toBe('pariwar_admin');
    expect(matchingGrantRole([superAdmin], KEY, patna, ctx)).toBe('super_admin');
    // Sanity: each grant ALONE satisfies the check (so the picks above are the ordering, ⛔ not a failed match).
    for (const g of all) expect(matchingGrantRole([g], KEY, patna, ctx)).toBe(g.role);
  });

  it('⛔ no grant that satisfies the check ⇒ null (another Pariwar, the wrong key, no grants)', () => {
    const elsewhere: EffectiveGrant = { ...pariwarAdmin, pariwarId: OTHER, scopeValue: OTHER };
    expect(matchingGrantRole([elsewhere], 'cycle.freeze', PARIWAR_TARGET)).toBeNull();
    expect(matchingGrantRole([pariwarAdmin], 'claim.check_nominee_name', PARIWAR_TARGET)).toBeNull();
    expect(matchingGrantRole([], 'cycle.freeze', PARIWAR_TARGET)).toBeNull();
  });
});
