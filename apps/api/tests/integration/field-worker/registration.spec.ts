// Story 13.1 — `POST /api/v1/p/:pariwarId/field-workers` through HTTP (AC8 (a)–(h), (j), (k); AC13). Live DB, own-committing
// (see the harness). The exhaustion legs (AC8 (i)) are in `registration-exhaustion.spec.ts` (a file-wide door mock).
// "Nothing written", in every refusal leg: no `field_workers` row, no `field_worker.*` event, no code row and no
// `field_worker.registered*` audit line for the attempt. The KMS system audit rows are never asserted (TR5).
// Every 401 / 403 / 404 leg sends a VALID body (a bad body is 400 `request.validation` before the guards run).

import { randomUUID } from 'node:crypto';

import { rbac } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { fieldWorkerMobileIndex } from '../../../src/modules/field-worker/field-worker-crypto.js';
import { makeClient, hasDatabase } from '../_setup.js';
import { createHarness, errOf, json, type Harness, type Json } from './_registration-harness.js';

const NAME = 'Vikramaditya Recognisable-Surname';
const MOBILE = '+91 98765 43210';
const MOBILE_DIGITS = '9876543210';
const body = (district = 'Patna', o: Json = {}): Json => ({ name: NAME, mobile: MOBILE, district, ...o });

