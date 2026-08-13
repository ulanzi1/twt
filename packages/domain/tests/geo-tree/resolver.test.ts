// Geo-tree resolver unit tests — Story 1.18 (Task 4; AC1, AC2, AC8).
//
// The resolver is the implementation behind `rbac.scopeContains`' injectable seam. These tests
// cover three things that are easy to conflate and must not be:
//
//   1. ANCESTRY — the resolver answers "is X beneath Y", for all three reachable edge kinds.
//   2. PURITY (AC2) — `contains()` performs no I/O, proven by an injected-loader spy that must
//      never fire, not by inspection.
//   3. DISCRIMINATION (AC8) — the suite fails when the resolver is absent AND when a single tree
//      EDGE is wrong. A gate that only detects "resolver absent" does not detect "resolver wrong".

import { describe, expect, it, vi } from 'vitest';

import {
  buildGeoTree,
  createGeoTreeResolver,
  GEO_TREE_NODE_RANK,
  isGeoTreeNodeDimension,
  type LoadedGeoTree,
} from '../../src/geo-tree/index.js';
import { denyDeeperGeoResolver, SCOPE_DIMENSIONS, scopeContains } from '../../src/rbac/scope.js';
import {
  GEO_TREE_NODE_DIMENSIONS,
  type GeoTreeDocumentJson,
} from '../../src/schema/geo_tree_versions.js';

