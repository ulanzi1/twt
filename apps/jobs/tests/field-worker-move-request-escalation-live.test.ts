// Story 13.1d (AD8 (a), AC5 (a)) — the escalation sweep against the live DB (own-committing): a request opened 7 days + 1 minute ago is
// escalated by ONE tick (cause `unanswered_7_days`, actor `system`, ONE system audit line, the Pariwar Admin and the opener told), the
// worker never moved; a second tick changes nothing; one opened 6 days 23 hours ago is untouched. `opened_at` is IMMUTABLE (0205's
// guard), so the fixture backdates it in its own transaction under replica mode — ⛔ the guard disabled for anyone else.
// ⚠ The tick is CROSS-TENANT: it may also escalate another spec's stale row — every assertion here is by this test's own ids.

import { randomUUID } from 'node:crypto';

import { fieldWorker, ids, rbac, withPariwarScope } from '@twt/domain';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runFieldWorkerMoveRequestEscalationTick } from '../src/scheduler/field-worker-move-request-escalation.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe.skipIf(!hasDatabase)('Story 13.1d — the move-request escalation sweep (live DB, own-committing)', { timeout: 60_000 }, () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];
  const users: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4 });
  });
  afterAll(async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      const requests = (await c.query<{ id: string }>('SELECT move_request_id AS id FROM field_worker_move_requests WHERE pariwar_id::text = ANY($1)', [pariwars])).rows.map((r) => r.id);
      const workers = (await c.query<{ id: string }>('SELECT field_worker_id AS id FROM field_workers WHERE pariwar_id::text = ANY($1)', [pariwars])).rows.map((r) => r.id);
      await c.query('DELETE FROM field_worker_notices WHERE pariwar_id::text = ANY($1)', [pariwars]);
      await c.query('DELETE FROM field_worker_move_requests WHERE pariwar_id::text = ANY($1)', [pariwars]);
      await c.query('DELETE FROM field_workers WHERE pariwar_id::text = ANY($1)', [pariwars]);
      await c.query('DELETE FROM events_log WHERE pariwar_id::text = ANY($1) AND stream_id::text = ANY($2)', [pariwars, [...requests, ...workers]]);
      await c.query('DELETE FROM role_grants WHERE user_id::text = ANY($1)', [users]);
      await c.query('DELETE FROM users WHERE id::text = ANY($1)', [users]);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
      await pool.end();
    }
  }, 60_000);

  async function user(pid: string, role: string, dim: string, value: string): Promise<string> {
    const id = randomUUID();
    users.push(id);
    await pool.query(`INSERT INTO users (id, identity_type, status) VALUES ($1, 'admin', 'active')`, [id]);
    await pool.query('INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)', [id, pid, role, dim, value]);
    return id;
  }
  // ⚠ Keep this helper in a `.test.ts` (the `authorize(` fence).
  const verified = (pid: string, actorId: string, key: string, grant: { role: string; dim: string; value: string }, district: string) => {
    const r = rbac.authorize({
      actorId,
      grants: [{ pariwarId: pid, role: grant.role, scopeDimension: grant.dim as 'district' | 'pariwar', scopeValue: grant.value }],
      key,
      resource: { dimension: 'district', value: district, pariwarId: pid },
    });
    if (r === null) throw new Error(`the real check refused ${key}`);
    return r;
  };

  /** A Pariwar, a Pariwar Admin, District Admins of Patna and Gaya, a worker in Patna, and a request Patna → Gaya opened `age` ago. */
  async function seed(age: string) {
    const pid = randomUUID();
    pariwars.push(pid);
    const pa = await user(pid, 'pariwar_admin', 'pariwar', pid);
    const daP = await user(pid, 'district_admin', 'district', 'Patna');
    await user(pid, 'district_admin', 'district', 'Gaya');
    const worker = randomUUID();
    const request = randomUUID();
    await withPariwarScope(pool, pid, async (_db, client) => {
      await fieldWorker.registerFieldWorker(client, {
        pariwarId: ids.pariwarId(pid),
        fieldWorkerId: ids.fieldWorkerId(worker),
        auditId: randomUUID(),
        actor: 'operator',
        actorId: pa,
        nameCiphertext: 'enc:v1:name',
        mobileCiphertext: 'enc:v1:mobile',
        mobileBlindIndex: `idx-${worker}`,
        registeredByDisplay: 'Asha Verma',
        district: 'Patna',
        authorization: verified(pid, pa, 'field_worker.register', { role: 'pariwar_admin', dim: 'pariwar', value: pid }, 'Patna'),
      });
      await fieldWorker.openFieldWorkerMoveRequest(client, {
        pariwarId: ids.pariwarId(pid),
        auditId: randomUUID(),
        actor: 'operator',
        actorId: daP,
        moveRequestId: ids.fieldWorkerMoveRequestId(request),
        fieldWorkerId: ids.fieldWorkerId(worker),
        fromDistrict: 'Patna',
        toDistrict: 'Gaya',
        authorization: verified(pid, daP, 'field_worker.request_move', { role: 'district_admin', dim: 'district', value: 'Patna' }, 'Patna'),
      });
    });
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query(`UPDATE field_worker_move_requests SET opened_at = now() - $2::interval WHERE move_request_id = $1`, [request, age]);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    return { pid, pa, daP, worker, request };
  }
  const requestRow = (id: string) =>
    pool.query<{ state: string; escalation_cause: string | null }>('SELECT state, escalation_cause FROM field_worker_move_requests WHERE move_request_id = $1', [id]).then((r) => r.rows[0]!);

  it('AC5 (a): 7 days + 1 minute → escalated by one tick (system), ONE system audit line, the Pariwar Admin and the opener told; a second tick nothing; 6 days 23 h untouched', async () => {
    const old = await seed('7 days 1 minute');
    const young = await seed('6 days 23 hours');
    await runFieldWorkerMoveRequestEscalationTick({ pool });
    expect(await requestRow(old.request)).toEqual({ state: 'escalated', escalation_cause: 'unanswered_7_days' });
    expect((await requestRow(young.request)).state).toBe('pending');
    const actor = (await pool.query<{ actor_id: string | null }>("SELECT actor_id FROM events_log WHERE stream_id = $1 AND event_type = 'field_worker_move_request.escalated'", [old.request])).rows;
    expect(actor).toEqual([{ actor_id: null }]);
    const lines = (await pool.query<{ actor_id: string | null; actor_role: string }>(
      'SELECT actor_id, actor_role FROM audit_log_entries WHERE pariwar_id = $1 AND action = $2 AND resource_locator = $3',
      [old.pid, 'field_worker_move_request.escalated', `field_worker_move_request/${old.request}`],
    )).rows;
    expect(lines).toEqual([{ actor_id: null, actor_role: 'system' }]);
    const told = (await pool.query<{ recipient: string }>(
      "SELECT recipient_user_id AS recipient FROM field_worker_notices WHERE move_request_id = $1 AND kind = 'move_request_escalated' ORDER BY recipient_user_id",
      [old.request],
    )).rows.map((r) => r.recipient);
    expect(told).toEqual([old.pa, old.daP].sort());
    expect((await pool.query<{ district: string }>('SELECT district FROM field_workers WHERE field_worker_id = $1', [old.worker])).rows[0]!.district).toBe('Patna');
    // A second tick: nothing changes for this request (no second event, no second line).
    await runFieldWorkerMoveRequestEscalationTick({ pool });
    expect((await pool.query('SELECT 1 FROM events_log WHERE stream_id = $1', [old.request])).rowCount).toBe(2);
  });
});
