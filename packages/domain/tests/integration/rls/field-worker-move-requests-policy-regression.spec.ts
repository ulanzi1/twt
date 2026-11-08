// field_worker_move_requests + field_worker_notices tables + RLS policy regression — Story 13.1d (Task 2.1; migration 0205; architecture
// "every RLS policy ships with a test"). Mirrors field-workers-policy-regression: the catalog shape (columns, the named CHECKs — the
// value lists sourced from the domain tuples —, the FK-target UNIQUE, the partial unique, the keyset indexes), the grants (the notices'
// COLUMN grants), ENABLE + FORCE with three per-command policies, positive + negative isolation, the withCheck 42501, the fail-closed
// probe, and both guard triggers (AD2, AD3, AD9, AD11). Raw INSERTs set the writer guards so the triggers (which run BEFORE the RLS WITH
// CHECK) step aside. Live DB only.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import {
  FIELD_WORKER_MOVE_ESCALATION_CAUSES,
  FIELD_WORKER_MOVE_REFUSAL_REASONS,
  FIELD_WORKER_MOVE_REQUEST_STATES,
  FIELD_WORKER_MOVE_SUPERSEDE_CAUSES,
} from '../../../src/schema/field_worker_move_requests.js';
import { FIELD_WORKER_NOTICE_KINDS } from '../../../src/schema/field_worker_notices.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';
import { GUARD_OFF, GUARD_ON, RAW_INSERT_SQL, expectSqlRejected, pgErrorOf, rawInsertParams } from '../field-worker/_fixtures.js';

const REQ_ON = "SET LOCAL app.field_worker_move_request_writer = 'on'";
const REQ_OFF = "SET LOCAL app.field_worker_move_request_writer = 'off'";
const REQ_PREFIX = 'field_worker_move_requests direct write rejected';

/** An opening-shaped request INSERT — 9 parameters, in `reqParams` order. */
const REQ_INSERT_SQL = `INSERT INTO field_worker_move_requests
  (move_request_id, pariwar_id, field_worker_id, from_district, to_district, opened_at_end, counterpart_district, state,
   opened_by, state_event_version, audit_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, 1, $9)`;
const reqParams = (id: string, pariwarId: string, workerId: string, end: 'from' | 'to' = 'from'): unknown[] => [
  id,
  pariwarId,
  workerId,
  'Patna',
  'Gaya',
  end,
  end === 'from' ? 'Gaya' : 'Patna',
  randomUUID(),
  randomUUID(),
];

const NOTICE_INSERT_SQL = `INSERT INTO field_worker_notices
  (pariwar_id, recipient_user_id, kind, field_worker_id, move_request_id, from_district, to_district, refusal_reason)
  VALUES ($1, $2, $3, $4, $5, 'Patna', 'Gaya', $6) RETURNING notice_id`;

/** Collapse whitespace and drop parentheses, so a predicate compares by content (Postgres re-renders it). */
const normalise = (sql: string): string => sql.replace(/[()\s]+/g, ' ').trim().toLowerCase();
/** The quoted literals of a CHECK, in order — the value list, independent of how Postgres renders `IN` (`= ANY (ARRAY[...])`). */
const literals = (def: string): string[] => [...def.matchAll(/'([a-z0-9_]+)'::text/g)].map((m) => m[1]!);

