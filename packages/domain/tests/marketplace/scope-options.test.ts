// Story 12.2 (`2026-11-01-433` QE5; AC4) — the PURE `buildModuleScopeOptions`. DB-free.
//
// The picker's options: a tree's state + district nodes (with parent states); a districts-only tree (⛔ states); ⛔ tree
// → the listed workplace districts, `districtsTruncated` per `hasMore`; ⛔ tree and ⛔ listed district → both empty. A
// value over `MAX_SCOPE_VALUE_LENGTH` (a tree node may be 128) is offered UNUSABLE, ⛔ truncated (TR6).

import { describe, expect, it } from 'vitest';

import { MAX_SCOPE_VALUE_LENGTH } from '../../src/marketplace/filters.js';
import { buildModuleScopeOptions } from '../../src/marketplace/scope-options.js';
import type { GeoTreeNodeJson } from '../../src/schema/geo_tree_versions.js';

const state = (value: string): GeoTreeNodeJson => ({ dimension: 'state', value, parent_dimension: null, parent_value: null });
const district = (value: string, parent: string | null): GeoTreeNodeJson => ({
  dimension: 'district',
  value,
  parent_dimension: parent === null ? null : 'state',
  parent_value: parent,
});
const tree = (nodes: GeoTreeNodeJson[], version = 3) => ({ version, document: { version, nodes } });
const NONE = { items: [] as string[], hasMore: false };

describe('buildModuleScopeOptions (QE5)', () => {
  it('a tree: its state nodes, and its district nodes with their parent state; blocks ignored; sorted by value', () => {
    const o = buildModuleScopeOptions(
      tree([
        state('Bihar'),
        state('Assam'),
        district('Patna', 'Bihar'),
        district('Gaya', 'Bihar'),
        district('Kamrup', 'Assam'),
        { dimension: 'block', value: 'Danapur', parent_dimension: 'district', parent_value: 'Patna' },
      ]),
      NONE,
    );
    expect(o.geoTreeVersion).toBe(3);
    expect(o.districtSource).toBe('geo_tree');
    expect(o.districtsTruncated).toBe(false);
    expect(o.states).toEqual([
      { value: 'Assam', state: null, usable: true, unusableReason: null },
      { value: 'Bihar', state: null, usable: true, unusableReason: null },
    ]);
    expect(o.districts.map((d) => [d.value, d.state])).toEqual([
      ['Gaya', 'Bihar'],
      ['Kamrup', 'Assam'],
      ['Patna', 'Bihar'],
    ]);
  });

  it('a districts-only tree → states: [] (so a state audience cannot be offered); districts keep a null parent', () => {
    const o = buildModuleScopeOptions(tree([district('Patna', null), district('Gaya', null)]), NONE);
    expect(o.states).toEqual([]);
    expect(o.districts.map((d) => [d.value, d.state])).toEqual([
      ['Gaya', null],
      ['Patna', null],
    ]);
    expect(o.districtSource).toBe('geo_tree');
  });

  it('a tree ignores the listed-districts argument entirely', () => {
    const o = buildModuleScopeOptions(tree([state('Bihar')]), { items: ['Patna'], hasMore: true });
    expect(o.districts).toEqual([]);
    expect(o.districtsTruncated).toBe(false);
  });

  it.each([[false], [true]])('⛔ tree + listed workplace districts (hasMore %s): states [], source workplace_districts', (hasMore) => {
    const o = buildModuleScopeOptions(null, { items: ['Gaya', 'Patna'], hasMore });
    expect(o.geoTreeVersion).toBeNull();
    expect(o.states).toEqual([]);
    expect(o.districts).toEqual([
      { value: 'Gaya', state: null, usable: true, unusableReason: null },
      { value: 'Patna', state: null, usable: true, unusableReason: null },
    ]);
    expect(o.districtSource).toBe('workplace_districts');
    expect(o.districtsTruncated).toBe(hasMore);
  });

  it('⛔ tree and ⛔ listed district → both lists empty (only members-all is authorable)', () => {
    expect(buildModuleScopeOptions(null, NONE)).toEqual({
      geoTreeVersion: null,
      states: [],
      districts: [],
      districtSource: 'workplace_districts',
      districtsTruncated: false,
    });
  });

  it('a 121–128-character value is offered UNUSABLE (too_long), never truncated; 120 is usable', () => {
    expect(MAX_SCOPE_VALUE_LENGTH).toBe(120);
    const v120 = 'a'.repeat(120);
    const v121 = 'b'.repeat(121);
    const v128 = 'c'.repeat(128);
    const o = buildModuleScopeOptions(tree([state(v128), district(v121, v128), district(v120, v128)]), NONE);
    expect(o.states).toEqual([{ value: v128, state: null, usable: false, unusableReason: 'too_long' }]);
    expect(o.districts).toEqual([
      { value: v120, state: v128, usable: true, unusableReason: null },
      { value: v121, state: v128, usable: false, unusableReason: 'too_long' },
    ]);
    const noTree = buildModuleScopeOptions(null, { items: [v121], hasMore: false });
    expect(noTree.districts[0]).toEqual({ value: v121, state: null, usable: false, unusableReason: 'too_long' });
  });

  it('values are kept BYTE-FOR-BYTE (⛔ trim, ⛔ case-fold) and sorted by code unit, not locale', () => {
    const o = buildModuleScopeOptions(tree([state(' patna'), state('Patna'), state('PATNA')]), NONE);
    expect(o.states.map((s) => s.value)).toEqual([' patna', 'PATNA', 'Patna']);
  });
});
