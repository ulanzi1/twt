// marketplace_partners RLS policy-regression — Story 12.2 (`2026-11-01-433` QE3 (A), QE7 (A); AC1; architecture "every
// RLS policy ships with a test"). Mirrors marketplace-modules-policy-regression: positive + negative isolation, the
// withCheck 42501, the fail-closed probe, the FORCE-RLS catalog guard, and the INSERT-ONLY grant (I7). Plus AC1's
// composite-FK legs on `marketplace_modules` (an FK check runs as the owner and IGNORES RLS — so only the composite key
// stops a module naming another Pariwar's partner) and the `twt_service` grant the activation sweep needs (TR17: the dev
// / CI superuser hides a missing grant, so it is asserted by catalog). Live DB only.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { pariwarId as toPariwarId, moduleId as toModuleId } from '../../../src/ids/index.js';
import { authorModule } from '../../../src/marketplace/commands.js';
import { ModulePersistError } from '../../../src/marketplace/errors.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';
import { RAW_INSERT_SQL, expectSqlRejected, manifestInput, rawInsertParams, seedPartner, txNow } from '../marketplace/_fixtures.js';

const GUARD_ON = "SET LOCAL app.marketplace_module_state_writer = 'on'";
const INSERT_PARTNER = `INSERT INTO marketplace_partners (partner_id, pariwar_id, display_name_en, display_name_hi, created_by_actor_id, audit_id)
  VALUES ($1, $2, $3, 'साझेदार', $4, $5)`;
const partnerParams = (pariwar: string, id = randomUUID()) => [id, pariwar, `Partner ${randomUUID()}`, randomUUID(), randomUUID()];

