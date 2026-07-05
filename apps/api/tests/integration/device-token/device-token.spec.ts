// Device-token registration E2E (live DB :5433) — Story 5.2 (Task 7; AC3, AC7).
//
// Drives the member AND admin registration surfaces through `app.inject`:
//   · register → 200 { status: 'registered', platform }; ONE encrypted row (raw token NEVER at rest);
//     the audit line's request_payload_hash is the 64-hex blind-index HMAC (never the raw token, AC7(c)).
//   · app-open rebuild (AC3) — registering a NEW android token marks the prior android token stale.
//   · fail-closed (AI-4-3(b)) — no member/admin session ⇒ 401, never a silent register.
//
// Member creation mirrors the nominee spec (seed via projectMemberState + a member session token). Admin
// auth mirrors pariwar-provisioning.spec.ts (fake WebAuthn passkey enroll + login + authenticate, no
// additional role_grant needed — AC7(e): the admin endpoint has no RBAC scope, just the bearer guard).

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import type { SendResult, SendTarget } from '@twt/channels';

import * as adminAuthService from '../../../src/modules/auth/admin/admin-auth.service.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { invalidatePushTokenOnFailure } from '../../../src/modules/device-token/index.js';
import { createTestApp, hasDatabase, makeClient, teardown, type TestApp } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

function token(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
}

/** Seed a member in `pending-fee` (committed) so the FK + the request handler's own scope tx both see it.
 * `pariwarId` is overridable so two members can be seeded in the SAME Pariwar (cross-principal tests). */
async function seedMember(t: TestApp, pariwarId: string = randomUUID()): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid,
      pariwarId: pid,
      eventType: 'member.signup_initiated',
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
      actorId: memberId,
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid,
      pariwarId: pid,
      eventType: 'member.kyc_manual_fallback',
      payload: { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'manual_fallback' },
      actorId: memberId,
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { memberId, pariwarId };
}

