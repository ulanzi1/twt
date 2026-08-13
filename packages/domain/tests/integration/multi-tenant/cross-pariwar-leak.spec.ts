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
import { clauseId as toClauseId } from '../../../src/ids/index.js';
import { amendClause, createClause } from '../../../src/niyamavali/index.js';
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
  seedClauseVersion,
  seedEvent,
  seedPassport,
  seedRoleGrant,
  seedUser,
} from '../_helpers.js';

describe.skipIf(!hasDatabase)('cross-Pariwar adversarial leak (RLS-enforced)', () => {
  setupLiveDb();

  // Seed A + B as superuser, then enter app scope A — used by every shape probe.
  // Returns the seeded stream ids so probes can assert PRESENCE of their own row rather than an
  // absolute row count (see the note on accumulation below).
  async function seedAndScopeA(): Promise<{ aStreamId: string; bStreamId: string }> {
    const { tx, client } = getTx();
    const aStreamId = await seedEvent(tx, PARIWAR_A);
    const bStreamId = await seedEvent(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    return { aStreamId, bStreamId };
  }

  it('basic SELECT — A scope sees only A rows', async () => {
    const { aStreamId } = await seedAndScopeA();
    const { tx } = getTx();
    const rows = await tx.select().from(schema.eventsLog);
    // ⚠ NOT `toHaveLength(1)` (2026-08-04). `setupLiveDb()` rolls THIS test's transaction back, but
    // own-committing suites elsewhere in the repo leave A-scoped rows behind, so an absolute count
    // encodes "this database has only ever run this one test" — true on a fresh CI container, false
    // on any reused local DB, and never the property under test. The leak-invariant is that NO B row
    // is visible and EVERY visible row is A's — which is also strictly stronger than checking
    // `rows[0]` alone. Mirrors the sibling negative probes and
    // rls/policy-regression.spec.ts ([[project_live_db_test_gotchas]]: assert membership, not counts).
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
    expect(rows.map((r) => r.streamId)).toContain(aStreamId);
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
    const visible = await tx.select().from(schema.eventsLog);
    const rows = await tx.select({ n: count() }).from(schema.eventsLog);
    // ⚠ NOT `toBe(1)` — see the note on the basic-SELECT probe. The failure mode this test exists to
    // catch is COUNT() bypassing RLS and tallying B's rows too; that is caught exactly by requiring
    // the aggregate to agree with the RLS-filtered SELECT, since B rows DO exist in the table (both
    // are seeded above). A leaking COUNT would exceed `visible.length`. This is not a tautology: the
    // two go through different planner paths, which is why the probe exists at all.
    expect(Number(rows[0]?.n)).toBe(visible.length);
    expect(visible.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
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

  // Story 2.3 — clause_versions is a SCOPED table (NOT a Passport carve-out, even
  // though the Niyamavali is publicly rendered — each Pariwar's public site reads
  // with its OWN app.pariwar_id set). A cross-Pariwar clause read is a real leak.
  it('clause_versions (scoped) — A scope sees only A clauses, never B', async () => {
    const { tx, client } = getTx();
    await seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.a.one' });
    await seedClauseVersion(tx, PARIWAR_B, { clauseId: 'niy.b.one' });
    await enterAppScope(client, PARIWAR_A);

    const all = await tx.select().from(schema.clauseVersions);
    expect(all).toHaveLength(1);
    expect(all[0]?.pariwarId).toBe(PARIWAR_A);

    const bRows = await tx
      .select()
      .from(schema.clauseVersions)
      .where(eq(schema.clauseVersions.pariwarId, PARIWAR_B));
    expect(bRows).toHaveLength(0);

    const raw = await client.query<{ pariwar_id: string }>(
      `SELECT pariwar_id FROM clause_versions WHERE pariwar_id = $1`,
      [PARIWAR_B],
    );
    expect(raw.rows).toHaveLength(0);
  });

  // Story 2.3 — niyamavali_amendments is also SCOPED (amendment lineage is
  // per-tenant). Seeded via the accessors as superuser (RLS bypassed) so both
  // tenants' rows land; then A scope must see only its own.
  it('niyamavali_amendments (scoped) — A scope sees only A amendments, never B', async () => {
    const { tx, client } = getTx();
    // Seed an amendment per tenant (superuser, before entering app scope).
    for (const pariwar of [PARIWAR_A, PARIWAR_B]) {
      await createClause(tx, {
        pariwarId: pariwar,
        clauseId: toClauseId('niy.leak.amend'),
        effectiveDate: new Date('2025-01-01T00:00:00Z'),
        payload: { v: 1 },
        benefitMechanism: 'pool',
      });
      await amendClause(tx, {
        pariwarId: pariwar,
        clauseId: toClauseId('niy.leak.amend'),
        payload: { v: 2 },
        effectiveDate: new Date('2025-06-01T00:00:00Z'),
        affectedMemberScope: { kind: 'all_members' },
      });
    }
    await enterAppScope(client, PARIWAR_A);

    const all = await tx.select().from(schema.niyamavaliAmendments);
    expect(all).toHaveLength(1);
    expect(all[0]?.pariwarId).toBe(PARIWAR_A);

    const raw = await client.query<{ pariwar_id: string }>(
      `SELECT pariwar_id FROM niyamavali_amendments WHERE pariwar_id = $1`,
      [PARIWAR_B],
    );
    expect(raw.rows).toHaveLength(0);
  });

  // Story 1.18 — geo_tree_versions is a SCOPED table, and it belongs in this set for a sharper
  // reason than "it has a pariwar_id". ⛔ A LEAKED ORG TREE IS A LEAKED AUTHORIZATION INPUT: the
  // resolver's answers ARE authorization decisions (`contains(state=Bihar, district=Patna)` is what
  // lets a state-held grant reach a district-scoped target), so reading another Pariwar's tree
  // discloses that tenant's administrative structure AND supplies a widening input to a decision
  // that is supposed to be scoped. It is NOT geography-as-reference-data and must never be
  // reclassified as a Passport-style cross-readable carve-out — each Pariwar owns its own subtree
  // (`GEO_RANK` puts `pariwar` ABOVE `state`), so there is no shared national tree to carve out.
  it('geo_tree_versions (scoped) — A scope sees only A trees, never B', async () => {
    const { tx, client } = getTx();
    // Seed one tree version per tenant as superuser (before entering app scope).
    for (const pariwar of [PARIWAR_A, PARIWAR_B]) {
      await tx.insert(schema.geoTreeVersions).values({
        pariwarId: pariwar,
        version: 1,
        effectiveAt: new Date('2025-01-01T00:00:00Z'),
        treeDocument: {
          version: 1,
          nodes: [
            { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
            {
              dimension: 'district',
              value: 'Patna',
              parent_dimension: 'state',
              parent_value: 'Bihar',
            },
          ],
        },
      });
    }
    await enterAppScope(client, PARIWAR_A);

    const all = await tx.select().from(schema.geoTreeVersions);
    expect(all).toHaveLength(1);
    expect(all[0]?.pariwarId).toBe(PARIWAR_A);

    const bRows = await tx
      .select()
      .from(schema.geoTreeVersions)
      .where(eq(schema.geoTreeVersions.pariwarId, PARIWAR_B));
    expect(bRows).toHaveLength(0);

    // Raw SQL bypass attempt — still RLS-filtered to 0 rows.
    const raw = await client.query<{ pariwar_id: string }>(
      `SELECT pariwar_id FROM geo_tree_versions WHERE pariwar_id = $1`,
      [PARIWAR_B],
    );
    expect(raw.rows).toHaveLength(0);

    // ⭐ The one that matters most: the DOCUMENT BODY must not leak either. A tree read that
    // returned the JSONB with a filtered pariwar_id would still hand over the other tenant's
    // administrative structure — so probe the payload column directly, not just the tenant key.
    const rawDoc = await client.query<{ tree_document: unknown }>(
      `SELECT tree_document FROM geo_tree_versions WHERE tree_document IS NOT NULL`,
    );
    expect(rawDoc.rows).toHaveLength(1);
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
    await runAsCrossTenant(pool, pool, { reason: 'test-seed', actorId: null }, async (db) => {
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
      pool,
      { reason: 'test-cross-tenant-read', actorId: null },
      (db) => db.select().from(schema.eventsLog),
    );
    const pariwarIds = new Set(rows.map((r) => r.pariwarId));
    expect(pariwarIds.has(PARIWAR_X)).toBe(true);
    expect(pariwarIds.has(PARIWAR_Y)).toBe(true);
  });

  it('runAsCrossTenant emits an audit.cross_tenant_access row into audit_log_entries (Story 1.10 re-key)', async () => {
    // Re-keyed from events_log → audit_log_entries (D5-1.6). The audit line is now
    // a tamper-evident hash-chained row carrying the sentinel pariwar_id.
    await runAsCrossTenant(pool, pool, { reason: 'test-audit-verification', actorId: null }, async () => undefined);

    // Read the audit rows cross-tenant (row_security=off sees the sentinel rows).
    const auditRows = await runAsCrossTenant(
      pool,
      pool,
      { reason: 'test-read-audit', actorId: null },
      (db) =>
        db
          .select()
          .from(schema.auditLogEntries)
          .where(eq(schema.auditLogEntries.action, 'audit.cross_tenant_access')),
    );
    expect(auditRows.length).toBeGreaterThanOrEqual(1);
    expect(auditRows.every((r) => r.pariwarId === CROSS_TENANT_SENTINEL_UUID)).toBe(true);
    expect(auditRows[0]?.auditHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// Story 1.9 — the identity/auth carve-out family (users + admin-auth tables) is
// GLOBAL / non-tenant (Reconciliation R2): these tables have NO pariwar_id, so
// "cross-Pariwar read" is not even meaningful. They are classified as
// cross-readable-by-design (USING(true) for twt_app) — NOT scoped-must-return-0.
// ⚠ They must NEVER be added to the "must return 0 rows" set above: a wrong
// classification would make login (which runs BEFORE any scope is set) return 0
// rows and break authentication structurally.
describe.skipIf(!hasDatabase)('identity/auth carve-out family (GLOBAL, NOT must-return-0)', () => {
  setupLiveDb();

  it('users is readable under an arbitrary active scope (global, not fail-closed)', async () => {
    const { tx, client } = getTx();
    const uid = await seedUser(tx); // seeded as superuser
    await enterAppScope(client, PARIWAR_A); // SET LOCAL ROLE twt_app + scope A

    // Contrast events_log (which would be 0 rows for a B-scoped read): users is
    // global — the just-seeded row IS visible under the twt_app role + USING(true).
    const rows = await client.query<{ id: string }>(`SELECT id FROM users WHERE id = $1`, [uid]);
    expect(rows.rows).toHaveLength(1);
  });

  it('admin_credentials is readable under app role (the login lookup path works)', async () => {
    const { tx, client } = getTx();
    const uid = await seedUser(tx);
    await client.query(
      `INSERT INTO admin_credentials (user_id, email_ciphertext, email_blind_index, password_hash)
         VALUES ($1, 'enc:v1:x', $2, 'hash')`,
      [uid, `bidx-${uid}`],
    );
    await enterAppScope(client, PARIWAR_A);
    const rows = await client.query(`SELECT user_id FROM admin_credentials WHERE user_id = $1`, [uid]);
    expect(rows.rows).toHaveLength(1);
  });

  it('retro FK: an orphan role_grants.user_id (no users row) is rejected', async () => {
    const { client } = getTx();
    // No users row for this id → the D4-1.8 FK rejects the insert (23503).
    await expect(
      client.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES (gen_random_uuid(), $1, 'auditor', 'pariwar', $2)`,
        [PARIWAR_A, PARIWAR_A],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('retro FK: a role_grants row with an existing users row is accepted', async () => {
    const { tx, client } = getTx();
    const uid = await seedUser(tx);
    await expect(
      client.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, 'auditor', 'pariwar', $3)`,
        [uid, PARIWAR_A, PARIWAR_A],
      ),
    ).resolves.toBeDefined();
  });
});
