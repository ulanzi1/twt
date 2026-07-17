// pool_names + pool_canonical_counters RLS policy-regression — Story 7.2 (Tasks 3/5;
// architecture line 745 — every RLS policy ships with a test). Mirrors
// pools-policy-regression: positive (allowed query returns expected rows) + negative
// (forbidden query empty / raises) assertions for the tenant-isolation policies, the
// connection-level fail-closed probe, and the FORCE-RLS catalog regression guard.
// Live DB only.
//
// What isolation BUYS here, concretely: a Pariwar's curated name list is its cultural
// configuration (one tenant must not read, extend, or reorder another's), and a leaked
// counter would disclose how many pools another tenant spawned in a month.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppRoleNoScope,
  enterAppScope,
  seedPoolName,
} from '../_helpers.js';

describe.skipIf(!hasDatabase)('pool_names RLS policy regression', () => {
  setupLiveDb();

  it('positive: SELECT under scope A returns only A name rows', async () => {
    const { tx, client } = getTx();
    await seedPoolName(tx, PARIWAR_A, 0);
    await seedPoolName(tx, PARIWAR_B, 0);
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.poolNames);
    expect(rows).not.toHaveLength(0); // guard: empty would pass every() vacuously
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('negative: scope B does NOT see A name rows (symmetric: B sees its own)', async () => {
    const { tx, client } = getTx();
    await seedPoolName(tx, PARIWAR_A, 0);
    await seedPoolName(tx, PARIWAR_B, 0);
    await enterAppScope(client, PARIWAR_B);

    const rows = await tx.select().from(schema.poolNames);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
  });

  it('negative: INSERT with a mismatched pariwarId is rejected by withCheck (42501)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const err = await tx
      .insert(schema.poolNames)
      .values({
        poolNameId: randomUUID() as never,
        pariwarId: PARIWAR_B, // ← MISMATCH under scope A
        positionInOrderedList: 0,
        displayNameEn: 'Injected',
        displayNameHi: 'इंजेक्टेड',
      })
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it("negative: scope A cannot UPDATE another tenant's curated name (0 rows affected)", async () => {
    const { tx, client } = getTx();
    const bNameId = await seedPoolName(tx, PARIWAR_B, 0, { displayNameEn: 'B-original' });
    await enterAppScope(client, PARIWAR_A);

    // The USING predicate makes B's row invisible to A's UPDATE — it matches nothing
    // rather than raising. Silently rewriting another tenant's cultural list would be a
    // severe, invisible failure, so assert the row is untouched afterwards.
    await tx
      .update(schema.poolNames)
      .set({ displayNameEn: 'A-hijacked' })
      .where(eq(schema.poolNames.poolNameId, bNameId as never));

    // Verify as the superuser, NOT under scope A: A's own SELECT is filtered by the same
    // USING predicate, so checking from inside A's scope would return zero rows and pass
    // vacuously whether or not the UPDATE had landed. RESET ROLE sheds twt_app back to the
    // Docker superuser (RLS-bypassing) so the row's TRUE state is observable.
    await client.query('RESET ROLE');
    const { rows } = await client.query<{ display_name_en: string }>(
      'SELECT display_name_en FROM pool_names WHERE pool_name_id = $1',
      [bNameId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.display_name_en).toBe('B-original');
  });

  it("negative: scope A cannot DELETE another tenant's curated name (0 rows affected)", async () => {
    const { tx, client } = getTx();
    const bNameId = await seedPoolName(tx, PARIWAR_B, 0, { displayNameEn: 'B-original' });
    await enterAppScope(client, PARIWAR_A);

    // Same USING-predicate invisibility as the UPDATE case above: the DELETE matches
    // nothing under scope A rather than raising, so assert the row SURVIVES.
    await tx.delete(schema.poolNames).where(eq(schema.poolNames.poolNameId, bNameId as never));

    await client.query('RESET ROLE');
    const { rows } = await client.query<{ pool_name_id: string }>(
      'SELECT pool_name_id FROM pool_names WHERE pool_name_id = $1',
      [bNameId],
    );
    expect(rows).toHaveLength(1);
  });

  it('positive: scope A CAN delete its OWN curated name', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const aNameId = await seedPoolName(tx, PARIWAR_A, 0, { displayNameEn: 'A-own' });

    await tx.delete(schema.poolNames).where(eq(schema.poolNames.poolNameId, aNameId as never));

    const rows = await tx.select().from(schema.poolNames).where(eq(schema.poolNames.poolNameId, aNameId as never));
    expect(rows).toHaveLength(0);
  });

  it('connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    await seedPoolName(tx, PARIWAR_A, 0);
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.poolNames);
    expect(rows).toHaveLength(0);
  });

  it('FORCE RLS: pool_names has rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'pool_names'`);
    expect(rows).toHaveLength(1);
    expect(rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
  });
});

describe.skipIf(!hasDatabase)('pool_canonical_counters RLS policy regression', () => {
  setupLiveDb();

  it('positive: SELECT under scope A returns only A counter rows', async () => {
    const { tx, client } = getTx();
    await tx.insert(schema.poolCanonicalCounters).values([
      { pariwarId: PARIWAR_A, period: '2026-05', nextSequence: 3 },
      { pariwarId: PARIWAR_B, period: '2026-05', nextSequence: 7 },
    ]);
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.poolCanonicalCounters);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it("negative: scope A cannot read B's counter (no cross-tenant spawn-volume disclosure)", async () => {
    const { tx, client } = getTx();
    await tx
      .insert(schema.poolCanonicalCounters)
      .values({ pariwarId: PARIWAR_B, period: '2026-05', nextSequence: 42 });
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx
      .select()
      .from(schema.poolCanonicalCounters)
      .where(eq(schema.poolCanonicalCounters.period, '2026-05'));
    expect(rows).toHaveLength(0);
  });

  it('negative: INSERT with a mismatched pariwarId is rejected by withCheck (42501)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const err = await tx
      .insert(schema.poolCanonicalCounters)
      .values({ pariwarId: PARIWAR_B, period: '2026-05', nextSequence: 1 }) // ← MISMATCH
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    await tx
      .insert(schema.poolCanonicalCounters)
      .values({ pariwarId: PARIWAR_A, period: '2026-05', nextSequence: 1 });
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.poolCanonicalCounters);
    expect(rows).toHaveLength(0);
  });

  it('FORCE RLS: pool_canonical_counters has rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
         WHERE relname = 'pool_canonical_counters'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
  });
});