describe.skipIf(!hasDatabase)('field_worker_move_requests + field_worker_notices tables + RLS policy regression (Story 13.1d AD11)', () => {
  setupLiveDb();

  /** A worker in `pariwarId` (raw, guarded) plus one opening-shaped request on it. Leaves the session in that scope. */
  async function seedRequest(client: pg.PoolClient, pariwarId: string): Promise<{ workerId: string; requestId: string }> {
    const workerId = randomUUID();
    const requestId = randomUUID();
    await enterAppScope(client, pariwarId);
    await client.query(GUARD_ON);
    await client.query(RAW_INSERT_SQL, rawInsertParams(workerId, pariwarId));
    await client.query(GUARD_OFF);
    await client.query(REQ_ON);
    await client.query(REQ_INSERT_SQL, reqParams(requestId, pariwarId, workerId));
    await client.query(REQ_OFF);
    return { workerId, requestId };
  }

  describe('field_worker_move_requests', () => {
    it('the columns, types and NOT NULLs, and only the two timestamps default', async () => {
      const { client } = getTx();
      const r = await client.query<{ column_name: string; udt_name: string; is_nullable: string; column_default: string | null }>(
        `SELECT column_name, udt_name, is_nullable, column_default FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'field_worker_move_requests' ORDER BY ordinal_position`,
      );
      expect(r.rows.map((c) => [c.column_name, c.udt_name, c.is_nullable])).toEqual([
        ['move_request_id', 'uuid', 'NO'],
        ['pariwar_id', 'uuid', 'NO'],
        ['field_worker_id', 'uuid', 'NO'],
        ['from_district', 'text', 'NO'],
        ['to_district', 'text', 'NO'],
        ['opened_at_end', 'text', 'NO'],
        ['counterpart_district', 'text', 'NO'],
        ['state', 'text', 'NO'],
        ['refusal_reason', 'text', 'YES'],
        ['escalation_cause', 'text', 'YES'],
        ['supersede_cause', 'text', 'YES'],
        ['opened_by', 'uuid', 'NO'],
        ['opened_at', 'timestamptz', 'NO'],
        ['answered_by', 'uuid', 'YES'],
        ['answered_at', 'timestamptz', 'YES'],
        ['posted_event_id', 'uuid', 'YES'],
        ['state_event_version', 'int8', 'NO'],
        ['audit_id', 'uuid', 'NO'],
        ['updated_at', 'timestamptz', 'NO'],
      ]);
      const defaults = Object.fromEntries(r.rows.filter((c) => c.column_default !== null).map((c) => [c.column_name, c.column_default]));
      expect(defaults).toEqual({ opened_at: 'now()', updated_at: 'now()' }); // ⛔ default on the id (caller-minted — the stream id)
    });

    it('the named constraints — and nothing else; each value-list CHECK carries exactly its domain tuple', async () => {
      const { client } = getTx();
      const r = await client.query<{ conname: string; contype: string; def: string }>(
        `SELECT conname, contype, pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conrelid = 'field_worker_move_requests'::regclass ORDER BY conname`,
      );
      expect(r.rows.map((c) => [c.conname, c.contype])).toEqual([
        ['field_worker_move_requests_answered_pair', 'c'],
        ['field_worker_move_requests_counterpart_check', 'c'],
        ['field_worker_move_requests_districts_differ', 'c'],
        ['field_worker_move_requests_districts_nonblank', 'c'],
        ['field_worker_move_requests_escalation_cause_check', 'c'],
        ['field_worker_move_requests_escalation_cause_state', 'c'],
        ['field_worker_move_requests_opened_at_end_check', 'c'],
        ['field_worker_move_requests_pariwar_request_uq', 'u'],
        ['field_worker_move_requests_pkey', 'p'],
        ['field_worker_move_requests_posted_event_pair', 'c'],
        ['field_worker_move_requests_refusal_pair', 'c'],
        ['field_worker_move_requests_refusal_reason_check', 'c'],
        ['field_worker_move_requests_state_check', 'c'],
        ['field_worker_move_requests_supersede_cause_check', 'c'],
        ['field_worker_move_requests_supersede_pair', 'c'],
        ['field_worker_move_requests_worker_fk', 'f'],
      ]);
      const def = (n: string): string => r.rows.find((c) => c.conname === n)!.def;
      expect(literals(def('field_worker_move_requests_state_check'))).toEqual([...FIELD_WORKER_MOVE_REQUEST_STATES]);
      expect(literals(def('field_worker_move_requests_refusal_reason_check'))).toEqual([...FIELD_WORKER_MOVE_REFUSAL_REASONS]);
      expect(literals(def('field_worker_move_requests_escalation_cause_check'))).toEqual([...FIELD_WORKER_MOVE_ESCALATION_CAUSES]);
      expect(literals(def('field_worker_move_requests_supersede_cause_check'))).toEqual([...FIELD_WORKER_MOVE_SUPERSEDE_CAUSES]);
      expect(def('field_worker_move_requests_pariwar_request_uq')).toBe('UNIQUE (pariwar_id, move_request_id)');
      expect(def('field_worker_move_requests_worker_fk')).toBe(
        'FOREIGN KEY (pariwar_id, field_worker_id) REFERENCES field_workers(pariwar_id, field_worker_id)',
      );
    });

    it('the one-open partial unique and the four keyset / sweep indexes (column lists and predicates, normalised)', async () => {
      const { client } = getTx();
      const r = await client.query<{ indexname: string; def: string; uniq: boolean; pred: string | null }>(
        `SELECT c.relname AS indexname, pg_get_indexdef(i.indexrelid) AS def, i.indisunique AS uniq, pg_get_expr(i.indpred, i.indrelid) AS pred
           FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
          WHERE i.indrelid = 'field_worker_move_requests'::regclass ORDER BY c.relname`,
      );
      const byName = new Map(r.rows.map((x) => [x.indexname, x]));
      expect([...byName.keys()]).toEqual([
        'field_worker_move_requests_from_idx',
        'field_worker_move_requests_one_open_uq',
        'field_worker_move_requests_pariwar_idx',
        'field_worker_move_requests_pariwar_request_uq',
        'field_worker_move_requests_pending_idx',
        'field_worker_move_requests_pkey',
        'field_worker_move_requests_to_idx',
      ]);
      const columnsOf = (d: string): string => normalise(d).replace(/^.* using btree /, '').replace(/ where .*$/, '');
      const open = byName.get('field_worker_move_requests_one_open_uq')!;
      expect(open.uniq).toBe(true);
      expect(columnsOf(open.def)).toBe('pariwar_id, field_worker_id');
      expect(literals(open.pred!)).toEqual(['pending', 'escalated']);
      expect(columnsOf(byName.get('field_worker_move_requests_from_idx')!.def)).toBe('pariwar_id, from_district, opened_at desc, move_request_id desc');
      expect(columnsOf(byName.get('field_worker_move_requests_to_idx')!.def)).toBe('pariwar_id, to_district, opened_at desc, move_request_id desc');
      expect(columnsOf(byName.get('field_worker_move_requests_pariwar_idx')!.def)).toBe('pariwar_id, opened_at desc, move_request_id desc');
      const pending = byName.get('field_worker_move_requests_pending_idx')!;
      expect(columnsOf(pending.def)).toBe('opened_at, move_request_id');
      expect(literals(pending.pred!)).toEqual(['pending']);
    });

    it('twt_app holds SELECT, INSERT, UPDATE — ⛔ DELETE, ⛔ TRUNCATE; ENABLE + FORCE with three per-command policies', async () => {
      const { client } = getTx();
      const grants = await client.query<{ privilege_type: string }>(
        `SELECT privilege_type FROM information_schema.role_table_grants
          WHERE table_name = 'field_worker_move_requests' AND grantee = 'twt_app' ORDER BY privilege_type`,
      );
      expect(grants.rows.map((g) => g.privilege_type)).toEqual(['INSERT', 'SELECT', 'UPDATE']);
      const rel = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = 'field_worker_move_requests'::regclass`,
      );
      expect(rel.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
      const pol = await client.query<{ policyname: string; cmd: string; roles: string[] }>(
        `SELECT policyname, cmd, roles::text[] AS roles FROM pg_policies WHERE tablename = 'field_worker_move_requests' ORDER BY policyname`,
      );
      expect(pol.rows.map((p) => [p.policyname, p.cmd, p.roles])).toEqual([
        ['field_worker_move_requests_tenant_isolation_insert', 'INSERT', ['twt_app']],
        ['field_worker_move_requests_tenant_isolation_select', 'SELECT', ['twt_app']],
        ['field_worker_move_requests_tenant_isolation_update', 'UPDATE', ['twt_app']],
      ]);
    });

    it('positive / negative isolation; withCheck 42501; an UPDATE cannot reach another tenant; fail-closed with no scope', async () => {
      const { client } = getTx();
      const b = await seedRequest(client, PARIWAR_B);
      const a = await seedRequest(client, PARIWAR_A);
      const ids = [a.requestId, b.requestId];
      expect((await client.query('SELECT move_request_id FROM field_worker_move_requests WHERE move_request_id = ANY($1)', [ids])).rows).toEqual([
        { move_request_id: a.requestId },
      ]);
      await enterAppScope(client, PARIWAR_B);
      expect((await client.query('SELECT move_request_id FROM field_worker_move_requests WHERE move_request_id = ANY($1)', [ids])).rows).toEqual([
        { move_request_id: b.requestId },
      ]);
      // withCheck: an INSERT for another tenant (the worker exists in A; scope is B).
      await client.query(REQ_ON);
      await expectSqlRejected(client, REQ_INSERT_SQL, reqParams(randomUUID(), PARIWAR_A, a.workerId), '42501');
      // An UPDATE from B cannot reach A's request, even guarded.
      const u = await client.query("UPDATE field_worker_move_requests SET state_event_version = 2 WHERE move_request_id = $1", [a.requestId]);
      expect(u.rowCount).toBe(0);
      await client.query(REQ_OFF);
      await enterAppRoleNoScope(client);
      await client.query("SELECT set_config('app.pariwar_id', '', true)");
      expect((await client.query('SELECT 1 FROM field_worker_move_requests WHERE move_request_id = ANY($1)', [ids])).rows).toHaveLength(0);
    });

    it('as twt_app: DELETE and TRUNCATE are refused (42501); the lock SELECT … FOR UPDATE works on its own tenant’s row', async () => {
      const { client } = getTx();
      const a = await seedRequest(client, PARIWAR_A);
      await expectSqlRejected(client, 'DELETE FROM field_worker_move_requests WHERE move_request_id = $1', [a.requestId], '42501');
      await expectSqlRejected(client, 'TRUNCATE field_worker_move_requests', [], '42501');
      const own = await client.query('SELECT 1 FROM field_worker_move_requests WHERE move_request_id = $1 AND pariwar_id = $2 FOR UPDATE', [
        a.requestId,
        PARIWAR_A,
      ]);
      expect(own.rowCount).toBe(1);
    });

    it('the guard (AD2): an unguarded INSERT or UPDATE is refused; an INSERT must be the opening shape', async () => {
      const { client } = getTx();
      await seedRequest(client, PARIWAR_A);
      const unguardedInsert = await pgErrorOf(() => client.query(REQ_INSERT_SQL, reqParams(randomUUID(), PARIWAR_A, randomUUID())));
      expect(unguardedInsert.code).toBe('P0001');
      expect(unguardedInsert.message).toContain(REQ_PREFIX);
    });

    it('the guard (AD2): an UPDATE without the writer is refused, even of a projected column alone', async () => {
      const { client } = getTx();
      const a = await seedRequest(client, PARIWAR_A);
      const e = await pgErrorOf(() => client.query("UPDATE field_worker_move_requests SET audit_id = $2 WHERE move_request_id = $1", [a.requestId, randomUUID()]));
      expect(e.code).toBe('P0001');
      expect(e.message).toContain('only the request projector may update');
    });

    it('the guard (AD3): an opening INSERT that is not pending / version 1 / bare is refused — with a CONTROL that the bare shape passes', async () => {
      const { client } = getTx();
      const workerId = randomUUID();
      await enterAppScope(client, PARIWAR_A);
      await client.query(GUARD_ON);
      await client.query(RAW_INSERT_SQL, rawInsertParams(workerId, PARIWAR_A));
      await client.query(REQ_ON);
      const shaped = `INSERT INTO field_worker_move_requests
        (move_request_id, pariwar_id, field_worker_id, from_district, to_district, opened_at_end, counterpart_district, state,
         opened_by, state_event_version, audit_id, escalation_cause)
        VALUES ($1, $2, $3, 'Patna', 'Gaya', 'from', 'Gaya', $4, $5, $6, $7, $8)`;
      for (const [state, version, cause] of [
        ['escalated', 1, 'unanswered_7_days'],
        ['pending', 2, null],
      ] as const) {
        const e = await pgErrorOf(() =>
          client.query('SAVEPOINT s').then(() => client.query(shaped, [randomUUID(), PARIWAR_A, workerId, state, randomUUID(), version, randomUUID(), cause])),
        );
        await client.query('ROLLBACK TO SAVEPOINT s');
        expect(e.code, `${state}/${version}`).toBe('P0001');
        expect(e.message).toContain('an opening INSERT must be pending');
      }
      // CONTROL — the bare shape passes on the same client.
      await client.query(shaped, [randomUUID(), PARIWAR_A, workerId, 'pending', randomUUID(), 1, randomUUID(), null]);
    });

    it('the guard (AD3, AD11): a final row is frozen; the identity is immutable; the version strictly increases; an escalation cause is never changed', async () => {
      const { client } = getTx();
      const a = await seedRequest(client, PARIWAR_A);
      await client.query(REQ_ON);
      const tryUpdate = async (sets: string): Promise<{ code?: string; message: string } | null> => {
        await client.query('SAVEPOINT u');
        try {
          await client.query(`UPDATE field_worker_move_requests SET ${sets} WHERE move_request_id = $1`, [a.requestId]);
          await client.query('RELEASE SAVEPOINT u');
          return null;
        } catch (err) {
          await client.query('ROLLBACK TO SAVEPOINT u');
          const x = err as { code?: string; message?: string };
          return { code: x.code, message: x.message ?? '' };
        }
      };
      expect((await tryUpdate("to_district = 'Nalanda', counterpart_district = 'Nalanda', state_event_version = 2"))?.message).toContain(
        'identity is immutable',
      );
      expect((await tryUpdate('state_event_version = 1'))?.message).toContain('must strictly increase');
      // Escalate (version 2), then try to change the cause, then clear it.
      expect(await tryUpdate("state = 'escalated', escalation_cause = 'unanswered_7_days', state_event_version = 2")).toBeNull();
      expect((await tryUpdate("escalation_cause = 'no_counterpart_officer', state_event_version = 3"))?.message).toContain('never changed or cleared');
      // Withdraw from escalated keeps the cause (the CHECK admits it), and the row is then FROZEN.
      expect(
        await tryUpdate(`state = 'withdrawn', answered_by = '${randomUUID()}', answered_at = now(), state_event_version = 3`),
      ).toBeNull();
      expect((await tryUpdate('state_event_version = 4'))?.message).toContain('a final request (withdrawn) is never updated');
    });

    it('the CHECKs: the counterpart is the other end; a refusal needs its reason; accepted needs its posted event; a close needs an escalation', async () => {
      const { client } = getTx();
      const a = await seedRequest(client, PARIWAR_A);
      await client.query(REQ_ON);
      const check = async (sets: string, constraint: string): Promise<void> => {
        await expectSqlRejected(
          client,
          `UPDATE field_worker_move_requests SET ${sets}, state_event_version = 2 WHERE move_request_id = $1`,
          [a.requestId],
          '23514',
          constraint,
        );
      };
      await check("state = 'refused', answered_by = opened_by, answered_at = now()", 'field_worker_move_requests_refusal_pair');
      await check("state = 'accepted', answered_by = opened_by, answered_at = now()", 'field_worker_move_requests_posted_event_pair');
      await check("state = 'closed', answered_by = opened_by, answered_at = now()", 'field_worker_move_requests_escalation_cause_state');
      await check("state = 'superseded', answered_by = opened_by, answered_at = now()", 'field_worker_move_requests_supersede_pair');
      await check("state = 'withdrawn'", 'field_worker_move_requests_answered_pair');
      // CONTROL — a well-formed refusal passes.
      await client.query(
        "UPDATE field_worker_move_requests SET state = 'refused', refusal_reason = 'no_capacity', answered_by = opened_by, answered_at = now(), state_event_version = 2 WHERE move_request_id = $1",
        [a.requestId],
      );
      // The counterpart CHECK on a raw INSERT (the trigger passes the shape; the CHECK refuses the wrong end).
      const bad = [randomUUID(), PARIWAR_A, a.workerId, 'Patna', 'Gaya', 'from', 'Patna', randomUUID(), randomUUID()];
      await expectSqlRejected(client, REQ_INSERT_SQL, bad, '23514', 'field_worker_move_requests_counterpart_check');
    });

    it('I4: a second OPEN request for the same worker hits the partial unique BY NAME; a final one does not block a new one', async () => {
      const { client } = getTx();
      const a = await seedRequest(client, PARIWAR_A);
      await client.query(REQ_ON);
      await expectSqlRejected(client, REQ_INSERT_SQL, reqParams(randomUUID(), PARIWAR_A, a.workerId), '23505', 'field_worker_move_requests_one_open_uq');
      await client.query(
        "UPDATE field_worker_move_requests SET state = 'withdrawn', answered_by = opened_by, answered_at = now(), state_event_version = 2 WHERE move_request_id = $1",
        [a.requestId],
      );
      await client.query(REQ_INSERT_SQL, reqParams(randomUUID(), PARIWAR_A, a.workerId)); // CONTROL — now admitted
    });
  });

  describe('field_worker_notices', () => {
    it('the columns, the constraints (the kind CHECK = the domain tuple) and the recipient index', async () => {
      const { client } = getTx();
      const cols = await client.query<{ column_name: string; udt_name: string; is_nullable: string }>(
        `SELECT column_name, udt_name, is_nullable FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'field_worker_notices' ORDER BY ordinal_position`,
      );
      expect(cols.rows.map((c) => [c.column_name, c.udt_name, c.is_nullable])).toEqual([
        ['notice_id', 'uuid', 'NO'],
        ['pariwar_id', 'uuid', 'NO'],
        ['recipient_user_id', 'uuid', 'NO'],
        ['kind', 'text', 'NO'],
        ['field_worker_id', 'uuid', 'NO'],
        ['move_request_id', 'uuid', 'YES'],
        ['from_district', 'text', 'NO'],
        ['to_district', 'text', 'NO'],
        ['refusal_reason', 'text', 'YES'],
        ['created_at', 'timestamptz', 'NO'],
        ['seen_at', 'timestamptz', 'YES'],
      ]);
      const con = await client.query<{ conname: string; contype: string; def: string }>(
        `SELECT conname, contype, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'field_worker_notices'::regclass ORDER BY conname`,
      );
      expect(con.rows.map((c) => [c.conname, c.contype])).toEqual([
        ['field_worker_notices_districts_check', 'c'],
        ['field_worker_notices_kind_check', 'c'],
        ['field_worker_notices_pkey', 'p'],
        ['field_worker_notices_refusal_pair', 'c'],
        ['field_worker_notices_refusal_reason_check', 'c'],
        ['field_worker_notices_request_fk', 'f'],
        ['field_worker_notices_request_pair', 'c'],
        ['field_worker_notices_worker_fk', 'f'],
      ]);
      expect(literals(con.rows.find((c) => c.conname === 'field_worker_notices_kind_check')!.def)).toEqual([...FIELD_WORKER_NOTICE_KINDS]);
      expect(literals(con.rows.find((c) => c.conname === 'field_worker_notices_refusal_reason_check')!.def)).toEqual([
        ...FIELD_WORKER_MOVE_REFUSAL_REASONS,
      ]);
      const idx = await client.query<{ def: string }>(
        `SELECT pg_get_indexdef(i.indexrelid) AS def FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
          WHERE i.indrelid = 'field_worker_notices'::regclass AND c.relname = 'field_worker_notices_recipient_idx'`,
      );
      expect(normalise(idx.rows[0]!.def).replace(/^.* using btree /, '')).toBe('pariwar_id, recipient_user_id, created_at desc, notice_id desc');
    });

    it('twt_app: SELECT on the table, INSERT on the eight identity columns, UPDATE on seen_at ONLY; ⛔ DELETE; ENABLE + FORCE, three policies', async () => {
      const { client } = getTx();
      const table = await client.query<{ privilege_type: string }>(
        `SELECT privilege_type FROM information_schema.role_table_grants WHERE table_name = 'field_worker_notices' AND grantee = 'twt_app'`,
      );
      expect(table.rows.map((g) => g.privilege_type)).toEqual(['SELECT']);
      const cols = await client.query<{ privilege_type: string; column_name: string }>(
        `SELECT privilege_type, column_name FROM information_schema.column_privileges
          WHERE table_name = 'field_worker_notices' AND grantee = 'twt_app' AND privilege_type IN ('INSERT', 'UPDATE')
          ORDER BY privilege_type, column_name`,
      );
      expect(cols.rows.filter((c) => c.privilege_type === 'INSERT').map((c) => c.column_name)).toEqual(
        ['field_worker_id', 'from_district', 'kind', 'move_request_id', 'pariwar_id', 'recipient_user_id', 'refusal_reason', 'to_district'],
      );
      expect(cols.rows.filter((c) => c.privilege_type === 'UPDATE').map((c) => c.column_name)).toEqual(['seen_at']);
      const rel = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = 'field_worker_notices'::regclass`,
      );
      expect(rel.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
      const pol = await client.query<{ policyname: string; cmd: string }>(
        `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'field_worker_notices' ORDER BY policyname`,
      );
      expect(pol.rows.map((p) => [p.policyname, p.cmd])).toEqual([
        ['field_worker_notices_tenant_isolation_insert', 'INSERT'],
        ['field_worker_notices_tenant_isolation_select', 'SELECT'],
        ['field_worker_notices_tenant_isolation_update', 'UPDATE'],
      ]);
    });

    it('as twt_app: insert, isolate by Pariwar, set seen_at ONCE; ⛔ another column; ⛔ DELETE; ⛔ another tenant (withCheck)', async () => {
      const { client } = getTx();
      const b = await seedRequest(client, PARIWAR_B);
      const nb = (await client.query<{ notice_id: string }>(NOTICE_INSERT_SQL, [PARIWAR_B, randomUUID(), 'move_request_opened', b.workerId, b.requestId, null]))
        .rows[0]!.notice_id;
      const a = await seedRequest(client, PARIWAR_A);
      const officer = randomUUID();
      const na = (await client.query<{ notice_id: string }>(NOTICE_INSERT_SQL, [PARIWAR_A, officer, 'move_request_refused', a.workerId, a.requestId, 'other']))
        .rows[0]!.notice_id;
      expect((await client.query('SELECT notice_id FROM field_worker_notices WHERE notice_id = ANY($1)', [[na, nb]])).rows).toEqual([{ notice_id: na }]);
      // A column the grant does not name — refused by the grant (42501) before the trigger.
      await expectSqlRejected(client, "UPDATE field_worker_notices SET kind = 'move_request_opened' WHERE notice_id = $1", [na], '42501');
      await expectSqlRejected(client, 'DELETE FROM field_worker_notices WHERE notice_id = $1', [na], '42501');
      expect((await client.query('UPDATE field_worker_notices SET seen_at = now() WHERE notice_id = $1', [na])).rowCount).toBe(1);
      await expectSqlRejected(client, "UPDATE field_worker_notices SET seen_at = now() + interval '1 hour' WHERE notice_id = $1", [na], '23000');
      expect((await client.query('UPDATE field_worker_notices SET seen_at = now() WHERE notice_id = $1', [nb])).rowCount).toBe(0); // B's — invisible
      await expectSqlRejected(client, NOTICE_INSERT_SQL, [PARIWAR_B, officer, 'move_request_opened', b.workerId, b.requestId, null], '42501');
      // The CHECKs: a refusal needs its reason; every kind but the direct move names a request.
      await expectSqlRejected(client, NOTICE_INSERT_SQL, [PARIWAR_A, officer, 'move_request_refused', a.workerId, a.requestId, null], '23514', 'field_worker_notices_refusal_pair');
      await expectSqlRejected(client, NOTICE_INSERT_SQL, [PARIWAR_A, officer, 'move_request_opened', a.workerId, null, null], '23514', 'field_worker_notices_request_pair');
      await client.query(NOTICE_INSERT_SQL, [PARIWAR_A, officer, 'moved_by_pariwar_admin', a.workerId, null, null]); // CONTROL
    });

    it('the guard as the OWNER (no grant in the way): only seen_at may change', async () => {
      const { client } = getTx();
      const a = await seedRequest(client, PARIWAR_A);
      const n = (await client.query<{ notice_id: string }>(NOTICE_INSERT_SQL, [PARIWAR_A, randomUUID(), 'move_request_opened', a.workerId, a.requestId, null]))
        .rows[0]!.notice_id;
      await client.query('RESET ROLE');
      const e = await pgErrorOf(() => client.query("UPDATE field_worker_notices SET to_district = 'Nalanda' WHERE notice_id = $1", [n]));
      expect(e.code).toBe('23000');
      expect(e.message).toContain('only seen_at is ever updated');
    });
  });
});
