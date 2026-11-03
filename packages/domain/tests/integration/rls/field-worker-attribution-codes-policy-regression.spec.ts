// field_worker_attribution_codes RLS policy-regression — Story 13.2 (Task 6.2; AC1 / AC8; architecture "every RLS policy ships
// with a test"; the flags table's sibling is attribution-code-allocation-flags-policy-regression.spec.ts). Mirrors
// marketplace-partners-policy-regression: the columns from the catalog (the migration is hand-written), the SELECT + INSERT grant
// only, positive / negative isolation, the withCheck 42501, the fail-closed probe, FORCE RLS + exactly the per-command policies,
// the named UNIQUEs (⛔ `UNIQUE (code)`) + the composite FK Story 13.1 added (0200), every CHECK BY NAME, and append-only for EVERY role (UPDATE / DELETE /
// TRUNCATE refused by the guard triggers as the owner). Live DB only.

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, lockTruncateSetNowait } from '../_helpers.js';
import { expectSqlRejected, seedFieldWorker } from '../attribution-code/_fixtures.js';

const CODES = 'field_worker_attribution_codes';
const INSERT_CODE = `INSERT INTO field_worker_attribution_codes (pariwar_id, field_worker_id, code, allocation_attempts) VALUES ($1, $2, $3, $4)`;
const APPEND_ONLY = '23000'; // integrity_constraint_violation — the guard trigger

async function seedCodeRow(client: pg.PoolClient, pariwar: string, code = '731020'): Promise<string> {
  const w = await seedFieldWorker(client, pariwar); // ⭐ a REAL holder of the SAME Pariwar — Story 13.1 (the 0200 FK)
  await client.query(INSERT_CODE, [pariwar, w, code, 1]);
  return w;
}

