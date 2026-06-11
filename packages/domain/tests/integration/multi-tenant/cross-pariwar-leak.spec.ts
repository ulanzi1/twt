// Cross-Pariwar adversarial leak test — Story 1.6 (AC-6) + Story 1.7 carve-out.
//
// Epics line 1095-1098: Pariwar A admin attempts to read Pariwar B data → every
// cross-tenant read of a SCOPED table returns zero rows REGARDLESS of query shape;
// any leak fails CI as P0. This suite probes 6 query shapes on events_log (basic
// SELECT, explicit WHERE bypass, raw SQL, COUNT aggregate, self-join, subquery)
// and the complementary runAsCrossTenant positive path + its audit-event emission.
//
// ⚠ Story 1.7 adds the EXPECTED CROSS-READABLE EXCEPTION: pariwar_passport is the
// architecture's single pre-authorised carve-out (§1.2 line 726-729). Its rows
// ARE visible cross-tenant by design (USING true). The dedicated describe block
// at the bottom asserts that positively. pariwar_passport must NEVER be added to
// the "must return 0 rows" set above — that is the load-bearing distinction: a
// wrong assertion here would either green-light a real leak on scoped tables or
// red-fail the legitimate carve-out.
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
  seedPassport,
  seedRoleGrant,
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

  // Story 1.8 — role_grants is a SCOPED table (NOT a Passport-style carve-out): a
  // cross-Pariwar grant read is a real leak (who-holds-what-role in another
  // tenant). It MUST return 0 rows cross-tenant, exactly like events_log.
  it('role_grants (scoped) — A scope sees only A grants, never B', async () => {
    const { tx, client } = getTx();
    await seedRoleGrant(tx, PARIWAR_A, { role: 'district_admin' });
    await seedRoleGrant(tx, PARIWAR_B, { role: 'state_trustee' });
    await enterAppScope(client, PARIWAR_A);

    const all = await tx.select().from(schema.roleGrants);
    expect(all).toHaveLength(1);
    expect(all[0]?.pariwarId).toBe(PARIWAR_A);

    const bRows = await tx
      .select()
      .from(schema.roleGrants)
      .where(eq(schema.roleGrants.pariwarId, PARIWAR_B));
    expect(bRows).toHaveLength(0);

    // Raw SQL bypass attempt — still RLS-filtered to 0 rows.
    const raw = await client.query<{ pariwar_id: string }>(
      `SELECT pariwar_id FROM role_grants WHERE pariwar_id = $1`,
      [PARIWAR_B],
    );
    expect(raw.rows).toHaveLength(0);
  });
});

describe.skipIf(!hasDatabase)('Pariwar-Passport carve-out (EXPECTED cross-readable exception)', () => {
  setupLiveDb();

  it('A scope DOES read B passport — the carve-out, NOT a leak', async () => {
    const { tx, client } = getTx();
    await seedPassport(tx, PARIWAR_A);
    await seedPassport(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    const bPassport = await tx
      .select()
      .from(schema.pariwarPassport)
      .where(eq(schema.pariwarPassport.pariwarId, PARIWAR_B));
    // Inverse of the events_log probes above: cross-tenant rows ARE visible here.
    expect(bPassport).toHaveLength(1);
    expect(bPassport[0]?.pariwarId).toBe(PARIWAR_B);
  });

  it('contrast in ONE test: events_log(B)=0 rows but pariwar_passport(B)=1 row under A scope', async () => {
    const { tx, client } = getTx();
    await seedEvent(tx, PARIWAR_B);
    await seedPassport(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    const bEvents = await tx
      .select()
      .from(schema.eventsLog)
      .where(eq(schema.eventsLog.pariwarId, PARIWAR_B));
    const bPassport = await tx
      .select()
      .from(schema.pariwarPassport)
      .where(eq(schema.pariwarPassport.pariwarId, PARIWAR_B));

    expect(bEvents).toHaveLength(0); // scoped table — fail-closed (the invariant)
    expect(bPassport).toHaveLength(1); // carve-out table — cross-readable (the exception)
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
