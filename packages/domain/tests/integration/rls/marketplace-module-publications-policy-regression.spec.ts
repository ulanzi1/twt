// marketplace_module_publications RLS policy-regression — Story 12.2 (`2026-11-01-433` QE4; AC1). Mirrors
// marketplace-partners-policy-regression: isolation both ways, the withCheck 42501, fail-closed, FORCE RLS, the two named
// policies, the INSERT-ONLY grant (I7) — plus AC1's composite-FK leg: a publication naming ANOTHER Pariwar's module is a
// 23503 even though the module exists (an FK check ignores RLS; only `(pariwar_id, module_id)` stops it). Live DB only.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';
import { RAW_INSERT_SQL, expectSqlRejected, rawInsertParams, seedPartner } from '../marketplace/_fixtures.js';

const GUARD_ON = "SET LOCAL app.marketplace_module_state_writer = 'on'";
const INSERT_PUBLICATION = `INSERT INTO marketplace_module_publications
  (module_id, pariwar_id, published_event_type, tone_signoff_content_hash, reviewed_by_actor_id, hindi_reviewed,
   partner_agreement_confirmed, audit_id)
  VALUES ($1, $2, 'module.activated', $3, $4, true, true, $5)`;
const pubParams = (moduleId: string, pariwar: string) => [moduleId, pariwar, 'e'.repeat(64), randomUUID(), randomUUID()];

describe.skipIf(!hasDatabase)('marketplace_module_publications RLS policy regression', () => {
  setupLiveDb();

  /** A module row in `pariwar` (guarded raw insert under its own scope, with its own partner). */
  async function moduleIn(client: pg.PoolClient, pariwar: string): Promise<string> {
    const id = randomUUID();
    const partnerId = await seedPartner(client, pariwar);
    await enterAppScope(client, pariwar);
    await client.query(GUARD_ON);
    await client.query(RAW_INSERT_SQL, rawInsertParams(id, pariwar, { partnerId }));
    return id;
  }

  /** One module + one publication per tenant. Returns [aModule, bModule]. */
  async function seedBoth(client: pg.PoolClient): Promise<[string, string]> {
    const a = await moduleIn(client, PARIWAR_A);
    await client.query(INSERT_PUBLICATION, pubParams(a, PARIWAR_A));
    const b = await moduleIn(client, PARIWAR_B);
    await client.query(INSERT_PUBLICATION, pubParams(b, PARIWAR_B));
    return [a, b];
  }

  it('grants: twt_app has SELECT + INSERT only (⛔ UPDATE, ⛔ DELETE — insert-only, I7)', async () => {
    const { client } = getTx();
    const r = await client.query<Record<string, boolean>>(
      `SELECT has_table_privilege('twt_app', 'marketplace_module_publications', 'SELECT') AS s,
              has_table_privilege('twt_app', 'marketplace_module_publications', 'INSERT') AS i,
              has_table_privilege('twt_app', 'marketplace_module_publications', 'UPDATE') AS u,
              has_table_privilege('twt_app', 'marketplace_module_publications', 'DELETE') AS d`,
    );
    expect(r.rows[0]).toEqual({ s: true, i: true, u: false, d: false });
  });

  it('isolation: scope A sees its publication and ⛔ B’s; scope B symmetric', async () => {
    const { client } = getTx();
    const [a, b] = await seedBoth(client);
    await enterAppScope(client, PARIWAR_A);
    const ra = await client.query<{ module_id: string }>('SELECT module_id FROM marketplace_module_publications WHERE module_id = ANY($1)', [[a, b]]);
    expect(ra.rows.map((x) => x.module_id)).toEqual([a]);
    await enterAppScope(client, PARIWAR_B);
    const rb = await client.query<{ module_id: string }>('SELECT module_id FROM marketplace_module_publications WHERE module_id = ANY($1)', [[a, b]]);
    expect(rb.rows.map((x) => x.module_id)).toEqual([b]);
  });

  it('an INSERT for another tenant is rejected by withCheck (42501)', async () => {
    const { client } = getTx();
    const b = await moduleIn(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    await expectSqlRejected(client, INSERT_PUBLICATION, pubParams(b, PARIWAR_B), '42501');
  });

  it('AC1: a publication naming ANOTHER Pariwar’s module → 23503 on marketplace_module_publications_module_fk', async () => {
    const { client } = getTx();
    const a = await moduleIn(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_B);
    // pariwar_id = B passes the withCheck; (B, a) does not exist — the module is A's.
    await expectSqlRejected(client, INSERT_PUBLICATION, pubParams(a, PARIWAR_B), '23503', 'marketplace_module_publications_module_fk');
  });

  it('UPDATE and DELETE are denied to twt_app (42501 — ⛔ grant)', async () => {
    const { client } = getTx();
    const [a] = await seedBoth(client);
    await enterAppScope(client, PARIWAR_A);
    await expectSqlRejected(client, 'UPDATE marketplace_module_publications SET hindi_reviewed = true WHERE module_id = $1', [a], '42501');
    await expectSqlRejected(client, 'DELETE FROM marketplace_module_publications WHERE module_id = $1', [a], '42501');
  });

  it('fail-closed: twt_app with NO scope sees zero rows and cannot insert', async () => {
    const { client } = getTx();
    const [a] = await seedBoth(client);
    await enterAppRoleNoScope(client);
    await client.query("SELECT set_config('app.pariwar_id', '', true)");
    expect((await client.query('SELECT 1 FROM marketplace_module_publications')).rows).toHaveLength(0);
    await expectSqlRejected(client, INSERT_PUBLICATION, pubParams(a, PARIWAR_A), '42501');
  });

  it('catalog: RLS ENABLE + FORCE, exactly the two named policies, and the composite FK by columns', async () => {
    const { client } = getTx();
    const c = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      "SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'marketplace_module_publications'",
    );
    expect(c.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
    const p = await client.query<{ policyname: string; cmd: string; roles: string }>(
      "SELECT policyname, cmd, roles::text AS roles FROM pg_policies WHERE tablename = 'marketplace_module_publications' ORDER BY policyname",
    );
    expect(p.rows).toEqual([
      { policyname: 'marketplace_module_publications_tenant_isolation_insert', cmd: 'INSERT', roles: '{twt_app}' },
      { policyname: 'marketplace_module_publications_tenant_isolation_select', cmd: 'SELECT', roles: '{twt_app}' },
    ]);
    const fk = await client.query<{ def: string }>(
      "SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'marketplace_module_publications_module_fk'",
    );
    expect(fk.rows[0]!.def).toBe('FOREIGN KEY (pariwar_id, module_id) REFERENCES marketplace_modules(pariwar_id, module_id)');
  });
});
