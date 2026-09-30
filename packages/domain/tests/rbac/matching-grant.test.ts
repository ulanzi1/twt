// `matchingGrantRole` — Story 6.19b (AC16, AC11b `-271`; `2026-09-29-270`). The permission checks return a boolean,
// `void` or `{ ok }` — ⛔ never the matching grant — so the mark's `set_by_role` needs this. A SCOPED grant is
// preferred over a `global` one: a Pariwar Admin who also holds `super_admin` records `pariwar_admin`.

import { describe, expect, it } from 'vitest';

import type { EffectiveGrant, ResourceLocator } from '../../src/rbac/check.js';
import { matchingGrantRole } from '../../src/rbac/matching-grant.js';

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

  it('⛔ no grant that satisfies the check ⇒ null (another Pariwar, the wrong key, no grants)', () => {
    const elsewhere: EffectiveGrant = { ...pariwarAdmin, pariwarId: OTHER, scopeValue: OTHER };
    expect(matchingGrantRole([elsewhere], 'cycle.freeze', PARIWAR_TARGET)).toBeNull();
    expect(matchingGrantRole([pariwarAdmin], 'claim.check_nominee_name', PARIWAR_TARGET)).toBeNull();
    expect(matchingGrantRole([], 'cycle.freeze', PARIWAR_TARGET)).toBeNull();
  });
});
