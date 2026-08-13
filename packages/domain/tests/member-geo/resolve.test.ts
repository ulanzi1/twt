// Member-geo primitive unit tests — Story 1.19 (Task 3; AC1, AC2).
//
// The LIFT is pure once the posting row and the tree are in hand, so the whole typed-absence matrix
// is provable DB-free. These tests cover four things that are easy to conflate and must not be:
//
//   1. TYPED ABSENCE (AC1) — every level carries the reason that ACTUALLY applies, from the closed
//      five-value union. ⛔ `{available:false, reason}` is not `null`, and a test that only checked
//      "no state" would pass against a null-collapsing implementation. The reason IS the contract.
//   2. THE FOUR ABSENCE CAUSES ARE DISTINGUISHED — no-posting-row / no-tree-published /
//      node-not-in-tree / no-ancestor-at-dimension are four different situations, and collapsing any
//      two of them would tell a future reader the wrong thing about what would fix it.
//   3. `block` IS PERMANENT (D5) — proven UNDER A TREE THAT HAS BLOCKS, which is the only way to
//      show it is a member-attribute fact rather than a tree-completeness fact.
//   4. NO NORMALIZATION — a district differing only by case does NOT match, agreeing byte-for-byte
//      with `geo-tree/resolver.ts:20-31`. A resolver that case-folded while the tree did not would
//      produce a same-request contradiction.

import { describe, expect, it } from 'vitest';

import { buildGeoTree, type LoadedGeoTree, nodeKey } from '../../src/geo-tree/index.js';
import { pariwarId as toPariwarId } from '../../src/ids/index.js';
import {
  districtsBeneathState,
  liftDistrictThroughTree,
  MEMBER_GEO_ABSENCE_REASONS,
} from '../../src/member-geo/index.js';
import type { GeoTreeDocumentJson } from '../../src/schema/geo_tree_versions.js';

const PARIWAR = toPariwarId('11111111-1111-1111-1111-111111111111');

