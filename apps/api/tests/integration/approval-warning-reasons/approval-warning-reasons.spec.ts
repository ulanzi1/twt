// Story 6.23a — the Super Admin's WARNING-REASON LIST through HTTP (live DB :5433; Task 11; NW17; AC12).
//   · only `super_admin` holds `approval_warning_reason.manage` (a `pariwar_admin` / `district_admin` ⇒ 403);
//   · both writes need a FRESH step-up (403 `auth.step_up_required` without one);
//   · add ⇒ 201 with a server code and the snapshotted name; replace ⇒ the old one in the history, the new one active;
//     a second replace ⇒ 409; a cross-Pariwar replace ⇒ 404 (⛔ another Pariwar's reason is never reachable);
//   · a microcopy vocabulary term, a blank, an over-long field or a smuggled `code` ⇒ 400;
//   · ⛔ no PUT / PATCH / DELETE route exists (404);
//   · the audit lines carry ids and codes — ⛔ never the reason's words.
// ⚠ Own-committing; a FRESH Pariwar per test (Trap 18 — a reason row can ⛔ never be deleted).

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type CapturingStepUpDelivery, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

describe.skipIf(!hasDatabase)('Story 6.23a — the warning-reason list through HTTP (:5433)', { timeout: 30000 }, () => {
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

  async function actor(pariwarId: string, role: string, dim: string, value: string | null, displayName: string): Promise<Client> {
    const email = `awr-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName });
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
    await td.pool.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [
      userId,
      pariwarId,
      role,
      dim,
      value,
    ]);
    return client;
  }

  const superAdmin = (pariwarId: string) => actor(pariwarId, 'super_admin', 'global', null, 'Sunita (Super Admin)');

  async function elevate(client: Client): Promise<void> {
    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'approval_warning_reason_manage' } });
    expect(req.statusCode).toBe(200);
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: adminStepUp.last?.code as string } });
    expect(ver.statusCode).toBe(200);
  }

  const url = (p: string) => `/api/v1/p/${p}/admin/approval-warning-reasons`;
  const errCode = (body: string) => (JSON.parse(body) as { error: { code: string } }).error.code;

  it('⭐ only `super_admin` holds the key: a Pariwar Admin and a District Admin ⇒ 403 on every route', async () => {
    const p = randomUUID();
    for (const client of [await actor(p, 'pariwar_admin', 'pariwar', p, 'PA'), await actor(p, 'district_admin', 'district', 'Patna', 'DA')]) {
      expect((await client.inject({ method: 'GET', url: url(p) })).statusCode).toBe(403);
      expect((await client.inject({ method: 'POST', url: url(p), payload: { label: 'x', when_to_use: 'y' } })).statusCode).toBe(403);
      expect((await client.inject({ method: 'POST', url: `${url(p)}/${randomUUID()}/replace`, payload: { label: 'x', when_to_use: 'y' } })).statusCode).toBe(403);
    }
  });

  it('⭐ a write needs a FRESH step-up; then add ⇒ 201 (server code, snapshotted name), the list shows it after the generic', async () => {
    const p = randomUUID();
    const sa = await superAdmin(p);
    const noStepUp = await sa.inject({ method: 'POST', url: url(p), payload: { label: 'Seen in person', when_to_use: 'Use when seen.' } });
    expect(noStepUp.statusCode).toBe(403);
    expect(errCode(noStepUp.body)).toBe('auth.step_up_required');

    await elevate(sa);
    const added = await sa.inject({ method: 'POST', url: url(p), payload: { label: 'Seen in person', when_to_use: 'Use when seen.' } });
    expect(added.statusCode).toBe(201);
    const reason = (added.json() as { reason: Json }).reason;
    expect(reason).toMatchObject({ label: 'Seen in person', addedByDisplay: 'Sunita (Super Admin)', replacesLabel: null });
    expect(String(reason.code)).toMatch(/^awr_[0-9a-f]{8}$/);

    const list = await sa.inject({ method: 'GET', url: url(p) });
    expect(list.statusCode).toBe(200);
    const active = (list.json() as { active: Json[] }).active;
    expect(active.map((o) => o.code)).toEqual(['warnings_reviewed', reason.code]);
    const [line] = td.auditSink.ofType('admin_approval_warning_reason.added').filter((e) => (e.context as Json).reason_id === reason.reasonId);
    expect(line?.context).toMatchObject({ code: reason.code });
    expect(JSON.stringify(line)).not.toContain('Seen in person');
  });

  it('⭐ replace ⇒ the old one in the history with what replaced it; a second replace ⇒ 409; a cross-Pariwar replace ⇒ 404', async () => {
    const p = randomUUID();
    const q = randomUUID();
    const sa = await superAdmin(p);
    await elevate(sa);
    const old = (await sa.inject({ method: 'POST', url: url(p), payload: { label: 'Old words', when_to_use: 'Old note.' } })).json() as { reason: Json };
    const rep = await sa.inject({
      method: 'POST',
      url: `${url(p)}/${String(old.reason.reasonId)}/replace`,
      payload: { label: 'New words', when_to_use: 'New note.' },
    });
    expect(rep.statusCode).toBe(201);
    expect(rep.json()).toMatchObject({ reason: { label: 'New words', replacesLabel: 'Old words' }, replacedReasonId: old.reason.reasonId });
    const list = (await sa.inject({ method: 'GET', url: url(p) })).json() as { active: Json[]; history: Json[] };
    expect(list.active.map((o) => o.label)).toEqual(['Warnings reviewed — approved despite them', 'New words']);
    expect(list.history).toEqual([expect.objectContaining({ label: 'Old words', whenToUse: 'Old note.', replacedByLabel: 'New words' })]);

    const again = await sa.inject({ method: 'POST', url: `${url(p)}/${String(old.reason.reasonId)}/replace`, payload: { label: 'x', when_to_use: 'y' } });
    expect(again.statusCode).toBe(409);
    expect(errCode(again.body)).toBe('approval_warning_reason.already_replaced');

    const cross = await sa.inject({ method: 'POST', url: `${url(q)}/${String(old.reason.reasonId)}/replace`, payload: { label: 'x', when_to_use: 'y' } });
    expect(cross.statusCode).toBe(404);
  });

  it('a vocabulary term, a blank, an over-long field or a smuggled `code` ⇒ 400', async () => {
    const p = randomUUID();
    const sa = await superAdmin(p);
    await elevate(sa);
    const vocab = await sa.inject({ method: 'POST', url: url(p), payload: { label: 'Checked the report', when_to_use: 'Use when checked.' } });
    expect(vocab.statusCode).toBe(400);
    expect(errCode(vocab.body)).toBe('approval_warning_reason.invalid_text');
    for (const payload of [
      { label: ' ', when_to_use: 'y' },
      { label: 'x'.repeat(121), when_to_use: 'y' },
      { label: 'x', when_to_use: 'y'.repeat(1001) },
      { label: 'x', when_to_use: 'y', code: 'awr_00000000' },
    ]) {
      expect((await sa.inject({ method: 'POST', url: url(p), payload })).statusCode).toBe(400);
    }
    expect(((await sa.inject({ method: 'GET', url: url(p) })).json() as { active: Json[] }).active).toHaveLength(1);
  });

  it('⛔ no route edits or deletes a reason (PUT / PATCH / DELETE ⇒ 404)', async () => {
    const p = randomUUID();
    const sa = await superAdmin(p);
    for (const method of ['PUT', 'PATCH', 'DELETE'] as const) {
      expect((await sa.inject({ method, url: `${url(p)}/${randomUUID()}`, payload: {} })).statusCode).toBe(404);
      expect((await sa.inject({ method, url: url(p), payload: {} })).statusCode).toBe(404);
    }
  });
});
