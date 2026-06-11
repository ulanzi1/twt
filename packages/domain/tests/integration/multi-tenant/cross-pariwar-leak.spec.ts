// Cross-Pariwar adversarial leak test — Story 1.6 (AC-6).
//
// Epics line 1095-1098: Pariwar A admin attempts to read Pariwar B data → every
// cross-tenant read returns zero rows REGARDLESS of query shape; any leak fails
// CI as P0. This suite probes 6 query shapes (basic SELECT, explicit WHERE
// bypass, raw SQL, COUNT aggregate, self-join, subquery) and the complementary
// runAsCrossTenant positive path + its audit-event emission.
//
// RLS-in-tests model: see _helpers.ts — `SET LOCAL ROLE twt_app` sheds the
// Docker superuser so the policies actually apply on the per-test transaction.

import { randomUUID } from 'node:crypto';

import { count, eq } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  CROSS_TENANT_SENTINEL_UUID,
  runAsCrossTenant,
} from '../../../src/cross-tenant/index.js';
import * as schema from '../../../src/schema/index.js';
import {
  DATABASE_URL,
  getTx,
  hasDatabase,
  setupLiveDb,
} from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  PARIWAR_X,
  PARIWAR_Y,
  enterAppScope,
  seedEvent,
} from '../_helpers.js';

describe.skipIf(!hasDatabase)('cross-Pariwar adversarial leak (RLS-enforced)', () => {
  setupLiveDb();

  // Seed A + B as superuser, then enter app scope A — used by every shape probe.
  async function seedAndScopeA(): Promise<void> {
    const { tx, client } = getTx();
    await seedEvent(tx, PARIWAR_A);
    await seedEvent(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
  }

  it('basic SELECT — A scope sees only A rows', async () => {
    await seedAndScopeA();
    const { tx } = getTx();
    const rows = await tx.select().from(schema.eventsLog);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.pariwarId).toBe(PARIWAR_A);
  });

  it('explicit WHERE pariwarId = B — A scope sees zero rows', async () => {
    await seedAndScopeA();
    const { tx } = getTx();
    const rows = await tx
      .select()
      .from(schema.eventsLog)
      .where(eq(schema.eventsLog.pariwarId, PARIWAR_B));
    expect(rows).toHaveLength(0);
  });

  it('raw SQL WHERE pariwar_id = B — A scope sees zero rows', async () => {
    await seedAndScopeA();
    const { client } = getTx();
    const r = await client.query<{ pariwar_id: string }>(
      `SELECT pariwar_id FROM events_log WHERE pariwar_id = $1`,
      [PARIWAR_B],
    );
    expect(r.rows).toHaveLength(0);
  });

  it('COUNT aggregate — A scope counts only A rows', async () => {
    await seedAndScopeA();
    const { tx } = getTx();
    const rows = await tx.select({ n: count() }).from(schema.eventsLog);
    expect(Number(rows[0]?.n)).toBe(1);
  });

  it('self-join on differing pariwar_id — A scope sees zero cross-tenant pairs', async () => {
    await seedAndScopeA();
    const { client } = getTx();
    // Both relations in the join are RLS-filtered to A independently, so no
    // (a.pariwar_id != b.pariwar_id) pair is visible.
    const r = await client.query(
      `SELECT a.pariwar_id, b.pariwar_id AS other
         FROM events_log a JOIN events_log b ON a.pariwar_id != b.pariwar_id`,
    );
    expect(r.rows).toHaveLength(0);
  });

  it('subquery — A scope cannot leak B via IN (subquery)', async () => {
    await seedAndScopeA();
    const { client } = getTx();
    const r = await client.query(
      `SELECT pariwar_id FROM events_log
         WHERE event_id IN (SELECT event_id FROM events_log WHERE pariwar_id = $1)`,
      [PARIWAR_B],
    );
    expect(r.rows).toHaveLength(0);
  });
});

describe.skipIf(!hasDatabase)('cross-Pariwar helper verification (runAsCrossTenant)', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2, ssl: false });
    pool.on('error', (err) => console.error('[cross-pariwar pool]', err.message));
  });
  afterAll(() => pool.end());

  it('runAsCrossTenant — legitimate cross-tenant read sees multiple tenants', async () => {
    // Seed under row_security=off (runAsCrossTenant bypasses RLS) with dedicated
    // tenants X/Y (committed rows; the append-only trigger blocks cleanup), so
    // the read asserts membership rather than an exact count and does not
    // pollute the A/B exact-count assertions in the RLS-enforced block above.
    await runAsCrossTenant(pool, { reason: 'test-seed', actorId: null }, async (db) => {
      await db.insert(schema.eventsLog).values({
        streamId: randomUUID(),
        eventType: 'test.created',
        payload: {},
        eventVersion: 1,
        actorId: null,
        pariwarId: PARIWAR_X,
      });
      await db.insert(schema.eventsLog).values({
        streamId: randomUUID(),
        eventType: 'test.created',
        payload: {},
        eventVersion: 1,
        actorId: null,
        pariwarId: PARIWAR_Y,
      });
    });

    const rows = await runAsCrossTenant(
      pool,
      { reason: 'test-cross-tenant-read', actorId: null },
      (db) => db.select().from(schema.eventsLog),
    );
    const pariwarIds = new Set(rows.map((r) => r.pariwarId));
    expect(pariwarIds.has(PARIWAR_X)).toBe(true);
    expect(pariwarIds.has(PARIWAR_Y)).toBe(true);
  });

  it('runAsCrossTenant emits an audit.cross_tenant_access event', async () => {
    await runAsCrossTenant(pool, { reason: 'test-audit-verification', actorId: null }, async () => undefined);

    const auditEvents = await runAsCrossTenant(
      pool,
      { reason: 'test-read-audit', actorId: null },
      (db) =>
        db
          .select()
          .from(schema.eventsLog)
          .where(eq(schema.eventsLog.eventType, 'audit.cross_tenant_access')),
    );
    expect(auditEvents.length).toBeGreaterThanOrEqual(1);
    expect(auditEvents[0]?.pariwarId).toBe(CROSS_TENANT_SENTINEL_UUID);
    expect(auditEvents[0]?.payload).toMatchObject({ reason: expect.any(String) });
  });
});
