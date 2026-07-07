// Trustee degraded-mode declare/revoke/read endpoints — Story 5.8 (Task 5/7; AC4, AC5).
//
// Drives the real Fastify app via fastify.inject for the three surfaces:
//   · POST /p/:pariwarId/admin/degraded-mode/declarations            — declare (AUDITED) + GET active.
//   · POST /p/:pariwarId/admin/degraded-mode/declarations/:id/revoke — manual revocation (AUDITED).
//   · the permission gate: an admin WITHOUT pariwar.declare_degraded_mode → fail-closed (never 200).
//   · an unauthenticated caller → 401 (never a silent declaration write).
//
// ⚠ Own-committing writes (the scope tx commits on 2xx; the audit writer commits its own tx). Assertions
// key on MEMBERSHIP, never counts, and each test uses a FRESH random pariwarId ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import * as service from '../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from './_setup.js';
import { FakeWebAuthnProvider } from './_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const dmBase = (pariwarId: string): string => `/api/v1/p/${pariwarId}/admin/degraded-mode`;

describe.skipIf(!hasDatabase)('Trustee degraded-mode declare/revoke/read (Story 5.8)', () => {
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
    const email = `dm-${randomUUID()}@example.test`;
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

  /** Grant a role in a Pariwar. pariwar_admin carries pariwar.declare_degraded_mode (catalog v6). */
  async function grantRole(userId: string, pariwarId: string, role: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, $3, 'pariwar', $4)`,
        [userId, pariwarId, role, pariwarId],
      );
    } finally {
      c.release();
    }
  }

  async function auditCount(actorId: string, action: string, pariwarId: string): Promise<number> {
    const c = await td.pool.connect();
    try {
      const res = await c.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM audit_log_entries WHERE actor_id = $1 AND action = $2 AND pariwar_id = $3`,
        [actorId, action, pariwarId],
      );
      return Number(res.rows[0]?.n ?? '0');
    } finally {
      c.release();
    }
  }

  it('declare → GET active returns it; revoke → GET active null; both AUDITED', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    // Unprovisioned → active is null.
    const initial = await client.inject({ method: 'GET', url: `${dmBase(pariwarId)}/active` });
    expect(initial.statusCode).toBe(200);
    expect(initial.json()).toMatchObject({ active: null });

    // Declare (effectiveFrom omitted ⇒ now; open-ended).
    const declare = await client.inject({
      method: 'POST',
      url: `${dmBase(pariwarId)}/declarations`,
      payload: { mode: 'cycle_open_sms_bridge', reason: 'push infra down system-wide' },
    });
    expect(declare.statusCode).toBe(200);
    const declared = declare.json() as { id: string; mode: string; revokedAt: string | null };
    expect(declared.mode).toBe('cycle_open_sms_bridge');
    expect(declared.revokedAt).toBeNull();

    // GET active returns the declaration.
    const afterDeclare = await client.inject({ method: 'GET', url: `${dmBase(pariwarId)}/active` });
    expect((afterDeclare.json() as { active: { id: string } | null }).active?.id).toBe(declared.id);
    expect(await auditCount(userId, 'pariwar.degraded_mode.declared', pariwarId)).toBeGreaterThanOrEqual(1);

    // Revoke → active null.
    const revoke = await client.inject({
      method: 'POST',
      url: `${dmBase(pariwarId)}/declarations/${declared.id}/revoke`,
      payload: {},
    });
    expect(revoke.statusCode).toBe(200);
    expect(revoke.json()).toMatchObject({ active: null });
    const afterRevoke = await client.inject({ method: 'GET', url: `${dmBase(pariwarId)}/active` });
    expect(afterRevoke.json()).toMatchObject({ active: null });
    expect(await auditCount(userId, 'pariwar.degraded_mode.revoked', pariwarId)).toBeGreaterThanOrEqual(1);
  });

  it('revoking an already-revoked declaration is a no-op and writes NO additional audit line (Review Finding)', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const declare = await client.inject({
      method: 'POST',
      url: `${dmBase(pariwarId)}/declarations`,
      payload: { mode: 'cycle_open_sms_bridge', reason: 'push infra down' },
    });
    const declared = declare.json() as { id: string };

    const firstRevoke = await client.inject({
      method: 'POST',
      url: `${dmBase(pariwarId)}/declarations/${declared.id}/revoke`,
      payload: {},
    });
    expect(firstRevoke.statusCode).toBe(200);
    const auditAfterFirst = await auditCount(userId, 'pariwar.degraded_mode.revoked', pariwarId);
    expect(auditAfterFirst).toBeGreaterThanOrEqual(1);

    // A second revoke of the SAME (already-revoked) declaration is a true no-op — it must not write another
    // audit line claiming a revocation happened (Review Finding: revoke previously audited unconditionally).
    const secondRevoke = await client.inject({
      method: 'POST',
      url: `${dmBase(pariwarId)}/declarations/${declared.id}/revoke`,
      payload: {},
    });
    expect(secondRevoke.statusCode).toBe(200);
    expect(await auditCount(userId, 'pariwar.degraded_mode.revoked', pariwarId)).toBe(auditAfterFirst);
  });

  it('rejects a backdated effectiveFrom with 400 (NO BACKDATING)', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const res = await client.inject({
      method: 'POST',
      url: `${dmBase(pariwarId)}/declarations`,
      payload: { mode: 'cycle_open_sms_bridge', effectiveFrom: past, reason: 'r' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('fail-closed: an admin WITHOUT pariwar.declare_degraded_mode cannot declare (never 200)', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'auditor'); // granted in the Pariwar, but lacks the declare key

    const res = await client.inject({
      method: 'POST',
      url: `${dmBase(pariwarId)}/declarations`,
      payload: { mode: 'cycle_open_sms_bridge', reason: 'r' },
    });
    expect(res.statusCode).not.toBe(200);
    expect([403, 404]).toContain(res.statusCode);
    expect(await auditCount(userId, 'pariwar.degraded_mode.declared', pariwarId)).toBe(0);
  });

  it('fail-closed: an unauthenticated caller → 401 (never a silent declaration write)', async () => {
    const pariwarId = randomUUID();
    const client = makeClient(app); // no session
    const res = await client.inject({
      method: 'POST',
      url: `${dmBase(pariwarId)}/declarations`,
      payload: { mode: 'cycle_open_sms_bridge', reason: 'r' },
    });
    expect([401, 403]).toContain(res.statusCode);
  });
});
