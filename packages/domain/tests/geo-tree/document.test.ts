// Geo-tree document validation unit tests — Story 1.18 (Task 3).
//
// Write-time structural validation. ⛔ These tests also pin what validation CANNOT do — a factually
// wrong edge is structurally valid and IS accepted — because a reader who assumes otherwise would
// treat a published tree as verified geography rather than as a declared, authorization-widening act.

import { describe, expect, it } from 'vitest';

import {
  assertValidGeoTreeDocument,
  findGeoTreeCycles,
  GeoTreeDocumentInvalidError,
  validateGeoTreeDocument,
} from '../../src/geo-tree/index.js';
import type { GeoTreeDocumentJson, GeoTreeNodeJson } from '../../src/schema/geo_tree_versions.js';

function doc(nodes: GeoTreeNodeJson[], version = 1): GeoTreeDocumentJson {
  return { version, nodes };
}

const BIHAR: GeoTreeNodeJson[] = [
  { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
  { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Bihar' },
  { dimension: 'block', value: 'Danapur', parent_dimension: 'district', parent_value: 'Patna' },
];

describe('validateGeoTreeDocument — the valid shapes', () => {
  it('accepts a well-formed state → district → block chain', () => {
    expect(validateGeoTreeDocument(doc(BIHAR))).toEqual([]);
  });

  it('accepts a block parented DIRECTLY to a state (strictly broader, not "one level up")', () => {
    // A Pariwar whose administration skips the district level must not be forced to invent one.
    expect(
      validateGeoTreeDocument(
        doc([
          { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
          { dimension: 'block', value: 'Phulwari', parent_dimension: 'state', parent_value: 'Bihar' },
        ]),
      ),
    ).toEqual([]);
  });

  it('accepts multiple roots (a Pariwar spanning two states)', () => {
    expect(
      validateGeoTreeDocument(
        doc([
          { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
          { dimension: 'state', value: 'UP', parent_dimension: null, parent_value: null },
          { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Bihar' },
          { dimension: 'district', value: 'Lucknow', parent_dimension: 'state', parent_value: 'UP' },
        ]),
      ),
    ).toEqual([]);
  });

  it('accepts same-named nodes at DIFFERENT dimensions (identity is the pair, not the value)', () => {
    expect(
      validateGeoTreeDocument(
        doc([
          { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
          { dimension: 'district', value: 'Bihar', parent_dimension: 'state', parent_value: 'Bihar' },
        ]),
      ),
    ).toEqual([]);
  });
});

describe('validateGeoTreeDocument — rejections', () => {
  it('rejects an empty node list', () => {
    expect(validateGeoTreeDocument(doc([]))).toContain('nodes must be a non-empty array');
  });

  it('rejects a `pariwar` node — it is answered before the resolver, not stored', () => {
    const reasons = validateGeoTreeDocument(
      doc([
        {
          dimension: 'pariwar' as never,
          value: 'p1',
          parent_dimension: null,
          parent_value: null,
        },
      ]),
    );
    expect(reasons.some((r) => r.includes('is not a geo-tree node dimension'))).toBe(true);
    expect(reasons.some((r) => r.includes('rbac/scope.ts:236'))).toBe(true);
  });

  it('rejects a RANK INVERSION — a district may not parent a state', () => {
    const reasons = validateGeoTreeDocument(
      doc([
        { dimension: 'district', value: 'Patna', parent_dimension: null, parent_value: null },
        { dimension: 'state', value: 'Bihar', parent_dimension: 'district', parent_value: 'Patna' },
      ]),
    );
    expect(reasons.some((r) => r.includes('not STRICTLY BROADER by geo rank'))).toBe(true);
  });

  it('rejects a SAME-DIMENSION parent (district under district is not strictly broader)', () => {
    const reasons = validateGeoTreeDocument(
      doc([
        { dimension: 'district', value: 'Patna', parent_dimension: null, parent_value: null },
        { dimension: 'district', value: 'Gaya', parent_dimension: 'district', parent_value: 'Patna' },
      ]),
    );
    expect(reasons.some((r) => r.includes('not STRICTLY BROADER by geo rank'))).toBe(true);
  });

  it('rejects a DANGLING parent — a parent must be a node in the same document', () => {
    const reasons = validateGeoTreeDocument(
      doc([
        { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Bihar' },
      ]),
    );
    expect(reasons.some((r) => r.includes('which is not a node in this document'))).toBe(true);
  });

  it('⭐ rejects DUPLICATE (dimension, value) across the WHOLE document, not just per parent', () => {
    // STRONGER than "no duplicate values at the same dimension under one parent", and the
    // strengthening is forced by the grant model: a GrantScope carries only (dimension, value) and
    // NO PATH, so two districts both named "Patna" under different states are indistinguishable to
    // scopeContains — accepting them would make authorization depend on map insertion order.
    const reasons = validateGeoTreeDocument(
      doc([
        { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
        { dimension: 'state', value: 'UP', parent_dimension: null, parent_value: null },
        { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Bihar' },
        { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'UP' },
      ]),
    );
    expect(reasons.some((r) => r.includes("duplicate node 'district=Patna'"))).toBe(true);
    expect(reasons.some((r) => r.includes('no path'))).toBe(true);
  });

  it('rejects parent_dimension / parent_value that do not move together', () => {
    const reasons = validateGeoTreeDocument(
      doc([
        { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
        { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: null },
      ]),
    );
    expect(reasons.some((r) => r.includes('they must move together'))).toBe(true);
  });

  it('rejects an empty, blank or over-long value', () => {
    expect(
      validateGeoTreeDocument(
        doc([{ dimension: 'state', value: '', parent_dimension: null, parent_value: null }]),
      ).some((r) => r.includes('must be a non-empty string')),
    ).toBe(true);
    expect(
      validateGeoTreeDocument(
        doc([{ dimension: 'state', value: '   ', parent_dimension: null, parent_value: null }]),
      ).some((r) => r.includes('must not be blank')),
    ).toBe(true);
    expect(
      validateGeoTreeDocument(
        doc([{ dimension: 'state', value: 'x'.repeat(129), parent_dimension: null, parent_value: null }]),
      ).some((r) => r.includes('at most 128 characters')),
    ).toBe(true);
  });

  it('rejects a non-positive version', () => {
    expect(validateGeoTreeDocument(doc(BIHAR, 0))).toContain('version must be a positive integer');
  });

  it('collects EVERY reason, not just the first', () => {
    const reasons = validateGeoTreeDocument(
      doc([
        { dimension: 'state', value: '', parent_dimension: null, parent_value: null },
        { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Nowhere' },
      ]),
    );
    expect(reasons.length).toBeGreaterThanOrEqual(2);
  });
});

describe('findGeoTreeCycles — tested DIRECTLY, because the rank rule hides it', () => {
  // ⚠ The rank check already makes every CONSTRUCTIBLE cycle also a rank violation (rank strictly
  // decreases going up, and rank is bounded), so a test that only asserted "the document is
  // invalid" would prove nothing about the cycle detector. Calling it directly is the only way to
  // show it actually fires — the detector is defence-in-depth against a future dimension-set
  // change, and defence nobody has exercised is not defence.
  it('detects a two-node cycle', () => {
    const reasons = findGeoTreeCycles([
      { dimension: 'district', value: 'A', parent_dimension: 'district', parent_value: 'B' },
      { dimension: 'district', value: 'B', parent_dimension: 'district', parent_value: 'A' },
    ]);
    expect(reasons.some((r) => r.startsWith('cycle detected in the parent graph'))).toBe(true);
  });

  it('detects a self-cycle', () => {
    const reasons = findGeoTreeCycles([
      { dimension: 'district', value: 'A', parent_dimension: 'district', parent_value: 'A' },
    ]);
    expect(reasons.some((r) => r.startsWith('cycle detected'))).toBe(true);
  });

  it('detects a three-node cycle', () => {
    const reasons = findGeoTreeCycles([
      { dimension: 'district', value: 'A', parent_dimension: 'district', parent_value: 'B' },
      { dimension: 'district', value: 'B', parent_dimension: 'district', parent_value: 'C' },
      { dimension: 'district', value: 'C', parent_dimension: 'district', parent_value: 'A' },
    ]);
    expect(reasons.some((r) => r.startsWith('cycle detected'))).toBe(true);
  });

  it('reports NO cycle for a well-formed tree, and none for a dangling parent either', () => {
    expect(findGeoTreeCycles(BIHAR)).toEqual([]);
    // A dangling parent terminates the walk; it is check (4)'s finding, not a cycle.
    expect(
      findGeoTreeCycles([
        { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Nowhere' },
      ]),
    ).toEqual([]);
  });

  it('a cyclic document IS rejected end-to-end (both the cycle AND the rank reason surface)', () => {
    const reasons = validateGeoTreeDocument(
      doc([
        { dimension: 'district', value: 'A', parent_dimension: 'district', parent_value: 'B' },
        { dimension: 'district', value: 'B', parent_dimension: 'district', parent_value: 'A' },
      ]),
    );
    expect(reasons.some((r) => r.startsWith('cycle detected'))).toBe(true);
    expect(reasons.some((r) => r.includes('not STRICTLY BROADER'))).toBe(true);
  });
});

describe('assertValidGeoTreeDocument — the throwing wrapper', () => {
  it('does not throw on a valid document', () => {
    expect(() => { assertValidGeoTreeDocument(doc(BIHAR)); }).not.toThrow();
  });

  it('throws GeoTreeDocumentInvalidError carrying every reason', () => {
    try {
      assertValidGeoTreeDocument(doc([]));
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GeoTreeDocumentInvalidError);
      expect((err as GeoTreeDocumentInvalidError).reasons.length).toBeGreaterThan(0);
    }
  });
});

// ── ⛔ THE LIMIT OF VALIDATION, PINNED ──────────────────────────────────────────────────────────
describe('validateGeoTreeDocument — what it CANNOT catch (accepted risk, ADR-0038)', () => {
  it('ACCEPTS a factually wrong edge — `Patna ∈ Kerala` is structurally valid', () => {
    // This is not a gap to be fixed later; it is the accepted residual risk ADR-0038 records. The
    // mitigation is that publishing a tree is an explicit, versioned, append-only act that WIDENS
    // authorization — not that the validator vouches for the geography. A reader who assumes
    // validation implies correctness would treat a published tree as verified. It is not.
    expect(
      validateGeoTreeDocument(
        doc([
          { dimension: 'state', value: 'Kerala', parent_dimension: null, parent_value: null },
          { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Kerala' },
        ]),
      ),
    ).toEqual([]);
  });
});