describe.skipIf(!hasDatabase)('Story 13.1 — register a field worker through HTTP', { timeout: 60_000 }, () => {
  let h: Harness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  async function written(p: string) {
    const q = <T>(sql: string) => h.td.pool.query(sql, [p]).then((r) => r.rows as T[]);
    return {
      workers: await q<{ field_worker_id: string; current_state: string; district: string; registered_by_display: string }>(
        'SELECT field_worker_id, current_state, district, registered_by_display FROM field_workers WHERE pariwar_id = $1',
      ),
      events: await q<{ stream_id: string; event_type: string; payload: Json; actor_id: string }>(
        "SELECT stream_id, event_type, payload, actor_id FROM events_log WHERE pariwar_id = $1 AND event_type LIKE 'field_worker.%' ORDER BY occurred_at",
      ),
      codes: await q<{ field_worker_id: string; code: string }>('SELECT field_worker_id, code FROM field_worker_attribution_codes WHERE pariwar_id = $1'),
      audit: await q<{ action: string; resource_locator: string; actor_role: string | null; actor_id: string }>(
        "SELECT action, resource_locator, actor_role, actor_id FROM audit_log_entries WHERE pariwar_id = $1 AND action LIKE 'field_worker.registered%' ORDER BY seq",
      ),
    };
  }

  async function expectNothingWritten(p: string): Promise<void> {
    const w = await written(p);
    expect(w).toEqual({ workers: [], events: [], codes: [], audit: [] });
  }

  /** Every text the attempt left anywhere (events, audit rows, the idempotency results, the logs) — for the PII sweep. */
  async function everything(p: string): Promise<string> {
    const events = await h.td.pool.query('SELECT payload::text AS t FROM events_log WHERE pariwar_id = $1', [p]);
    const audit = await h.td.pool.query('SELECT row_to_json(a)::text AS t FROM audit_log_entries a WHERE pariwar_id = $1', [p]);
    const idem = await h.td.pool.query("SELECT coalesce(result::text, '') AS t FROM idempotency_keys WHERE key LIKE $1", [`field_worker.register:${p}:%`]);
    return [...events.rows, ...audit.rows, ...idem.rows].map((r) => r.t as string).join('\n') + h.logs();
  }

  function expectNoPii(text: string): void {
    expect(text).not.toContain(NAME);
    expect(text).not.toContain('Recognisable');
    expect(text).not.toContain(MOBILE_DIGITS);
  }

  it('(a) success: 201 { field_worker_id, district, current_state, kyc_status } — NO code; the row, the event, the audit line and the code row exist', async () => {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna');
    const { client, userId } = await h.actor(p, 'pariwar_admin', 'pariwar', p);
    const r = await h.register(client, p, body());
    expect(r.statusCode, r.body).toBe(201);
    const out = json(r);
    expect(Object.keys(out).sort()).toEqual(['current_state', 'district', 'field_worker_id', 'kyc_status']);
    expect(out).toMatchObject({ district: 'Patna', current_state: 'pending_kyc', kyc_status: 'pending' });
    const id = out['field_worker_id'] as string;
    const w = await written(p);
    expect(w.workers).toEqual([{ field_worker_id: id, current_state: 'pending_kyc', district: 'Patna', registered_by_display: 'Asha Verma' }]);
    expect(w.events.map((e) => [e.stream_id, e.event_type, e.actor_id])).toEqual([[id, 'field_worker.registered', userId]]);
    expect(w.codes.map((c) => c.field_worker_id)).toEqual([id]);
    expect(w.audit).toEqual([{ action: 'field_worker.registered', resource_locator: `field_worker/${id}`, actor_role: 'pariwar_admin', actor_id: userId }]);
    // (k) the allocated code's VALUE is nowhere in the body.
    expect(r.body).not.toContain(w.codes[0]!.code);
    expect(r.body).not.toMatch(/attributionCode|"code"/);
  });

  it('(b) replay: the same Idempotency-Key returns the RECORDED response (no code in it) and creates nothing', async () => {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna');
    const { client } = await h.actor(p, 'pariwar_admin', 'pariwar', p);
    const key = randomUUID();
    const first = await h.register(client, p, body(), key);
    const again = await h.register(client, p, body(), key);
    expect(first.statusCode).toBe(201);
    expect(again.statusCode).toBe(201);
    expect(json(again)).toEqual(json(first));
    expect(again.body).not.toMatch(/"code"/);
    const w = await written(p);
    expect([w.workers.length, w.events.length, w.codes.length, w.audit.length]).toEqual([1, 1, 1, 1]);
  });

  it('(c) the same mobile again (the PRE-CHECK) ⇒ 409 field_worker.mobile_already_registered, with no audit line for the attempt', async () => {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna');
    const { client } = await h.actor(p, 'pariwar_admin', 'pariwar', p);
    expect((await h.register(client, p, body())).statusCode).toBe(201);
    const r = await h.register(client, p, body('Patna', { name: 'Another Person' }));
    expect(r.statusCode).toBe(409);
    expect(errOf(r).code).toBe('field_worker.mobile_already_registered');
    const w = await written(p);
    expect([w.workers.length, w.events.length, w.codes.length, w.audit.length]).toEqual([1, 1, 1, 1]);
    expectNoPii(r.body);
  });

  it('(d) the CONCURRENT loser, forced: an uncommitted live row with the same mobile index ⇒ the request blocks on the partial unique; on COMMIT ⇒ 409, its intent AND _rolled_back lines, no event of its own', async () => {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna');
    const { client } = await h.actor(p, 'pariwar_admin', 'pariwar', p);
    const index = await fieldWorkerMobileIndex(`+91${MOBILE_DIGITS}`, p, h.deps.encryption);
    const seededId = randomUUID();
    const owner = await h.td.pool.connect();
    try {
      await owner.query('BEGIN');
      await owner.query("SET LOCAL app.field_worker_state_writer = 'on'");
      await owner.query(
        `INSERT INTO field_workers (field_worker_id, pariwar_id, name_ciphertext, mobile_ciphertext, mobile_blind_index, registered_by_user_id,
                                    registered_by_display, current_state, state_event_version, kyc_status, district, audit_id)
           VALUES ($1, $2, 'enc:v1:x', 'enc:v1:y', $3, $4, 'Seed', 'pending_kyc', 1, 'pending', 'Patna', $5)`,
        [seededId, p, index, randomUUID(), randomUUID()],
      );
      const pending = h.register(client, p, body());
      // Wait until the request is WAITING on a lock (its pre-check could not see the uncommitted row).
      let waiting = false;
      for (let i = 0; i < 200 && !waiting; i += 1) {
        const r = await h.td.pool.query(
          "SELECT 1 FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query ILIKE 'insert into \"field_workers\"%'",
        );
        waiting = (r.rowCount ?? 0) > 0;
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 25));
      }
      expect(waiting).toBe(true);
      await owner.query('COMMIT');
      const r = await pending;
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('field_worker.mobile_already_registered');
    } finally {
      await owner.query('ROLLBACK').catch(() => undefined);
      owner.release();
    }
    const w = await written(p);
    expect(w.audit.map((a) => a.action)).toEqual(['field_worker.registered', 'field_worker.registered_rolled_back']);
    expect(w.audit[0]!.resource_locator).toBe(w.audit[1]!.resource_locator);
    expect(w.audit[0]!.resource_locator).toMatch(/^field_worker\/[0-9a-f-]{36}$/);
    expect(w.audit[0]!.resource_locator).not.toBe(`field_worker/${seededId}`);
    expect(w.events).toEqual([]); // the seeded row was a raw insert — no event; the loser's genesis rolled back
    expect(w.workers.map((x) => x.field_worker_id)).toEqual([seededId]);
  });

  it('(e) the guards: no session 401; no grant in the Pariwar 404; a grant without the key 403; state_trustee 403 (with and without a tree)', async () => {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna');
    expect((await h.register(makeClient(h.app), p, body())).statusCode).toBe(401);
    const elsewhere = h.freshPariwar();
    const outsider = await h.actor(elsewhere, 'pariwar_admin', 'pariwar', elsewhere);
    expect((await h.register(outsider.client, p, body())).statusCode).toBe(404);
    const helpline = await h.actor(p, 'helpline_operator', 'pariwar', p);
    const r403 = await h.register(helpline.client, p, body());
    expect(r403.statusCode).toBe(403);
    const trustee = await h.actor(p, 'state_trustee', 'state', 'Bihar');
    expect((await h.register(trustee.client, p, body())).statusCode).toBe(403);
    const treed = h.freshPariwar();
    await h.seedTree(treed, [
      { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
      { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Bihar' },
    ]);
    const trustee2 = await h.actor(treed, 'state_trustee', 'state', 'Bihar');
    expect((await h.register(trustee2.client, treed, body())).statusCode).toBe(403);
    await expectNothingWritten(p);
    await expectNothingWritten(treed);
  });

  it('(e)+(f) a district_admin of the SAME district ⇒ 201, snapshot role district_admin and ITS grant id; of ANOTHER district ⇒ 403', async () => {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna', 'Gaya');
    const da = await h.actor(p, 'district_admin', 'district', 'Patna');
    const r = await h.register(da.client, p, body('Patna'));
    expect(r.statusCode, r.body).toBe(201);
    const ev = (await written(p)).events[0]!;
    expect(ev.payload['authorization']).toEqual({
      permission_key: 'field_worker.register',
      role: 'district_admin',
      grant: { dimension: 'district', value: 'Patna', grant_id: da.grantId },
      target: { dimension: 'district', value: 'Patna' },
      catalog_version: rbac.PERMISSION_CATALOG_VERSION,
    });
    const other = await h.register(da.client, p, body('Gaya', { mobile: '9876500001' }));
    expect(other.statusCode).toBe(403);
  });

  it('(f) a pariwar_admin (the fill-in) ⇒ pariwar_admin; BOTH grants ⇒ district_admin (the most specific); a GLOBAL super_admin ⇒ super_admin with grant.value null', async () => {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna', 'Gaya');
    const pa = await h.actor(p, 'pariwar_admin', 'pariwar', p);
    expect((await h.register(pa.client, p, body('Gaya'))).statusCode).toBe(201);
    const both = await h.actor(p, 'pariwar_admin', 'pariwar', p);
    const bothDistrictGrant = await h.addGrant(both.userId, p, 'district_admin', 'district', 'Patna');
    expect((await h.register(both.client, p, body('Patna', { mobile: '9876500002' }))).statusCode).toBe(201);
    const sa = await h.actor(p, 'super_admin', 'global', null);
    const rs = await h.register(sa.client, p, body('Patna', { mobile: '9876500003' }));
    expect(rs.statusCode, rs.body).toBe(201);
    const auths = (await written(p)).events.map((e) => e.payload['authorization'] as Json);
    expect(auths.map((a) => a['role'])).toEqual(['pariwar_admin', 'district_admin', 'super_admin']);
    expect(auths[0]!['grant']).toEqual({ dimension: 'pariwar', value: p, grant_id: pa.grantId });
    expect(auths[1]!['grant']).toEqual({ dimension: 'district', value: 'Patna', grant_id: bothDistrictGrant });
    expect(auths[2]!['grant']).toEqual({ dimension: 'global', value: null, grant_id: sa.grantId });
    for (const a of auths) expect(a['target']).toMatchObject({ dimension: 'district' });
    // The audit line's actorRole is the SAME role (one source — QE18).
    expect((await written(p)).audit.map((a) => a.actor_role)).toEqual(['pariwar_admin', 'district_admin', 'super_admin']);
  });

  it('(h) an UNLISTED district ⇒ 422 field_worker.district_unknown, nothing written, and NO KMS call (the check precedes the encrypt)', async () => {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna');
    const { client } = await h.actor(p, 'pariwar_admin', 'pariwar', p);
    const encrypt = vi.spyOn(h.deps.encryption.kms, 'encryptDek');
    const hmac = vi.spyOn(h.deps.encryption.kms, 'computeHmac');
    try {
      for (const district of ['Nowhere', 'patna', 'Patna ']) {
        const r = await h.register(client, p, body(district));
        expect(r.statusCode, district).toBe(422);
        expect(errOf(r).code).toBe('field_worker.district_unknown');
      }
      expect(encrypt).not.toHaveBeenCalled();
      expect(hmac).not.toHaveBeenCalled();
    } finally {
      encrypt.mockRestore();
      hmac.mockRestore();
    }
    await expectNothingWritten(p);
  });

  it('(h) request and content errors: a missing / non-string district 400; no Idempotency-Key 400; a bad mobile 422; a bad name 422; no display name 409 — nothing written', async () => {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna');
    const { client } = await h.actor(p, 'pariwar_admin', 'pariwar', p);
    const missing = await h.register(client, p, { name: NAME, mobile: MOBILE });
    expect([missing.statusCode, errOf(missing).code]).toEqual([400, 'request.validation']);
    const numeric = await h.register(client, p, body('Patna', { district: 5 }));
    expect(numeric.statusCode).toBe(400);
    const noKey = await h.register(client, p, body(), null);
    expect([noKey.statusCode, errOf(noKey).code]).toEqual([400, 'field_worker.idempotency_key_required']);
    for (const mobile of ['12345', 'not a number', '+1 555 0100']) {
      const r = await h.register(client, p, body('Patna', { mobile }));
      expect([r.statusCode, errOf(r).code], mobile).toEqual([422, 'field_worker.mobile_invalid']);
    }
    for (const name of ['   ', 'x'.repeat(121), 'Tab\there', 'Nul\u0000here']) {
      const r = await h.register(client, p, body('Patna', { name }));
      expect([r.statusCode, errOf(r).code], JSON.stringify(name).slice(0, 20)).toEqual([422, 'field_worker.name_invalid']);
    }
    const unnamed = await h.actor(p, 'pariwar_admin', 'pariwar', p, null);
    const r409 = await h.register(unnamed.client, p, body());
    expect([r409.statusCode, errOf(r409).code]).toEqual([409, 'admin.display_name_missing']);
    await expectNothingWritten(p);
  });

  it('(k) / AC13: the name and mobile appear in NO event payload, audit row, idempotency result, server log or console.error — success AND refusals', async () => {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna');
    const { client } = await h.actor(p, 'pariwar_admin', 'pariwar', p);
    const consoleError = vi.spyOn(console, 'error');
    try {
      const ok = await h.register(client, p, body());
      expect(ok.statusCode).toBe(201);
      const dup = await h.register(client, p, body());
      const unlisted = await h.register(client, p, body('Nowhere', { mobile: '9876500009' }));
      const badMobile = await h.register(client, p, body('Patna', { mobile: `${MOBILE_DIGITS}0` }));
      for (const r of [ok, dup, unlisted, badMobile]) expectNoPii(r.body);
      expectNoPii(await everything(p));
      expectNoPii(consoleError.mock.calls.map((c) => JSON.stringify(c)).join('\n'));
    } finally {
      consoleError.mockRestore();
    }
    // Non-vacuity: the sweep did read real rows and the server did log.
    expect((await written(p)).events).toHaveLength(1);
    expect(h.logs().length).toBeGreaterThan(0);
  });
});