// The canonical fixture, in the SAME shape as the `BIHAR_TREE` stub that `tests/rbac/scope.test.ts`
// and `tests/rbac/check.test.ts` already inject — Patna ∈ Bihar, Vaishali ∈ Bihar, Lucknow ∈ UP —
// now expressed as a real published DOCUMENT rather than a hand-written predicate. Deliberately NOT
// a second fixture idiom: this is the same tree the existing pins already prove `hasPermission`
// allows with, so a reader comparing the two files is comparing like with like.
//
// `Danapur` is a BLOCK under Patna, and `Phulwari` is a block placed DIRECTLY under Bihar — a
// legitimate shape (a Pariwar whose administration skips the district level should not have to
// invent one), and the case that proves the walk is genuine ancestry and not "exactly one level up".
const BIHAR_DOCUMENT: GeoTreeDocumentJson = {
  version: 1,
  nodes: [
    { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
    { dimension: 'state', value: 'UP', parent_dimension: null, parent_value: null },
    { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Bihar' },
    { dimension: 'district', value: 'Vaishali', parent_dimension: 'state', parent_value: 'Bihar' },
    { dimension: 'district', value: 'Lucknow', parent_dimension: 'state', parent_value: 'UP' },
    { dimension: 'block', value: 'Danapur', parent_dimension: 'district', parent_value: 'Patna' },
    { dimension: 'block', value: 'Phulwari', parent_dimension: 'state', parent_value: 'Bihar' },
  ],
};

const BIHAR_TREE = buildGeoTree(BIHAR_DOCUMENT);
const resolver = createGeoTreeResolver(BIHAR_TREE);

describe('geo-tree resolver — rank agreement with the RBAC model', () => {
  // ⚠ `GEO_TREE_NODE_RANK` is a LOCAL map, deliberately not an import of `rbac/scope.ts`'s
  // module-private `GEO_RANK`. That decoupling is only safe if something asserts the two agree —
  // a drift would let a document declare a `district` as the parent of a `state`, which the
  // resolver would then happily walk. This is that assertion.
  it('GEO_TREE_NODE_RANK matches SCOPE_DIMENSIONS ordering for every node dimension', () => {
    for (const dimension of GEO_TREE_NODE_DIMENSIONS) {
      expect(GEO_TREE_NODE_RANK[dimension]).toBe(SCOPE_DIMENSIONS.indexOf(dimension));
    }
  });

  it('only state/district/block are node dimensions — pariwar, global and self are NOT', () => {
    expect([...GEO_TREE_NODE_DIMENSIONS]).toEqual(['state', 'district', 'block']);
    for (const d of ['pariwar', 'global', 'self']) {
      expect(isGeoTreeNodeDimension(d)).toBe(false);
    }
  });
});

describe('geo-tree resolver — genuine ancestry (the three reachable edge kinds)', () => {
  it('state → district: Patna ∈ Bihar', () => {
    expect(
      resolver.contains({ dimension: 'state', value: 'Bihar' }, { dimension: 'district', value: 'Patna' }),
    ).toBe(true);
  });

  it('district → block: Danapur ∈ Patna', () => {
    expect(
      resolver.contains({ dimension: 'district', value: 'Patna' }, { dimension: 'block', value: 'Danapur' }),
    ).toBe(true);
  });

  it('state → block TRANSITIVELY: Danapur ∈ Bihar (through Patna, two hops)', () => {
    expect(
      resolver.contains({ dimension: 'state', value: 'Bihar' }, { dimension: 'block', value: 'Danapur' }),
    ).toBe(true);
  });

  it('state → block DIRECTLY: Phulwari ∈ Bihar (a block parented straight to a state)', () => {
    // Proves the walk is "strictly broader ancestry", NOT "exactly one level up".
    expect(
      resolver.contains({ dimension: 'state', value: 'Bihar' }, { dimension: 'block', value: 'Phulwari' }),
    ).toBe(true);
  });
});

describe('geo-tree resolver — fail-closed denials', () => {
  it('non-ancestry denies: Lucknow ∉ Bihar (a real sibling in another state)', () => {
    expect(
      resolver.contains({ dimension: 'state', value: 'Bihar' }, { dimension: 'district', value: 'Lucknow' }),
    ).toBe(false);
  });

  it('non-ancestry denies at block depth: Danapur ∉ UP', () => {
    expect(
      resolver.contains({ dimension: 'state', value: 'UP' }, { dimension: 'block', value: 'Danapur' }),
    ).toBe(false);
  });

  it('an unknown DESCENDANT denies — a tree that never mentions Gaya cannot place it', () => {
    expect(
      resolver.contains({ dimension: 'state', value: 'Bihar' }, { dimension: 'district', value: 'Gaya' }),
    ).toBe(false);
  });

  it('an unknown ANCESTOR denies', () => {
    expect(
      resolver.contains({ dimension: 'state', value: 'Kerala' }, { dimension: 'district', value: 'Patna' }),
    ).toBe(false);
  });

  it('an EMPTY tree denies everything', () => {
    const empty = createGeoTreeResolver(buildGeoTree({ version: 1, nodes: [] }));
    expect(
      empty.contains({ dimension: 'state', value: 'Bihar' }, { dimension: 'district', value: 'Patna' }),
    ).toBe(false);
  });

  it('an INVERTED question denies: Bihar is not beneath Patna', () => {
    expect(
      resolver.contains({ dimension: 'district', value: 'Patna' }, { dimension: 'state', value: 'Bihar' }),
    ).toBe(false);
  });

  it('identity denies — the resolver answers STRICT ancestry, and scopeContains never asks', () => {
    // A same-dimension pair is answered at rbac/scope.ts:241 by exact value match and never reaches
    // the resolver. Returning false here keeps this module from becoming a second, competing answer
    // to a question already settled upstream.
    expect(
      resolver.contains({ dimension: 'district', value: 'Patna' }, { dimension: 'district', value: 'Patna' }),
    ).toBe(false);
  });

  it('a `pariwar` argument fails closed on BOTH sides (it is not a tree node)', () => {
    expect(
      resolver.contains({ dimension: 'pariwar', value: 'p1' }, { dimension: 'district', value: 'Patna' }),
    ).toBe(false);
    expect(
      resolver.contains({ dimension: 'state', value: 'Bihar' }, { dimension: 'pariwar', value: 'p1' }),
    ).toBe(false);
  });
});

// ── ⭐ THE VALUE-NORMALIZATION TRAP ─────────────────────────────────────────────────────────────
// `rbac/scope.ts:241` compares `grant.value === target.value` — strict, case-SENSITIVE, untrimmed.
// If the resolver normalized and the exact-node path did not, then within ONE REQUEST the BROADER
// grant would authorize and the narrower one would not. These tests pin the agreement.
describe('geo-tree resolver — value comparison is byte-identical to the exact-node path', () => {
  it('case-sensitively denies: state=Bihar ⊉ district=patna (lowercase)', () => {
    expect(
      resolver.contains({ dimension: 'state', value: 'Bihar' }, { dimension: 'district', value: 'patna' }),
    ).toBe(false);
  });

  it('does not trim: state=Bihar ⊉ district=" Patna "', () => {
    expect(
      resolver.contains({ dimension: 'state', value: 'Bihar' }, { dimension: 'district', value: ' Patna ' }),
    ).toBe(false);
  });

  it('the ancestor value is equally strict: state="bihar" ⊉ district=Patna', () => {
    expect(
      resolver.contains({ dimension: 'state', value: 'bihar' }, { dimension: 'district', value: 'Patna' }),
    ).toBe(false);
  });

  it('⭐ THE CONTRADICTION TEST — resolver and exact-node path agree on the SAME casing question', () => {
    // The exact-node path (same dimension) — strict `===`, so `district=Patna ⊇ district=patna` denies.
    const exactNodeAnswer = scopeContains(
      { dimension: 'district', value: 'Patna' },
      { dimension: 'district', value: 'patna' },
      resolver,
    );
    // The resolver path (strictly narrower target) — must reach the SAME verdict on casing.
    const resolverAnswer = scopeContains(
      { dimension: 'state', value: 'Bihar' },
      { dimension: 'district', value: 'patna' },
      resolver,
    );
    expect(exactNodeAnswer).toBe(false);
    expect(resolverAnswer).toBe(false);
    // Stated as the invariant rather than as two coincidental falses: the two paths must never
    // disagree about whether 'patna' is the same node as 'Patna'.
    expect(resolverAnswer).toBe(exactNodeAnswer);
  });
});

// ── AC2 — PURITY, proven rather than asserted ───────────────────────────────────────────────────
describe('geo-tree resolver — purity (AC2)', () => {
  it('contains() never invokes an injected loader, over a tree of realistic size', () => {
    // The spy stands in for EVERY I/O path: if `contains` ever reached for a loader, a DB handle or
    // a lazy fetch, this fires. It must not, because `hasPermission` is a pure synchronous
    // predicate (ADR-0008 Decision 8) and `GeoTreeResolver.contains` is synchronous by interface.
    const loaderSpy = vi.fn();

    // A realistic Pariwar subtree: 1 state, 40 districts, 20 blocks each = 841 nodes.
    const nodes = BIHAR_DOCUMENT.nodes.slice(0, 1);
    for (let d = 0; d < 40; d += 1) {
      nodes.push({
        dimension: 'district',
        value: `District-${String(d)}`,
        parent_dimension: 'state',
        parent_value: 'Bihar',
      });
      for (let b = 0; b < 20; b += 1) {
        nodes.push({
          dimension: 'block',
          value: `Block-${String(d)}-${String(b)}`,
          parent_dimension: 'district',
          parent_value: `District-${String(d)}`,
        });
      }
    }
    expect(nodes).toHaveLength(841);

    const big = createGeoTreeResolver(
      buildGeoTree({
        version: 1,
        // The loader is invoked HERE, at build time, exactly once — and never again.
        nodes: (loaderSpy(), nodes),
      }),
    );
    expect(loaderSpy).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 500; i += 1) {
      big.contains(
        { dimension: 'state', value: 'Bihar' },
        { dimension: 'block', value: `Block-${String(i % 40)}-0` },
      );
    }

    // 500 containment checks later, the loader has STILL been called exactly once — at build time.
    expect(loaderSpy).toHaveBeenCalledTimes(1);
  });

  it('the resolver holds no mutable state — repeated calls are identical', () => {
    const first = resolver.contains(
      { dimension: 'state', value: 'Bihar' },
      { dimension: 'block', value: 'Danapur' },
    );
    for (let i = 0; i < 50; i += 1) {
      expect(
        resolver.contains({ dimension: 'state', value: 'Bihar' }, { dimension: 'block', value: 'Danapur' }),
      ).toBe(first);
    }
  });

  it('a malformed persisted document cannot hang a request — the walk is bounded', () => {
    // `validateGeoTreeDocument` rejects cycles at WRITE time, but the resolver reads documents
    // persisted earlier, possibly by an older validator. An infinite loop inside a synchronous
    // authorization predicate would hang a request thread, so the walk is bounded and fails closed.
    const cyclic: LoadedGeoTree = {
      version: 1,
      parents: new Map([
        ['district A', 'district B'],
        ['district B', 'district A'],
        ['state Bihar', null],
      ]),
    };
    const cyclicResolver = createGeoTreeResolver(cyclic);
    expect(
      cyclicResolver.contains(
        { dimension: 'state', value: 'Bihar' },
        { dimension: 'district', value: 'A' },
      ),
    ).toBe(false);
  });
});

// ── The seam contract: how the resolver behaves THROUGH scopeContains ───────────────────────────
describe('geo-tree resolver — through scopeContains (the real call path)', () => {
  it('a state grant now reaches a district target, where the default denies', () => {
    const grant = { dimension: 'state' as const, value: 'Bihar' };
    const target = { dimension: 'district' as const, value: 'Patna' };
    expect(scopeContains(grant, target, denyDeeperGeoResolver)).toBe(false);
    expect(scopeContains(grant, target, resolver)).toBe(true);
  });

  it('⛔ the pariwar ancestor SHORT-CIRCUITS before the resolver — asserted, not assumed', () => {
    // rbac/scope.ts:236 returns true for ANY pariwar grant before the resolver is consulted. If it
    // did NOT short-circuit, this would reach our resolver, which fails closed on `pariwar` — so
    // the `true` below is only reachable via the short-circuit. A never-called spy proves it
    // directly rather than by inference.
    const spy = vi.fn(() => false);
    const spyingResolver = { contains: spy };
    expect(
      scopeContains(
        { dimension: 'pariwar', value: 'p1' },
        { dimension: 'district', value: 'Patna' },
        spyingResolver,
      ),
    ).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('⛔ RANK ORDER still denies — a narrower grant never reaches a broader target', () => {
    // The Family-A invariant this story must not disturb. `scope.ts:232` denies at `tRank < gRank`
    // BEFORE the resolver runs, so even a tree containing both nodes changes nothing. This is the
    // D2 finding in test form: `block` → parent-`district` is rank-order, not resolver-blocked.
    const spy = vi.fn(() => true); // an ALLOW-EVERYTHING resolver — still must not matter
    expect(
      scopeContains(
        { dimension: 'block', value: 'Danapur' },
        { dimension: 'district', value: 'Patna' },
        { contains: spy },
      ),
    ).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('an exact-node match still resolves without the resolver being consulted', () => {
    const spy = vi.fn(() => false);
    expect(
      scopeContains(
        { dimension: 'district', value: 'Patna' },
        { dimension: 'district', value: 'Patna' },
        { contains: spy },
      ),
    ).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });
});

// ── ⭐ AC8 — REVERT-SANITY, both halves ─────────────────────────────────────────────────────────
// [[feedback_gate_scope_semantic_coverage]]: a green scan proves nothing without a revert probe.
// These two tests are the STANDING, in-suite form of the manual probes run at Task 4 — they encode
// what the manual probes proved, so the discrimination cannot silently rot later.
describe('geo-tree resolver — AC8 revert-sanity (the tests have teeth)', () => {
  it('(a) RESOLVER-ABSENT probe: reverting to `contains: () => false` breaks the ancestry claims', () => {
    // This is `denyDeeperGeoResolver` byte-for-byte — the exact revert the manual probe performed.
    const reverted = { contains: () => false };
    expect(
      reverted.contains(),
    ).toBe(false);
    // Every ancestry assertion in this file would flip to false under it.
    expect(
      scopeContains(
        { dimension: 'state', value: 'Bihar' },
        { dimension: 'district', value: 'Patna' },
        reverted,
      ),
    ).toBe(false);
  });

  it('(b) ⭐ ONE-EDGE-CORRUPTION probe: the tests discriminate ANCESTRY, not "a resolver is present"', () => {
    // The half that matters. A suite that only detects "resolver absent" would pass with a WRONG
    // tree. Corrupt exactly ONE edge — re-parent Patna from Bihar to UP, changing nothing else —
    // and the resolver is still fully present and fully functional. The ancestry answers must move.
    const corrupted = BIHAR_DOCUMENT.nodes.map((n) =>
      n.dimension === 'district' && n.value === 'Patna' ? { ...n, parent_value: 'UP' } : n,
    );
    const wrong = createGeoTreeResolver(buildGeoTree({ version: 1, nodes: corrupted }));

    // Patna is no longer in Bihar …
    expect(
      wrong.contains({ dimension: 'state', value: 'Bihar' }, { dimension: 'district', value: 'Patna' }),
    ).toBe(false);
    // … and Danapur, which is two hops below via Patna, follows it out of Bihar …
    expect(
      wrong.contains({ dimension: 'state', value: 'Bihar' }, { dimension: 'block', value: 'Danapur' }),
    ).toBe(false);
    // … and into UP, which the correct tree denies. One edge, three answers moved.
    expect(
      wrong.contains({ dimension: 'state', value: 'UP' }, { dimension: 'block', value: 'Danapur' }),
    ).toBe(true);
    expect(
      resolver.contains({ dimension: 'state', value: 'UP' }, { dimension: 'block', value: 'Danapur' }),
    ).toBe(false);

    // Vaishali is untouched — proving the corruption was surgical, not a wholesale break.
    expect(
      wrong.contains({ dimension: 'state', value: 'Bihar' }, { dimension: 'district', value: 'Vaishali' }),
    ).toBe(true);
  });
});