async function inject(
  t: TestApp,
  url: string,
  opts: { payload?: Json; token?: string } = {},
): Promise<{ status: number; body: Json }> {
  const res = await t.app.inject({
    method: 'POST',
    url,
    payload: opts.payload,
    headers: {
      origin: 'http://localhost:3001',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body };
}

describe.skipIf(!hasDatabase)('Device-token registration — E2E (:5433)', () => {
  it('AC3/AC7: register → encrypted row + audit HMAC (never raw token); no session ⇒ 401', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const rawToken = `fcm-tok-${randomUUID()}`;

      // Fail-closed: no session ⇒ 401, never a silent register.
      const unauth = await inject(t, '/api/v1/member/device-tokens', {
        payload: { platform: 'android', token: rawToken },
      });
      expect(unauth.status).toBe(401);

      // Register with a member session.
      const res = await inject(t, '/api/v1/member/device-tokens', {
        payload: { platform: 'android', token: rawToken },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'registered', platform: 'android' });

      // ONE row for this member, encrypted (raw token NEVER at rest).
      const rows = await t.pool.query<{ token_ciphertext: string; token_blind_index: string; status: string }>(
        `SELECT token_ciphertext, token_blind_index, status FROM member_device_tokens WHERE principal_id = $1`,
        [memberId],
      );
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]!.token_ciphertext).not.toContain(rawToken);
      expect(rows.rows[0]!.status).toBe('active');
      const blindIndex = rows.rows[0]!.token_blind_index;
      expect(blindIndex).toMatch(/^[0-9a-f]{64}$/);

      // Audit line: HMAC blind index as the hash, NEVER the raw token (AC7(c)).
      const audit = await t.pool.query<{ action: string; request_payload_hash: string; resource_locator: string }>(
        `SELECT action, request_payload_hash, resource_locator FROM audit_log_entries
           WHERE actor_id = $1 AND action = 'member.device_token_register' ORDER BY seq DESC LIMIT 1`,
        [memberId],
      );
      expect(audit.rows).toHaveLength(1);
      expect(audit.rows[0]!.request_payload_hash).toBe(blindIndex); // HMAC, not raw token
      expect(audit.rows[0]!.request_payload_hash).not.toContain(rawToken);
      expect(audit.rows[0]!.resource_locator).not.toContain(rawToken);
      expect(audit.rows[0]!.resource_locator).toContain('platform=android');
    } finally {
      await teardown(t);
    }
  });

  it('AC3: app-open rebuild — a NEW android token marks the prior android token stale', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const jwt = token(t, memberId, pariwarId);

      await inject(t, '/api/v1/member/device-tokens', { payload: { platform: 'android', token: `old-${randomUUID()}` }, token: jwt });
      await inject(t, '/api/v1/member/device-tokens', { payload: { platform: 'android', token: `new-${randomUUID()}` }, token: jwt });

      const rows = await t.pool.query<{ status: string }>(
        `SELECT status FROM member_device_tokens WHERE principal_id = $1 ORDER BY status`,
        [memberId],
      );
      expect(rows.rows.map((r) => r.status).sort()).toEqual(['active', 'stale']);
    } finally {
      await teardown(t);
    }
  });

  it('AC5: invalidation seam marks the token invalid ONLY on an unrecoverable rejection', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const rawToken = `fcm-tok-${randomUUID()}`;
      await inject(t, '/api/v1/member/device-tokens', {
        payload: { platform: 'android', token: rawToken },
        token: token(t, memberId, pariwarId),
      });

      const transient: SendResult = { channel: 'push', provider: 'fcm', status: 'rejected', providerMessageId: null, detail: 'transient:messaging/internal-error' };
      const unrecoverable: SendResult = { channel: 'push', provider: 'fcm', status: 'rejected', providerMessageId: null, detail: 'unrecoverable_token:messaging/registration-token-not-registered' };
      const target: SendTarget = {
        channel: 'push',
        address: rawToken,
        platform: 'android',
        principalType: 'member',
        principalId: memberId,
      };

      // A transient rejection keeps the token active.
      expect(await invalidatePushTokenOnFailure(t.deps, pariwarId, target, transient)).toBe('kept');
      let row = await t.pool.query<{ status: string }>(`SELECT status FROM member_device_tokens WHERE principal_id = $1`, [memberId]);
      expect(row.rows[0]!.status).toBe('active');

      // An unrecoverable token rejection invalidates it.
      expect(await invalidatePushTokenOnFailure(t.deps, pariwarId, target, unrecoverable)).toBe('invalidated');
      row = await t.pool.query<{ status: string }>(`SELECT status FROM member_device_tokens WHERE principal_id = $1`, [memberId]);
      expect(row.rows[0]!.status).toBe('invalid');

      // The invalidation itself emits an isolated audit line (AC7 — never the raw token).
      const invalidationAudit = await t.pool.query<{ request_payload_hash: string; resource_locator: string }>(
        `SELECT request_payload_hash, resource_locator FROM audit_log_entries
           WHERE action = 'device_token.invalidated' ORDER BY seq DESC LIMIT 1`,
      );
      expect(invalidationAudit.rows).toHaveLength(1);
      expect(invalidationAudit.rows[0]!.request_payload_hash).not.toContain(rawToken);
      expect(invalidationAudit.rows[0]!.resource_locator).not.toContain(rawToken);
    } finally {
      await teardown(t);
    }
  });

  it('AC5 (code-review fix): invalidating one principal\'s token does NOT invalidate a DIFFERENT principal\'s identical raw token in the SAME Pariwar', async () => {
    const t = await createTestApp();
    try {
      const pariwarId = randomUUID();
      const { memberId: memberA } = await seedMember(t, pariwarId);
      const { memberId: memberB } = await seedMember(t, pariwarId);
      // Two DIFFERENT principals register the IDENTICAL raw token — same blind index, but different rows
      // (the unique key includes principal_id). Before the fix, invalidating A's row by blind-index alone
      // would have also invalidated B's row.
      const sharedRawToken = `shared-tok-${randomUUID()}`;
      await inject(t, '/api/v1/member/device-tokens', {
        payload: { platform: 'android', token: sharedRawToken },
        token: token(t, memberA, pariwarId),
      });
      await inject(t, '/api/v1/member/device-tokens', {
        payload: { platform: 'android', token: sharedRawToken },
        token: token(t, memberB, pariwarId),
      });

      const unrecoverable: SendResult = {
        channel: 'push',
        provider: 'fcm',
        status: 'rejected',
        providerMessageId: null,
        detail: 'unrecoverable_token:messaging/registration-token-not-registered',
      };
      const targetA: SendTarget = {
        channel: 'push',
        address: sharedRawToken,
        platform: 'android',
        principalType: 'member',
        principalId: memberA,
      };
      expect(await invalidatePushTokenOnFailure(t.deps, pariwarId, targetA, unrecoverable)).toBe('invalidated');

      const rowA = await t.pool.query<{ status: string }>(
        `SELECT status FROM member_device_tokens WHERE principal_id = $1`,
        [memberA],
      );
      const rowB = await t.pool.query<{ status: string }>(
        `SELECT status FROM member_device_tokens WHERE principal_id = $1`,
        [memberB],
      );
      expect(rowA.rows[0]!.status).toBe('invalid');
      expect(rowB.rows[0]!.status).toBe('active'); // NOT collaterally invalidated
    } finally {
      await teardown(t);
    }
  });
});

