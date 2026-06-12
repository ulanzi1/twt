// Step-up OTP + gating integration (Story 1.9, Task 5, AC-4).
//
// Drives the gate end-to-end: a step-up-gated route 403s until a fresh elevation
// for its exact action_context; request mints + delivers (captured) an OTP; verify
// elevates the session (~5 min); the gate then passes. Also: single-use, TTL expiry
// (frozen clock advanced past the TTL), action-context binding, and the SEND audit
// line carrying otp_hash (never the code).

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import * as service from '../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../src/server.js';
import {
  buildTestDeps,
  hasDatabase,
  makeClient,
  type CapturingAuditSink,
  type CapturingStepUpDelivery,
  type TestDeps,
} from './_setup.js';
import { FakeWebAuthnProvider } from './_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

describe.skipIf(!hasDatabase)('step-up OTP + gating (Task 5)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let fakeWebauthn: FakeWebAuthnProvider;
  let delivery: CapturingStepUpDelivery;
  let audit: CapturingAuditSink;
  let nowMs = Date.now();
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    nowMs = Date.now();
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn, clock: () => new Date(nowMs) });
    deps = td.deps;
    delivery = td.stepUpDelivery;
    audit = td.auditSink;
    app = await buildServer(deps);
  });

  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]); // cascades
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  beforeEach(() => {
    nowMs = Date.now();
  });

  /** Create + enroll + fully log in an admin; returns an authenticated client. */
  async function authedClient(): Promise<Client> {
    const email = `su-${randomUUID()}@example.test`;
    const password = 'StepUpTestPassword1';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = {
      verified: true,
      credential: { id: credentialId, publicKey: 'pk', counter: 0 },
    };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };

    const client = makeClient(app);
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    audit.events.length = 0; // isolate the step-up events from the login events
    return client;
  }

  it('gates until a fresh step-up; request→verify elevates the session', async () => {
    const client = await authedClient();

    const blocked = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/protected-probe', payload: {} });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json<{ error: { code: string } }>().error.code).toBe('auth.step_up_required');

    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'step_up.demo' } });
    expect(req.statusCode).toBe(200);
    const code = delivery.last!.code;

    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } });
    expect(ver.statusCode).toBe(200);
    expect(ver.json<{ elevated: boolean }>().elevated).toBe(true);

    const allowed = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/protected-probe', payload: {} });
    expect(allowed.statusCode).toBe(200);

    // Audit: the SEND line carries otp_hash (never the code), the CONSUME the action.
    const sent = audit.ofType('step_up.send');
    expect(sent).toHaveLength(1);
    expect(typeof sent[0]?.context?.['otp_hash']).toBe('string');
    expect(sent[0]?.context?.['otp_hash']).not.toBe(code);
    expect(audit.ofType('step_up.consume')).toHaveLength(1);
  });

  it('OTP is single-use', async () => {
    const client = await authedClient();
    await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'step_up.demo' } });
    const code = delivery.last!.code;
    const first = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } });
    expect(first.statusCode).toBe(200);
    const reuse = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } });
    expect(reuse.statusCode).toBe(401);
  });

  it('OTP expires after the TTL', async () => {
    const client = await authedClient();
    await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'step_up.demo' } });
    const code = delivery.last!.code;
    nowMs += deps.config.stepUpOtpTtlMs + 1000; // advance past the 3-min TTL
    const expired = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } });
    expect(expired.statusCode).toBe(401);
  });

  it('an elevation is bound to its action_context (no cross-action reuse)', async () => {
    const client = await authedClient();
    await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'other.action' } });
    const code = delivery.last!.code;
    await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } });
    // The probe gates 'step_up.demo' — an elevation for 'other.action' does NOT satisfy it.
    const blocked = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/protected-probe', payload: {} });
    expect(blocked.statusCode).toBe(403);
  });
});