// The same fixture idiom `tests/geo-tree/resolver.test.ts` uses — Patna ∈ Bihar, Vaishali ∈ Bihar,
// Lucknow ∈ UP — plus BLOCKS, which this suite needs to prove D5 rather than assume it.
const FULL_DOCUMENT: GeoTreeDocumentJson = {
  version: 1,
  nodes: [
    { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
    { dimension: 'state', value: 'UP', parent_dimension: null, parent_value: null },
    { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Bihar' },
    { dimension: 'district', value: 'Vaishali', parent_dimension: 'state', parent_value: 'Bihar' },
    { dimension: 'district', value: 'Lucknow', parent_dimension: 'state', parent_value: 'UP' },
    { dimension: 'block', value: 'Danapur', parent_dimension: 'district', parent_value: 'Patna' },
  ],
};

// A REAL Pariwar shape: districts declared with no state above them. Its `state` answer must be
// `no-ancestor-at-dimension` — a first-class answer, NOT a degraded one.
const DISTRICT_ONLY_DOCUMENT: GeoTreeDocumentJson = {
  version: 1,
  nodes: [
    { dimension: 'district', value: 'Patna', parent_dimension: null, parent_value: null },
    { dimension: 'district', value: 'Vaishali', parent_dimension: null, parent_value: null },
  ],
};

const FULL_TREE: LoadedGeoTree = buildGeoTree(FULL_DOCUMENT);
const DISTRICT_ONLY_TREE: LoadedGeoTree = buildGeoTree(DISTRICT_ONLY_DOCUMENT);

describe('liftDistrictThroughTree — the typed-absence matrix (AC1)', () => {
  it('lifts a district to its state through the tree', () => {
    const geo = liftDistrictThroughTree(PARIWAR, 'Patna', FULL_TREE);
    expect(geo.district).toEqual({ available: true, value: 'Patna' });
    expect(geo.state).toEqual({ available: true, value: 'Bihar' });
    expect(geo.pariwar).toEqual({ available: true, value: PARIWAR });
  });

  it('resolves the OTHER state correctly — the lift is real ancestry, not a constant', () => {
    expect(liftDistrictThroughTree(PARIWAR, 'Lucknow', FULL_TREE).state).toEqual({
      available: true,
      value: 'UP',
    });
  });

  // ⛔ FAIL-CLOSED. A member with no posting is in NO geo audience — never "in all".
  it('NO posting row → no geo at all, reason `no-posting-row` (district AND state)', () => {
    const geo = liftDistrictThroughTree(PARIWAR, null, FULL_TREE);
    expect(geo.district).toEqual({ available: false, reason: 'no-posting-row' });
    expect(geo.state).toEqual({ available: false, reason: 'no-posting-row' });
    // ⭐ The pariwar level survives — it is the tenancy key, not a tree answer.
    expect(geo.pariwar).toEqual({ available: true, value: PARIWAR });
  });

  // AC2: `state` comes ONLY from the published tree. No tree ⇒ denies exactly as today.
  it('NO tree published → district present, state `no-tree-published`', () => {
    const geo = liftDistrictThroughTree(PARIWAR, 'Patna', null);
    expect(geo.district).toEqual({ available: true, value: 'Patna' });
    expect(geo.state).toEqual({ available: false, reason: 'no-tree-published' });
  });

  it('district is NOT a node in the tree → `node-not-in-tree`', () => {
    const geo = liftDistrictThroughTree(PARIWAR, 'Gaya', FULL_TREE);
    expect(geo.district).toEqual({ available: true, value: 'Gaya' });
    expect(geo.state).toEqual({ available: false, reason: 'node-not-in-tree' });
  });

  it('DISTRICT-ONLY tree → the district IS a node but nothing sits above it: `no-ancestor-at-dimension`', () => {
    const geo = liftDistrictThroughTree(PARIWAR, 'Patna', DISTRICT_ONLY_TREE);
    expect(geo.district).toEqual({ available: true, value: 'Patna' });
    expect(geo.state).toEqual({ available: false, reason: 'no-ancestor-at-dimension' });
  });

  // ⭐ The four absence causes must stay DISTINGUISHABLE. Collapsing any two would tell a future
  // reader the wrong thing about what would fix it (publish a tree? add a node? add a parent?).
  it('the four tree-shaped absences produce FOUR DIFFERENT reasons', () => {
    const reasons = [
      liftDistrictThroughTree(PARIWAR, null, FULL_TREE).state,
      liftDistrictThroughTree(PARIWAR, 'Patna', null).state,
      liftDistrictThroughTree(PARIWAR, 'Gaya', FULL_TREE).state,
      liftDistrictThroughTree(PARIWAR, 'Patna', DISTRICT_ONLY_TREE).state,
    ].map((l) => (l.available ? 'PRESENT' : l.reason));
    expect(new Set(reasons).size).toBe(4);
    expect(reasons).toEqual([
      'no-posting-row',
      'no-tree-published',
      'node-not-in-tree',
      'no-ancestor-at-dimension',
    ]);
  });
});

describe('`block` is PERMANENTLY absent (D5)', () => {
  // ⭐ Asserted UNDER A TREE THAT HAS BLOCKS. That is what makes this a member-attribute fact and
  // not a tree-completeness fact: `Danapur` is a real block node and STILL nothing populates it,
  // because a posting supplies a DISTRICT and ancestry walks UP.
  it('block is absent with `no-member-attribute` EVEN under a tree that has blocks', () => {
    expect(FULL_TREE.parents.has(nodeKey('block', 'Danapur'))).toBe(true);
    const geo = liftDistrictThroughTree(PARIWAR, 'Patna', FULL_TREE);
    expect(geo.block).toEqual({ available: false, reason: 'no-member-attribute' });
  });

  it('block carries the SAME reason in every other case — it never varies with the tree', () => {
    for (const tree of [FULL_TREE, DISTRICT_ONLY_TREE, null]) {
      for (const district of ['Patna', 'Gaya', null]) {
        expect(liftDistrictThroughTree(PARIWAR, district, tree).block).toEqual({
          available: false,
          reason: 'no-member-attribute',
        });
      }
    }
  });

  // ⛔ The reason must stay DISTINCT from the tree-shaped ones: collapsing it into
  // `node-not-in-tree` would tell a future reader that a richer tree lights block up. It does not.
  it('`no-member-attribute` is never produced by a tree-shaped absence', () => {
    const treeShaped = [
      liftDistrictThroughTree(PARIWAR, null, FULL_TREE).state,
      liftDistrictThroughTree(PARIWAR, 'Patna', null).state,
      liftDistrictThroughTree(PARIWAR, 'Gaya', FULL_TREE).state,
      liftDistrictThroughTree(PARIWAR, 'Patna', DISTRICT_ONLY_TREE).state,
    ];
    for (const level of treeShaped) {
      expect(level.available === false && level.reason).not.toBe('no-member-attribute');
    }
  });
});

describe('NO normalization — byte-identical comparison', () => {
  // A resolver that case-folded while the tree did not would produce a same-request contradiction
  // (`geo-tree/resolver.ts:20-31`). This pins the agreement rather than trusting the comment.
  it('a district differing only by CASE does not match', () => {
    expect(liftDistrictThroughTree(PARIWAR, 'patna', FULL_TREE).state).toEqual({
      available: false,
      reason: 'node-not-in-tree',
    });
  });

  it('a district differing only by surrounding WHITESPACE does not match', () => {
    expect(liftDistrictThroughTree(PARIWAR, ' Patna', FULL_TREE).state).toEqual({
      available: false,
      reason: 'node-not-in-tree',
    });
  });
});

describe('districtsBeneathState — the audience-selection direction (AC7, D7)', () => {
  it('returns every district beneath the state, and only those', () => {
    expect(districtsBeneathState(FULL_TREE, 'Bihar').sort()).toEqual(['Patna', 'Vaishali']);
    expect(districtsBeneathState(FULL_TREE, 'UP')).toEqual(['Lucknow']);
  });

  // ⛔ An empty set must mean "no audience" to the caller — NEVER a fallback to members-all.
  it('an unknown state → EMPTY (fail-closed), not everything', () => {
    expect(districtsBeneathState(FULL_TREE, 'Kerala')).toEqual([]);
  });

  it('a null tree → EMPTY', () => {
    expect(districtsBeneathState(null, 'Bihar')).toEqual([]);
  });

  it('a district-only tree has no state node → EMPTY', () => {
    expect(districtsBeneathState(DISTRICT_ONLY_TREE, 'Bihar')).toEqual([]);
  });

  it('is case-SENSITIVE, like every other comparison here', () => {
    expect(districtsBeneathState(FULL_TREE, 'bihar')).toEqual([]);
  });

  // ⭐ The ROUND TRIP: a district the set contains must lift back to that same state. If these two
  // directions ever disagreed, a member could be dispatched to an audience the read-time predicate
  // would then deny them — the two consumers would silently contradict each other.
  it('round-trips with liftDistrictThroughTree for every district in the set', () => {
    for (const district of districtsBeneathState(FULL_TREE, 'Bihar')) {
      expect(liftDistrictThroughTree(PARIWAR, district, FULL_TREE).state).toEqual({
        available: true,
        value: 'Bihar',
      });
    }
  });

  // A block beneath the state is NOT a district and must not leak into the member fan-out set.
  it('does not return blocks, only districts', () => {
    expect(districtsBeneathState(FULL_TREE, 'Bihar')).not.toContain('Danapur');
  });
});

describe('the reason union is CLOSED (D6)', () => {
  it('carries exactly the five ruled reasons, in the ruled order', () => {
    expect(MEMBER_GEO_ABSENCE_REASONS).toEqual([
      'no-posting-row',
      'no-tree-published',
      'node-not-in-tree',
      'no-ancestor-at-dimension',
      'no-member-attribute',
    ]);
  });
});
