// field_worker_ending_appeals table + RLS policy regression — Story 13.1f (Task 2.3; migration 0207; architecture "every RLS policy ships
// with a test"). Mirrors the 13.1d request table's spec: the catalog shape (columns, the named constraints — the value-list CHECKs sourced
// from the domain tuples —, the partial unique, the indexes), the grants, ENABLE + FORCE with three per-command policies, positive +
// negative isolation, the withCheck 42501, the fail-closed probe. The guard, the CHECKs fired, the FKs fired and the delete / truncate
// triggers as the OWNER are `field-worker/ending-appeal.spec.ts` (AC16). Raw INSERTs set the writer guards (the triggers run BEFORE the RLS
// WITH CHECK). Live DB only.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import {
  FIELD_WORKER_ENDING_APPEAL_CHANNELS,
  FIELD_WORKER_ENDING_APPEAL_HEARERS,
  FIELD_WORKER_ENDING_APPEAL_STATES,
} from '../../../src/schema/field_worker_ending_appeals.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';
import { GUARD_OFF, GUARD_ON, RAW_INSERT_SQL, expectSqlRejected, rawInsertParams } from '../field-worker/_fixtures.js';

const APPEAL_ON = "SET LOCAL app.field_worker_ending_appeal_writer = 'on'";
const APPEAL_OFF = "SET LOCAL app.field_worker_ending_appeal_writer = 'off'";
const APPEAL_INSERT_SQL = `INSERT INTO field_worker_ending_appeals
  (appeal_id, pariwar_id, field_worker_id, ending_event_version, state, heard_by, received_on, received_via, lodged_by_user_id,
   ended_by_user_id, state_event_version, audit_id)
  VALUES ($1, $2, $3, 2, 'open', 'trustee_panel', current_date, 'phone', gen_random_uuid(), gen_random_uuid(), 1, gen_random_uuid())`;

const normalise = (sql: string): string => sql.replace(/[()\s]+/g, ' ').trim().toLowerCase();
const literals = (def: string): string[] => [...def.matchAll(/'([a-z0-9_]+)'::text/g)].map((m) => m[1]!);

