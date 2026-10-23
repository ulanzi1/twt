// Story 11b.4 — the Trust's review, end to end (AC9 / AC6 / AC10; MA6 / MA7 / MA13 / MA16; Trap 8), and the family-side
// effects of a decision. Live DB (`:5434`), explicit values, one Pariwar per world.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestApp, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';
import { handover, jpegWithGps, memberInject, rows, seedMemorialWorld, send, sendFields, type MemorialWorld } from './_fixture.js';

type Client = ReturnType<typeof makeClient>;

describe.skipIf(!hasDatabase)('memorial — the Trust\'s review (live DB)', () => {
  let td: TestDeps;
  let t: TestApp;
  let fakeWebauthn: FakeWebAuthnProvider;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    t = { ...td, app: await buildServer(td.deps) };
  });

  afterAll(async () => {
    await t.app.close();
    const c = await td.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  async function staff(pariwarId: string, role: string | null, displayName = 'Panel Member'): Promise<Client> {
    const email = `memorial-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(td.deps, { email, password, displayName });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(t.app);
    const token = service.mintEnrollmentToken(td.deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    if (role !== null) {
      await rows(t, `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, 'pariwar', $4)`, [userId, pariwarId, role, pariwarId]);
    }
    return client;
  }

  async function sentWorld(body = 'माँ बहुत अच्छी थीं। रमेश ने धोखा दिया।\n\nहम उन्हें याद करते हैं।', photo = false) {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const parts = photo
      ? [...sendFields({ body, altText: 'माँ' }), { kind: 'file' as const, name: 'photo', filename: 'm.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() }]
      : sendFields({ body });
    expect((await send(t, w, parts)).status).toBe(201);
    const subs = await rows<{ submission_id: string }>(t, `SELECT submission_id FROM memorial_submissions WHERE pariwar_id = $1 ORDER BY created_at`, [w.pariwarId]);
    return { w, id: subs.at(-1)!.submission_id, body };
  }

  const base = (w: MemorialWorld) => `/api/v1/p/${w.pariwarId}/memorial-reviews`;
  const post = (c: Client, url: string, payload: object) => c.inject({ method: 'POST', url, payload });
  const memberView = async (w: MemorialWorld) =>
    (await memberInject(t, 'GET', '/api/v1/member/memorial', { token: w.token })).body.memorial as Record<string, unknown>;

  it('AC9: the queue lists a version with the Trust — the name and the date, ⛔ body; one read line per page', async () => {
    const { w, id, body } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    const before = t.auditSink.events.length;
    const r = await panel.inject({ method: 'GET', url: base(w) });
    expect(r.statusCode).toBe(200);
    const items = r.json<{ items: Array<Record<string, unknown>> }>().items;
    expect(items).toEqual([{ submissionId: id, deceasedName: 'Shanti Devi', sentAt: expect.any(String), memorialState: 'with_the_trust' }]);
    expect(r.body).not.toContain(body.slice(0, 5));
    expect(t.auditSink.events.slice(before).filter((e) => e.type === 'memorial.review.read')).toHaveLength(1);
    // ?view=decided is empty until a decision.
    expect((await panel.inject({ method: 'GET', url: `${base(w)}?view=decided` })).json<{ items: unknown[] }>().items).toEqual([]);
  });

  it('MA7: ⛔ memorial.review → 403; a Pariwar with ⛔ grant → the scope middleware\'s 404 first', async () => {
    const { w } = await sentWorld();
    const admin = await staff(w.pariwarId, 'pariwar_admin');
    expect((await admin.inject({ method: 'GET', url: base(w) })).statusCode).toBe(403);
    const other = await seedMemorialWorld(t);
    const panelElsewhere = await staff(other.pariwarId, 'trustee_panel');
    const r = await panelElsewhere.inject({ method: 'GET', url: base(w) });
    expect(r.statusCode).toBe(404);
  });

  it('AC9 / AC6: approve with a part left out — the verbatim body is ⛔ rewritten; the family sees the span and its reason', async () => {
    const { w, id, body } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    const start = body.indexOf('रमेश');
    const end = body.indexOf('\n');
    const r = await post(panel, `${base(w)}/${id}/decision`, {
      action: 'approved_with_omissions',
      omissions: [{ field: 'body', start, end, reason: 'accuses_someone_of_wrongdoing' }],
      internalNote: 'नाम लेकर आरोप',
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ submissionId: id, memorialState: 'approved_with_omissions' });
    const [d] = await rows<{ action: string; omissions: unknown; actor_display: string }>(t, `SELECT action, omissions, actor_display FROM memorial_review_decisions WHERE submission_id = $1`, [id]);
    expect(d).toMatchObject({ action: 'approved_with_omissions', actor_display: 'Panel Member' });
    const v = await memberView(w);
    expect(v).toMatchObject({
      memorialState: 'approved_with_omissions',
      body,
      omissions: [{ field: 'body', start, end, reason: 'accuses_someone_of_wrongdoing' }],
      canSend: true,
    });
    // AC10 — the internal note ⛔ never reaches the family's wire.
    expect(JSON.stringify(v)).not.toContain('नाम लेकर आरोप');
    // The history view reads the note back (⛔ write-only field).
    const detail = (await panel.inject({ method: 'GET', url: `${base(w)}/${id}` })).json<{ chain: Array<{ decision: { internalNote: string } }> }>();
    expect(detail.chain[0]!.decision.internalNote).toBe('नाम लेकर आरोप');
    // The write line.
    const audit = await rows<{ action: string }>(t, `SELECT action FROM audit_log_entries WHERE pariwar_id = $1 AND action LIKE 'memorial.review.%'`, [w.pariwarId]);
    expect(audit.map((a) => a.action)).toEqual(['memorial.review.decide']);
  });

  it.each(['body', 'text', 'narrative'])('AC6: a decision posting `%s` → 400 (the strict schema)', async (field) => {
    const { w, id } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    const r = await post(panel, `${base(w)}/${id}/decision`, { action: 'approved', [field]: 'new words' });
    expect(r.statusCode).toBe(400);
  });

  it('MA6: invalid spans → 400 memorial_review.invalid_omissions (only for a visible version)', async () => {
    const { w, id, body } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    const r = await post(panel, `${base(w)}/${id}/decision`, {
      action: 'approved_with_omissions',
      omissions: [{ field: 'body', start: 0, end: body.length, reason: 'against_the_law' }],
    });
    expect(r.statusCode).toBe(400);
    expect(r.json()).toMatchObject({ error: { code: 'memorial_review.invalid_omissions' } });
    const photoless = await post(panel, `${base(w)}/${id}/decision`, { action: 'approved_with_omissions', photoLeftOut: { reason: 'identifies_a_child' } });
    expect(photoless.json()).toMatchObject({ error: { code: 'memorial_review.invalid_omissions' } });
  });

  it('MA6: leave out the photo (and its alt text) on a version with one', async () => {
    const { w, id } = await sentWorld('शब्द।', true);
    const panel = await staff(w.pariwarId, 'trustee_panel');
    const r = await post(panel, `${base(w)}/${id}/decision`, { action: 'approved_with_omissions', photoLeftOut: { reason: 'identifies_a_child' } });
    expect(r.statusCode).toBe(200);
    expect(await memberView(w)).toMatchObject({ photoLeftOut: { reason: 'identifies_a_child' } });
    // The reviewer's detail carries a signed URL for the photo (each a memorial.photo.url line).
    const before = t.auditSink.events.length;
    const d = (await panel.inject({ method: 'GET', url: `${base(w)}/${id}` })).json<{ chain: Array<{ photoUrl: string | null }> }>();
    expect(typeof d.chain[0]!.photoUrl).toBe('string');
    expect(t.auditSink.events.slice(before).map((e) => e.type)).toContain('memorial.photo.url');
  });

  it('⭐ Trap 8: decision refusals — superseded, withdrawn, already decided, another Pariwar\'s id — ONE byte-identical 404 body', async () => {
    const panelWorld = await sentWorld();
    const panel = await staff(panelWorld.w.pariwarId, 'trustee_panel');
    const { w } = panelWorld;
    // superseded: a second Send.
    expect((await send(t, w, sendFields({ body: 'दूसरा' }))).status).toBe(201);
    const subs = await rows<{ submission_id: string }>(t, `SELECT submission_id FROM memorial_submissions WHERE pariwar_id = $1 ORDER BY created_at`, [w.pariwarId]);
    const superseded = subs[0]!.submission_id;
    const head = subs[1]!.submission_id;
    // decided: decide the head; then try again.
    expect((await post(panel, `${base(w)}/${head}/decision`, { action: 'not_approved', reasonCode: 'against_the_law' })).statusCode).toBe(200);
    // withdrawn: a family-withdrawn head in a second world of the SAME Pariwar is not reachable (one Pariwar per world) — use a
    // withdrawn version in its own world, decided by its own panel below.
    const other = await sentWorld();
    const strangerId = other.id;
    const bodies: string[] = [];
    for (const target of [superseded, head, strangerId, randomUUID()]) {
      const r = await post(panel, `${base(w)}/${target}/decision`, { action: 'approved' });
      expect(r.statusCode).toBe(404);
      const parsed = r.json<{ error: { code: string; message: string } }>();
      expect(parsed.error.code).toBe('memorial_review.not_found');
      bodies.push(JSON.stringify({ code: parsed.error.code, message: parsed.error.message }));
    }
    expect(new Set(bodies).size).toBe(1);
    // A family-withdrawn version is refused the same way.
    const wd = await sentWorld();
    const wdPanel = await staff(wd.w.pariwarId, 'trustee_panel');
    await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${wd.id}/withdraw`, { payload: {}, token: wd.w.token });
    const r = await post(wdPanel, `${base(wd.w)}/${wd.id}/decision`, { action: 'approved' });
    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ error: { code: 'memorial_review.not_found', message: 'Not found' } });
    // The history view still READS a superseded and a decided version.
    expect((await panel.inject({ method: 'GET', url: `${base(w)}/${superseded}` })).statusCode).toBe(200);
  });

  it('MA13: a Send after a clean approval → 409 memorial.already_reviewed; canSend false', async () => {
    const { w, id } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    expect((await post(panel, `${base(w)}/${id}/decision`, { action: 'approved' })).statusCode).toBe(200);
    expect(await memberView(w)).toMatchObject({ memorialState: 'approved', canSend: false, canWithdraw: false });
    const r = await send(t, w, sendFields({ body: 'नया' }));
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ error: { code: 'memorial.already_reviewed' } });
    // The family's withdraw of a decided version → 409.
    const wr = await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${id}/withdraw`, { payload: {}, token: w.token });
    expect(wr.status).toBe(409);
  });

  it('MA16: the Trust withdraws its approval → approval_withdrawn with the reason; the family may send again', async () => {
    const { w, id } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    await post(panel, `${base(w)}/${id}/decision`, { action: 'approved' });
    expect((await post(panel, `${base(w)}/${id}/withdraw-approval`, {})).statusCode).toBe(400); // a missing reason
    const r = await post(panel, `${base(w)}/${id}/withdraw-approval`, { reasonCode: 'identifies_a_child' });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ submissionId: id, memorialState: 'approval_withdrawn' });
    expect(await memberView(w)).toMatchObject({ memorialState: 'approval_withdrawn', reasonCode: 'identifies_a_child', canSend: true });
    // Already withdrawn → the neutral 404.
    expect((await post(panel, `${base(w)}/${id}/withdraw-approval`, { reasonCode: 'identifies_a_child' })).statusCode).toBe(404);
    // A new version: the earlier withdrawal is told beside it.
    expect((await send(t, w, sendFields({ body: 'बिना नाम के' }))).status).toBe(201);
    expect(await memberView(w)).toMatchObject({ memorialState: 'with_the_trust', earlierApprovalWithdrawn: { reasonCode: 'identifies_a_child' } });
  });

  it('MA16: a SUPERSEDED approved version may be withdrawn; a non-approved one → 404', async () => {
    const { w, id } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    await post(panel, `${base(w)}/${id}/decision`, { action: 'approved_with_omissions', photoLeftOut: undefined, omissions: [{ field: 'body', start: 0, end: 3, reason: 'against_the_law' }] });
    expect((await send(t, w, sendFields({ body: 'नया संस्करण' }))).status).toBe(201);
    const subs = await rows<{ submission_id: string }>(t, `SELECT submission_id FROM memorial_submissions WHERE pariwar_id = $1 ORDER BY created_at`, [w.pariwarId]);
    const newest = subs[1]!.submission_id;
    expect((await post(panel, `${base(w)}/${newest}/withdraw-approval`, { reasonCode: 'against_the_law' })).statusCode).toBe(404);
    expect((await post(panel, `${base(w)}/${id}/withdraw-approval`, { reasonCode: 'against_the_law' })).statusCode).toBe(200);
    const audit = await rows<{ action: string }>(t, `SELECT action FROM audit_log_entries WHERE pariwar_id = $1 AND action = 'memorial.review.withdraw_approval'`, [w.pariwarId]);
    expect(audit).toHaveLength(1);
  });

  it('AC9: ?view=decided lists the latest of each decided chain', async () => {
    const { w, id } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    await post(panel, `${base(w)}/${id}/decision`, { action: 'not_approved', reasonCode: 'attacks_someone_named' });
    const items = (await panel.inject({ method: 'GET', url: `${base(w)}?view=decided` })).json<{ items: Array<{ submissionId: string; memorialState: string }> }>().items;
    expect(items).toEqual([expect.objectContaining({ submissionId: id, memorialState: 'not_approved' })]);
    expect(await memberView(w)).toMatchObject({ memorialState: 'not_approved', reasonCode: 'attacks_someone_named', canSend: true });
  });
});