describe.skipIf(!hasDatabase)('field_worker_attribution_codes RLS policy regression', () => {
  setupLiveDb();

  it('AC1: the columns, in order, every one NOT NULL, with their defaults (read from the catalog)', async () => {
    const { client } = getTx();
    const cols = async (t: string) =>
      (
        await client.query<{ column_name: string; data_type: string; is_nullable: string; column_default: string | null }>(
          `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
          [t],
        )
      ).rows;
    expect(await cols(CODES)).toEqual([
      { column_name: 'attribution_code_id', data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
      { column_name: 'pariwar_id', data_type: 'uuid', is_nullable: 'NO', column_default: null },
      { column_name: 'field_worker_id', data_type: 'uuid', is_nullable: 'NO', column_default: null },
      { column_name: 'code', data_type: 'text', is_nullable: 'NO', column_default: null },
      { column_name: 'allocation_attempts', data_type: 'smallint', is_nullable: 'NO', column_default: null },
      { column_name: 'allocated_at', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'clock_timestamp()' },
    ]);
  });

  it('AC1: the composite FK on (pariwar_id, field_worker_id) → field_workers now EXISTS (AT2 — Story 13.1, 0200); the two named UNIQUEs and ⛔ a UNIQUE on code alone (I1)', async () => {
    const { client } = getTx();
    // `pg_get_constraintdef` omits the default `ON DELETE NO ACTION` ⇒ the referenced table and the delete action come from the
    // catalog columns (`confdeltype = 'a'` is NO ACTION).
    const r = await client.query<{ conname: string; contype: string; def: string; ref: string | null; on_delete: string | null }>(
      `SELECT conname, contype, pg_get_constraintdef(oid) AS def,
              CASE WHEN contype = 'f' THEN confrelid::regclass::text END AS ref,
              CASE WHEN contype = 'f' THEN confdeltype::text END AS on_delete
         FROM pg_constraint WHERE conrelid = $1::regclass AND contype IN ('u', 'f') ORDER BY conname`,
      [CODES],
    );
    expect(r.rows).toEqual([
      { conname: 'field_worker_attribution_codes_field_worker_uq', contype: 'u', def: 'UNIQUE (field_worker_id)', ref: null, on_delete: null },
      { conname: 'field_worker_attribution_codes_pariwar_code_uq', contype: 'u', def: 'UNIQUE (pariwar_id, code)', ref: null, on_delete: null },
      {
        conname: 'field_worker_attribution_codes_worker_fk',
        contype: 'f',
        def: 'FOREIGN KEY (pariwar_id, field_worker_id) REFERENCES field_workers(pariwar_id, field_worker_id)',
        ref: 'field_workers',
        on_delete: 'a',
      },
    ]);
  });

  it('grants: twt_app has SELECT + INSERT only (⛔ UPDATE, ⛔ DELETE, ⛔ TRUNCATE)', async () => {
    const { client } = getTx();
    for (const t of [CODES]) {
      const r = await client.query<Record<string, boolean>>(
        `SELECT has_table_privilege('twt_app', $1, 'SELECT') AS s, has_table_privilege('twt_app', $1, 'INSERT') AS i,
                has_table_privilege('twt_app', $1, 'UPDATE') AS u, has_table_privilege('twt_app', $1, 'DELETE') AS d,
                has_table_privilege('twt_app', $1, 'TRUNCATE') AS tr`,
        [t],
      );
      expect(r.rows[0], t).toEqual({ s: true, i: true, u: false, d: false, tr: false });
    }
  });

  it('catalog: RLS ENABLE + FORCE, and exactly the two named select / insert policies (⛔ FOR ALL)', async () => {
    const { client } = getTx();
    for (const t of [CODES]) {
      const c = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
        'SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1',
        [t],
      );
      expect(c.rows[0], t).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
      const p = await client.query<{ policyname: string; cmd: string; roles: string }>(
        'SELECT policyname, cmd, roles::text AS roles FROM pg_policies WHERE tablename = $1 ORDER BY policyname',
        [t],
      );
      expect(p.rows, t).toEqual([
        { policyname: `${t}_tenant_isolation_insert`, cmd: 'INSERT', roles: '{twt_app}' },
        { policyname: `${t}_tenant_isolation_select`, cmd: 'SELECT', roles: '{twt_app}' },
      ]);
    }
  });

  it('positive / negative: scope A reads A’s rows and ⛔ B’s, (symmetric)', async () => {
    const { client } = getTx();
    const [wa, wb] = [await seedCodeRow(client, PARIWAR_A), await seedCodeRow(client, PARIWAR_B)];
    await enterAppScope(client, PARIWAR_A);
    expect((await client.query(`SELECT field_worker_id FROM ${CODES} WHERE field_worker_id = ANY($1)`, [[wa, wb]])).rows).toEqual([{ field_worker_id: wa }]);
    await client.query(`SELECT set_config('app.pariwar_id', $1, true)`, [PARIWAR_B]);
    expect((await client.query(`SELECT field_worker_id FROM ${CODES} WHERE field_worker_id = ANY($1)`, [[wa, wb]])).rows).toEqual([{ field_worker_id: wb }]);
  });

  it('an INSERT under the own scope succeeds; one for another tenant is rejected by withCheck (42501)', async () => {
    const { client } = getTx();
    // ⭐ REAL holders in each Pariwar (Story 13.1, the 0200 FK) — seeded as the owner — so the B leg is refused by RLS withCheck
    // (42501), ⛔ by the FK (23503).
    const [wa, wb] = [await seedFieldWorker(client, PARIWAR_A), await seedFieldWorker(client, PARIWAR_B)];
    await enterAppScope(client, PARIWAR_A);
    await client.query(INSERT_CODE, [PARIWAR_A, wa, '731021', 1]);
    await expectSqlRejected(client, INSERT_CODE, [PARIWAR_B, wb, '731022', 1], '42501');
  });

  it('fail-closed: twt_app with NO scope sees zero rows and cannot insert', async () => {
    const { client } = getTx();
    await seedCodeRow(client, PARIWAR_A);
    const w = await seedFieldWorker(client, PARIWAR_A); // a REAL code-less holder (Story 13.1, the 0200 FK) — only RLS refuses
    await enterAppRoleNoScope(client);
    await client.query("SELECT set_config('app.pariwar_id', '', true)");
    expect((await client.query(`SELECT 1 FROM ${CODES}`)).rows).toHaveLength(0);
    await expectSqlRejected(client, INSERT_CODE, [PARIWAR_A, w, '731023', 1], '42501');
  });

  it('as twt_app: UPDATE and DELETE are refused (42501 — ⛔ grant)', async () => {
    const { client } = getTx();
    const w = await seedCodeRow(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectSqlRejected(client, `UPDATE ${CODES} SET code = '731024' WHERE field_worker_id = $1`, [w], '42501');
    await expectSqlRejected(client, `DELETE FROM ${CODES} WHERE field_worker_id = $1`, [w], '42501');
  });

  it('⭐ I3 as the OWNER role: the guard triggers refuse UPDATE, DELETE and TRUNCATE (23000)', async () => {
    const { client } = getTx();
    const w = await seedCodeRow(client, PARIWAR_A);
    const other = await seedFieldWorker(client, PARIWAR_A); // a REAL target (Story 13.1, the 0200 FK) — only the guard refuses
    await expectSqlRejected(client, `UPDATE ${CODES} SET field_worker_id = $2 WHERE field_worker_id = $1`, [w, other], APPEND_ONLY);
    await expectSqlRejected(client, `DELETE FROM ${CODES} WHERE field_worker_id = $1`, [w], APPEND_ONLY);
    for (const t of [CODES]) {
      await lockTruncateSetNowait(client, t); // ⛔ wait on a parallel spec's lock while holding ours
      await expectSqlRejected(client, `TRUNCATE ${t}`, [], APPEND_ONLY);
    }
    const trig = await client.query<{ tgname: string }>(
      `SELECT tgname FROM pg_trigger WHERE tgrelid = $1::regclass AND NOT tgisinternal ORDER BY tgname`,
      [CODES],
    );
    expect(trig.rows.map((r) => r.tgname)).toEqual([
      'field_worker_attribution_codes_no_truncate',
      'field_worker_attribution_codes_no_update_delete',
      'field_worker_attribution_codes_stamp',
    ]);
  });

  it('AC1 CHECKs BY NAME, as the OWNER role (so RLS 42501 cannot fire first): format, deny-list, attempts', async () => {
    const { client } = getTx();
    // ONE real holder (Story 13.1, the 0200 FK): every refused INSERT rolls back to its savepoint, so the last one admits it.
    const w = await seedFieldWorker(client, PARIWAR_A);
    const ins = (code: string, attempts = 1) => [PARIWAR_A, w, code, attempts];
    await expectSqlRejected(client, INSERT_CODE, ins('12345'), '23514', 'field_worker_attribution_codes_code_format_check');
    await expectSqlRejected(client, INSERT_CODE, ins('1234567'), '23514', 'field_worker_attribution_codes_code_format_check');
    await expectSqlRejected(client, INSERT_CODE, ins('१२३४५६'), '23514', 'field_worker_attribution_codes_code_format_check');
    await expectSqlRejected(client, INSERT_CODE, ins('123456'), '23514', 'field_worker_attribution_codes_code_denylist_check');
    await expectSqlRejected(client, INSERT_CODE, ins('000000'), '23514', 'field_worker_attribution_codes_code_denylist_check');
    await expectSqlRejected(client, INSERT_CODE, ins('731025', 0), '23514', 'field_worker_attribution_codes_attempts_check');
    await expectSqlRejected(client, INSERT_CODE, ins('731025', 33), '23514', 'field_worker_attribution_codes_attempts_check');
    await client.query(INSERT_CODE, ins('012346', 32)); // a leading zero and the ceiling are admitted
  });

  it('AC1 UNIQUEs BY NAME: a second code row for one worker ⇒ 23505 …_field_worker_uq; the same code twice in one Pariwar ⇒ 23505 …_pariwar_code_uq', async () => {
    const { client } = getTx();
    const w = await seedCodeRow(client, PARIWAR_A, '731026');
    // REAL holders (Story 13.1, the 0200 FK): a second A worker for the code clash, a B worker for the cross-Pariwar admit.
    const [wa2, wb] = [await seedFieldWorker(client, PARIWAR_A), await seedFieldWorker(client, PARIWAR_B)];
    await expectSqlRejected(client, INSERT_CODE, [PARIWAR_A, w, '731027', 1], '23505', 'field_worker_attribution_codes_field_worker_uq');
    await expectSqlRejected(client, INSERT_CODE, [PARIWAR_A, wa2, '731026', 1], '23505', 'field_worker_attribution_codes_pariwar_code_uq');
    await client.query(INSERT_CODE, [PARIWAR_B, wb, '731026', 1]); // another Pariwar — permitted (I1)
  });
});
