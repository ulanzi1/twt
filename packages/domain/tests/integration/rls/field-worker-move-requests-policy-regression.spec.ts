// field_worker_move_requests + field_worker_notices tables + RLS policy regression — Story 13.1d (Task 2.1; migration 0205; architecture
// "every RLS policy ships with a test"). Mirrors field-workers-policy-regression: the catalog shape (columns, the named CHECKs — the
// value lists sourced from the domain tuples —, the FK-target UNIQUE, the partial unique, the keyset indexes), the grants (the notices'
// COLUMN grants), ENABLE + FORCE with three per-command policies, positive + negative isolation, the withCheck 42501, the fail-closed
// probe, and both guard triggers (AD2, AD3, AD9, AD11). Raw INSERTs set the writer guards so the triggers (which run BEFORE the RLS WITH
// CHECK) step aside. Code review 2026-11-09 (CR1-CR7) added: the actor CHECKs, the escalation-cause rules, every final state frozen, the
// remaining CHECKs fired, the composite FKs fired (23503), the delete / truncate triggers as the OWNER, the notices' fail-closed probe and
// the one-notice-per-act unique. Live DB only.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import {
  FIELD_WORKER_MOVE_ESCALATION_CAUSES,
  FIELD_WORKER_MOVE_OPENED_AT_ENDS,
  FIELD_WORKER_MOVE_REFUSAL_REASONS,
  FIELD_WORKER_MOVE_REQUEST_STATES,
  FIELD_WORKER_MOVE_SUPERSEDE_CAUSES,
} from '../../../src/schema/field_worker_move_requests.js';
import { FIELD_WORKER_NOTICE_KINDS } from '../../../src/schema/field_worker_notices.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, lockTruncateSetNowait } from '../_helpers.js';
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

/** A notice INSERT with the districts as parameters — for the districts CHECK. */
const NOTICE_DISTRICTS_SQL = `INSERT INTO field_worker_notices
  (pariwar_id, recipient_user_id, kind, field_worker_id, move_request_id, from_district, to_district, refusal_reason)
  VALUES ($1, $2, 'move_request_opened', $3, $4, $5, $6, NULL)`;

