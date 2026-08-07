// `pariwar_custom_field_definitions` RLS policy-regression — Story 10.12 (Task 8; AC1).
//
// Mirrors clause-versions / feature-flag-versions: positive (an allowed query returns the expected
// rows) + negative (a forbidden query is empty or raises) assertions for the three tenant-isolation
// policies, the fail-closed no-scope probe, and the FORCE-RLS catalog regression guard. Live DB only.
//
// ⚠ WHY TENANT ISOLATION MATTERS PARTICULARLY HERE. A definition authored into a NEIGHBOURING
// Pariwar would then GOVERN that Pariwar's member writes — the leak is not just a read of someone
// else's row, it is one tenant silently changing another tenant's data contract. Hence the sharper
// framing on the withCheck test below.
//
// ⚠ NO DELETE POLICY AND NO DELETE GRANT, deliberately. Retirement is a VERSION (a new row with
// `retired_at` set), so nothing in the design ever needs to remove one — and a deleted definition
// makes every value stored under it uninterpretable.

import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

const HOST = 'member';

/** Seed a definition row DIRECTLY (bypassing the writer) via the raw client, so the seed works both
 *  as superuser (pre-scope) and under app scope (where the withCheck is what we are testing). */
async function seedDefinition(
  client: Parameters<typeof enterAppScope>[0],
  pariwarId: string,
  fieldKey: string,
  version = 1,
): Promise<void> {
  await client.query(
    `INSERT INTO pariwar_custom_field_definitions
       (pariwar_id, host_entity, field_key, version, definition, effective_at)
     VALUES ($1, $2, $3, $4, $5, now())`,
    [
      pariwarId,
      HOST,
      fieldKey,
      version,
      JSON.stringify({
        field_key: fieldKey,
        label_en: 'Field',
        label_hi: 'क्षेत्र',
        field_type: 'string',
        pii_tier: 3,
        required: false,
        indexed: false,
      }),
    ],
  );
}

describe.skipIf(!hasDatabase)(
  'pariwar_custom_field_definitions RLS policy regression',
  { timeout: 20000 },
  () => {
    setupLiveDb();

    it('positive: SELECT under scope A returns only A definitions', async () => {
      const { tx, client } = getTx();
      // Seeded BEFORE entering app scope (as superuser, RLS bypassed) so BOTH tenants' rows land.
      await seedDefinition(client, PARIWAR_A, 'a_field');
      await seedDefinition(client, PARIWAR_B, 'b_field');
      await enterAppScope(client, PARIWAR_A);

      const rows = await tx.select().from(schema.pariwarCustomFieldDefinitions);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.pariwarId).toBe(PARIWAR_A);
      expect(rows[0]?.fieldKey).toBe('a_field');
    });

    it('negative: scope B does NOT see A definitions', async () => {
      const { tx, client } = getTx();
      await seedDefinition(client, PARIWAR_A, 'a_field');
      await seedDefinition(client, PARIWAR_B, 'b_field');
      await enterAppScope(client, PARIWAR_B);

      const rows = await tx.select().from(schema.pariwarCustomFieldDefinitions);
      expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
      expect(rows.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
    });

    it('⚠ negative: INSERT of ANOTHER tenant\'s definition is rejected by withCheck (42501)', async () => {
      // The sharpest form of the leak: a definition written into B under A's scope would govern B's
      // member writes — one tenant silently editing another tenant's data contract.
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const err = await seedDefinition(client, PARIWAR_B, 'smuggled').catch((e: unknown) => e);
      const code = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
      expect(code).toBe('42501');
      expect(String((err as Error).message)).toMatch(/row-level security/i);
    });

    it('connection-level fail-closed: the app role with NO scope reads nothing', async () => {
      const { tx, client } = getTx();
      await seedDefinition(client, PARIWAR_A, 'a_field');
      await seedDefinition(client, PARIWAR_B, 'b_field');
      await enterAppRoleNoScope(client);

      const rows = await tx.select().from(schema.pariwarCustomFieldDefinitions);
      expect(rows).toHaveLength(0);
    });

    it('the version pin is per-tenant: the SAME field_key exists independently in both Pariwars', async () => {
      const { client } = getTx();
      await seedDefinition(client, PARIWAR_A, 'shared_key', 1);
      // Same key, same version, different tenant → no conflict.
      await expect(seedDefinition(client, PARIWAR_B, 'shared_key', 1)).resolves.toBeUndefined();
    });

    it('a duplicate (pariwar_id, host_entity, field_key, version) is rejected (23505)', async () => {
      const { client } = getTx();
      await seedDefinition(client, PARIWAR_A, 'dup_key', 1);
      const err = await seedDefinition(client, PARIWAR_A, 'dup_key', 1).catch((e: unknown) => e);
      const code = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
      expect(code).toBe('23505');
    });

    it('⚠ no DELETE grant — the app role cannot remove a definition row under any scope', async () => {
      const { client } = getTx();
      await seedDefinition(client, PARIWAR_A, 'a_field');
      await enterAppScope(client, PARIWAR_A);
      await expect(
        client.query(`DELETE FROM pariwar_custom_field_definitions WHERE pariwar_id = $1`, [PARIWAR_A]),
      ).rejects.toThrow(/permission denied/i);
    });

    it('FORCE RLS: the table has BOTH rowsecurity and forcerowsecurity', async () => {
      // ENABLE alone leaves the (non-superuser) table OWNER exempt; FORCE is what closes that.
      const { client } = getTx();
      const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
        `SELECT relrowsecurity, relforcerowsecurity
           FROM pg_class WHERE relname = 'pariwar_custom_field_definitions'`,
      );
      expect(rows[0]?.relrowsecurity).toBe(true);
      expect(rows[0]?.relforcerowsecurity).toBe(true);
    });

    it('exactly three policies exist — select, insert, update; NO delete and NO `all`', async () => {
      // A `for: 'all'` policy would also grant DELETE. Asserting the SET, not just presence, is what
      // catches someone "simplifying" the three into one.
      const { client } = getTx();
      const { rows } = await client.query<{ polname: string; cmd: string }>(
        `SELECT polname, CASE polcmd WHEN 'r' THEN 'select' WHEN 'a' THEN 'insert'
                                     WHEN 'w' THEN 'update' WHEN 'd' THEN 'delete' ELSE 'all' END AS cmd
           FROM pg_policy WHERE polrelid = 'pariwar_custom_field_definitions'::regclass`,
      );
      expect(rows.map((r) => r.cmd).sort()).toEqual(['insert', 'select', 'update']);
    });
  },
);
