// Story 13.1d (AD8 (a), AC5 (a)) — the escalation sweep against the live DB (own-committing): a request opened 7 days + 1 minute ago is
// escalated by the sweep (`settle`: within at most FIVE ticks - ⚠ the legs do not count the ticks, so "one tick" is not what they prove;
// cause `unanswered_7_days`, actor `system`, ONE system audit line, the Pariwar Admin and the opener told), the
// worker never moved; a second tick changes nothing; one opened 6 days 23 hours ago is untouched. `opened_at` is IMMUTABLE (0205's
// guard), so the fixture backdates it in its own transaction under replica mode — ⛔ the guard disabled for anyone else.
// ⚠ The tick is CROSS-TENANT: it may also escalate another spec's stale row — every assertion here is by this test's own ids.
// Code review CR34 / CR35 / CR38 added: a tick over TWO due Pariwars, a refusal on a REAL non-bypass login, the skipped-row twin through the
// real audit wrapper, the audit and notice recount after a second tick, and a settle loop (a backlog left by another spec can delay a row).

import { randomUUID } from 'node:crypto';

import { fieldWorker, ids, rbac, withPariwarScope } from '@twt/domain';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { runFieldWorkerMoveRequestEscalationTick } from '../src/scheduler/field-worker-move-request-escalation.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