/** One UPDATE of a request inside a savepoint: `null` when the guard admits it (kept), else the refusal (rolled back). */
async function tryRequestUpdate(
  client: pg.PoolClient,
  requestId: string,
  sets: string,
): Promise<{ code?: string; constraint?: string; message: string } | null> {
  await client.query('SAVEPOINT u');
  try {
    await client.query(`UPDATE field_worker_move_requests SET ${sets} WHERE move_request_id = $1`, [requestId]);
    await client.query('RELEASE SAVEPOINT u');
    return null;
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT u');
    const x = err as { code?: string; constraint?: string; message?: string };
    return { code: x.code, constraint: x.constraint, message: x.message ?? '' };
  }
}

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
        ['field_worker_move_requests_answerer_not_opener', 'c'],
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
        ['field_worker_move_requests_withdrawn_by_opener', 'c'],
        ['field_worker_move_requests_worker_fk', 'f'],
      ]);
      const def = (n: string): string => r.rows.find((c) => c.conname === n)!.def;
      expect(literals(def('field_worker_move_requests_state_check'))).toEqual([...FIELD_WORKER_MOVE_REQUEST_STATES]);
      expect(literals(def('field_worker_move_requests_opened_at_end_check'))).toEqual([...FIELD_WORKER_MOVE_OPENED_AT_ENDS]);
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

    it('as the OWNER (no grant in the way): DELETE and TRUNCATE are refused by their own triggers (P0001, their messages) — and with the triggers off the same DELETE removes the row (CR3; R4-7)', async () => {
      const { client } = getTx();
      const a = await seedRequest(client, PARIWAR_A);
      await client.query('RESET ROLE'); // the owner bypasses RLS and holds every privilege — only the triggers stand in the way
      await client.query('SAVEPOINT own_delete');
      const del = await pgErrorOf(() => client.query('DELETE FROM field_worker_move_requests WHERE move_request_id = $1', [a.requestId]));
      await client.query('ROLLBACK TO SAVEPOINT own_delete');
      expect(del.code).toBe('P0001');
      expect(del.message).toContain('a move request is never deleted');
      expect(del.message).toContain('DELETE rejected');
      // Postgres refuses a RESTRICT truncate of a table the notices reference (0A000) BEFORE it fires a trigger, so the trigger is reached by
      // CASCADE — which needs the whole referencing set locked, all or nothing (Story 6.19b), before the statement.
      await lockTruncateSetNowait(client, 'field_worker_move_requests');
      await client.query('SAVEPOINT own_truncate');
      const trunc = await pgErrorOf(() => client.query('TRUNCATE field_worker_move_requests CASCADE'));
      await client.query('ROLLBACK TO SAVEPOINT own_truncate');
      expect(trunc.code).toBe('P0001');
      expect(trunc.message).toContain('TRUNCATE rejected');
      // CONTROL (code review R4-7): the same owner DELETE with the triggers off removes the row - so the TRIGGER is what refused it above. (A
      // "the row survives" check after `ROLLBACK TO SAVEPOINT` could not fail: the rollback restores it whatever the trigger did.)
      await client.query('SAVEPOINT own_control');
      await client.query("SET LOCAL session_replication_role = 'replica'");
      const gone = await client.query('DELETE FROM field_worker_move_requests WHERE move_request_id = $1', [a.requestId]);
      await client.query('ROLLBACK TO SAVEPOINT own_control');
      expect(gone.rowCount).toBe(1);
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
      const tryUpdate = (sets: string) => tryRequestUpdate(client, a.requestId, sets);
      expect((await tryUpdate("to_district = 'Nalanda', counterpart_district = 'Nalanda', state_event_version = 2"))?.message).toContain(
        'identity is immutable',
      );
      expect((await tryUpdate('state_event_version = 1'))?.message).toContain('must strictly increase');
      // Escalate (version 2), then try to change the cause, then clear it.
      expect(await tryUpdate("state = 'escalated', escalation_cause = 'unanswered_7_days', state_event_version = 2")).toBeNull();
      expect((await tryUpdate("escalation_cause = 'no_counterpart_officer', state_event_version = 3"))?.message).toContain('never changed or cleared');
      // Withdraw from escalated keeps the cause (the CHECK admits it), and the row is then FROZEN.
      expect(await tryUpdate("state = 'withdrawn', answered_by = opened_by, answered_at = now(), state_event_version = 3")).toBeNull();
      expect((await tryUpdate('state_event_version = 4'))?.message).toContain('a final request (withdrawn) is never updated');
    });

    it('the guard (AD3): EVERY final state is frozen — accepted, refused, withdrawn, closed, superseded (CR6)', async () => {
      const { client } = getTx();
      const ended = `answered_by = '${randomUUID()}', answered_at = now()`;
      const toFinal: Record<string, string[]> = {
        accepted: [`state = 'accepted', posted_event_id = gen_random_uuid(), ${ended}, state_event_version = 2`],
        refused: [`state = 'refused', refusal_reason = 'other', ${ended}, state_event_version = 2`],
        withdrawn: ["state = 'withdrawn', answered_by = opened_by, answered_at = now(), state_event_version = 2"],
        superseded: [`state = 'superseded', supersede_cause = 'worker_moved', ${ended}, state_event_version = 2`],
        closed: ["state = 'escalated', escalation_cause = 'no_counterpart_officer', state_event_version = 2", `state = 'closed', ${ended}, state_event_version = 3`],
      };
      for (const [final, steps] of Object.entries(toFinal)) {
        const r = await seedRequest(client, PARIWAR_A);
        await client.query(REQ_ON);
        for (const sets of steps) expect(await tryRequestUpdate(client, r.requestId, sets), `${final}: ${sets}`).toBeNull();
        const e = await tryRequestUpdate(client, r.requestId, 'state_event_version = 9');
        expect(e?.code, final).toBe('P0001');
        expect(e?.message, final).toContain(`a final request (${final}) is never updated`);
      }
    });

    it('the guard (AD3, AD11): a cause is first written by the move to escalated and a close follows an escalation; an escalated request is never answered, reopened or stripped of its cause (CR4)', async () => {
      const { client } = getTx();
      const a = await seedRequest(client, PARIWAR_A);
      await client.query(REQ_ON);
      const up = (sets: string) => tryRequestUpdate(client, a.requestId, sets);
      const ended = `answered_by = '${randomUUID()}', answered_at = now()`;
      const cause = "escalation_cause = 'unanswered_7_days'";
      // PENDING — each of these satisfies every CHECK; only rule (g) refuses a cause that rides a move other than the escalation.
      for (const sets of [
        `state = 'closed', ${cause}, ${ended}, state_event_version = 2`,
        `state = 'withdrawn', ${cause}, answered_by = opened_by, answered_at = now(), state_event_version = 2`,
        `state = 'superseded', ${cause}, supersede_cause = 'worker_moved', ${ended}, state_event_version = 2`,
      ]) {
        const e = await up(sets);
        expect(e?.code, sets).toBe('P0001');
        expect(e?.message, sets).toContain('first written by the move to escalated');
      }
      // Rule (h): a close with NO cause would meet the CHECK (23514) — the guard answers first, in its own words.
      const close = await up(`state = 'closed', ${ended}, state_event_version = 2`);
      expect(close?.code).toBe('P0001');
      expect(close?.message).toContain('closed only from escalated');
      // CONTROL — the move to escalated writes it.
      expect(await up(`state = 'escalated', ${cause}, state_event_version = 2`)).toBeNull();
      // ESCALATED — never answered or reopened: by the CHECKs while the cause is kept, by rule (e) once it is cleared.
      for (const sets of [
        `state = 'accepted', posted_event_id = gen_random_uuid(), ${ended}`,
        `state = 'refused', refusal_reason = 'other', ${ended}`,
        "state = 'pending'",
      ]) {
        const kept = await up(`${sets}, state_event_version = 3`);
        expect(kept?.code, sets).toBe('23514');
        expect(kept?.constraint, sets).toBe('field_worker_move_requests_escalation_cause_state');
        const cleared = await up(`${sets}, escalation_cause = NULL, state_event_version = 3`);
        expect(cleared?.code, sets).toBe('P0001');
        expect(cleared?.message, sets).toContain('never changed or cleared');
      }
      // AD11 — a withdrawn or superseded escalated request keeps its cause: it is neither cleared nor changed.
      for (const sets of [
        "state = 'withdrawn', answered_by = opened_by, answered_at = now()",
        `state = 'superseded', supersede_cause = 'worker_ended', ${ended}`,
      ]) {
        for (const change of ['escalation_cause = NULL', "escalation_cause = 'no_counterpart_officer'"]) {
          const e = await up(`${sets}, ${change}, state_event_version = 3`);
          expect(e?.code, `${sets} / ${change}`).toBe('P0001');
          expect(e?.message, `${sets} / ${change}`).toContain('never changed or cleared');
        }
      }
      // CONTROL — an escalated request is closed, keeping its cause.
      expect(await up(`state = 'closed', ${ended}, state_event_version = 3`)).toBeNull();
      expect((await client.query('SELECT escalation_cause FROM field_worker_move_requests WHERE move_request_id = $1', [a.requestId])).rows[0]).toEqual({
        escalation_cause: 'unanswered_7_days',
      });
    });

    // A close that skips the escalation is the GUARD's now (rule (h), CR4 — the test above); the CHECK behind it is proved on its own below.
    it('the CHECKs: the counterpart is the other end; a refusal needs its reason; accepted needs its posted event', async () => {
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
      const officer = randomUUID(); // ⛔ the opener: an answerer is never the one who asked, and `answerer_not_opener` would answer first (CR1)
      await check(`state = 'refused', answered_by = '${officer}', answered_at = now()`, 'field_worker_move_requests_refusal_pair');
      await check(`state = 'accepted', answered_by = '${officer}', answered_at = now()`, 'field_worker_move_requests_posted_event_pair');
      await check("state = 'superseded', answered_by = opened_by, answered_at = now()", 'field_worker_move_requests_supersede_pair');
      await check("state = 'withdrawn'", 'field_worker_move_requests_answered_pair');
      // CONTROL — a well-formed refusal passes.
      await client.query(
        "UPDATE field_worker_move_requests SET state = 'refused', refusal_reason = 'no_capacity', answered_by = $2, answered_at = now(), state_event_version = 2 WHERE move_request_id = $1",
        [a.requestId, officer],
      );
      // The counterpart CHECK on a raw INSERT (the trigger passes the shape; the CHECK refuses the wrong end).
      const bad = [randomUUID(), PARIWAR_A, a.workerId, 'Patna', 'Gaya', 'from', 'Patna', randomUUID(), randomUUID()];
      await expectSqlRejected(client, REQ_INSERT_SQL, bad, '23514', 'field_worker_move_requests_counterpart_check');
    });

    it('the cause CHECK holds ON ITS OWN, behind the guard: with the triggers off (replica role) a close with no cause and a pending request with one are refused (23514) (CR4)', async () => {
      const { client } = getTx();
      const a = await seedRequest(client, PARIWAR_A);
      await client.query('RESET ROLE'); // session_replication_role needs the owner; the CHECKs still apply to it
      await client.query("SET LOCAL session_replication_role = 'replica'");
      const check = (sets: string) =>
        expectSqlRejected(
          client,
          `UPDATE field_worker_move_requests SET ${sets}, state_event_version = 2 WHERE move_request_id = $1`,
          [a.requestId],
          '23514',
          'field_worker_move_requests_escalation_cause_state',
        );
      await check("state = 'closed', answered_by = opened_by, answered_at = now()"); // a close needs an escalation
      await check("escalation_cause = 'unanswered_7_days'"); // a pending request carries no cause
    });

    it('the CHECKs (`-459` Q1 A, I3, AD3): whoever accepts or refuses is never the opener, and a withdrawal is the opener’s — with CONTROLS (CR1)', async () => {
      const { client } = getTx();
      const a = await seedRequest(client, PARIWAR_A);
      const b = await seedRequest(client, PARIWAR_A);
      const c = await seedRequest(client, PARIWAR_A);
      await client.query(REQ_ON);
      const other = randomUUID();
      const reject = (id: string, sets: string, constraint: string) =>
        expectSqlRejected(
          client,
          `UPDATE field_worker_move_requests SET ${sets}, state_event_version = 2 WHERE move_request_id = $1`,
          [id],
          '23514',
          constraint,
        );
      await reject(a.requestId, "state = 'refused', refusal_reason = 'other', answered_by = opened_by, answered_at = now()", 'field_worker_move_requests_answerer_not_opener');
      await reject(a.requestId, "state = 'accepted', posted_event_id = gen_random_uuid(), answered_by = opened_by, answered_at = now()", 'field_worker_move_requests_answerer_not_opener');
      await reject(a.requestId, `state = 'withdrawn', answered_by = '${other}', answered_at = now()`, 'field_worker_move_requests_withdrawn_by_opener');
      // CONTROLS — another officer refuses one and accepts another; the opener withdraws a third.
      const run = (id: string, sets: string) => tryRequestUpdate(client, id, `${sets}, state_event_version = 2`);
      expect(await run(a.requestId, `state = 'refused', refusal_reason = 'other', answered_by = '${other}', answered_at = now()`)).toBeNull();
      expect(await run(b.requestId, `state = 'accepted', posted_event_id = gen_random_uuid(), answered_by = '${other}', answered_at = now()`)).toBeNull();
      expect(await run(c.requestId, "state = 'withdrawn', answered_by = opened_by, answered_at = now()")).toBeNull();
    });

    it('the CHECKs: the districts are named and differ, the end is from or to, each "set IFF" pair refuses the other direction (CR6)', async () => {
      const { client } = getTx();
      const a = await seedRequest(client, PARIWAR_A);
      await client.query(REQ_ON);
      const insert = (o: { from?: string; to?: string; end?: string; counterpart?: string }, constraint: string) =>
        expectSqlRejected(
          client,
          REQ_INSERT_SQL,
          [randomUUID(), PARIWAR_A, a.workerId, o.from ?? 'Patna', o.to ?? 'Gaya', o.end ?? 'from', o.counterpart ?? 'Gaya', randomUUID(), randomUUID()],
          '23514',
          constraint,
        );
      await insert({ to: 'Patna', counterpart: 'Patna' }, 'field_worker_move_requests_districts_differ');
      await insert({ from: '  ' }, 'field_worker_move_requests_districts_nonblank');
      await insert({ end: 'sideways', counterpart: 'Patna' }, 'field_worker_move_requests_opened_at_end_check');
      // The pairs the other way round — a column set on a row the state does not allow it on (the guard admits each; only the CHECK refuses).
      const pair = (sets: string, constraint: string) =>
        expectSqlRejected(
          client,
          `UPDATE field_worker_move_requests SET ${sets}, state_event_version = 2 WHERE move_request_id = $1`,
          [a.requestId],
          '23514',
          constraint,
        );
      await pair('posted_event_id = gen_random_uuid()', 'field_worker_move_requests_posted_event_pair');
      await pair("supersede_cause = 'worker_moved'", 'field_worker_move_requests_supersede_pair');
      await pair("refusal_reason = 'other'", 'field_worker_move_requests_refusal_pair');
      await pair('answered_by = gen_random_uuid(), answered_at = now()', 'field_worker_move_requests_answered_pair'); // an OPEN request names no answerer
      await pair("state = 'withdrawn', answered_by = opened_by", 'field_worker_move_requests_answered_pair'); // an answerer with no time
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

    it('the composite FK (0178): another Pariwar’s worker and an unknown one are refused (23503, by constraint name); its own worker is admitted (CR2)', async () => {
      const { client } = getTx();
      const b = await seedRequest(client, PARIWAR_B);
      await seedRequest(client, PARIWAR_A); // leaves the session in A's scope
      await client.query(REQ_ON);
      await expectSqlRejected(client, REQ_INSERT_SQL, reqParams(randomUUID(), PARIWAR_A, b.workerId), '23503', 'field_worker_move_requests_worker_fk');
      await expectSqlRejected(client, REQ_INSERT_SQL, reqParams(randomUUID(), PARIWAR_A, randomUUID()), '23503', 'field_worker_move_requests_worker_fk');
      await seedRequest(client, PARIWAR_A); // CONTROL — a request on a worker of its own Pariwar
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
      const conDef = (n: string): string => con.rows.find((c) => c.conname === n)!.def;
      expect(conDef('field_worker_notices_worker_fk')).toBe('FOREIGN KEY (pariwar_id, field_worker_id) REFERENCES field_workers(pariwar_id, field_worker_id)');
      expect(conDef('field_worker_notices_request_fk')).toBe(
        'FOREIGN KEY (pariwar_id, move_request_id) REFERENCES field_worker_move_requests(pariwar_id, move_request_id)',
      );
      const idx = await client.query<{ indexname: string; def: string; uniq: boolean; pred: string | null }>(
        `SELECT c.relname AS indexname, pg_get_indexdef(i.indexrelid) AS def, i.indisunique AS uniq, pg_get_expr(i.indpred, i.indrelid) AS pred
           FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
          WHERE i.indrelid = 'field_worker_notices'::regclass ORDER BY c.relname`,
      );
      const byName = new Map(idx.rows.map((x) => [x.indexname, x]));
      expect([...byName.keys()]).toEqual(['field_worker_notices_once_per_act_uq', 'field_worker_notices_pkey', 'field_worker_notices_recipient_idx']);
      expect(normalise(byName.get('field_worker_notices_recipient_idx')!.def).replace(/^.* using btree /, '')).toBe(
        'pariwar_id, recipient_user_id, created_at desc, notice_id desc',
      );
      const once = byName.get('field_worker_notices_once_per_act_uq')!;
      expect(once.uniq).toBe(true);
      expect(normalise(once.def).replace(/^.* using btree /, '').replace(/ where .*$/, '')).toBe('pariwar_id, move_request_id, kind, recipient_user_id');
      expect(normalise(once.pred!)).toBe('move_request_id is not null');
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
      await expectSqlRejected(client, NOTICE_INSERT_SQL, [PARIWAR_A, officer, 'move_request_refused_admin', a.workerId, a.requestId, null], '23514', 'field_worker_notices_refusal_pair'); // the Pariwar Admins' kind too
      await expectSqlRejected(client, NOTICE_INSERT_SQL, [PARIWAR_A, officer, 'move_request_opened', a.workerId, a.requestId, 'other'], '23514', 'field_worker_notices_refusal_pair'); // a reason on any other kind
      await client.query(NOTICE_INSERT_SQL, [PARIWAR_A, officer, 'move_request_refused_admin', a.workerId, a.requestId, 'other']); // CONTROL: the admin kind with its reason
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

    it('fail-closed: with no Pariwar scope a SELECT sees nothing, an UPDATE touches nothing and an INSERT is refused (42501) — a CONTROL that the row is visible in scope (CR5)', async () => {
      const { client } = getTx();
      const a = await seedRequest(client, PARIWAR_A);
      const officer = randomUUID();
      const n = (await client.query<{ notice_id: string }>(NOTICE_INSERT_SQL, [PARIWAR_A, officer, 'move_request_opened', a.workerId, a.requestId, null]))
        .rows[0]!.notice_id;
      expect((await client.query('SELECT 1 FROM field_worker_notices WHERE notice_id = $1', [n])).rows).toHaveLength(1); // CONTROL
      await enterAppRoleNoScope(client);
      await client.query("SELECT set_config('app.pariwar_id', '', true)");
      expect((await client.query('SELECT 1 FROM field_worker_notices WHERE notice_id = $1', [n])).rows).toHaveLength(0);
      expect((await client.query('UPDATE field_worker_notices SET seen_at = now() WHERE notice_id = $1', [n])).rowCount).toBe(0);
      await expectSqlRejected(client, NOTICE_INSERT_SQL, [PARIWAR_A, officer, 'move_request_escalated', a.workerId, a.requestId, null], '42501');
    });

    it('the composite FKs (0178): another Pariwar’s worker or request, and an unknown one, are refused (23503, by constraint name); their own are admitted (CR2)', async () => {
      const { client } = getTx();
      const b = await seedRequest(client, PARIWAR_B);
      const a = await seedRequest(client, PARIWAR_A); // leaves the session in A's scope
      const officer = randomUUID();
      const bad = (workerId: string, requestId: string, constraint: string) =>
        expectSqlRejected(client, NOTICE_INSERT_SQL, [PARIWAR_A, officer, 'move_request_opened', workerId, requestId, null], '23503', constraint);
      await bad(b.workerId, a.requestId, 'field_worker_notices_worker_fk');
      await bad(randomUUID(), a.requestId, 'field_worker_notices_worker_fk');
      await bad(a.workerId, b.requestId, 'field_worker_notices_request_fk');
      await bad(a.workerId, randomUUID(), 'field_worker_notices_request_fk');
      await client.query(NOTICE_INSERT_SQL, [PARIWAR_A, officer, 'move_request_opened', a.workerId, a.requestId, null]); // CONTROL
    });

    it('one notice per request, kind and recipient: a second is refused BY NAME; another recipient, another kind and a direct move naming no request are not (CR7)', async () => {
      const { client } = getTx();
      const a = await seedRequest(client, PARIWAR_A);
      const officer = randomUUID();
      const insert = (recipient: string, kind: string, requestId: string | null) =>
        client.query(NOTICE_INSERT_SQL, [PARIWAR_A, recipient, kind, a.workerId, requestId, null]);
      await insert(officer, 'move_request_opened', a.requestId);
      await expectSqlRejected(
        client,
        NOTICE_INSERT_SQL,
        [PARIWAR_A, officer, 'move_request_opened', a.workerId, a.requestId, null],
        '23505',
        'field_worker_notices_once_per_act_uq',
      );
      // CONTROLS
      await insert(randomUUID(), 'move_request_opened', a.requestId);
      await insert(officer, 'move_request_escalated', a.requestId);
      await insert(officer, 'moved_by_pariwar_admin', null);
      await insert(officer, 'moved_by_pariwar_admin', null); // a direct move names no request: each is its own act
    });

    it('the districts CHECK: both named and different', async () => {
      const { client } = getTx();
      const a = await seedRequest(client, PARIWAR_A);
      const bad = (from: string, to: string) =>
        expectSqlRejected(client, NOTICE_DISTRICTS_SQL, [PARIWAR_A, randomUUID(), a.workerId, a.requestId, from, to], '23514', 'field_worker_notices_districts_check');
      await bad('Patna', 'Patna');
      await bad('  ', 'Gaya');
      await bad('Patna', '');
      await client.query(NOTICE_DISTRICTS_SQL, [PARIWAR_A, randomUUID(), a.workerId, a.requestId, 'Patna', 'Gaya']); // CONTROL
    });
  });
});
