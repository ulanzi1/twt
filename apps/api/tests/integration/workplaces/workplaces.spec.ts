// Story 6.36c — the workplace list, the queue, the member's answer, the prompts and the campaigns through HTTP (live DB
// :5433; Task 4.7; AC1–AC5, AC7).
//   · RBAC: the list GET is `workplace.manage` OR `workplace.review`; a Pariwar Admin (review alone) gets 403 on EVERY list
//     write (SW9 A — ONLY the Super Admin adds); a District Admin gets 403 everywhere; a campaign is the Pariwar Admin's;
//   · step-up on every list / queue write (403 `auth.step_up_required` without one) — ⛔ on a campaign;
//   · the ACTOR binding (this module is ⛔ in the human-actor gate's scope): `created_by_actor_id` and
//     `suggested_by_actor_id` are the session's user;
//   · the statuses per route (`workplace.not_found` 404 on `/:workplaceId/*`, 422 on the suggest body);
//   · the queue's key set carries ⛔ member data; the audit lines carry ⛔ a workplace's name or a member's typed text;
//   · the answer: the SAME 404 for another member's request; "Yes" ⇒ ONE posting + the marker + the audit, in ONE
//     transaction; a replay ⛔ writes twice; "No" re-queues; a stale suggestion ⇒ 409 and a retry with the SAME key ⇒ 409
//     `request_closed` (the claim was released);
//   · the prompts: 200 to any member session;
//   · a campaign sends ⛔ message (⛔ an OTP / SMS delivery, ⛔ a channel event; the module imports ⛔ `@twt/channels`).
// ⚠ Own-committing; a FRESH Pariwar per test.

import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { KNOWN_PEOPLE_CAMPAIGN_REFUSAL_CODES, WORKPLACE_ADMIN_REFUSAL_CODES, WORKPLACE_ANSWER_REFUSAL_CODES } from '@twt/contracts';
import { member as memberDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type CapturingStepUpDelivery, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;
const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, '../../../src/modules');

