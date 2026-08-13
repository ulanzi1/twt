// Geo-tree resolver WIRING — Story 1.18 (Task 5; AC2, AC3).
//
// The domain suite proves the resolver is correct. This proves the ADAPTER hands it over correctly,
// which is a different failure mode: a resolver that is right but never reaches the gate is a
// resolver that does nothing, and a resolver that reaches SOME gates and not others is worse —
// that is route-dependent authorization, a silent privilege asymmetry.
//
// Three properties, none of which the domain tests can see:
//   1. `geoTreeResolverForRequest` returns `undefined` for a request with NO tree — so the domain
//      default (`denyDeeperGeoResolver`) applies BY FALLBACK, not by a look-alike object.
//   2. It returns a WORKING resolver when a tree is present.
//   3. ⭐ It performs NO I/O (AC2) — it reads the preloaded document and awaits nothing.

import { geoTree, rbac } from '@twt/domain';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { geoTreeResolverForRequest } from '../../src/modules/rbac/index.js';

const BIHAR = geoTree.buildGeoTree({
  version: 1,
  nodes: [
    { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
    { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Bihar' },
  ],
});

/** A request stub carrying only what the helper reads. */
function requestWith(tree: geoTree.LoadedGeoTree | null | undefined): FastifyRequest {
  return { geoTree: tree } as unknown as FastifyRequest;
}

describe('geoTreeResolverForRequest — the adapter seam (AC3 site 1)', () => {
  it('⭐ returns undefined when the Pariwar has published NO tree', () => {
    // Load-bearing: `undefined` (not a deny-everything object) is what makes `resolveContext` fall
    // back to `denyDeeperGeoResolver` itself — so the no-tree path is byte-identically today's
    // behaviour rather than a new object that merely behaves like it.
    expect(geoTreeResolverForRequest(requestWith(null))).toBeUndefined();
    expect(geoTreeResolverForRequest(requestWith(undefined))).toBeUndefined();
  });

  it('returns a working resolver when a tree IS present', () => {
    const resolver = geoTreeResolverForRequest(requestWith(BIHAR));
    expect(resolver).toBeDefined();
    expect(
      resolver?.contains({ dimension: 'state', value: 'Bihar' }, { dimension: 'district', value: 'Patna' }),
    ).toBe(true);
    expect(
      resolver?.contains({ dimension: 'state', value: 'Bihar' }, { dimension: 'district', value: 'Gaya' }),
    ).toBe(false);
  });

  it('the no-tree path leaves hasPermission at EXACTLY the deny-deeper default', () => {
    const grants: rbac.EffectiveGrant[] = [
      {
        pariwarId: 'p1',
        role: 'state_trustee',
        scopeDimension: 'state',
        scopeValue: 'Bihar',
      },
    ];
    const resource = { dimension: 'district' as const, value: 'Patna', pariwarId: 'p1' };

    // No tree → undefined resolver → deny, identical to passing no ctx at all.
    const withoutTree = geoTreeResolverForRequest(requestWith(null));
    expect(rbac.hasPermission(grants, 'claim.approve', resource, { resolver: withoutTree })).toBe(
      rbac.hasPermission(grants, 'claim.approve', resource),
    );
    expect(rbac.hasPermission(grants, 'claim.approve', resource, { resolver: withoutTree })).toBe(false);

    // A published tree → the same grant now reaches the same target.
    const withTree = geoTreeResolverForRequest(requestWith(BIHAR));
    expect(rbac.hasPermission(grants, 'claim.approve', resource, { resolver: withTree })).toBe(true);
  });
});

describe('geoTreeResolverForRequest — purity at the adapter boundary (AC2)', () => {
  it('⭐ neither the helper nor contains() performs I/O — an injected loader spy never fires', () => {
    // The spy replaces the module's LOADER. If the adapter ever reached for a tree at check time
    // instead of consuming the preloaded one, this fires. It must not: the tree is loaded exactly
    // once per request in `scopeResolutionHook`, and `hasPermission` is a pure synchronous
    // predicate that cannot await anything.
    const loadSpy = vi.spyOn(geoTree, 'loadGeoTree');

    const resolver = geoTreeResolverForRequest(requestWith(BIHAR));
    for (let i = 0; i < 200; i += 1) {
      resolver?.contains(
        { dimension: 'state', value: 'Bihar' },
        { dimension: 'district', value: 'Patna' },
      );
    }

    expect(loadSpy).not.toHaveBeenCalled();
    loadSpy.mockRestore();
  });

  it('contains() returns synchronously — never a promise', () => {
    const resolver = geoTreeResolverForRequest(requestWith(BIHAR));
    const answer = resolver?.contains(
      { dimension: 'state', value: 'Bihar' },
      { dimension: 'district', value: 'Patna' },
    );
    // A Promise would be truthy too, so assert the TYPE, not the truthiness.
    expect(typeof answer).toBe('boolean');
  });
});
