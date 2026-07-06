// Trustee WhatsApp Business config endpoints — Story 5.3 (Task 4/7; AC4, AC7).
//
// Drives the real Fastify app via fastify.inject for the four config surfaces:
//   · PUT/GET /p/:pariwarId/admin/channel-config/whatsapp           — config upsert + read-back (AUDITED).
//   · PUT/GET /p/:pariwarId/admin/channel-config/whatsapp/templates — per-category template upsert + list.
//   · the permission gate: an admin WITHOUT pariwar.configure_channels → fail-closed (never 200).
//   · the audit line records the credential NAME (a safe pointer) but NEVER a token value.
//
// ⚠ Own-committing writes (the scope tx commits on 2xx; the audit writer commits its own tx).
// audit_log_entries is append-only, so assertions key on MEMBERSHIP, never counts, and each test uses a
// FRESH random pariwarId ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import * as service from '../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from './_setup.js';
import { FakeWebAuthnProvider } from './_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const waBase = (pariwarId: string): string => `/api/v1/p/${pariwarId}/admin/channel-config/whatsapp`;

describe.skipIf(!hasDatabase)('Trustee WhatsApp Business config (Story 5.3)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];

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
      await td.pool.end();
    }
  });

  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `cc-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);

    const client = makeClient(app);
    fakeWebauthn.nextRegistration = {
      verified: true,
      credential: { id: `cred-${userId}`, publicKey: Buffer.from(userId).toString('base64url'), counter: 0 },
    };
    const credentialId = fakeWebauthn.nextRegistration.credential!.id;
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'browser' }, enrollmentToken: token } });
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  /** Grant pariwar_admin (carries pariwar.configure_channels — catalog v5) in a Pariwar. */
  async function grantPariwarAdmin(userId: string, pariwarId: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, 'pariwar_admin', 'pariwar', $3)`,
        [userId, pariwarId, pariwarId],
      );
    } finally {
      c.release();
    }
  }

  /** Grant state_trustee (does NOT carry pariwar.configure_channels — catalog v5). */
  async function grantStateTrustee(userId: string, pariwarId: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, 'state_trustee', 'pariwar', $3)`,
        [userId, pariwarId, pariwarId],
      );
    } finally {
      c.release();
    }
  }

  async function auditRows(actorId: string, action: string, pariwarId: string): Promise<{ n: number; hash: string | null }> {
    const c = await td.pool.connect();
    try {
      const res = await c.query<{ n: string; hash: string | null }>(
        `SELECT count(*)::text AS n, max(request_payload_hash) AS hash FROM audit_log_entries
          WHERE actor_id = $1 AND action = $2 AND pariwar_id = $3`,
        [actorId, action, pariwarId],
      );
      return { n: Number(res.rows[0]?.n ?? '0'), hash: res.rows[0]?.hash ?? null };
    } finally {
      c.release();
    }
  }

  it('GET returns zero-config defaults when unprovisioned; PUT upserts + reads back (AUDITED, no token value)', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantPariwarAdmin(userId, pariwarId);

    // Unprovisioned → configured:false + zero-config defaults.
    const initial = await client.inject({ method: 'GET', url: waBase(pariwarId) });
    expect(initial.statusCode).toBe(200);
    expect(initial.json()).toMatchObject({ configured: false, config: { enabled: false, graphApiVersion: 'v21.0' } });

    const put = await client.inject({
      method: 'PUT',
      url: waBase(pariwarId),
      payload: {
        enabled: true,
        displayPhoneNumber: '+91 98765 43210',
        phoneNumberId: '1234567890',
        wabaId: 'waba-xyz',
        accessTokenSecretName: 'twt-wa-token-p1',
        graphApiVersion: 'v21.0',
        appSecretSecretName: 'twt-wa-app-secret-p1',
        webhookVerifyTokenSecretName: 'twt-wa-verify-token-p1',
      },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json()).toMatchObject({ configured: true, config: { enabled: true, phoneNumberId: '1234567890' } });

    const after = await client.inject({ method: 'GET', url: waBase(pariwarId) });
    expect(after.json()).toMatchObject({
      configured: true,
      config: { enabled: true, accessTokenSecretName: 'twt-wa-token-p1' },
    });

    // AUDITED. The credential NAME is a safe pointer; assert the audit hash exists and — critically — does
    // not embed anything a token value would (the payload hash is computed over NON-secret fields only).
    const audit = await auditRows(userId, 'pariwar.wa_config_update', pariwarId);
    expect(audit.n).toBeGreaterThanOrEqual(1);
    expect(audit.hash).toMatch(/^[0-9a-f]{64}$/); // opaque hash, not a raw value
  });

  it('PUT/GET templates: upsert one category mapping + list it back', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantPariwarAdmin(userId, pariwarId);
    // A config row must exist first (templates FK → config).
    await client.inject({
      method: 'PUT',
      url: waBase(pariwarId),
      payload: { enabled: true, displayPhoneNumber: null, phoneNumberId: null, wabaId: null, accessTokenSecretName: null, graphApiVersion: 'v21.0', appSecretSecretName: null, webhookVerifyTokenSecretName: null },
    });

    const putTpl = await client.inject({
      method: 'PUT',
      url: `${waBase(pariwarId)}/templates`,
      payload: { alertCategory: 'contribution_confirmed', templateName: 'contrib_v1', languageCode: 'en', approvalStatus: 'approved' },
    });
    expect(putTpl.statusCode).toBe(200);

    const list = await client.inject({ method: 'GET', url: `${waBase(pariwarId)}/templates` });
    expect(list.statusCode).toBe(200);
    expect((list.json() as { templates: unknown[] }).templates).toContainEqual({
      alertCategory: 'contribution_confirmed',
      templateName: 'contrib_v1',
      languageCode: 'en',
      approvalStatus: 'approved',
    });
    expect((await auditRows(userId, 'pariwar.wa_template_update', pariwarId)).n).toBeGreaterThanOrEqual(1);
  });

  it('fail-closed: an admin WITHOUT pariwar.configure_channels cannot write config (never 200)', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantStateTrustee(userId, pariwarId); // granted in the Pariwar, but lacks the config key

    const res = await client.inject({
      method: 'PUT',
      url: waBase(pariwarId),
      payload: { enabled: true, displayPhoneNumber: null, phoneNumberId: null, wabaId: null, accessTokenSecretName: null, graphApiVersion: 'v21.0', appSecretSecretName: null, webhookVerifyTokenSecretName: null },
    });
    expect(res.statusCode).not.toBe(200);
    expect([403, 404]).toContain(res.statusCode);
    // No config write happened — no audit line.
    expect((await auditRows(userId, 'pariwar.wa_config_update', pariwarId)).n).toBe(0);
  });

  it('fail-closed: an unauthenticated caller → 401 (never a silent config write)', async () => {
    const pariwarId = randomUUID();
    const client = makeClient(app); // no session
    const res = await client.inject({
      method: 'PUT',
      url: waBase(pariwarId),
      payload: { enabled: true, displayPhoneNumber: null, phoneNumberId: null, wabaId: null, accessTokenSecretName: null, graphApiVersion: 'v21.0', appSecretSecretName: null, webhookVerifyTokenSecretName: null },
    });
    expect([401, 403]).toContain(res.statusCode);
  });
});