describe.skipIf(!hasDatabase)('field_worker_ending_appeals table + RLS policy regression (Story 13.1f AD7)', () => {
  setupLiveDb();

  async function seedAppeal(client: pg.PoolClient, pariwarId: string): Promise<{ workerId: string; appealId: string }> {
    const workerId = randomUUID();
    const appealId = randomUUID();
    await enterAppScope(client, pariwarId);
    await client.query(GUARD_ON);
    await client.query(RAW_INSERT_SQL, rawInsertParams(workerId, pariwarId));
    await client.query(GUARD_OFF);
    await client.query(APPEAL_ON);
    await client.query(APPEAL_INSERT_SQL, [appealId, pariwarId, workerId]);
    await client.query(APPEAL_OFF);
    return { workerId, appealId };
  }

  it('the columns, types and NOT NULLs, and only the two timestamps default', async () => {
    const { client } = getTx();
    const r = await client.query<{ column_name: string; udt_name: string; is_nullable: string; column_default: string | null }>(
      `SELECT column_name, udt_name, is_nullable, column_default FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'field_worker_ending_appeals' ORDER BY ordinal_position`,
    );
    expect(r.rows.map((c) => [c.column_name, c.udt_name, c.is_nullable])).toEqual([
      ['appeal_id', 'uuid', 'NO'],
      ['pariwar_id', 'uuid', 'NO'],
      ['field_worker_id', 'uuid', 'NO'],
      ['ending_event_version', 'int8', 'NO'],
      ['state', 'text', 'NO'],
      ['heard_by', 'text', 'NO'],
      ['received_on', 'date', 'NO'],
      ['received_via', 'text', 'NO'],
      ['lodged_by_user_id', 'uuid', 'NO'],
      ['ended_by_user_id', 'uuid', 'NO'], // NOT NULL — a NULL would pass the ender CHECK silently (AD7)
      ['decided_by_user_id', 'uuid', 'YES'],
      ['decided_on', 'date', 'YES'],
      ['state_event_version', 'int8', 'NO'],
      ['audit_id', 'uuid', 'NO'],
      ['created_at', 'timestamptz', 'NO'],
      ['updated_at', 'timestamptz', 'NO'],
    ]);
    const defaults = Object.fromEntries(r.rows.filter((c) => c.column_default !== null).map((c) => [c.column_name, c.column_default]));
    expect(defaults).toEqual({ created_at: 'now()', updated_at: 'now()' }); // ⛔ default on the id (caller-minted — the stream id)
  });

  it('the named constraints — and nothing else; each value-list CHECK carries exactly its domain tuple', async () => {
    const { client } = getTx();
    const r = await client.query<{ conname: string; contype: string; def: string }>(
      `SELECT conname, contype, pg_get_constraintdef(oid) AS def FROM pg_constraint
        WHERE conrelid = 'field_worker_ending_appeals'::regclass ORDER BY conname`,
    );
    expect(r.rows.map((c) => [c.conname, c.contype])).toEqual([
      ['field_worker_ending_appeals_decided_after_received', 'c'],
      ['field_worker_ending_appeals_decider_not_ender', 'c'],
      ['field_worker_ending_appeals_ending_version_positive', 'c'],
      ['field_worker_ending_appeals_heard_by_check', 'c'],
      ['field_worker_ending_appeals_open_decided_by', 'c'],
      ['field_worker_ending_appeals_open_decided_on', 'c'],
      ['field_worker_ending_appeals_pkey', 'p'],
      ['field_worker_ending_appeals_received_via_check', 'c'],
      ['field_worker_ending_appeals_state_check', 'c'],
      ['field_worker_ending_appeals_worker_fk', 'f'],
    ]);
    const def = (n: string): string => r.rows.find((c) => c.conname === n)!.def;
    expect(literals(def('field_worker_ending_appeals_state_check'))).toEqual([...FIELD_WORKER_ENDING_APPEAL_STATES]);
    expect(literals(def('field_worker_ending_appeals_heard_by_check'))).toEqual([...FIELD_WORKER_ENDING_APPEAL_HEARERS]);
    expect(literals(def('field_worker_ending_appeals_received_via_check'))).toEqual([...FIELD_WORKER_ENDING_APPEAL_CHANNELS]);
    expect(def('field_worker_ending_appeals_worker_fk')).toBe(
      'FOREIGN KEY (pariwar_id, field_worker_id) REFERENCES field_workers(pariwar_id, field_worker_id)',
    );
  });

  it('the one-open partial unique (⛔ a plain UNIQUE — the 10.22 lesson) and the two keyset indexes', async () => {
    const { client } = getTx();
    const r = await client.query<{ indexname: string; def: string; uniq: boolean; pred: string | null }>(
      `SELECT c.relname AS indexname, pg_get_indexdef(i.indexrelid) AS def, i.indisunique AS uniq, pg_get_expr(i.indpred, i.indrelid) AS pred
         FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
        WHERE i.indrelid = 'field_worker_ending_appeals'::regclass ORDER BY c.relname`,
    );
    const byName = new Map(r.rows.map((x) => [x.indexname, x]));
    expect([...byName.keys()]).toEqual([
      'field_worker_ending_appeals_one_open_uq',
      'field_worker_ending_appeals_pariwar_idx',
      'field_worker_ending_appeals_pkey',
      'field_worker_ending_appeals_worker_idx',
    ]);
    const columnsOf = (d: string): string => normalise(d).replace(/^.* using btree /, '').replace(/ where .*$/, '');
    const open = byName.get('field_worker_ending_appeals_one_open_uq')!;
    expect(open.uniq).toBe(true);
    expect(columnsOf(open.def)).toBe('pariwar_id, field_worker_id');
    expect(literals(open.pred!)).toEqual(['open']);
    expect(columnsOf(byName.get('field_worker_ending_appeals_pariwar_idx')!.def)).toBe('pariwar_id, created_at desc, appeal_id desc');
    expect(columnsOf(byName.get('field_worker_ending_appeals_worker_idx')!.def)).toBe('pariwar_id, field_worker_id, created_at desc, appeal_id desc');
  });

  it('twt_app holds SELECT, INSERT, UPDATE — ⛔ DELETE, ⛔ TRUNCATE; ENABLE + FORCE with three per-command policies', async () => {
    const { client } = getTx();
    const grants = await client.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.role_table_grants
        WHERE table_name = 'field_worker_ending_appeals' AND grantee = 'twt_app' ORDER BY privilege_type`,
    );
    expect(grants.rows.map((g) => g.privilege_type)).toEqual(['INSERT', 'SELECT', 'UPDATE']);
    const rel = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = 'field_worker_ending_appeals'::regclass`,
    );
    expect(rel.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
    const pol = await client.query<{ policyname: string; cmd: string; roles: string[] }>(
      `SELECT policyname, cmd, roles::text[] AS roles FROM pg_policies WHERE tablename = 'field_worker_ending_appeals' ORDER BY policyname`,
    );
    expect(pol.rows.map((p) => [p.policyname, p.cmd, p.roles])).toEqual([
      ['field_worker_ending_appeals_tenant_isolation_insert', 'INSERT', ['twt_app']],
      ['field_worker_ending_appeals_tenant_isolation_select', 'SELECT', ['twt_app']],
      ['field_worker_ending_appeals_tenant_isolation_update', 'UPDATE', ['twt_app']],
    ]);
  });

  it('positive / negative isolation; withCheck 42501; an UPDATE cannot reach another tenant; fail-closed with no scope', async () => {
    const { client } = getTx();
    const b = await seedAppeal(client, PARIWAR_B);
    const a = await seedAppeal(client, PARIWAR_A);
    const ids = [a.appealId, b.appealId];
    expect((await client.query('SELECT appeal_id FROM field_worker_ending_appeals WHERE appeal_id = ANY($1)', [ids])).rows).toEqual([{ appeal_id: a.appealId }]);
    await enterAppScope(client, PARIWAR_B);
    expect((await client.query('SELECT appeal_id FROM field_worker_ending_appeals WHERE appeal_id = ANY($1)', [ids])).rows).toEqual([{ appeal_id: b.appealId }]);
    await client.query(APPEAL_ON);
    await expectSqlRejected(client, APPEAL_INSERT_SQL, [randomUUID(), PARIWAR_A, a.workerId], '42501');
    const u = await client.query(
      "UPDATE field_worker_ending_appeals SET state = 'withdrawn', decided_on = current_date, decided_by_user_id = gen_random_uuid(), state_event_version = 2 WHERE appeal_id = $1",
      [a.appealId],
    );
    expect(u.rowCount).toBe(0);
    await client.query(APPEAL_OFF);
    await enterAppRoleNoScope(client);
    await client.query("SELECT set_config('app.pariwar_id', '', true)");
    expect((await client.query('SELECT 1 FROM field_worker_ending_appeals WHERE appeal_id = ANY($1)', [ids])).rows).toHaveLength(0);
  });

  it('as twt_app: DELETE and TRUNCATE are refused (42501); the lock SELECT … FOR UPDATE works on its own tenant’s row; every projector write passes (TR12)', async () => {
    const { client } = getTx();
    const a = await seedAppeal(client, PARIWAR_A);
    await expectSqlRejected(client, 'DELETE FROM field_worker_ending_appeals WHERE appeal_id = $1', [a.appealId], '42501');
    await expectSqlRejected(client, 'TRUNCATE field_worker_ending_appeals', [], '42501');
    const own = await client.query('SELECT 1 FROM field_worker_ending_appeals WHERE appeal_id = $1 AND pariwar_id = $2 FOR UPDATE', [a.appealId, PARIWAR_A]);
    expect(own.rowCount).toBe(1);
    // The projector's transition `.set()` columns, as twt_app (the grant covers each — the 10.22 column-GRANT footgun).
    await client.query(APPEAL_ON);
    const t = await client.query(
      "UPDATE field_worker_ending_appeals SET state = 'refused', decided_on = current_date, decided_by_user_id = gen_random_uuid(), state_event_version = 2, audit_id = gen_random_uuid(), updated_at = now() WHERE appeal_id = $1",
      [a.appealId],
    );
    expect(t.rowCount).toBe(1);
    await client.query(APPEAL_OFF);
  });
});
