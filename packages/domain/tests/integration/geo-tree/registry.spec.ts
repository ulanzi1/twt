// Geo-tree versioned registry — live-DB integration (Story 1.18, Task 3; AC1, AC2, AC7).
//
// Covers: ⭐ NO tree in force when a Pariwar has published none (the load-bearing case — it is what
// preserves today's behaviour byte-identically); per-Pariwar versioning starting at 1 (NOT 2 — no
// code constant owns version 1 here); the superseded_by_version forward-pointer + DB-enforced
// immutability of a prior document; in-force resolution by instant; replay by version; the typed
// document-invalid + out-of-order errors; and the per-request loader feeding a real resolver.
//
// Live DB only. Own-committing writers accumulate rows → assert membership/shape, not global counts
// ([[project_live_db_test_gotchas]]).

import { describe, expect, it } from 'vitest';

import {
  createGeoTreeResolver,
  createGeoTreeVersion,
  geoTreeDocumentForVersion,
  geoTreeVersionInForce,
  GeoTreeDocumentInvalidError,
  GeoTreeEffectiveAtOutOfOrderError,
  loadGeoTree,
} from '../../../src/geo-tree/index.js';
import { scopeContains } from '../../../src/rbac/scope.js';
import { geoTreeVersions, type GeoTreeNodeJson } from '../../../src/schema/geo_tree_versions.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

const bihar = (districts: string[]): GeoTreeNodeJson[] => [
  { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
  ...districts.map(
    (d): GeoTreeNodeJson => ({
      dimension: 'district',
      value: d,
      parent_dimension: 'state',
      parent_value: 'Bihar',
    }),
  ),
];

describe.skipIf(!hasDatabase)('geo-tree registry (AC1)', () => {
  setupLiveDb();

  // ⭐ THE LOAD-BEARING CASE. Everything else in Story 1.18 is safe to land only because this holds:
  // a Pariwar that has published nothing behaves EXACTLY as it did before the story existed.
  it('a Pariwar with NO published tree resolves to NOTHING — not to a default', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    expect(await geoTreeVersionInForce(tx, PARIWAR_A, new Date('2026-08-12T00:00:00Z'))).toBeNull();
    expect(await loadGeoTree(tx, PARIWAR_A, new Date('2026-08-12T00:00:00Z'))).toBeNull();
  });

  it("a Pariwar's FIRST tree is version 1 (no code constant owns version 1 here)", async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: bihar(['Patna']),
      effectiveAt: new Date('2026-08-01T00:00:00Z'),
    });
    expect(row.version).toBe(1);
    expect(row.treeDocument.version).toBe(1);
    expect(row.supersededByVersion).toBeNull();
  });

  it('a second version is 2 and points the prior forward; the PRIOR DOCUMENT IS UNCHANGED', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const v1 = await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: bihar(['Patna']),
      effectiveAt: new Date('2026-08-01T00:00:00Z'),
    });
    const v2 = await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: bihar(['Patna', 'Vaishali']),
      effectiveAt: new Date('2026-08-05T00:00:00Z'),
    });
    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);

    // The prior row's document is byte-unchanged — rewriting it would silently re-decide past
    // authorization questions, which is exactly what the immutability posture exists to prevent.
    const replayedV1 = await geoTreeDocumentForVersion(tx, PARIWAR_A, 1);
    expect(replayedV1?.nodes).toHaveLength(2);
    expect(replayedV1?.nodes.some((n) => n.value === 'Vaishali')).toBe(false);

    const rows = await tx.select().from(geoTreeVersions);
    const prior = rows.find((r) => r.version === 1);
    expect(prior?.supersededByVersion).toBe(2);
  });

  it('in-force resolution is BY INSTANT, not by highest version', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: bihar(['Patna']),
      effectiveAt: new Date('2026-08-01T00:00:00Z'),
    });
    await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: bihar(['Patna', 'Vaishali']),
      effectiveAt: new Date('2026-08-10T00:00:00Z'),
    });

    const early = await geoTreeVersionInForce(tx, PARIWAR_A, new Date('2026-08-03T00:00:00Z'));
    expect(early?.version).toBe(1);
    const late = await geoTreeVersionInForce(tx, PARIWAR_A, new Date('2026-08-11T00:00:00Z'));
    expect(late?.version).toBe(2);
    // Before the first version's effective instant, there is STILL no tree.
    expect(await geoTreeVersionInForce(tx, PARIWAR_A, new Date('2026-07-01T00:00:00Z'))).toBeNull();
  });

  it('rejects an out-of-order effectiveAt with the typed error', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: bihar(['Patna']),
      effectiveAt: new Date('2026-08-10T00:00:00Z'),
    });
    await expect(
      createGeoTreeVersion(tx, {
        pariwarId: PARIWAR_A,
        nodes: bihar(['Gaya']),
        effectiveAt: new Date('2026-08-01T00:00:00Z'),
      }),
    ).rejects.toBeInstanceOf(GeoTreeEffectiveAtOutOfOrderError);
  });

  it('rejects a malformed document BEFORE it is persisted', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      createGeoTreeVersion(tx, {
        pariwarId: PARIWAR_A,
        // Dangling parent: 'Bihar' is never declared as a node.
        nodes: [
          { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Bihar' },
        ],
      }),
    ).rejects.toBeInstanceOf(GeoTreeDocumentInvalidError);
    // Nothing was written.
    expect(await geoTreeVersionInForce(tx, PARIWAR_A, new Date('2030-01-01T00:00:00Z'))).toBeNull();
  });
});