describe('the wire vocabularies are LOCKSTEP with the domain', () => {
  it('the admin, answer and campaign refusal codes', () => {
    expect([...WORKPLACE_ADMIN_REFUSAL_CODES]).toEqual([...memberDomain.WORKPLACE_ADMIN_REFUSAL_CODES]);
    expect([...WORKPLACE_ANSWER_REFUSAL_CODES]).toEqual([...memberDomain.WORKPLACE_ANSWER_REFUSAL_CODES]);
    expect([...KNOWN_PEOPLE_CAMPAIGN_REFUSAL_CODES]).toEqual([...memberDomain.KNOWN_PEOPLE_CAMPAIGN_REFUSAL_CODES]);
  });

  it('⛔ a staff route writes a posting; the campaign module imports ⛔ a messaging path', () => {
    // Comments stripped — a header may NAME the writer it never calls (the number fence's `stripComments`).
    const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');
    const files = (dir: string) => readdirSync(path.join(srcRoot, dir)).map((f) => strip(readFileSync(path.join(srcRoot, dir, f), 'utf8')));
    for (const src of files('workplaces')) expect(src).not.toMatch(/insertMemberPosting|answerWorkplaceSuggestion/);
    for (const src of [...files('known-people-campaigns'), strip(readFileSync(path.resolve(here, '../../../../../packages/domain/src/member/known-people-campaigns.ts'), 'utf8'))]) {
      const imports = [...src.matchAll(/^import [\s\S]*? from '([^']+)';$/gm)].map((m) => m[1]!);
      expect(imports.some((i) => /channels|dispatch|sms|push|whatsapp|notif/i.test(i))).toBe(false);
      expect(src).not.toMatch(/\bdispatch\s*\(|stepUpDelivery/);
    }
  });
});

describe.skipIf(!hasDatabase)('Story 6.36c — workplaces, the queue, the answer and the campaigns through HTTP (:5433)', { timeout: 30000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let adminStepUp: CapturingStepUpDelivery;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    adminStepUp = td.adminStepUpDelivery;
    app = await buildServer(deps);
  });

  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  async function actor(pariwarId: string, role: string, dim: string, value: string | null): Promise<{ client: Client; userId: string }> {
    const email = `wp-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName: `${role} person` });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(app);
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    await td.pool.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [userId, pariwarId, role, dim, value]);
    return { client, userId };
  }
  const superAdmin = (p: string) => actor(p, 'super_admin', 'global', null);
  const pariwarAdmin = (p: string) => actor(p, 'pariwar_admin', 'pariwar', p);
  const districtAdmin = (p: string) => actor(p, 'district_admin', 'district', 'Patna');

  async function elevate(client: Client, actionContext: string): Promise<void> {
    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext } });
    expect(req.statusCode).toBe(200);
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: adminStepUp.last?.code as string } });
    expect(ver.statusCode).toBe(200);
  }

  const errCode = (body: string) => (JSON.parse(body) as { error?: { code?: string } }).error?.code;

  /** COMMITTED as the superuser: Patna + Gaya, two imported schools, one staff office. */
  async function seedList(pariwarId = randomUUID()): Promise<{ pariwarId: string; ids: Record<string, string> }> {
    const batchId = randomUUID();
    await td.pool.query(
      `INSERT INTO workplace_import_batches (batch_id, pariwar_id, source_name, source_url, retrieved_on, licence, attribution, state_code)
       VALUES ($1, $2, 'fixture', 'https://example.test', '2026-10-14', 'ODC-BY-1.0', 'fixture', '10')`,
      [batchId, pariwarId],
    );
    await td.pool.query(`INSERT INTO workplace_districts (pariwar_id, district, source_batch_id) VALUES ($1, 'Patna', $2), ($1, 'Gaya', $2)`, [pariwarId, batchId]);
    const out: Record<string, string> = {};
    let code = 10289900100;
    for (const [name, district, kind] of [
      ['GMS RAMPUR', 'Patna', 'school'],
      ['GMS GAYA', 'Gaya', 'school'],
      ['DEO OFFICE PATNA', 'Patna', 'office'],
    ] as const) {
      const id = randomUUID();
      out[name] = id;
      code += 1;
      const school = kind === 'school';
      await td.pool.query(
        `INSERT INTO workplaces (workplace_id, pariwar_id, kind, name, district, udise_school_code, block_code, source, import_batch_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, pariwarId, kind, name, district, school ? String(code) : null, school ? String(code).slice(0, 6) : null, school ? 'import' : 'staff', school ? batchId : null],
      );
    }
    return { pariwarId, ids: out };
  }

  async function seedMemberRow(pariwarId: string): Promise<string> {
    const id = randomUUID();
    await td.pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [id, pariwarId]);
    return id;
  }

  async function seedRequest(pariwarId: string, memberId: string, typedName = 'Primary School Rampur'): Promise<string> {
    const id = randomUUID();
    await td.pool.query(
      `INSERT INTO workplace_requests (request_id, pariwar_id, member_id, district, typed_name, typed_place, started_on) VALUES ($1, $2, $3, 'Patna', $4, 'Rampur', '2020-06-01')`,
      [id, pariwarId, memberId, typedName],
    );
    return id;
  }

  async function suggestRaw(requestId: string, workplaceId: string): Promise<void> {
    await td.pool.query(`UPDATE workplace_requests SET state = 'suggested', suggested_workplace_id = $2, suggested_by_actor_id = gen_random_uuid(), suggested_at = now() WHERE request_id = $1`, [
      requestId,
      workplaceId,
    ]);
  }

  const memberToken = (memberId: string, pariwarId: string) => signAccessToken(app, { memberId, pariwarId, deviceId: 'test-device' }, 15 * 60 * 1000);

  async function memberCall(method: 'GET' | 'POST', url: string, tok: string, payload?: Json, key: string | null = randomUUID()) {
    const res = await app.inject({
      method,
      url,
      payload,
      headers: { origin: 'http://localhost:3001', authorization: `Bearer ${tok}`, ...(method === 'POST' && key !== null ? { 'idempotency-key': key } : {}) },
    });
    return { status: res.statusCode, body: (res.body ? (JSON.parse(res.body) as Json) : {}) as Json, raw: res.body };
  }

  const wp = (p: string) => `/api/v1/p/${p}/admin/workplaces`;
  const rq = (p: string) => `/api/v1/p/${p}/admin/workplace-requests`;
  const cp = (p: string) => `/api/v1/p/${p}/admin/known-people-campaigns`;
  const answerUrl = (r: string) => `/api/v1/member/life-events/workplace-requests/${r}/answer`;

  describe('RBAC and step-up (AC1–AC3, AC7)', () => {
    it('⛔ a session ⇒ 401 on every route (admin and member)', async () => {
      const p = randomUUID();
      const anon = makeClient(app);
      const id = randomUUID();
      // VALID bodies — Fastify validates a body BEFORE the preHandlers, so the session gate is what answers here.
      for (const [method, url, payload] of [
        ['GET', wp(p), undefined],
        ['POST', wp(p), { kind: 'office', name: 'X', district: 'Patna' }],
        ['POST', `${wp(p)}/${id}/rename`, { name: 'X' }],
        ['POST', `${wp(p)}/${id}/delist`, undefined],
        ['POST', `${wp(p)}/${id}/relist`, undefined],
        ['GET', rq(p), undefined],
        ['POST', `${rq(p)}/${id}/suggest`, { workplaceId: id }],
        ['POST', `${rq(p)}/${id}/close`, undefined],
        ['GET', cp(p), undefined],
        ['POST', cp(p), { startsOn: '2099-01-01', endsOn: '2099-01-02' }],
        ['POST', `${cp(p)}/${id}/end`, undefined],
      ] as const) {
        expect((await anon.inject({ method, url, payload })).statusCode, `${method} ${url}`).toBe(401);
      }
      const member = await app.inject({ method: 'POST', url: answerUrl(id), payload: { answer: 'yes' }, headers: { origin: 'http://localhost:3001', 'idempotency-key': randomUUID() } });
      expect(member.statusCode).toBe(401);
    });

    it('a Pariwar Admin reads the list and the queue, but gets 403 on EVERY list write (ONLY the Super Admin adds)', async () => {
      const { pariwarId: p, ids } = await seedList();
      const { client: pa } = await pariwarAdmin(p);
      expect((await pa.inject({ method: 'GET', url: wp(p) })).statusCode).toBe(200);
      expect((await pa.inject({ method: 'GET', url: rq(p) })).statusCode).toBe(200);
      // ⭐ Review — NO `elevate()` here: the permission hook (`workplace.manage`) runs BEFORE the step-up hook, so a
      // plain `pariwar_admin` session (`workplace.review` only) already 403s on these writes without reaching step-up.
      // Elevating first was misleading — it implied the 403 holds even step-up'd, but the write chain never got there.
      const office = ids['DEO OFFICE PATNA']!;
      for (const [url, payload] of [
        [wp(p), { kind: 'office', name: 'BEO', district: 'Patna' }],
        [`${wp(p)}/${office}/rename`, { name: 'X' }],
        [`${wp(p)}/${office}/delist`, undefined],
        [`${wp(p)}/${office}/relist`, undefined],
      ] as const) {
        const res = await pa.inject({ method: 'POST', url, payload });
        expect(res.statusCode, url).toBe(403);
        expect(errCode(res.body), url).not.toBe('auth.step_up_required');
      }
    });

    it('a District Admin gets 403 on the list, the queue and the campaigns', async () => {
      const { pariwarId: p } = await seedList();
      const { client: da } = await districtAdmin(p);
      for (const url of [wp(p), rq(p), cp(p)]) expect((await da.inject({ method: 'GET', url })).statusCode, url).toBe(403);
      expect((await da.inject({ method: 'POST', url: cp(p), payload: { startsOn: '2099-01-01', endsOn: '2099-01-02' } })).statusCode).toBe(403);
    });

    it('every list / queue write needs a FRESH step-up of its OWN context', async () => {
      const { pariwarId: p, ids } = await seedList();
      const { client: sa } = await superAdmin(p);
      const m = await seedMemberRow(p);
      const r = await seedRequest(p, m);
      const add = () => sa.inject({ method: 'POST', url: wp(p), payload: { kind: 'office', name: 'BEO', district: 'Patna' } });
      const suggest = () => sa.inject({ method: 'POST', url: `${rq(p)}/${r}/suggest`, payload: { workplaceId: ids['GMS RAMPUR'] } });
      expect(errCode((await add()).body)).toBe('auth.step_up_required');
      expect(errCode((await suggest()).body)).toBe('auth.step_up_required');
      await elevate(sa, 'workplace_review');
      expect(errCode((await add()).body)).toBe('auth.step_up_required'); // the review elevation ⛔ satisfies manage
      expect((await suggest()).statusCode).toBe(200);
      await elevate(sa, 'workplace_manage');
      expect((await add()).statusCode).toBe(201);
    });
  });

  describe('the list (AC2)', () => {
    it('add ⇒ 201, the actor IN THE ROW, the audit line names the row (⛔ its name); refusals per route', async () => {
      const { pariwarId: p, ids } = await seedList();
      const { client: sa, userId } = await superAdmin(p);
      await elevate(sa, 'workplace_manage');
      const res = await sa.inject({ method: 'POST', url: wp(p), payload: { kind: 'office', name: '  Unique Office Name  ', district: 'Patna' } });
      expect(res.statusCode).toBe(201);
      const w = (res.json() as { workplace: Json }).workplace;
      expect(w).toMatchObject({ kind: 'office', name: 'Unique Office Name', district: 'Patna', source: 'staff', status: 'listed' });
      const row = await td.pool.query(`SELECT created_by_actor_id FROM workplaces WHERE workplace_id = $1`, [w.workplaceId]);
      expect(row.rows[0]).toEqual({ created_by_actor_id: userId });
      const line = td.auditSink.ofType('admin_workplace.added').find((e) => e.resourceLocator === `workplace:${String(w.workplaceId)}`);
      expect(line?.actorId).toBe(userId);
      expect(JSON.stringify(line)).not.toContain('Unique Office Name');

      const bad = await sa.inject({ method: 'POST', url: wp(p), payload: { kind: 'office', name: 'X', district: 'Nalanda' } });
      expect([bad.statusCode, errCode(bad.body)]).toEqual([422, 'workplace.district_not_found']);
      const code = (await td.pool.query<{ c: string }>(`SELECT udise_school_code AS c FROM workplaces WHERE workplace_id = $1`, [ids['GMS RAMPUR']])).rows[0]!.c;
      const taken = await sa.inject({ method: 'POST', url: wp(p), payload: { kind: 'school', name: 'Dup', district: 'Patna', udiseSchoolCode: code } });
      expect([taken.statusCode, errCode(taken.body)]).toEqual([409, 'workplace.code_taken']);
      const ctl = await sa.inject({ method: 'POST', url: wp(p), payload: { kind: 'office', name: 'Bad\u0007', district: 'Patna' } });
      expect(ctl.statusCode).toBe(400);
    });

    it('rename / delist / relist: a STAFF row only (422 import_managed); 409 state_unchanged; 404 an unknown or another Pariwar’s', async () => {
      const { pariwarId: p, ids } = await seedList();
      const other = await seedList();
      const { client: sa } = await superAdmin(p);
      await elevate(sa, 'workplace_manage');
      const office = ids['DEO OFFICE PATNA']!;
      const post = (url: string, payload?: Json) => sa.inject({ method: 'POST', url, payload });
      expect((await post(`${wp(p)}/${office}/rename`, { name: 'DEO Office, Patna' })).json()).toMatchObject({ workplace: { name: 'DEO Office, Patna' } });
      expect((await post(`${wp(p)}/${office}/delist`)).statusCode).toBe(200);
      const again = await post(`${wp(p)}/${office}/delist`);
      expect([again.statusCode, errCode(again.body)]).toEqual([409, 'workplace.state_unchanged']);
      expect((await post(`${wp(p)}/${office}/relist`)).statusCode).toBe(200);
      const imp = await post(`${wp(p)}/${ids['GMS RAMPUR']}/delist`);
      expect([imp.statusCode, errCode(imp.body)]).toEqual([422, 'workplace.import_managed']);
      for (const id of [randomUUID(), other.ids['DEO OFFICE PATNA']!]) {
        const nf = await post(`${wp(p)}/${id}/rename`, { name: 'Y' });
        expect([nf.statusCode, errCode(nf.body)]).toEqual([404, 'workplace.not_found']);
      }
      expect((await post(`${wp(p)}/not-a-uuid/delist`)).statusCode).toBe(400);
      expect(td.auditSink.ofType('admin_workplace.relisted').some((e) => e.resourceLocator === `workplace:${office}`)).toBe(true);
    });

    it('GET filters and pages', async () => {
      const { pariwarId: p } = await seedList();
      const { client: sa } = await superAdmin(p);
      const page = (await sa.inject({ method: 'GET', url: `${wp(p)}?limit=2` })).json() as { items: Json[]; hasMore: boolean; nextCursor: string };
      expect(page.items.map((i) => i.name)).toEqual(['DEO OFFICE PATNA', 'GMS GAYA']);
      expect(page.hasMore).toBe(true);
      const next = (await sa.inject({ method: 'GET', url: `${wp(p)}?limit=2&cursor=${page.nextCursor}` })).json() as { items: Json[] };
      expect(next.items.map((i) => i.name)).toEqual(['GMS RAMPUR']);
      const gaya = (await sa.inject({ method: 'GET', url: `${wp(p)}?district=Gaya` })).json() as { items: Json[] };
      expect(gaya.items.map((i) => i.name)).toEqual(['GMS GAYA']);
      expect((await sa.inject({ method: 'GET', url: `${wp(p)}?cursor=forged` })).statusCode).toBe(400);
    });
  });

  describe('the queue (AC3)', () => {
    it('the key set carries ⛔ member data; suggest binds the Pariwar Admin as the actor; the statuses per route', async () => {
      const { pariwarId: p, ids } = await seedList();
      const { client: pa, userId } = await pariwarAdmin(p);
      const m = await seedMemberRow(p);
      const r = await seedRequest(p, m, 'Very Distinct Typed School');
      const q = (await pa.inject({ method: 'GET', url: rq(p) })).json() as { items: Json[] };
      expect(q.items).toHaveLength(1);
      expect(Object.keys(q.items[0]!).sort()).toEqual(['createdAt', 'district', 'requestId', 'sameNameCount', 'startedOn', 'state', 'suggested', 'typedName', 'typedPlace'].sort());
      expect(JSON.stringify(q)).not.toContain(m);

      await elevate(pa, 'workplace_review');
      const post = (url: string, payload?: Json) => pa.inject({ method: 'POST', url, payload });
      const nf = await post(`${rq(p)}/${r}/suggest`, { workplaceId: randomUUID() });
      expect([nf.statusCode, errCode(nf.body)]).toEqual([422, 'workplace.not_found']);
      const mm = await post(`${rq(p)}/${r}/suggest`, { workplaceId: ids['GMS GAYA'] });
      expect([mm.statusCode, errCode(mm.body)]).toEqual([422, 'workplace.district_mismatch']);
      const rn = await post(`${rq(p)}/${randomUUID()}/suggest`, { workplaceId: ids['GMS RAMPUR'] });
      expect([rn.statusCode, errCode(rn.body)]).toEqual([404, 'workplace.request_not_found']);
      const ok = await post(`${rq(p)}/${r}/suggest`, { workplaceId: ids['GMS RAMPUR'] });
      expect([ok.statusCode, ok.json()]).toEqual([200, { requestId: r, state: 'suggested' }]);
      const row = await td.pool.query(`SELECT suggested_by_actor_id, suggested_workplace_id FROM workplace_requests WHERE request_id = $1`, [r]);
      expect(row.rows[0]).toEqual({ suggested_by_actor_id: userId, suggested_workplace_id: ids['GMS RAMPUR'] });
      const twice = await post(`${rq(p)}/${r}/suggest`, { workplaceId: ids['GMS RAMPUR'] });
      expect([twice.statusCode, errCode(twice.body)]).toEqual([409, 'workplace.request_closed']);
      const line = td.auditSink.ofType('admin_workplace.request_suggested').find((e) => e.resourceLocator === `workplace_request:${r}`);
      expect(line?.actorId).toBe(userId);
      expect(JSON.stringify(line)).not.toContain('Very Distinct Typed School');

      const closed = await post(`${rq(p)}/${r}/close`);
      expect([closed.statusCode, closed.json()]).toEqual([200, { requestId: r, state: 'closed' }]);
      const again = await post(`${rq(p)}/${r}/close`);
      expect([again.statusCode, errCode(again.body)]).toEqual([409, 'workplace.request_closed']);
    });
  });

  describe('the member answers (AC4)', () => {
    it('another member’s request ⇒ the SAME 404 as an unknown one; ⛔ an Idempotency-Key ⇒ 400', async () => {
      const { pariwarId: p, ids } = await seedList();
      const [me, other] = [await seedMemberRow(p), await seedMemberRow(p)];
      const theirs = await seedRequest(p, other);
      await suggestRaw(theirs, ids['GMS RAMPUR']!);
      const tok = memberToken(me, p);
      const a = await memberCall('POST', answerUrl(theirs), tok, { answer: 'yes' });
      const b = await memberCall('POST', answerUrl(randomUUID()), tok, { answer: 'yes' });
      expect([a.status, b.status]).toEqual([404, 404]);
      const strip = (e: Json) => ({ ...(e.error as Json), request_id: undefined });
      expect(strip(a.body)).toEqual(strip(b.body));
      expect((a.body.error as Json).code).toBe('workplace.request_not_found');
      expect((await memberCall('POST', answerUrl(theirs), tok, { answer: 'yes' }, null)).status).toBe(400);
      expect((await memberCall('POST', answerUrl('nope'), tok, { answer: 'yes' })).status).toBe(400);
    });

    it('"Yes" ⇒ 200 with the summary; ONE posting naming the workplace, the marker, the audit line; a replay ⛔ writes twice', async () => {
      const { pariwarId: p, ids } = await seedList();
      const me = await seedMemberRow(p);
      const r = await seedRequest(p, me);
      await suggestRaw(r, ids['GMS RAMPUR']!);
      const tok = memberToken(me, p);
      const key = randomUUID();
      const res = await memberCall('POST', answerUrl(r), tok, { answer: 'yes' }, key);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ answer: 'yes', summary: { posting: { recorded: true, is_retirement: false } } });
      const replay = await memberCall('POST', answerUrl(r), tok, { answer: 'yes' }, key);
      expect([replay.status, replay.body]).toEqual([200, res.body]);
      const postings = await td.pool.query(`SELECT workplace_id, workplace_request_id, district, started_on::text FROM member_postings WHERE member_id = $1`, [me]);
      expect(postings.rows).toEqual([{ workplace_id: ids['GMS RAMPUR'], workplace_request_id: null, district: 'Patna', started_on: '2020-06-01' }]);
      const ev = await td.pool.query<{ payload: Json }>(`SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'member.posting_updated'`, [me]);
      expect(ev.rows.map((e) => e.payload)).toEqual([
        expect.objectContaining({ trigger: 'life_events_workplace_confirm', workplace_id: ids['GMS RAMPUR'], workplace_kind: 'school', not_listed: false, started_on: '2020-06-01' }),
      ]);
      const req = await td.pool.query(`SELECT state FROM workplace_requests WHERE request_id = $1`, [r]);
      expect(req.rows[0]).toEqual({ state: 'confirmed' });
      expect(td.auditSink.ofType('member_life_events.posting_updated').filter((e) => e.actorId === me)).toHaveLength(1);
    });

    it('"No" ⇒ 200 { answer: no }; the request is back in the queue, NULLed', async () => {
      const { pariwarId: p, ids } = await seedList();
      const me = await seedMemberRow(p);
      const r = await seedRequest(p, me);
      await suggestRaw(r, ids['GMS RAMPUR']!);
      const res = await memberCall('POST', answerUrl(r), memberToken(me, p), { answer: 'no' });
      expect([res.status, res.body]).toEqual([200, { answer: 'no' }]);
      const row = await td.pool.query(`SELECT state, suggested_workplace_id, suggested_by_actor_id FROM workplace_requests WHERE request_id = $1`, [r]);
      expect(row.rows[0]).toEqual({ state: 'pending', suggested_workplace_id: null, suggested_by_actor_id: null });
      expect(td.auditSink.ofType('member_life_events.workplace_suggestion_declined').some((e) => e.resourceLocator === `workplace_request:${r}`)).toBe(true);
      const { client: pa } = await pariwarAdmin(p);
      const q = (await pa.inject({ method: 'GET', url: rq(p) })).json() as { items: Json[] };
      expect(q.items.map((i) => i.requestId)).toEqual([r]);
    });

    it('a STALE suggestion ⇒ 409 suggestion_stale (back to pending, committed); a retry with the SAME key ⇒ 409 request_closed', async () => {
      const { pariwarId: p, ids } = await seedList();
      const me = await seedMemberRow(p);
      const r = await seedRequest(p, me);
      await suggestRaw(r, ids['DEO OFFICE PATNA']!);
      await td.pool.query(`UPDATE workplaces SET status = 'delisted' WHERE workplace_id = $1`, [ids['DEO OFFICE PATNA']]);
      const tok = memberToken(me, p);
      const key = randomUUID();
      const first = await memberCall('POST', answerUrl(r), tok, { answer: 'yes' }, key);
      expect([first.status, (first.body.error as Json).code]).toEqual([409, 'workplace.suggestion_stale']);
      expect((await td.pool.query(`SELECT state FROM workplace_requests WHERE request_id = $1`, [r])).rows[0]).toEqual({ state: 'pending' });
      const retry = await memberCall('POST', answerUrl(r), tok, { answer: 'yes' }, key);
      expect([retry.status, (retry.body.error as Json).code]).toEqual([409, 'workplace.request_closed']);
      expect((await td.pool.query(`SELECT 1 FROM member_postings WHERE member_id = $1`, [me])).rows).toHaveLength(0);
    });
  });

  describe('the prompts (AC5)', () => {
    it('200 for a member who may name people, with the suggestion', async () => {
      const { pariwarId: p, ids } = await seedList();
      const me = await seedMemberRow(p);
      const r = await seedRequest(p, me);
      await td.pool.query(`INSERT INTO member_postings (pariwar_id, member_id, district, workplace_request_id) VALUES ($1, $2, 'Patna', $3)`, [p, me, r]);
      await suggestRaw(r, ids['GMS RAMPUR']!);
      const res = await memberCall('GET', '/api/v1/member/known-people/prompts', memberToken(me, p));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        noWorkplace: true,
        hasWorkplace: false,
        suggestedWorkplace: { requestId: r, workplaceId: ids['GMS RAMPUR'], name: 'GMS RAMPUR', district: 'Patna' },
        transferReview: false,
        replaceNeeded: false,
        canNamePeople: true,
        campaign: null,
      });
    });
  });

  describe('the campaigns (AC7)', () => {
    it('a Pariwar Admin starts (⛔ step-up), overlap ⇒ 409, window ⇒ 422, ends, lists; ⛔ a message is sent', async () => {
      const { pariwarId: p } = await seedList();
      const { client: pa, userId } = await pariwarAdmin(p);
      const today = (await td.pool.query<{ d: string }>(`SELECT to_char((clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS d`)).rows[0]!.d;
      const plus = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
      const deliveriesBefore = td.stepUpDelivery.deliveries.length + adminStepUp.deliveries.length;
      const start = await pa.inject({ method: 'POST', url: cp(p), payload: { startsOn: today, endsOn: plus(6) } });
      expect(start.statusCode).toBe(201);
      const campaign = (start.json() as { campaign: Json }).campaign;
      expect(campaign).toMatchObject({ startsOn: today, endsOn: plus(6), status: 'live', endedAt: null });
      const row = await td.pool.query(`SELECT started_by_actor_id FROM known_people_campaigns WHERE campaign_id = $1`, [campaign.campaignId]);
      expect(row.rows[0]).toEqual({ started_by_actor_id: userId });
      // ⛔ a message: no OTP / SMS delivery, no channel event for this Pariwar.
      expect(td.stepUpDelivery.deliveries.length + adminStepUp.deliveries.length).toBe(deliveriesBefore);
      const msgs = await td.pool.query(`SELECT 1 FROM events_log WHERE pariwar_id = $1 AND (event_type LIKE 'channel%' OR event_type LIKE 'notification%' OR event_type LIKE 'dispatch%')`, [p]);
      expect(msgs.rows).toHaveLength(0);

      const overlap = await pa.inject({ method: 'POST', url: cp(p), payload: { startsOn: plus(3), endsOn: plus(9) } });
      expect([overlap.statusCode, errCode(overlap.body)]).toEqual([409, 'known_people_campaign.overlap']);
      const long = await pa.inject({ method: 'POST', url: cp(p), payload: { startsOn: plus(10), endsOn: plus(40) } });
      expect([long.statusCode, errCode(long.body)]).toEqual([422, 'known_people_campaign.window_invalid']);
      const end = await pa.inject({ method: 'POST', url: `${cp(p)}/${String(campaign.campaignId)}/end` });
      expect([end.statusCode, (end.json() as { campaign: Json }).campaign.status]).toEqual([200, 'ended']);
      const twice = await pa.inject({ method: 'POST', url: `${cp(p)}/${String(campaign.campaignId)}/end` });
      expect([twice.statusCode, errCode(twice.body)]).toEqual([409, 'known_people_campaign.not_live']);
      const nf = await pa.inject({ method: 'POST', url: `${cp(p)}/${randomUUID()}/end` });
      expect([nf.statusCode, errCode(nf.body)]).toEqual([404, 'known_people_campaign.not_found']);
      const list = (await pa.inject({ method: 'GET', url: cp(p) })).json() as { items: Json[] };
      expect(list.items.map((c) => c.campaignId)).toEqual([campaign.campaignId]);
      expect(td.auditSink.ofType('admin_known_people.campaign_started').some((e) => e.resourceLocator === `known_people_campaign:${String(campaign.campaignId)}`)).toBe(true);
      expect(td.auditSink.ofType('admin_known_people.campaign_ended').some((e) => e.actorId === userId)).toBe(true);
    });
  });
});
