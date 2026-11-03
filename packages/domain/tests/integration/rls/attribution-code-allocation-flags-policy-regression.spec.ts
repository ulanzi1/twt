// attribution_code_allocation_flags RLS policy-regression — Story 13.2 (Task 6.2; AC2 / AC8; architecture "every RLS policy ships
// with a test"; the codes table's sibling is field-worker-attribution-codes-policy-regression.spec.ts). The columns from the
// catalog, the SELECT + INSERT grant only, positive / negative isolation, the withCheck 42501, the fail-closed probe, FORCE RLS +
// exactly the per-command policies, the (pariwar_id, flagged_at) index, both CHECKs BY NAME, and append-only for EVERY role.
// Live DB only.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, lockTruncateSetNowait } from '../_helpers.js';
import { expectSqlRejected } from '../attribution-code/_fixtures.js';

const FLAGS = 'attribution_code_allocation_flags';
const INSERT_FLAG = `INSERT INTO attribution_code_allocation_flags (pariwar_id, attempts, actor_id, actor_display) VALUES ($1, $2, $3, $4)`;
const APPEND_ONLY = '23000'; // integrity_constraint_violation — the guard trigger

async function seedFlagRow(client: pg.PoolClient, pariwar: string): Promise<string> {
  const r = await client.query<{ flag_id: string }>(`${INSERT_FLAG} RETURNING flag_id`, [pariwar, 8, randomUUID(), 'Asha Verma']);
  return r.rows[0]!.flag_id;
}

