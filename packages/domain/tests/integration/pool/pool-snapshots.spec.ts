// pool_snapshots hot-tier — live-DB integration (Story 7.1, Task 6; AC3).
//
// Proves the hot snapshot table stores a serialized snapshot, round-trips it (JSONB →
// readPoolSnapshot → integrity verifies), enforces the pools FK, and is tenant-isolated.
// Live DB only. Per [[project_live_db_test_gotchas]] — assert membership, never counts.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { poolId as toPoolId } from '../../../src/ids/index.js';
import { serializePoolSnapshot, verifyPoolSnapshotIntegrity } from '../../../src/pool/index.js';
import { readPoolSnapshot } from '../../../src/snapshot-adapters/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedPool } from '../_helpers.js';

describe.skipIf(!hasDatabase)('pool_snapshots hot tier (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('stores a serialized snapshot + round-trips it through the adapter (integrity verifies)', async () => {
    const { client, tx } = getTx();
    const pid = randomUUID();
    const cycleId = randomUUID();
    await seedPool(tx, PARIWAR_A, { poolId: pid, cycleId, currentState: 'spawned' });
    await enterAppScope(client, PARIWAR_A);

    const snap = serializePoolSnapshot({
      poolId: pid,
      pariwarId: PARIWAR_A,
      cycleId,
      poolIndex: 0,
      supportCategory: 'death_support',
      benefitMechanism: 'pool',
      fixedAmount: 500,
      currentState: 'spawned',
      memberAssignments: [],
    });

    await tx.insert(schema.poolSnapshots).values({
      poolId: toPoolId(pid),
      pariwarId: PARIWAR_A,
      formatVersion: snap.format_version,
      schemaVersion: snap.schema_version,
      integrityHash: snap.integrity_hash,
      stateEventVersion: 1,
      snapshot: snap,
    });

    const rows = await tx
      .select()
      .from(schema.poolSnapshots)
      .where(eq(schema.poolSnapshots.poolId, toPoolId(pid)));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.integrityHash).toBe(snap.integrity_hash);
    // The JSONB round-trips through the migration adapter + integrity verifies.
    const readBack = readPoolSnapshot(rows[0]?.snapshot);
    expect(readBack).toEqual(snap);
    expect(verifyPoolSnapshotIntegrity(readBack)).toBe(true);
  });

  it('the pools FK rejects a snapshot for a non-existent pool (23503)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const snap = serializePoolSnapshot({
      poolId: randomUUID(),
      pariwarId: PARIWAR_A,
      cycleId: randomUUID(),
      poolIndex: 0,
      supportCategory: 'death_support',
      benefitMechanism: 'pool',
      fixedAmount: 500,
      currentState: 'spawned',
      memberAssignments: [],
    });
    const err = await tx
      .insert(schema.poolSnapshots)
      .values({
        poolId: toPoolId(snap.pool_id),
        pariwarId: PARIWAR_A,
        formatVersion: snap.format_version,
        schemaVersion: snap.schema_version,
        integrityHash: snap.integrity_hash,
        stateEventVersion: 1,
        snapshot: snap,
      })
      .catch((e: unknown) => e);
    expect((err as { cause?: { code?: string } }).cause?.code).toBe('23503');
  });

  it('cross-tenant: a snapshot seeded under B is invisible under scope A', async () => {
    const { client, tx } = getTx();
    const pidB = randomUUID();
    await seedPool(tx, PARIWAR_B, { poolId: pidB });
    // Seed a snapshot for B as superuser (RLS bypassed), before entering A scope.
    const snapB = serializePoolSnapshot({
      poolId: pidB,
      pariwarId: PARIWAR_B,
      cycleId: randomUUID(),
      poolIndex: 0,
      supportCategory: 'death_support',
      benefitMechanism: 'pool',
      fixedAmount: 500,
      currentState: 'spawned',
      memberAssignments: [],
    });
    await tx.insert(schema.poolSnapshots).values({
      poolId: toPoolId(pidB),
      pariwarId: PARIWAR_B,
      formatVersion: snapB.format_version,
      schemaVersion: snapB.schema_version,
      integrityHash: snapB.integrity_hash,
      stateEventVersion: 1,
      snapshot: snapB,
    });
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx
      .select()
      .from(schema.poolSnapshots)
      .where(eq(schema.poolSnapshots.poolId, toPoolId(pidB)));
    expect(rows).toHaveLength(0); // B's snapshot is invisible under A scope
  });

  it('negative: INSERT with a mismatched pariwarId is rejected by withCheck (42501)', async () => {
    const { client, tx } = getTx();
    const pid = randomUUID();
    await seedPool(tx, PARIWAR_A, { poolId: pid });
    await enterAppScope(client, PARIWAR_A);

    const snap = serializePoolSnapshot({
      poolId: pid,
      pariwarId: PARIWAR_A,
      cycleId: randomUUID(),
      poolIndex: 0,
      supportCategory: 'death_support',
      benefitMechanism: 'pool',
      fixedAmount: 500,
      currentState: 'spawned',
      memberAssignments: [],
    });
    const err = await tx
      .insert(schema.poolSnapshots)
      .values({
        poolId: toPoolId(pid),
        pariwarId: PARIWAR_B, // ← MISMATCH under scope A
        formatVersion: snap.format_version,
        schemaVersion: snap.schema_version,
        integrityHash: snap.integrity_hash,
        stateEventVersion: 1,
        snapshot: snap,
      })
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('FORCE RLS: pool_snapshots has rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
         WHERE relname = 'pool_snapshots'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
  });
});
