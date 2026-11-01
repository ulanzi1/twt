// marketplace_modules RLS policy-regression — Story 12.1 (Task 8; architecture "every RLS policy ships with a
// test"). Mirrors alerts-policy-regression: positive + negative isolation, the withCheck 42501, the
// connection-level fail-closed probe, the FORCE-RLS catalog guard, DELETE denied, and the `FOR UPDATE` row
// lock every transition command takes first (QE7) — which under twt_app needs the UPDATE grant plus the
// SELECT and UPDATE policies' USING clauses (G15). Raw INSERTs set the writer guard so the trigger (which
// runs BEFORE the RLS WITH CHECK) steps aside and the RLS leg is isolated. Live DB only.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';
import { RAW_INSERT_SQL, expectSqlRejected, rawInsertParams, seedPartner } from '../marketplace/_fixtures.js';

const GUARD_ON = "SET LOCAL app.marketplace_module_state_writer = 'on'";

describe.skipIf(!hasDatabase)('marketplace_modules RLS policy regression', () => {
  setupLiveDb();

  /** Seed one module row per tenant (each under its own scope). Returns [aId, bId]. */
  async function seedBoth(): Promise<[string, string]> {
    const { client } = getTx();
    const a = randomUUID();
    const b = randomUUID();
    await enterAppScope(client, PARIWAR_B);
    await client.query(GUARD_ON);
    await client.query(RAW_INSERT_SQL, rawInsertParams(b, PARIWAR_B, { partnerId: await seedPartner(client, PARIWAR_B) }));
    await enterAppScope(client, PARIWAR_A);
    await client.query(GUARD_ON);
    await client.query(RAW_INSERT_SQL, rawInsertParams(a, PARIWAR_A, { partnerId: await seedPartner(client, PARIWAR_A) }));
    return [a, b];
  }

  it('positive: SELECT under scope A returns A rows and ⛔ B rows', async () => {
    const { client } = getTx();
    const [a, b] = await seedBoth();
    await enterAppScope(client, PARIWAR_A);
    const r = await client.query<{ module_id: string; pariwar_id: string }>('SELECT module_id, pariwar_id FROM marketplace_modules');
    expect(r.rows.length).toBeGreaterThan(0);
    expect(r.rows.every((x) => x.pariwar_id === PARIWAR_A)).toBe(true);
    expect(r.rows.some((x) => x.module_id === a)).toBe(true);
    expect(r.rows.some((x) => x.module_id === b)).toBe(false);
  });

  it('negative: scope B sees its own row and ⛔ A’s (symmetric)', async () => {
    const { client } = getTx();
    const [a, b] = await seedBoth();
    await enterAppScope(client, PARIWAR_B);
    const r = await client.query<{ module_id: string }>('SELECT module_id FROM marketplace_modules WHERE module_id = ANY($1)', [[a, b]]);
    expect(r.rows.map((x) => x.module_id)).toEqual([b]);
  });

  it('negative: an INSERT for another tenant is rejected by withCheck (42501)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await client.query(GUARD_ON);
    await expectSqlRejected(client, RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_B, { partnerId: await seedPartner(client, PARIWAR_B) }), '42501');
  });

  it('negative: an UPDATE cannot reach another tenant’s row (0 rows), even guarded', async () => {
    const { client } = getTx();
    const [, b] = await seedBoth();
    await enterAppScope(client, PARIWAR_A);
    await client.query(GUARD_ON);
    const r = await client.query(
      "UPDATE marketplace_modules SET current_state = 'active', state_event_version = 2 WHERE module_id = $1",
      [b],
    );
    expect(r.rowCount).toBe(0);
  });

  it('fail-closed: twt_app with NO scope sees zero rows and cannot insert', async () => {
    const { client } = getTx();
    await seedBoth();
    await enterAppRoleNoScope(client);
    // seedBoth left scope A set in this transaction — clear it (unset scope → NULL → 0 rows).
    await client.query("SELECT set_config('app.pariwar_id', '', true)");
    const r = await client.query('SELECT 1 FROM marketplace_modules');
    expect(r.rows).toHaveLength(0);
    await client.query(GUARD_ON);
    await expectSqlRejected(client, RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_A, { partnerId: await seedPartner(client, PARIWAR_A) }), '42501');
  });

  it('DELETE is denied to twt_app (42501 — ⛔ grant, ⛔ policy)', async () => {
    const { client } = getTx();
    const [a] = await seedBoth();
    await enterAppScope(client, PARIWAR_A);
    await expectSqlRejected(client, 'DELETE FROM marketplace_modules WHERE module_id = $1', [a], '42501');
  });

  it('SELECT … FOR UPDATE is allowed under twt_app on its own row, and finds ⛔ other tenant’s', async () => {
    const { client } = getTx();
    const [a, b] = await seedBoth();
    await enterAppScope(client, PARIWAR_A);
    const own = await client.query('SELECT module_id FROM marketplace_modules WHERE module_id = $1 AND pariwar_id = $2 FOR UPDATE', [a, PARIWAR_A]);
    expect(own.rows).toHaveLength(1);
    const other = await client.query('SELECT module_id FROM marketplace_modules WHERE module_id = $1 FOR UPDATE', [b]);
    expect(other.rows).toHaveLength(0);
  });

  it('catalog: relrowsecurity AND relforcerowsecurity are both on', async () => {
    const { client } = getTx();
    const r = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      "SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'marketplace_modules'",
    );
    expect(r.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
  });
});