// The REAL selector, unless a test hands the sweep a row that was selected and then answered (the skip leg): everything else is the real code.
const hook = vi.hoisted(() => ({ select: null as null | Array<{ pariwarId: string; moveRequestId: string }> }));
vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    fieldWorker: {
      ...actual.fieldWorker,
      findStaleMoveRequests: (pool: Parameters<typeof actual.fieldWorker.findStaleMoveRequests>[0], opts?: { limit?: number }) =>
        hook.select !== null ? Promise.resolve(hook.select as Awaited<ReturnType<typeof actual.fieldWorker.findStaleMoveRequests>>) : actual.fieldWorker.findStaleMoveRequests(pool, opts),
    },
  };
});

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
      // Story 13.1g — the notices' email rows first (replica mode disables their FK; an orphan would outlive the notice).
      await c.query('DELETE FROM field_worker_notice_emails WHERE pariwar_id::text = ANY($1)', [pariwars]);
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
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined); // an aborted connection must not go back to the pool for `afterAll` to draw
      throw e;
    } finally {
      c.release();
    }
    return { pid, pa, daP, worker, request, verified: (key: string) => verified(pid, daP, key, { role: 'district_admin', dim: 'district', value: 'Patna' }, 'Patna') };
  }
  /** Ticks until `done()` holds, at most `max` times: the tick is CROSS-TENANT and bounded, so a backlog left by another spec can delay a row. */
  async function settle(done: () => Promise<boolean>, max = 5): Promise<void> {
    for (let i = 0; i < max; i += 1) {
      await runFieldWorkerMoveRequestEscalationTick({ pool });
      if (await done()) return;
    }
  }
  const auditActions = (pid: string, request: string) =>
    pool
      .query<{ action: string }>('SELECT action FROM audit_log_entries WHERE pariwar_id = $1 AND resource_locator = $2 ORDER BY seq', [pid, `field_worker_move_request/${request}`])
      .then((r) => r.rows.map((x) => x.action));
  const escalatedNotices = (request: string) =>
    pool
      .query<{ recipient: string }>("SELECT recipient_user_id AS recipient FROM field_worker_notices WHERE move_request_id = $1 AND kind = 'move_request_escalated' ORDER BY recipient_user_id", [request])
      .then((r) => r.rows.map((x) => x.recipient));
  const requestRow = (id: string) =>
    pool.query<{ state: string; escalation_cause: string | null }>('SELECT state, escalation_cause FROM field_worker_move_requests WHERE move_request_id = $1', [id]).then((r) => r.rows[0]!);

  it('AC5 (a): 7 days + 1 minute → escalated by the sweep, within `settle`’s five ticks (system), ONE system audit line, the Pariwar Admin and the opener told; a second tick nothing; 6 days 23 h untouched', async () => {
    const old = await seed('7 days 1 minute');
    const young = await seed('6 days 23 hours');
    await settle(async () => (await requestRow(old.request)).state === 'escalated');
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
    // A second tick: nothing changes for this request — no second event, no second audit line, no second notice. (It proves the selector's
    // `pending` filter; the lock re-check is the skip leg below.)
    const linesBefore = await auditActions(old.pid, old.request);
    const noticesBefore = await escalatedNotices(old.request);
    await runFieldWorkerMoveRequestEscalationTick({ pool });
    expect((await pool.query('SELECT 1 FROM events_log WHERE stream_id = $1', [old.request])).rowCount).toBe(2);
    expect(await auditActions(old.pid, old.request)).toEqual(linesBefore);
    expect(linesBefore).toEqual(['field_worker_move_request.escalated']); // the fixture opens through the domain: the sweep's is the ONLY line
    expect(await escalatedNotices(old.request)).toEqual(noticesBefore);
  });

  // CR34 — AD8 (a) "a cross-tenant selector ... then per row in `withPariwarScope`": the sweep over two due Pariwars (within `settle`'s five ticks).
  it('the sweep escalates the due requests of TWO Pariwars (within `settle`’s five ticks), each under its own scope: each audit line and each notice carries its own Pariwar, nothing crosses', async () => {
    const a = await seed('7 days 1 minute');
    const b = await seed('8 days');
    await settle(async () => (await requestRow(a.request)).state === 'escalated' && (await requestRow(b.request)).state === 'escalated');
    for (const x of [a, b]) {
      expect(await requestRow(x.request)).toEqual({ state: 'escalated', escalation_cause: 'unanswered_7_days' });
      expect(await auditActions(x.pid, x.request)).toEqual(['field_worker_move_request.escalated']); // ONE line, under its own Pariwar
      expect(await escalatedNotices(x.request)).toEqual([x.pa, x.daP].sort());
    }
    // Nothing crossed: no audit line names one Pariwar's request under the other's, and no notice of one request is in the other Pariwar.
    expect(await auditActions(b.pid, a.request)).toEqual([]);
    expect(await auditActions(a.pid, b.request)).toEqual([]);
    const crossed = await pool.query(
      'SELECT 1 FROM field_worker_notices WHERE (move_request_id = $1 AND pariwar_id = $2) OR (move_request_id = $3 AND pariwar_id = $4)',
      [a.request, b.pid, b.request, a.pid],
    );
    expect(crossed.rowCount).toBe(0);
  });

  // CR34 — the Row 26 guard on a REAL login: `current_user` is `twt_app` (neither superuser nor BYPASSRLS), so the tick refuses and touches nothing.
  it('a pool whose login is RLS-bound (role twt_app): the tick answers `refused`, alarms once, and escalates nothing', async () => {
    const due = await seed('7 days 1 minute');
    const bound = new pg.Pool({ connectionString: DATABASE_URL, max: 1, options: '-c role=twt_app' });
    const alarms: string[] = [];
    try {
      const who = (await bound.query<{ u: string }>('SELECT current_user AS u')).rows[0]!.u;
      expect(who).toBe('twt_app'); // CONTROL — the pool really is the app role
      const r = await runFieldWorkerMoveRequestEscalationTick({ pool: bound, onAlarm: (m) => alarms.push(m) });
      expect(r).toEqual({ refused: true, scanned: 0, escalated: 0, skipped: 0, failed: 0 });
      expect(alarms).toEqual([expect.stringContaining('field_worker_move_request.rls_bound_role')]);
    } finally {
      await bound.end();
    }
    expect((await requestRow(due.request)).state).toBe('pending');
  });

  // CR35 — a row selected and then answered: the REAL audit wrapper must hand the sweep its own `NoLongerDue` back (else the row counts `failed`
  // and alarms every hour), and the intent line gets its `_rolled_back` twin. The unit test's audit wrapper is a mock; this one is not.
  it('a request that was selected and then WITHDRAWN: skipped, not failed — the intent line AND its twin written once each, the request still withdrawn, no escalated event, no alarm', async () => {
    const due = await seed('7 days 1 minute');
    await withPariwarScope(pool, due.pid, async (_db, client) => {
      await fieldWorker.withdrawFieldWorkerMoveRequest(client, {
        pariwarId: ids.pariwarId(due.pid),
        auditId: randomUUID(),
        actor: 'operator',
        actorId: due.daP,
        moveRequestId: ids.fieldWorkerMoveRequestId(due.request),
        authorization: due.verified('field_worker.request_move'),
      });
    });
    expect((await requestRow(due.request)).state).toBe('withdrawn');
    hook.select = [{ pariwarId: due.pid, moveRequestId: due.request }]; // as if selected BEFORE the withdrawal
    const alarms: string[] = [];
    try {
      const r = await runFieldWorkerMoveRequestEscalationTick({ pool, onAlarm: (m) => alarms.push(m) });
      expect(r).toEqual({ refused: false, scanned: 1, escalated: 0, skipped: 1, failed: 0 });
    } finally {
      hook.select = null;
    }
    expect(alarms).toEqual([]);
    expect((await requestRow(due.request)).state).toBe('withdrawn');
    expect((await pool.query("SELECT 1 FROM events_log WHERE stream_id = $1 AND event_type = 'field_worker_move_request.escalated'", [due.request])).rowCount).toBe(0);
    expect(await auditActions(due.pid, due.request)).toEqual(['field_worker_move_request.escalated', 'field_worker_move_request.escalated_rolled_back']);
  });
});
