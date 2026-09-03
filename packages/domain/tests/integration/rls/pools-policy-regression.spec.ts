// pools RLS policy-regression — Story 7.1 (Task 1; architecture line 745 — every RLS
// policy ships with a test). Mirrors claims-policy-regression: positive (allowed query
// returns expected rows) + negative (forbidden query empty / raises) assertions for the
// tenant-isolation policies, the connection-level fail-closed probe, and the FORCE-RLS
// catalog regression guard. Live DB only.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { mintPoolPublicToken } from '../../../src/pool/public-token.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppRoleNoScope,
  enterAppScope,
  seedPool,
} from '../_helpers.js';

describe.skipIf(!hasDatabase)('pools RLS policy regression', () => {
  setupLiveDb();

  it('positive: SELECT under scope A returns only A pool rows', async () => {
    const { tx, client } = getTx();
    await seedPool(tx, PARIWAR_A);
    await seedPool(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.pools);
    expect(rows).not.toHaveLength(0); // guard: empty would pass every() vacuously
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('negative: scope B does NOT see A pool rows (symmetric: B sees its own)', async () => {
    const { tx, client } = getTx();
    await seedPool(tx, PARIWAR_A);
    await seedPool(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_B);

    const rows = await tx.select().from(schema.pools);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
  });

  it('negative: INSERT with a mismatched pariwarId is rejected by withCheck (42501)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // Isolate the RLS withCheck policy, which is orthogonal to the AC5 pools.current_state
    // write-rejection trigger (that trigger also fires BEFORE INSERT, and Postgres runs
    // BEFORE ROW triggers ahead of WITH CHECK — an unguarded insert would hit P0001 first
    // and never reach the RLS check this test wants). Set the projector's session guard so
    // the trigger steps aside and RLS is the only gate under test.
    await client.query("SET LOCAL app.pool_state_writer = 'on'");
    const err = await tx
      .insert(schema.pools)
      .values({
        poolId: randomUUID() as never,
        pariwarId: PARIWAR_B, // ← MISMATCH under scope A
        cycleId: randomUUID() as never,
        claimCaseId: randomUUID() as never,
        poolIndex: 0,
        poolCanonicalIdentifier: `P-2026-07-${randomUUID().slice(0, 3)}`,
        supportCategory: 'death_support',
        benefitMechanism: 'pool',
        fixedAmount: 500,
        currentState: 'spawned',
        stateEventVersion: 1,
        // Story 11b.10 — the public address. Minted, never a literal: the column's unique index is
        // GLOBAL, so a shared constant would 23505 on the second seeded pool.
        publicToken: mintPoolPublicToken(),
      })
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    await seedPool(tx, PARIWAR_A);
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.pools);
    expect(rows).toHaveLength(0);
  });

  it('FORCE RLS: pools has rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
         WHERE relname = 'pools'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
  });
});