describe.skipIf(!hasDatabase)('geo-tree registry — DB-level immutability backstop', () => {
  setupLiveDb();

  it('the trigger REJECTS an UPDATE of tree_document on an existing version row', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: bihar(['Patna']),
      effectiveAt: new Date('2026-08-01T00:00:00Z'),
    });

    // A comment alone would not stop a buggy or malicious UPDATE from rewriting a supposedly
    // immutable historical tree — and rewriting one silently re-decides past authorization
    // questions. This asserts the DB-level backstop actually fires.
    await expect(
      client.query(
        `UPDATE geo_tree_versions SET tree_document = '{"version":1,"nodes":[]}'::jsonb
         WHERE pariwar_id = $1 AND version = 1`,
        [PARIWAR_A],
      ),
    ).rejects.toThrow(/immutable-column write rejected/);
  });

  it('the trigger ALLOWS the superseded_by_version forward-pointer (the one mutable column)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: bihar(['Patna']),
      effectiveAt: new Date('2026-08-01T00:00:00Z'),
    });
    await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: bihar(['Patna', 'Gaya']),
      effectiveAt: new Date('2026-08-02T00:00:00Z'),
    });
    // createGeoTreeVersion already performed exactly this UPDATE — it did not throw, which is the
    // positive half of the same guard.
    const replayed = await geoTreeDocumentForVersion(tx, PARIWAR_A, 1);
    expect(replayed?.nodes).toHaveLength(2);
  });
});

// ── The end-to-end path: a stored tree really does change an authorization outcome ──────────────
describe.skipIf(!hasDatabase)('geo-tree registry → loader → resolver → scopeContains', () => {
  setupLiveDb();

  it('⭐ a published tree makes a state grant reach a district target; without one it denies', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const grant = { dimension: 'state' as const, value: 'Bihar' };
    const target = { dimension: 'district' as const, value: 'Patna' };

    // BEFORE publishing: no tree → no resolver → the default deny-deeper posture, unchanged.
    expect(await loadGeoTree(tx, PARIWAR_A)).toBeNull();
    expect(scopeContains(grant, target)).toBe(false);

    await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: bihar(['Patna', 'Vaishali']),
      effectiveAt: new Date('2026-08-01T00:00:00Z'),
    });

    // AFTER publishing: the loader materializes the tree and the same question now allows.
    const tree = await loadGeoTree(tx, PARIWAR_A);
    expect(tree).not.toBeNull();
    const resolver = createGeoTreeResolver(tree!);
    expect(scopeContains(grant, target, resolver)).toBe(true);
    // A district the tree does NOT contain still denies — publishing Bihar did not publish India.
    expect(scopeContains(grant, { dimension: 'district', value: 'Lucknow' }, resolver)).toBe(false);
  });

  it('⛔ one Pariwar publishing a tree does NOT change another Pariwar (RLS + per-tenant subtrees)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: bihar(['Patna']),
      effectiveAt: new Date('2026-08-01T00:00:00Z'),
    });
    expect(await loadGeoTree(tx, PARIWAR_A)).not.toBeNull();

    // B has published nothing. Under B's scope the loader must still return null — B's
    // authorization behaviour is untouched by A's publication.
    await enterAppScope(client, PARIWAR_B);
    expect(await loadGeoTree(tx, PARIWAR_B)).toBeNull();
  });
});
