// Scope-dimension containment unit tests — Story 1.8 (AC-2, Task 7.1b).
//
// The load-bearing invariant: scope is `(dimension, value)` + hierarchical
// CONTAINMENT, not a flat enum compare. Covers the FR-45 Anita/Patna-vs-Vaishali
// case (prd.md L754), the global-covers-all rule, the self-owner rule, and the
// geo-tree resolver seam (state→district containment only resolves with an
// injected resolver; the default denies deeper — fail-closed).

import { describe, expect, it } from 'vitest';

import {
  SCOPE_DIMENSIONS,
  denyDeeperGeoResolver,
  scopeContains,
  type GeoTreeResolver,
} from '../../src/rbac/scope.js';

// A stub org tree: Patna ∈ Bihar, Vaishali ∈ Bihar; Lucknow ∈ UP. Stands in for
// the canonical geo tree that lands with member/geo data in Epic 3.
const BIHAR_TREE: GeoTreeResolver = {
  contains(ancestor, descendant) {
    const inBihar = new Set(['Patna', 'Vaishali']);
    const inUp = new Set(['Lucknow']);
    if (ancestor.dimension === 'state' && ancestor.value === 'Bihar') {
      return inBihar.has(descendant.value);
    }
    if (ancestor.dimension === 'state' && ancestor.value === 'UP') {
      return inUp.has(descendant.value);
    }
    return false;
  },
};

describe('scopeContains — canonical scope set', () => {
  it('exposes the reconciled union the seeded roles require (high→low)', () => {
    expect([...SCOPE_DIMENSIONS]).toEqual([
      'global',
      'pariwar',
      'state',
      'district',
      'block',
      'self',
    ]);
  });
});

describe('scopeContains — global grant', () => {
  it('global ⊇ everything (every dimension)', () => {
    for (const dimension of SCOPE_DIMENSIONS) {
      expect(
        scopeContains({ dimension: 'global', value: null }, { dimension, value: 'anything' }),
      ).toBe(true);
    }
  });
});

describe('scopeContains — exact-node (the Anita/Patna-vs-Vaishali case, prd L754)', () => {
  it('district=Patna ⊇ district=Patna', () => {
    expect(
      scopeContains(
        { dimension: 'district', value: 'Patna' },
        { dimension: 'district', value: 'Patna' },
      ),
    ).toBe(true);
  });

  it('district=Patna ⊉ district=Vaishali (no geo resolver needed — exact mismatch)', () => {
    expect(
      scopeContains(
        { dimension: 'district', value: 'Patna' },
        { dimension: 'district', value: 'Vaishali' },
      ),
    ).toBe(false);
  });
});

describe('scopeContains — hierarchical (state→district via resolver seam)', () => {
  it('state=Bihar ⊇ district=Patna WITH an injected resolver (Patna ∈ Bihar)', () => {
    expect(
      scopeContains(
        { dimension: 'state', value: 'Bihar' },
        { dimension: 'district', value: 'Patna' },
        BIHAR_TREE,
      ),
    ).toBe(true);
  });

  it('state=Bihar ⊉ district=Lucknow (Lucknow ∈ UP, not Bihar)', () => {
    expect(
      scopeContains(
        { dimension: 'state', value: 'Bihar' },
        { dimension: 'district', value: 'Lucknow' },
        BIHAR_TREE,
      ),
    ).toBe(false);
  });

  it('FAIL-CLOSED: state=Bihar ⊉ district=Patna WITHOUT a resolver (default deny-deeper)', () => {
    expect(
      scopeContains(
        { dimension: 'state', value: 'Bihar' },
        { dimension: 'district', value: 'Patna' },
        denyDeeperGeoResolver,
      ),
    ).toBe(false);
  });

  it('a narrower grant never covers a broader target (district ⊉ state)', () => {
    expect(
      scopeContains(
        { dimension: 'district', value: 'Patna' },
        { dimension: 'state', value: 'Bihar' },
        BIHAR_TREE,
      ),
    ).toBe(false);
  });
});

describe('scopeContains — pariwar ceiling', () => {
  it('pariwar grant ⊇ every in-tenant geo + self target', () => {
    expect(
      scopeContains({ dimension: 'pariwar', value: 'P' }, { dimension: 'district', value: 'X' }),
    ).toBe(true);
    expect(
      scopeContains({ dimension: 'pariwar', value: 'P' }, { dimension: 'block', value: 'Y' }),
    ).toBe(true);
    expect(
      scopeContains({ dimension: 'pariwar', value: 'P' }, { dimension: 'self', value: 'owner-1' }),
    ).toBe(true);
  });

  it('pariwar grant ⊉ a global target', () => {
    expect(
      scopeContains({ dimension: 'pariwar', value: 'P' }, { dimension: 'global', value: null }),
    ).toBe(false);
  });
});

describe('scopeContains — self grant (own records only)', () => {
  it('self ⊇ own self target (matching owner value)', () => {
    expect(
      scopeContains({ dimension: 'self', value: 'owner-1' }, { dimension: 'self', value: 'owner-1' }),
    ).toBe(true);
  });

  it('self ⊉ another owner’s self target', () => {
    expect(
      scopeContains({ dimension: 'self', value: 'owner-1' }, { dimension: 'self', value: 'owner-2' }),
    ).toBe(false);
  });

  it('self ⊉ a geo target (a Field Worker cannot act district-wide)', () => {
    expect(
      scopeContains({ dimension: 'self', value: 'owner-1' }, { dimension: 'district', value: 'Patna' }),
    ).toBe(false);
  });

  it('FAIL-CLOSED: self grant with null owner value covers nothing', () => {
    expect(
      scopeContains({ dimension: 'self', value: null }, { dimension: 'self', value: 'owner-1' }),
    ).toBe(false);
  });
});

describe('scopeContains — unresolved locator fails closed', () => {
  it('a geo target with a null value is never contained, even by global', () => {
    expect(
      scopeContains({ dimension: 'district', value: 'Patna' }, { dimension: 'district', value: null }),
    ).toBe(false);
    expect(
      scopeContains({ dimension: 'state', value: 'Bihar' }, { dimension: 'district', value: null }, BIHAR_TREE),
    ).toBe(false);
    expect(
      scopeContains({ dimension: 'global', value: null }, { dimension: 'district', value: null }),
    ).toBe(false);
  });

  it('a global target may use null as its canonical value', () => {
    expect(
      scopeContains({ dimension: 'global', value: null }, { dimension: 'global', value: null }),
    ).toBe(true);
  });
});