describe.skipIf(!hasDatabase)('marketplace_partners RLS policy regression', () => {
  setupLiveDb();

  /** One partner per tenant (seeded as the superuser). Returns [aId, bId]. */
  async function seedBoth(client: pg.PoolClient): Promise<[string, string]> {
    return [await seedPartner(client, PARIWAR_A), await seedPartner(client, PARIWAR_B)];
  }

  it('grants: twt_app has SELECT + INSERT only (⛔ UPDATE, ⛔ DELETE — insert-only, I7)', async () => {
    const { client } = getTx();
    const r = await client.query<Record<string, boolean>>(
      `SELECT has_table_privilege('twt_app', 'marketplace_partners', 'SELECT') AS s,
              has_table_privilege('twt_app', 'marketplace_partners', 'INSERT') AS i,
              has_table_privilege('twt_app', 'marketplace_partners', 'UPDATE') AS u,
              has_table_privilege('twt_app', 'marketplace_partners', 'DELETE') AS d`,
    );
    expect(r.rows[0]).toEqual({ s: true, i: true, u: false, d: false });
  });

  it('positive: SELECT under scope A returns A’s partner and ⛔ B’s', async () => {
    const { client } = getTx();
    const [a, b] = await seedBoth(client);
    await enterAppScope(client, PARIWAR_A);
    const r = await client.query<{ partner_id: string; pariwar_id: string }>('SELECT partner_id, pariwar_id FROM marketplace_partners');
    expect(r.rows.every((x) => x.pariwar_id === PARIWAR_A)).toBe(true);
    expect(r.rows.some((x) => x.partner_id === a)).toBe(true);
    expect(r.rows.some((x) => x.partner_id === b)).toBe(false);
  });

  it('negative: scope B sees its own partner and ⛔ A’s (symmetric)', async () => {
    const { client } = getTx();
    const [a, b] = await seedBoth(client);
    await enterAppScope(client, PARIWAR_B);
    const r = await client.query<{ partner_id: string }>('SELECT partner_id FROM marketplace_partners WHERE partner_id = ANY($1)', [[a, b]]);
    expect(r.rows.map((x) => x.partner_id)).toEqual([b]);
  });

  it('an INSERT under the own scope succeeds; one for another tenant is rejected by withCheck (42501)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await client.query(INSERT_PARTNER, partnerParams(PARIWAR_A));
    await expectSqlRejected(client, INSERT_PARTNER, partnerParams(PARIWAR_B), '42501');
  });

  it('UPDATE and DELETE are denied to twt_app (42501 — ⛔ grant)', async () => {
    const { client } = getTx();
    const [a] = await seedBoth(client);
    await enterAppScope(client, PARIWAR_A);
    await expectSqlRejected(client, "UPDATE marketplace_partners SET display_name_en = 'x' WHERE partner_id = $1", [a], '42501');
    await expectSqlRejected(client, 'DELETE FROM marketplace_partners WHERE partner_id = $1', [a], '42501');
  });

  it('fail-closed: twt_app with NO scope sees zero rows and cannot insert', async () => {
    const { client } = getTx();
    await seedBoth(client);
    await enterAppRoleNoScope(client);
    await client.query("SELECT set_config('app.pariwar_id', '', true)");
    expect((await client.query('SELECT 1 FROM marketplace_partners')).rows).toHaveLength(0);
    await expectSqlRejected(client, INSERT_PARTNER, partnerParams(PARIWAR_A), '42501');
  });

  it('catalog: RLS ENABLE + FORCE, and exactly the two named select / insert policies (⛔ FOR ALL)', async () => {
    const { client } = getTx();
    const c = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      "SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'marketplace_partners'",
    );
    expect(c.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
    const p = await client.query<{ policyname: string; cmd: string; roles: string }>(
      "SELECT policyname, cmd, roles::text AS roles FROM pg_policies WHERE tablename = 'marketplace_partners' ORDER BY policyname",
    );
    expect(p.rows).toEqual([
      { policyname: 'marketplace_partners_tenant_isolation_insert', cmd: 'INSERT', roles: '{twt_app}' },
      { policyname: 'marketplace_partners_tenant_isolation_select', cmd: 'SELECT', roles: '{twt_app}' },
    ]);
  });

  it('catalog: the composite FK target unique and the case-insensitive English-name unique index exist', async () => {
    const { client } = getTx();
    const u = await client.query<{ def: string }>(
      "SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'marketplace_partners_pariwar_partner_unique'",
    );
    expect(u.rows[0]!.def).toBe('UNIQUE (pariwar_id, partner_id)');
    const i = await client.query<{ indexdef: string }>(
      "SELECT indexdef FROM pg_indexes WHERE indexname = 'marketplace_partners_pariwar_name_en_unique'",
    );
    expect(i.rows[0]!.indexdef).toMatch(/^CREATE UNIQUE INDEX .* USING btree \(pariwar_id, lower\(display_name_en\)\)$/);
  });

  it('"LIC" then "lic" in one Pariwar → 23505 marketplace_partners_pariwar_name_en_unique', async () => {
    const { client } = getTx();
    const p = randomUUID();
    await enterAppScope(client, p);
    await client.query(INSERT_PARTNER, [randomUUID(), p, 'LIC', randomUUID(), randomUUID()]);
    await expectSqlRejected(client, INSERT_PARTNER, [randomUUID(), p, 'lic', randomUUID(), randomUUID()], '23505', 'marketplace_partners_pariwar_name_en_unique');
  });

  // ── AC1 — the composite partner FK on marketplace_modules ──

  it('a guarded RAW module insert naming ANOTHER Pariwar’s partner → 23503 on marketplace_modules_partner_fk', async () => {
    const { client } = getTx();
    const [, b] = await seedBoth(client);
    await enterAppScope(client, PARIWAR_A);
    await client.query(GUARD_ON);
    await expectSqlRejected(client, RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_A, { partnerId: b }), '23503', 'marketplace_modules_partner_fk');
    // …and the same row naming its OWN Pariwar's partner is accepted.
    const own = await seedPartner(client, PARIWAR_A);
    await client.query(RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_A, { partnerId: own }));
  });

  it('authorModule naming an UNKNOWN partner → ModulePersistError with sqlstate 23503; nothing written', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = toModuleId(randomUUID());
    let caught: unknown;
    try {
      await authorModule(client, {
        pariwarId: toPariwarId(PARIWAR_A),
        moduleId: id,
        auditId: randomUUID(),
        actor: 'operator',
        actorId: randomUUID(),
        manifest: manifestInput(await txNow(client), { partner_id: randomUUID() }),
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ModulePersistError);
    expect((caught as ModulePersistError).sqlstate).toBe('23503');
    expect((await client.query('SELECT 1 FROM events_log WHERE stream_id = $1', [id])).rows).toHaveLength(0);
  });

  it('twt_service (the sweep’s login) holds SELECT + UPDATE on marketplace_modules — ⛔ INSERT, ⛔ DELETE', async () => {
    const { client } = getTx();
    const r = await client.query<Record<string, boolean>>(
      `SELECT has_table_privilege('twt_service', 'marketplace_modules', 'SELECT') AS s,
              has_table_privilege('twt_service', 'marketplace_modules', 'UPDATE') AS u,
              has_table_privilege('twt_service', 'marketplace_modules', 'INSERT') AS i,
              has_table_privilege('twt_service', 'marketplace_modules', 'DELETE') AS d`,
    );
    expect(r.rows[0]).toEqual({ s: true, u: true, i: false, d: false });
  });
});
