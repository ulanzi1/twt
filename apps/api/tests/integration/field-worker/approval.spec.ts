// Story 13.1a — `POST /api/v1/p/:pariwarId/field-workers/:fieldWorkerId/approve` through HTTP (AC1, AC2, AC3 (b)(c); AD2, AD3, AD7;
// decision `-447` item 2). Live DB, OWN-COMMITTING (the route commits inside `mutate`): a fresh Pariwar per test, assertions by our
// own ids (⛔ counts of anything shared), cleanup under replica mode (the harness). AC3 (a) — a forced failure of the second command
// — needs a file-wide `@twt/domain` mock and lives in `approval-atomicity.spec.ts`. The KMS system audit rows are never asserted.

import { randomUUID } from 'node:crypto';

import { fieldWorker, ids, rbac } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { makeClient, hasDatabase } from '../_setup.js';
import { moveTestFieldWorker } from '../_field-worker-fixture.js';
import { createHarness, errOf, json, type Harness, type Json } from './_registration-harness.js';

const NAME = 'Approvable Distinctive-Surname';
const MOBILE_DIGITS = '9876501234';
const body = (district = 'Patna', mobile = `+91${MOBILE_DIGITS}`): Json => ({ name: NAME, mobile, district });

describe.skipIf(!hasDatabase)('Story 13.1a — approve a field worker through HTTP', { timeout: 60_000 }, () => {
  let h: Harness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  const q = <T>(sql: string, params: unknown[]) => h.td.pool.query(sql, params).then((r) => r.rows as T[]);
  const events = (id: string) =>
    q<{ event_type: string; event_version: string; occurred_at: Date; payload: Json; actor_id: string }>(
      'SELECT event_type, event_version, occurred_at, payload, actor_id FROM events_log WHERE stream_id = $1 ORDER BY event_version',
      [id],
    );
  const approvalAudit = (p: string, id: string) =>
    q<{ id: string; action: string; actor_id: string; actor_role: string; resource_locator: string; response_status: number }>(
      "SELECT audit_id AS id, action, actor_id, actor_role, resource_locator, response_status FROM audit_log_entries WHERE pariwar_id = $1 AND resource_locator = $2 AND action NOT LIKE 'field_worker.registered%' ORDER BY seq",
      [p, `field_worker/${id}`],
    );
  const row = (id: string) =>
    q<{ current_state: string; kyc_status: string; audit_id: string; approved_by_display: string | null; state_event_version: string }>(
      'SELECT current_state, kyc_status, audit_id, approved_by_display, state_event_version FROM field_workers WHERE field_worker_id = $1',
      [id],
    ).then((r) => r[0]!);

  /** A Pariwar with Patna listed, a Pariwar Admin, and one registered (pending_kyc) worker. */
  async function setup(district = 'Patna') {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna', 'Gaya');
    const admin = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Approver');
    const id = await h.registered(admin.client, p, body(district));
    return { p, admin, id };
  }

  /** Run a command on an OWNER connection in its own committed transaction (state set-up for the refusal legs). */
  async function owner(fn: (c: import('pg').PoolClient) => Promise<void>): Promise<void> {
    const c = await h.td.pool.connect();
    try {
      await c.query('BEGIN');
      await fn(c);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  }

  it('AC1: 200 { field_worker_id, district, active, completed }; TWO events (n+1, n+2) with EQUAL occurred_at and the SAME verified snapshot; two audit lines naming the admin; the row’s audit_id is the second; the approver snapshot; no PII anywhere', async () => {
    const { p, admin, id } = await setup();
    const key = randomUUID();
    const r = await h.approve(admin.client, p, id, key);
    expect(r.statusCode, r.body).toBe(200);
    expect(json(r)).toEqual({ field_worker_id: id, district: 'Patna', current_state: 'active', kyc_status: 'completed' });

    const ev = await events(id);
    expect(ev.map((e) => [e.event_type, Number(e.event_version)])).toEqual([
      ['field_worker.registered', 1],
      ['field_worker.kyc_completed', 2],
      ['field_worker.activated', 3],
    ]);
    const [kyc, act] = [ev[1]!, ev[2]!];
    expect(kyc.occurred_at.getTime()).toBe(act.occurred_at.getTime()); // ONE transaction (TR3)
    expect(kyc.payload['authorization']).toEqual(act.payload['authorization']);
    expect(kyc.payload['authorization']).toMatchObject({
      permission_key: 'field_worker.approve',
      role: 'pariwar_admin',
      grant: { dimension: 'pariwar', value: p, grant_id: admin.grantId },
      target: { dimension: 'district', value: 'Patna' },
      catalog_version: rbac.PERMISSION_CATALOG_VERSION,
    });
    expect([kyc.actor_id, act.actor_id]).toEqual([admin.userId, admin.userId]);

    const lines = await approvalAudit(p, id);
    expect(lines.map((l) => [l.action, l.actor_id, l.actor_role, l.response_status])).toEqual([
      ['field_worker.kyc_completed', admin.userId, 'pariwar_admin', 200],
      ['field_worker.activated', admin.userId, 'pariwar_admin', 200],
    ]);
    const w = await row(id);
    expect(w).toMatchObject({ current_state: 'active', kyc_status: 'completed', approved_by_display: 'Meera Approver', audit_id: lines[1]!.id });

    // No name, mobile or code in a payload, an audit row, the idempotency record, the response or the logs.
    const codeRow = await q<{ code: string }>('SELECT code FROM field_worker_attribution_codes WHERE field_worker_id = $1', [id]);
    const sweep = [
      ...(await q<{ t: string }>('SELECT payload::text AS t FROM events_log WHERE stream_id = $1', [id])),
      ...(await q<{ t: string }>('SELECT row_to_json(a)::text AS t FROM audit_log_entries a WHERE pariwar_id = $1', [p])),
      ...(await q<{ t: string }>("SELECT coalesce(result::text, '') AS t FROM idempotency_keys WHERE key LIKE $1", [`field_worker.approve:${p}:%`])),
    ]
      .map((x) => x.t)
      .join('\n') + r.body + h.logs();
    expect(sweep).not.toContain(NAME);
    expect(sweep).not.toContain(MOBILE_DIGITS);
    expect(sweep).not.toContain(codeRow[0]!.code);
  });

  it('AC2 (a): a worker NOT awaiting approval — active, suspended, terminated — ⇒ 409 field_worker.illegal_transition, no event and NO audit line from the refusal', async () => {
    for (const target of ['active', 'suspended', 'terminated'] as const) {
      const { p, admin, id } = await setup();
      expect((await h.approve(admin.client, p, id)).statusCode).toBe(200);
      const fw = ids.fieldWorkerId(id);
      const base = { pariwarId: ids.pariwarId(p), fieldWorkerId: fw, actor: 'operator' as const, actorId: admin.userId, auditId: randomUUID() };
      if (target === 'suspended') await owner((c) => fieldWorker.suspendFieldWorker(c, { ...base, reasonCode: 'under_review' }).then(() => undefined));
      if (target === 'terminated') {
        await owner(async (c) => {
          const today = (await c.query<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d")).rows[0]!.d;
          await fieldWorker.terminateFieldWorker(c, { ...base, reasonCode: 'inactive', endedOn: today });
        });
      }
      const eventsBefore = (await events(id)).length;
      const linesBefore = (await approvalAudit(p, id)).length;
      const r = await h.approve(admin.client, p, id);
      expect(r.statusCode, `${target}: ${r.body}`).toBe(409);
      expect(errOf(r).code).toBe('field_worker.illegal_transition');
      expect((await events(id)).length).toBe(eventsBefore);
      expect((await approvalAudit(p, id)).length).toBe(linesBefore);
    }
  });

  it('AC2 (b): an unknown id, another Pariwar’s worker, a worker the caller cannot reach ⇒ the SAME 403 (no existence oracle) — a Pariwar Admin included', async () => {
    const { p, admin } = await setup();
    const other = await setup();
    const unknown = await h.approve(admin.client, p, randomUUID());
    const foreign = await h.approve(admin.client, p, other.id);
    for (const r of [unknown, foreign]) {
      expect(r.statusCode, r.body).toBe(403);
      expect(errOf(r).code).toBe(errOf(unknown).code);
    }
    // A District Admin of Gaya cannot reach a Patna worker either — and a district_admin bundle lacks the key anyway (c).
    expect((await events(other.id)).map((e) => e.event_type)).toEqual(['field_worker.registered']);
  });

  it('AC2 (c): a District Admin (bundle lacks the key), a caller with no grant here (404), no session (401) ⇒ refused, nothing written', async () => {
    const { p, id } = await setup();
    const da = await h.actor(p, 'district_admin', 'district', 'Patna');
    const r1 = await h.approve(da.client, p, id);
    expect(r1.statusCode).toBe(403);
    const stranger = await h.actor(h.freshPariwar(), 'pariwar_admin', 'pariwar', randomUUID());
    expect((await h.approve(stranger.client, p, id)).statusCode).toBe(404);
    const anon = makeClient(h.app);
    expect((await h.approve(anon, p, id)).statusCode).toBe(401);
    expect((await events(id)).map((e) => e.event_type)).toEqual(['field_worker.registered']);
    expect(await approvalAudit(p, id)).toEqual([]);
  });

  it('AC2 (d): a missing, empty or over-200-character Idempotency-Key ⇒ 400 field_worker.idempotency_key_required; a body other than `{}` ⇒ 400 request.validation', async () => {
    const { p, admin, id } = await setup();
    for (const key of [null, '', '   ', 'k'.repeat(201)]) {
      const r = await h.approve(admin.client, p, id, key);
      expect(r.statusCode, String(key)).toBe(400);
      expect(errOf(r).code).toBe('field_worker.idempotency_key_required');
    }
    const extra = await h.approve(admin.client, p, id, randomUUID(), JSON.stringify({ field_worker_id: id }));
    expect(extra.statusCode).toBe(400);
    expect(errOf(extra).code).toBe('request.validation');
    expect((await events(id)).length).toBe(1);
  });

  it('AC2 (e): the same key replayed returns the FIRST 200 and appends NOTHING; the same key for a DIFFERENT worker is NOT replayed (the worker id is in the namespace — TR6)', async () => {
    const { p, admin, id } = await setup();
    const second = await h.registered(admin.client, p, body('Patna', '+919876509999'));
    const key = randomUUID();
    const first = await h.approve(admin.client, p, id, key);
    const again = await h.approve(admin.client, p, id, key);
    expect(first.statusCode).toBe(200);
    expect(json(again)).toEqual(json(first));
    expect((await events(id)).length).toBe(3);
    expect((await approvalAudit(p, id)).length).toBe(2);
    const other = await h.approve(admin.client, p, second, key);
    expect(other.statusCode, other.body).toBe(200);
    expect(json(other)['field_worker_id']).toBe(second);
    expect((await events(second)).map((e) => e.event_type)).toEqual(['field_worker.registered', 'field_worker.kyc_completed', 'field_worker.activated']);
  });

  it('AC2 (f): a Pariwar Admin approving the worker THEY registered succeeds (`-443` Q4 A — not enforced); both acts are in the log under the same actor', async () => {
    const { p, admin, id } = await setup();
    expect((await h.approve(admin.client, p, id)).statusCode).toBe(200);
    const ev = await events(id);
    expect(ev.map((e) => e.actor_id)).toEqual([admin.userId, admin.userId, admin.userId]);
  });

  it('`-447` item 2: an approver with NO display name ⇒ 409 admin.display_name_missing BEFORE any write; a later rename never changes the stored snapshot', async () => {
    const { p, id } = await setup();
    const nameless = await h.actor(p, 'pariwar_admin', 'pariwar', p, null);
    const r = await h.approve(nameless.client, p, id);
    expect(r.statusCode, r.body).toBe(409);
    expect(errOf(r).code).toBe('admin.display_name_missing');
    expect((await events(id)).length).toBe(1);
    expect(await approvalAudit(p, id)).toEqual([]);
    // CONTROL — the same worker approves under a named admin; then that admin is renamed and the snapshot stays.
    const named = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Original Name');
    expect((await h.approve(named.client, p, id)).statusCode).toBe(200);
    await h.td.pool.query("UPDATE users SET display_name = 'Renamed Later' WHERE id = $1", [named.userId]);
    expect((await row(id)).approved_by_display).toBe('Original Name');
  });

  it('a super_admin (derived holder) approves', async () => {
    const { p, id } = await setup();
    const sa = await h.actor(p, 'super_admin', 'global', null);
    const r = await h.approve(sa.client, p, id);
    expect(r.statusCode, r.body).toBe(200);
    expect((await events(id))[1]!.payload['authorization']).toMatchObject({ role: 'super_admin', permission_key: 'field_worker.approve' });
  });

  it('AC3 (b): two concurrent approvals of the same worker ⇒ exactly ONE pair of events; the loser gets 409 field_worker.illegal_transition', async () => {
    const { p, admin, id } = await setup();
    const second = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Second Approver');
    const results = await Promise.all([h.approve(admin.client, p, id), h.approve(second.client, p, id)]);
    const codes = results.map((r) => r.statusCode).sort();
    expect(codes).toEqual([200, 409]);
    const loser = results.find((r) => r.statusCode === 409)!;
    expect(errOf(loser).code).toBe('field_worker.illegal_transition');
    expect((await events(id)).map((e) => e.event_type)).toEqual(['field_worker.registered', 'field_worker.kyc_completed', 'field_worker.activated']);
    // A loser that reached the first command (the lock race) wrote ONLY the kyc twin — never an `activated` line for an act not attempted.
    const actions = (await approvalAudit(p, id)).map((l) => l.action);
    expect(actions.filter((a) => a === 'field_worker.activated')).toHaveLength(1);
    expect(actions).not.toContain('field_worker.activated_rolled_back');
  });

  it('AC3 (c): the worker MOVED between the gate and the command (the move commits while the request waits on the row lock) ⇒ 409 field_worker.authorization_stale, nothing written; the kyc intent has its twin', async () => {
    const { p, admin, id } = await setup();
    const mover = await h.td.pool.connect();
    try {
      await mover.query('BEGIN');
      await moveTestFieldWorker(mover, p, ids.fieldWorkerId(id), 'Gaya'); // holds the row lock until COMMIT
      const pending = h.approve(admin.client, p, id);
      // Wait until the request is blocked on the row lock (its loader read the COMMITTED district — Patna — and passed the gate).
      for (let i = 0; i < 100; i += 1) {
        const waiting = await h.td.pool.query(
          "SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query ILIKE '%FROM field_workers%FOR UPDATE%'",
        );
        if ((waiting.rows[0] as { n: number }).n > 0) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      await mover.query('COMMIT');
      const r = await pending;
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('field_worker.authorization_stale');
    } finally {
      mover.release();
    }
    expect((await events(id)).map((e) => e.event_type)).toEqual(['field_worker.registered', 'field_worker.posted']);
    expect((await approvalAudit(p, id)).map((l) => l.action)).toEqual(['field_worker.kyc_completed', 'field_worker.kyc_completed_rolled_back']);
    expect(await row(id)).toMatchObject({ current_state: 'pending_kyc', kyc_status: 'pending', approved_by_display: null });
  });
});