describe.skipIf(!hasDatabase)('attribution_code_allocation_flags RLS policy regression', () => {
  setupLiveDb();

  it('AC2: the columns, in order, every one NOT NULL, with their defaults (⛔ field_worker_id)', async () => {
    const { client } = getTx();
    const cols = await client.query<{ column_name: string; data_type: string; is_nullable: string; column_default: string | null }>(
      `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      [FLAGS],
    );
    expect(cols.rows).toEqual([
      { column_name: 'flag_id', data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
      { column_name: 'pariwar_id', data_type: 'uuid', is_nullable: 'NO', column_default: null },
      { column_name: 'attempts', data_type: 'smallint', is_nullable: 'NO', column_default: null },
      { column_name: 'actor_id', data_type: 'uuid', is_nullable: 'NO', column_default: null },
      { column_name: 'actor_display', data_type: 'text', is_nullable: 'NO', column_default: null },
      { column_name: 'flagged_at', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'clock_timestamp()' },
    ]);
  });

  it('AC2: the (pariwar_id, flagged_at) index exists', async () => {
    const { client } = getTx();
    const i = await client.query<{ indexdef: string }>(
      "SELECT indexdef FROM pg_indexes WHERE indexname = 'attribution_code_allocation_flags_pariwar_flagged_idx'",
    );
    expect(i.rows[0]!.indexdef).toMatch(/USING btree \(pariwar_id, flagged_at\)$/);
  });

  it('grants: twt_app has SELECT + INSERT only (⛔ UPDATE, ⛔ DELETE, ⛔ TRUNCATE)', async () => {
    const { client } = getTx();
    const r = await client.query<Record<string, boolean>>(
      `SELECT has_table_privilege('twt_app', $1, 'SELECT') AS s, has_table_privilege('twt_app', $1, 'INSERT') AS i,
              has_table_privilege('twt_app', $1, 'UPDATE') AS u, has_table_privilege('twt_app', $1, 'DELETE') AS d,
              has_table_privilege('twt_app', $1, 'TRUNCATE') AS tr`,
      [FLAGS],
    );
    expect(r.rows[0]).toEqual({ s: true, i: true, u: false, d: false, tr: false });
  });

  it('catalog: RLS ENABLE + FORCE, and exactly the two named select / insert policies (⛔ FOR ALL)', async () => {
    const { client } = getTx();
    const c = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      'SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1',
      [FLAGS],
    );
    expect(c.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
    const p = await client.query<{ policyname: string; cmd: string; roles: string }>(
      'SELECT policyname, cmd, roles::text AS roles FROM pg_policies WHERE tablename = $1 ORDER BY policyname',
      [FLAGS],
    );
    expect(p.rows).toEqual([
      { policyname: `${FLAGS}_tenant_isolation_insert`, cmd: 'INSERT', roles: '{twt_app}' },
      { policyname: `${FLAGS}_tenant_isolation_select`, cmd: 'SELECT', roles: '{twt_app}' },
    ]);
  });

  it('positive / negative: scope A reads A’s flag and ⛔ B’s (symmetric)', async () => {
    const { client } = getTx();
    const [fa, fb] = [await seedFlagRow(client, PARIWAR_A), await seedFlagRow(client, PARIWAR_B)];
    await enterAppScope(client, PARIWAR_A);
    expect((await client.query(`SELECT flag_id FROM ${FLAGS} WHERE flag_id = ANY($1)`, [[fa, fb]])).rows).toEqual([{ flag_id: fa }]);
    await client.query(`SELECT set_config('app.pariwar_id', $1, true)`, [PARIWAR_B]);
    expect((await client.query(`SELECT flag_id FROM ${FLAGS} WHERE flag_id = ANY($1)`, [[fa, fb]])).rows).toEqual([{ flag_id: fb }]);
  });

  it('an INSERT under the own scope succeeds; one for another tenant is rejected by withCheck (42501)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await client.query(INSERT_FLAG, [PARIWAR_A, 8, randomUUID(), 'Asha Verma']);
    await expectSqlRejected(client, INSERT_FLAG, [PARIWAR_B, 8, randomUUID(), 'Asha Verma'], '42501');
  });

  it('fail-closed: twt_app with NO scope sees zero rows and cannot insert', async () => {
    const { client } = getTx();
    await seedFlagRow(client, PARIWAR_A);
    await enterAppRoleNoScope(client);
    await client.query("SELECT set_config('app.pariwar_id', '', true)");
    expect((await client.query(`SELECT 1 FROM ${FLAGS}`)).rows).toHaveLength(0);
    await expectSqlRejected(client, INSERT_FLAG, [PARIWAR_A, 8, randomUUID(), 'Asha Verma'], '42501');
  });

  it('as twt_app: UPDATE and DELETE are refused (42501 — ⛔ grant)', async () => {
    const { client } = getTx();
    const f = await seedFlagRow(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectSqlRejected(client, `UPDATE ${FLAGS} SET attempts = 9 WHERE flag_id = $1`, [f], '42501');
    await expectSqlRejected(client, `DELETE FROM ${FLAGS} WHERE flag_id = $1`, [f], '42501');
  });

  it('⭐ as the OWNER role: the guard triggers refuse UPDATE, DELETE and TRUNCATE (23000)', async () => {
    const { client } = getTx();
    const f = await seedFlagRow(client, PARIWAR_A);
    await expectSqlRejected(client, `UPDATE ${FLAGS} SET attempts = 9 WHERE flag_id = $1`, [f], APPEND_ONLY);
    await expectSqlRejected(client, `DELETE FROM ${FLAGS} WHERE flag_id = $1`, [f], APPEND_ONLY);
    await lockTruncateSetNowait(client, FLAGS);
    await expectSqlRejected(client, `TRUNCATE ${FLAGS}`, [], APPEND_ONLY);
    const trig = await client.query<{ tgname: string }>(
      `SELECT tgname FROM pg_trigger WHERE tgrelid = $1::regclass AND NOT tgisinternal ORDER BY tgname`,
      [FLAGS],
    );
    expect(trig.rows.map((r) => r.tgname)).toEqual([
      'attribution_code_allocation_flags_no_truncate',
      'attribution_code_allocation_flags_no_update_delete',
    ]);
  });

  it('AC2 CHECKs BY NAME, as the OWNER role: attempts 1..32, a non-blank actor_display', async () => {
    const { client } = getTx();
    for (const attempts of [0, 33]) {
      await expectSqlRejected(client, INSERT_FLAG, [PARIWAR_A, attempts, randomUUID(), 'Asha Verma'], '23514', 'attribution_code_allocation_flags_attempts_check');
    }
    for (const display of ['', '   ']) {
      await expectSqlRejected(client, INSERT_FLAG, [PARIWAR_A, 8, randomUUID(), display], '23514', 'attribution_code_allocation_flags_actor_display_check');
    }
    await client.query(INSERT_FLAG, [PARIWAR_A, 1, randomUUID(), 'A']);
    await client.query(INSERT_FLAG, [PARIWAR_A, 32, randomUUID(), 'A']);
  });
});
