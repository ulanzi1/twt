// Admin-auth end-to-end integration (Story 1.9, Task 4 + Task 3 HTTP, AC-1/2/6).
//
// Drives the real Fastify app via fastify.inject (no supertest) with a controllable
// fake WebAuthn provider. Covers: the enrollment ceremony (token-gated bootstrap +
// recovery-code provisioning), the two-step login (password → passkey/recovery 2nd
// factor), the scoped-route chain (login → /p/:id/whoami 404-on-non-member,
// audit-probe 403-on-under-privileged), lockout, the ≤2-device cap, WebAuthn
// counter-regression rejection, and password reset (force re-enrollment).

import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import * as service from '../../src/modules/auth/admin/admin-auth.service.js';
import {
  buildTestDeps,
  hasDatabase,
  makeClient,
  CapturingAuditSink,
  type TestDeps,
} from './_setup.js';
import { FakeWebAuthnProvider } from './_webauthn-fake.js';
import { buildServer } from '../../src/server.js';

type Client = ReturnType<typeof makeClient>;

describe.skipIf(!hasDatabase)('admin auth end-to-end (Task 4)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let audit: CapturingAuditSink;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    audit = new CapturingAuditSink();
    td = buildTestDeps({ webauthn: fakeWebauthn, auditSink: audit });
    deps = td.deps;
    app = await buildServer(deps);
  });

  afterAll(async () => {
    await app.close();
    try {
      const c = await td.pool.connect();
      try {
        if (createdUserIds.length > 0) {
          await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
          await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]); // cascades
        }
      } finally {
        c.release();
      }
    } finally {
      await td.pool.end();
    }
  });

  let email: string;
  let password: string;
  let userId: string;

  beforeEach(async () => {
    fakeWebauthn.nextRegistration = undefined;
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    audit.events.length = 0;
    email = `admin-${randomUUID()}@example.test`;
    password = 'CorrectHorseBatteryStaple9';
    userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
  });

  afterEach(async () => {
    // Per-test row cleanup (credentials/recovery cascade; sessions by userId).
    const c = await td.pool.connect();
    try {
      await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = $1`, [userId]);
      await c.query(`DELETE FROM webauthn_credentials WHERE user_id = $1`, [userId]);
      await c.query(`DELETE FROM recovery_codes WHERE user_id = $1`, [userId]);
      await c.query(`DELETE FROM role_grants WHERE user_id = $1`, [userId]);
    } finally {
      c.release();
    }
  });

  /** Run the full two-step login on a client, leaving it authenticated. */
  async function fullLogin(client: Client, credentialId: string): Promise<void> {
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/authenticate/verify',
      payload: { response: { id: credentialId } },
    });
    expect(verify.json<{ authenticated: boolean }>().authenticated).toBe(true);
  }

  /** Enroll the first passkey via the out-of-band enrollment token; returns recovery codes. */
  async function enrollFirstPasskey(client: Client): Promise<{ credentialId: string; recoveryCodes: string[] }> {
    // Use a deterministic credential id (the fake's auto-seq is shared across tests).
    if (!fakeWebauthn.nextRegistration) {
      fakeWebauthn.nextRegistration = {
        verified: true,
        credential: { id: `cred-${userId}`, publicKey: Buffer.from(userId).toString('base64url'), counter: 0 },
      };
    }
    const credentialId = fakeWebauthn.nextRegistration.credential!.id;
    const token = service.mintEnrollmentToken(deps, userId);
    const optionsRes = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/register/options',
      payload: { enrollmentToken: token },
    });
    expect(optionsRes.statusCode).toBe(200);
    const verifyRes = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/register/verify',
      payload: { response: { id: 'browser' }, enrollmentToken: token },
    });
    expect(verifyRes.statusCode).toBe(200);
    const body = verifyRes.json<{ verified: boolean; recoveryCodes: string[] }>();
    expect(body.verified).toBe(true);
    return { credentialId, recoveryCodes: body.recoveryCodes };
  }

  it('enrollment ceremony: token-gated first passkey provisions 10 recovery codes', async () => {
    const client = makeClient(app);
    const { recoveryCodes } = await enrollFirstPasskey(client);
    expect(recoveryCodes).toHaveLength(10);
    expect(audit.ofType('passkey.enroll')).toHaveLength(1);
  });

  it('password-only access does NOT grant passkey enrollment (403)', async () => {
    const client = makeClient(app);
    const res = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/register/options',
      payload: {},
    });
    expect(res.statusCode).toBe(403);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('auth.enrollment_denied');
  });

  it('full login: password first factor → passkey second factor → authenticated', async () => {
    const client = makeClient(app);
    const { credentialId } = await enrollFirstPasskey(client);

    const login = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json<{ status: string }>().status).toBe('mfa_required');

    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/authenticate/verify',
      payload: { response: { id: credentialId } },
    });
    expect(verify.statusCode).toBe(200);
    expect(verify.json<{ authenticated: boolean }>().authenticated).toBe(true);
    expect(audit.ofType('passkey.auth')).toHaveLength(1);
    // AC-9: login.success fires for both first-factor and MFA completion.
    expect(audit.ofType('login.success')).toHaveLength(2);
  });

  it('wrong email and wrong password are indistinguishable 401s (no enumeration)', async () => {
    const client = makeClient(app);
    const wrongEmail = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nobody@example.test', password },
    });
    const wrongPw = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'wrong-password' },
    });
    expect(wrongEmail.statusCode).toBe(401);
    expect(wrongPw.statusCode).toBe(401);
    expect(wrongEmail.json<{ error: { code: string } }>().error.code).toBe(
      wrongPw.json<{ error: { code: string } }>().error.code,
    );
    // AC-9: login.failure fires for each wrong-credential attempt.
    expect(audit.ofType('login.failure')).toHaveLength(2);
  });

  it('lockout: N failed password attempts locks the account', async () => {
    const client = makeClient(app);
    for (let i = 0; i < deps.config.lockoutThreshold; i++) {
      await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: 'incorrect-password-for-lockout' } });
    }
    // Even the CORRECT password is now refused (locked).
    const afterLock = await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    expect(afterLock.statusCode).toBe(401);
    expect(audit.ofType('login.lockout').length).toBeGreaterThanOrEqual(1);
  });

  it('recovery code is a valid second factor and is single-use', async () => {
    const client = makeClient(app);
    const { recoveryCodes } = await enrollFirstPasskey(client);
    const code = recoveryCodes[0]!;

    // Login + consume the recovery code → authenticated.
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    const consume = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/recovery/consume',
      payload: { code },
    });
    expect(consume.statusCode).toBe(200);
    expect(consume.json<{ authenticated: boolean }>().authenticated).toBe(true);

    // Re-login + reuse the SAME code → rejected (burned).
    const client2 = makeClient(app);
    await client2.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    const reuse = await client2.inject({
      method: 'POST',
      url: '/api/v1/auth/recovery/consume',
      payload: { code },
    });
    expect(reuse.statusCode).toBe(401);
    // AC-9: recovery_code.consume fires on the successful first use only.
    expect(audit.ofType('recovery_code.consume')).toHaveLength(1);
  });

  it('≤2-device cap: a third passkey enrollment is rejected (409)', async () => {
    const client = makeClient(app);
    // First device via token.
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: 'dev-1', publicKey: 'pk1', counter: 0 } };
    await enrollFirstPasskey(client);

    // Log in (so the session path authorizes further enrollment).
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/authenticate/verify',
      payload: { response: { id: 'dev-1' } },
    });

    // Second device (session path).
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: 'dev-2', publicKey: 'pk2', counter: 0 } };
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: {} });
    const second = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/register/verify',
      payload: { response: { id: 'browser' } },
    });
    expect(second.statusCode).toBe(200);

    // Third device → cap.
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: 'dev-3', publicKey: 'pk3', counter: 0 } };
    const third = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: {} });
    expect(third.statusCode).toBe(409);
    expect(third.json<{ error: { code: string } }>().error.code).toBe('auth.device_cap');
  });

  it('WebAuthn counter regression (cloned authenticator) is rejected', async () => {
    const client = makeClient(app);
    const { credentialId } = await enrollFirstPasskey(client);

    // First auth advances the counter to 5.
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 5 };
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const first = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/authenticate/verify',
      payload: { response: { id: credentialId } },
    });
    expect(first.json<{ authenticated: boolean }>().authenticated).toBe(true);

    // A second auth reporting a NON-increasing counter (3 ≤ 5) → cloned → rejected.
    const client2 = makeClient(app);
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 3 };
    await client2.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client2.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const cloned = await client2.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/authenticate/verify',
      payload: { response: { id: credentialId } },
    });
    expect(cloned.statusCode).toBe(401);
    // AC-9: passkey.auth.failure fires when clone detection rejects the counter.
    expect(audit.ofType('passkey.auth.failure')).toHaveLength(1);
  });

  it('authenticated admin reaches scoped routes; scope 404s non-members; RBAC 403s under-privileged', async () => {
    const client = makeClient(app);
    const { credentialId } = await enrollFirstPasskey(client);
    await fullLogin(client, credentialId);

    const pariwarAuditor = randomUUID();
    const pariwarBlock = randomUUID();
    const c = await td.pool.connect();
    try {
      // pariwar-dimension grant MUST carry scope_value = pariwar_id to be well-formed.
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, 'auditor', 'pariwar', $3)`,
        [userId, pariwarAuditor, pariwarAuditor],
      );
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, 'block_admin', 'block', 'BlockX')`,
        [userId, pariwarBlock],
      );
    } finally {
      c.release();
    }

    // Member → scope resolves → 200 with the actor's grants.
    const who = await client.inject({ method: 'GET', url: `/api/v1/p/${pariwarAuditor}/whoami` });
    expect(who.statusCode).toBe(200);
    expect(who.json<{ grants: { role: string }[] }>().grants[0]?.role).toBe('auditor');

    // Non-member Pariwar → 404 (no enumeration oracle).
    const nonMember = await client.inject({ method: 'GET', url: `/api/v1/p/${randomUUID()}/whoami` });
    expect(nonMember.statusCode).toBe(404);

    // RBAC second guard: auditor HAS audit.verify → 200.
    const allowed = await client.inject({ method: 'GET', url: `/api/v1/p/${pariwarAuditor}/audit/verify-probe` });
    expect(allowed.statusCode).toBe(200);

    // block_admin LACKS audit.verify → 403.
    const denied = await client.inject({ method: 'GET', url: `/api/v1/p/${pariwarBlock}/audit/verify-probe` });
    expect(denied.statusCode).toBe(403);
    expect(audit.ofType('authz.denied').length).toBeGreaterThanOrEqual(1);
    // §2.5 scope-change audit emission fires when scope resolves.
    expect(audit.ofType('scope.change').length).toBeGreaterThanOrEqual(1);
  });

  it('password reset forces WebAuthn re-enrollment + changes the password', async () => {
    const client = makeClient(app);
    const { recoveryCodes } = await enrollFirstPasskey(client);

    // Mint the reset token via the service (delivery is seamed).
    const minted = await service.requestPasswordReset(deps, email);
    expect(minted).not.toBeNull();
    const newPassword = 'EntirelyNewPassword42';
    const consume = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/consume',
      payload: { token: minted!.token, newPassword },
    });
    expect(consume.statusCode).toBe(200);
    expect(consume.json<{ webauthnReenrollmentRequired: boolean }>().webauthnReenrollmentRequired).toBe(true);

    // Old password no longer works; the reset token is single-use (replay rejected).
    const oldPw = await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    expect(oldPw.statusCode).toBe(401);
    const replay = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/consume',
      payload: { token: minted!.token, newPassword: 'another-one-32chars-aaaaaa' },
    });
    expect(replay.statusCode).toBe(403);

    // New password reaches the (passkey-less) MFA stage.
    const newLogin = await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: newPassword } });
    expect(newLogin.statusCode).toBe(200);

    // Old recovery codes must be burned — C-6: deleteRecoveryCodes runs alongside deleteAllCredentials.
    const client3 = makeClient(app);
    await client3.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: newPassword } });
    const oldCodeReuse = await client3.inject({
      method: 'POST',
      url: '/api/v1/auth/recovery/consume',
      payload: { code: recoveryCodes[0]! },
    });
    expect(oldCodeReuse.statusCode).toBe(401);
  });

  it('logout emits login.logout audit and invalidates the session (AC-9)', async () => {
    const client = makeClient(app);
    const { credentialId } = await enrollFirstPasskey(client);
    await fullLogin(client, credentialId);

    const csrfRes = await client.inject({ method: 'GET', url: '/api/v1/auth/csrf' });
    const { csrfToken } = csrfRes.json<{ csrfToken: string }>();

    const logout = await client.inject({ method: 'POST', url: '/api/v1/auth/logout', payload: {}, headers: { 'csrf-token': csrfToken } });
    expect(logout.statusCode).toBe(204);
    expect(audit.ofType('login.logout')).toHaveLength(1);

    // Session is gone — a subsequent guarded route returns 401.
    const nonMember = await client.inject({ method: 'GET', url: `/api/v1/p/${randomUUID()}/whoami` });
    expect(nonMember.statusCode).toBe(401);
  });

  it('WebAuthn counter=0 passthrough: zero-counter authenticators bypass clone detection (C-4)', async () => {
    const client = makeClient(app);
    const { credentialId } = await enrollFirstPasskey(client);

    // Enrolled counter is 0; reporting newCounter=0 is the "authenticator has no counter" case → must pass.
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 0 };
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const zero = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/authenticate/verify',
      payload: { response: { id: credentialId } },
    });
    expect(zero.json<{ authenticated: boolean }>().authenticated).toBe(true);
  });

  it('WebAuthn counter=0 from a non-zero stored counter is a clone signal (C-4)', async () => {
    const client = makeClient(app);
    const { credentialId } = await enrollFirstPasskey(client);

    // First auth advances stored counter to 5.
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 5 };
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/authenticate/verify',
      payload: { response: { id: credentialId } },
    });

    // Stored counter is now 5. A report of newCounter=0 is a regression → clone detected → 401.
    const client2 = makeClient(app);
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 0 };
    await client2.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client2.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const cloned = await client2.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/authenticate/verify',
      payload: { response: { id: credentialId } },
    });
    expect(cloned.statusCode).toBe(401);
  });

  it('setAdminDisplayName rejects an empty/whitespace-only name with a typed error, not a bare Error (Story 6.11 R5)', async () => {
    await expect(service.setAdminDisplayName(deps, userId, '   ')).rejects.toMatchObject({
      name: 'InvalidDisplayNameError',
    });
  });
});