describe.skipIf(!hasDatabase)('Device-token registration — admin endpoint E2E (:5433)', () => {
  /** Create an admin, enroll a passkey, log in fully — returns an authenticated client + userId. Mirrors
   * pariwar-provisioning.spec.ts's `authenticate()`. No role_grant needed (AC7(e) — bearer gate only). */
  async function authenticateAdmin(
    t: TestApp,
    fakeWebauthn: FakeWebAuthnProvider,
  ): Promise<{ client: Client; userId: string }> {
    const email = `admin-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await adminAuthService.createAdminAccount(t.deps, { email, password });

    const client = makeClient(t.app);
    fakeWebauthn.nextRegistration = {
      verified: true,
      credential: { id: `cred-${userId}`, publicKey: Buffer.from(userId).toString('base64url'), counter: 0 },
    };
    const credentialId = fakeWebauthn.nextRegistration.credential!.id;
    const enrollToken = adminAuthService.mintEnrollmentToken(t.deps, userId);
    await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/register/options',
      payload: { enrollmentToken: enrollToken },
    });
    await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/register/verify',
      payload: { response: { id: 'browser' }, enrollmentToken: enrollToken },
    });

    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/authenticate/verify',
      payload: { response: { id: credentialId } },
    });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function cleanupAdmin(t: TestApp, userId: string): Promise<void> {
    await t.pool.query(`DELETE FROM member_device_tokens WHERE principal_id = $1`, [userId]);
    await t.pool.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = $1`, [userId]);
    await t.pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  }

  it('AC7(a)/(b): fail-closed — no admin session ⇒ 401, never a silent register', async () => {
    const t = await createTestApp({ webauthn: new FakeWebAuthnProvider() });
    try {
      const anon = makeClient(t.app);
      const res = await anon.inject({
        method: 'POST',
        url: '/api/v1/admin/device-tokens',
        payload: { platform: 'ios', token: `apns-tok-${randomUUID()}` },
      });
      expect(res.statusCode).toBe(401);
    } finally {
      await teardown(t);
    }
  });

  it('AC3/AC7: admin register → encrypted row keyed on the admin-global namespace + audit HMAC (never raw token)', async () => {
    const fakeWebauthn = new FakeWebAuthnProvider();
    const t = await createTestApp({ webauthn: fakeWebauthn });
    let userId: string | undefined;
    try {
      const auth = await authenticateAdmin(t, fakeWebauthn);
      userId = auth.userId;
      const rawToken = `apns-tok-${randomUUID()}`;

      const res = await auth.client.inject({
        method: 'POST',
        url: '/api/v1/admin/device-tokens',
        payload: { platform: 'ios', token: rawToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: 'registered', platform: 'ios' });

      const rows = await t.pool.query<{ token_ciphertext: string; principal_type: string; status: string }>(
        `SELECT token_ciphertext, principal_type, status FROM member_device_tokens WHERE principal_id = $1`,
        [userId],
      );
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]!.principal_type).toBe('admin');
      expect(rows.rows[0]!.token_ciphertext).not.toContain(rawToken);
      expect(rows.rows[0]!.status).toBe('active');

      const audit = await t.pool.query<{ request_payload_hash: string; resource_locator: string }>(
        `SELECT request_payload_hash, resource_locator FROM audit_log_entries
           WHERE actor_id = $1 AND action = 'admin.device_token_register' ORDER BY seq DESC LIMIT 1`,
        [userId],
      );
      expect(audit.rows).toHaveLength(1);
      expect(audit.rows[0]!.request_payload_hash).not.toContain(rawToken);
      expect(audit.rows[0]!.resource_locator).toContain('platform=ios');
    } finally {
      if (userId) await cleanupAdmin(t, userId);
      await teardown(t);
    }
  });

  it('AC3: admin app-open rebuild — a NEW ios token marks the prior ios token stale', async () => {
    const fakeWebauthn = new FakeWebAuthnProvider();
    const t = await createTestApp({ webauthn: fakeWebauthn });
    let userId: string | undefined;
    try {
      const auth = await authenticateAdmin(t, fakeWebauthn);
      userId = auth.userId;

      await auth.client.inject({
        method: 'POST',
        url: '/api/v1/admin/device-tokens',
        payload: { platform: 'ios', token: `old-${randomUUID()}` },
      });
      await auth.client.inject({
        method: 'POST',
        url: '/api/v1/admin/device-tokens',
        payload: { platform: 'ios', token: `new-${randomUUID()}` },
      });

      const rows = await t.pool.query<{ status: string }>(
        `SELECT status FROM member_device_tokens WHERE principal_id = $1 ORDER BY status`,
        [userId],
      );
      expect(rows.rows.map((r) => r.status).sort()).toEqual(['active', 'stale']);
    } finally {
      if (userId) await cleanupAdmin(t, userId);
      await teardown(t);
    }
  });
});
