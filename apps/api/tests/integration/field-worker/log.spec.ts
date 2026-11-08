// Story 13.1c — `GET /api/v1/p/:pariwarId/field-workers/:fieldWorkerId/log` through HTTP (AC8; AD7). Live DB, OWN-COMMITTING (the
// acts that build the stream commit): a fresh Pariwar per test, assertions by our own ids, cleanup by the harness.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hasDatabase } from '../_setup.js';
import { createHarness, errOf, json, type Harness, type Json } from './_registration-harness.js';

const NAME = 'Logged Distinctive-Surname';
const MOBILE_DIGITS = '9876556789';

describe.skipIf(!hasDatabase)('Story 13.1c — read a field worker’s log (AC8)', { timeout: 60_000 }, () => {
  let h: Harness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  const istToday = async () => (await h.td.pool.query<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d")).rows[0]!.d;

  /** Registered and approved in Patna by a Pariwar Admin; then suspended by a Patna District Admin WITHOUT a display name. */
  async function setup() {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna', 'Gaya');
    const admin = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Pariwar-Admin');
    const nameless = await h.actor(p, 'district_admin', 'district', 'Patna', null);
    const id = await h.registered(admin.client, p, { name: NAME, mobile: `+91${MOBILE_DIGITS}`, district: 'Patna' });
    expect((await h.approve(admin.client, p, id)).statusCode).toBe(200);
    expect((await h.suspend(nameless.client, p, id, { reason_code: 'under_review' })).statusCode).toBe(200);
    return { p, admin, nameless, id };
  }

  it('the whole stream in event_version order with its type, time, actor (CURRENT name, role), key, grant, target, reason, districts and ended_on; (d) an officer with no display name ⇒ null; (a) ⛔ a name, a mobile or a code; no-store', async () => {
    const { p, admin, nameless, id } = await setup();
    expect((await h.reactivate(admin.client, p, id)).statusCode).toBe(200);
    expect((await h.move(admin.client, p, id, { from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned' })).statusCode).toBe(200);
    const today = await istToday();
    expect((await h.terminate(admin.client, p, id, { reason_code: 'left_voluntarily', ended_on: today })).statusCode).toBe(200);

    const auditCount = async () => (await h.td.pool.query<{ n: number }>('SELECT count(*)::int AS n FROM audit_log_entries WHERE pariwar_id = $1', [p])).rows[0]!.n;
    const linesBefore = await auditCount();
    const r = await h.log(admin.client, p, id);
    expect(r.statusCode, r.body).toBe(200);
    expect(r.headers['cache-control']).toBe('no-store');
    // No audit line for a read that decrypts nothing (AD7) — the Pariwar's line count is unchanged by the read.
    expect(await auditCount()).toBe(linesBefore);
    const body = json(r) as { items: Json[]; next_after: number | null };
    expect(body.next_after).toBeNull();
    expect(body.items.map((e) => [e['event_version'], e['event_type'], e['permission_key'], e['target_district'], e['reason_code'], e['from_district'], e['to_district'], e['ended_on']])).toEqual([
      [1, 'field_worker.registered', 'field_worker.register', 'Patna', null, null, null, null],
      [2, 'field_worker.kyc_completed', 'field_worker.approve', 'Patna', null, null, null, null],
      [3, 'field_worker.activated', 'field_worker.approve', 'Patna', null, null, null, null],
      [4, 'field_worker.suspended', 'field_worker.suspend', 'Patna', 'under_review', null, null, null],
      [5, 'field_worker.reactivated', 'field_worker.reactivate', 'Patna', null, null, null, null],
      [6, 'field_worker.posted', 'field_worker.move', 'Patna', 'reassigned', 'Patna', 'Gaya', null],
      [7, 'field_worker.terminated', 'field_worker.terminate', 'Gaya', 'left_voluntarily', null, null, today],
    ]);
    expect(body.items[0]!['actor']).toEqual({ user_id: admin.userId, display_name: 'Meera Pariwar-Admin', role: 'pariwar_admin' });
    expect(body.items[0]!['grant']).toEqual({ dimension: 'pariwar', value: p });
    // (d) The District Admin who suspended has no display name: null — never an email or a fallback.
    expect(body.items[3]!['actor']).toEqual({ user_id: nameless.userId, display_name: null, role: 'district_admin' });
    expect(body.items[3]!['grant']).toEqual({ dimension: 'district', value: 'Patna' });
    expect(r.body).not.toMatch(/@example\.test/);
    // (a) — an absence assertion on a 200 body and its headers.
    const code = (await h.td.pool.query<{ code: string }>('SELECT code FROM field_worker_attribution_codes WHERE field_worker_id = $1', [id])).rows[0]!.code;
    const everything = r.body + JSON.stringify(r.headers);
    for (const secret of [NAME, MOBILE_DIGITS, code]) expect(everything).not.toContain(secret);
  });

  it('(e) a worker moved Patna → Gaya: a District Admin of GAYA reads the WHOLE log, events from Patna included; (c) a District Admin of Patna now ⇒ 403', async () => {
    const { p, admin, id } = await setup();
    expect((await h.move(admin.client, p, id, { from_district: 'Patna', to_district: 'Gaya', reason_code: 'at_worker_request' })).statusCode).toBe(200);
    const gaya = await h.actor(p, 'district_admin', 'district', 'Gaya');
    const r = await h.log(gaya.client, p, id);
    expect(r.statusCode, r.body).toBe(200);
    expect((json(r)['items'] as Json[]).map((e) => e['event_type'])).toEqual([
      'field_worker.registered',
      'field_worker.kyc_completed',
      'field_worker.activated',
      'field_worker.suspended',
      'field_worker.posted',
    ]);
    const patna = await h.actor(p, 'district_admin', 'district', 'Patna');
    expect((await h.log(patna.client, p, id)).statusCode).toBe(403);
  });

  it('pages: `after` + `limit` walk the stream; an over-cap limit is CLAMPED (200), never an error; a limit of 0 or text ⇒ 400', async () => {
    const { p, admin, id } = await setup();
    const first = await h.log(admin.client, p, id, { limit: '2' });
    expect((json(first)['items'] as Json[]).map((e) => e['event_version'])).toEqual([1, 2]);
    expect(json(first)['next_after']).toBe(2);
    const next = await h.log(admin.client, p, id, { after: '2', limit: '2' });
    expect((json(next)['items'] as Json[]).map((e) => e['event_version'])).toEqual([3, 4]);
    expect(json(next)['next_after']).toBeNull();
    const clamped = await h.log(admin.client, p, id, { limit: '1000' });
    expect(clamped.statusCode, clamped.body).toBe(200);
    expect((json(clamped)['items'] as Json[])).toHaveLength(4);
    for (const limit of ['0', 'all', '2.5']) {
      const bad = await h.log(admin.client, p, id, { limit });
      expect(bad.statusCode, limit).toBe(400);
      expect(errOf(bad).code).toBe('request.validation');
    }
  });

  it('(b) an unknown worker or another Pariwar’s ⇒ 403 for everyone (no existence oracle); a caller without the key ⇒ 403', async () => {
    const { p, admin, id } = await setup();
    const other = h.freshPariwar();
    await h.listDistrict(other, 'Patna');
    const otherAdmin = await h.actor(other, 'pariwar_admin', 'pariwar', other, 'Other Admin');
    // ONE actor asks for a real worker of another Pariwar and for an id that never existed: the same 403, the WHOLE error object -
    // a different code, message or detail would tell "exists elsewhere" from "never existed" (review R2-12, RP-6).
    const foreign = await h.log(otherAdmin.client, other, id);
    const unknown = await h.log(otherAdmin.client, other, '6ba7b810-9dad-41d1-80b4-00c04fd430c8');
    expect(foreign.statusCode).toBe(403);
    expect(unknown.statusCode).toBe(403);
    const withoutRequestId = (r: { body: string }) => ({ ...(json(r)['error'] as Json), request_id: undefined }); // unique per request
    expect(withoutRequestId(unknown)).toEqual(withoutRequestId(foreign));
    expect((await h.log(admin.client, p, '6ba7b810-9dad-41d1-80b4-00c04fd430c8')).statusCode).toBe(403);
    const helpline = await h.actor(p, 'helpline_operator', 'pariwar', p);
    expect((await h.log(helpline.client, p, id)).statusCode).toBe(403);
  });
});
