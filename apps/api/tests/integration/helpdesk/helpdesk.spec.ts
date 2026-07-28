// Helpdesk create-ticket primitive — E2E (Story 10.1, Task 6; AC1/AC3/AC5). (:5433)
//
// The tenant-scoped create-ticket route end-to-end against real Postgres: the auth/tenant-isolation
// boundary (no session → 401; no grant for the Pariwar → 404), the 201 success path (routes via the
// default policy, projects the genesis event, returns the DTO), the review-hardening fixes from chunks
// 3/4 of the code review (`created_via: 'member_app'` rejected at this admin-only route → 400; a
// `helpline_call` ticket with no acting-admin display name → 409, server-resolved `operator_attribution`
// on success).
//
// ⚠ Own-committing seed writes; fresh random pariwarId per test; role_grants cleaned in afterAll.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

describe.skipIf(!hasDatabase)('helpdesk create-ticket primitive — E2E (:5433)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const createdPariwars: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
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

  async function authenticate(opts: { displayName?: string | null } = {}): Promise<{ client: Client; userId: string }> {
    const email = `hd-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, {
      email,
      password,
      ...(opts.displayName != null ? { displayName: opts.displayName } : {}),
    });
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
    return { client, userId };
  }

  async function grant(userId: string, pariwarId: string, role: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [
        userId,
        pariwarId,
        role,
        'pariwar',
        pariwarId,
      ]);
    } finally {
      c.release();
    }
  }

  function freshPariwar(): string {
    const p = randomUUID();
    createdPariwars.push(p);
    return p;
  }

  const ticketsUrl = (p: string) => `/api/v1/p/${p}/helpdesk/tickets`;

  it('401 when unauthenticated', async () => {
    const p = freshPariwar();
    const anon = makeClient(app);
    const res = await anon.inject({
      method: 'POST',
      url: ticketsUrl(p),
      payload: { subject_member_id: randomUUID(), category: 'kyc-trouble', body: 'help', created_via: 'helpline_call' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('404 when the actor has no grant for the Pariwar (tenant isolation — scope unresolvable)', async () => {
    const p = freshPariwar();
    const a = await authenticate({ displayName: 'No Grant' });
    const res = await a.client.inject({
      method: 'POST',
      url: ticketsUrl(p),
      payload: { subject_member_id: randomUUID(), category: 'kyc-trouble', body: 'help', created_via: 'helpline_call' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('201: creates + routes a ticket via the default policy, with server-resolved operator_attribution', async () => {
    const p = freshPariwar();
    const a = await authenticate({ displayName: 'Operator Priya' });
    await grant(a.userId, p, 'helpline_operator');

    const res = await a.client.inject({
      method: 'POST',
      url: ticketsUrl(p),
      payload: {
        subject_member_id: randomUUID(),
        category: 'utr-mismatch',
        body: 'my UTR does not match',
        created_via: 'helpline_call',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as {
      ticket_id: string;
      current_state: string;
      sub_category: string | null;
      routed_to_role: string;
      routing_policy_version: number;
      created_via: string;
      operator_attribution: string | null;
    };
    expect(body.current_state).toBe('open');
    expect(body.sub_category).toBeNull();
    // The default v1 policy routes utr-mismatch to finance_officer (AC2 golden vector).
    expect(body.routed_to_role).toBe('finance_officer');
    expect(body.routing_policy_version).toBe(1);
    expect(body.created_via).toBe('helpline_call');
    // Server-resolved from the session — never client-supplied (chunk 3 decision).
    expect(body.operator_attribution).toBe('Operator Priya');
  });

  it('400: rejects created_via "member_app" at this admin-only route', async () => {
    const p = freshPariwar();
    const a = await authenticate({ displayName: 'Operator Two' });
    await grant(a.userId, p, 'helpline_operator');

    const res = await a.client.inject({
      method: 'POST',
      url: ticketsUrl(p),
      payload: { subject_member_id: randomUUID(), category: 'kyc-trouble', body: 'help', created_via: 'member_app' },
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: { code: string } }).error.code).toBe('helpdesk.created_via_not_supported');
  });

  it('409: fails closed when the acting operator has no display name configured', async () => {
    const p = freshPariwar();
    const a = await authenticate({ displayName: null });
    await grant(a.userId, p, 'helpline_operator');

    const res = await a.client.inject({
      method: 'POST',
      url: ticketsUrl(p),
      payload: { subject_member_id: randomUUID(), category: 'kyc-trouble', body: 'help', created_via: 'helpline_call' },
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe('admin.display_name_missing');
  });
});
