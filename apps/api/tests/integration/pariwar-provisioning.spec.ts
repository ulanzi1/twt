// Multi-Pariwar provisioning endpoints — Story 1.15 (AC-1, AC-7, AC-8).
//
// Drives the real Fastify app via fastify.inject with a fake WebAuthn provider to
// reach an authenticated admin session, then exercises the THREE provisioning
// endpoints + the global pariwar.provision gate:
//   - POST /api/v1/provisioning/pariwars                       (provision — self-scoped write)
//   - POST /api/v1/provisioning/pariwars/:pariwarId/deploy     (trigger the deploy seam)
//   - GET  /api/v1/provisioning/pariwars                       (provisioning-status view)
//
// AC-7 in-story proof: Add-Pariwar → provision → trigger → status reflects the new
// Pariwar + its /p/<id>/ path-scope, against the dev/FAKE DeployTrigger.
// AC-8 matrix: super_admin allowed; a pariwar-scoped-only admin denied 403; unauth 401.
//
// ⚠ pariwar_passport rows are own-committing writes that accumulate; assertions key
// on MEMBERSHIP of OUR minted ids, never absolute counts (live-DB gotcha
// [[project_live_db_test_gotchas]]). role_grants + provisioned passports we create
// are cleaned up via the superuser test pool in afterAll.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import * as service from '../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from './_setup.js';
import { FakeWebAuthnProvider } from './_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

interface ProvisionedPariwarShape {
  passport: { pariwarId: string; displayNameEn: string; localeDefault: string };
  pathScope: string;
  latestDeploy: { deployId: string; status: string } | null;
}

const VALID_BODY = {
  displayNameEn: 'Provision Test Trust',
  displayNameHi: 'प्रोविज़न टेस्ट ट्रस्ट',
  legalName: 'Provision Test Welfare Trust',
  trustRegistrationId: 'PT/2026/0001',
  localeDefault: 'hi' as const,
  brandingBundle: {
    logo_url: 'https://cdn.twt.local/pt/logo.png',
    primary_color: '#0A3D62',
    secondary_color: '#FFFFFF',
  },
};

describe.skipIf(!hasDatabase)('pariwar-provisioning endpoints (Story 1.15)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const provisionedPariwarIds: string[] = [];

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
      if (provisionedPariwarIds.length > 0) {
        await c.query(`DELETE FROM pariwar_passport WHERE pariwar_id = ANY($1)`, [provisionedPariwarIds]);
      }
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

  /** Create an admin, enroll a passkey, log in fully — returns an authenticated client + userId. */
  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `admin-${randomUUID()}@example.test`;
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
    const verify = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/authenticate/verify',
      payload: { response: { id: credentialId } },
    });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  /** Grant the user global `super_admin` (carries `pariwar.provision` at the global ceiling). */
  async function grantGlobalSuperAdmin(userId: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, 'super_admin', 'global', NULL)`,
        [userId, randomUUID()],
      );
    } finally {
      c.release();
    }
  }

  /** Grant the user a Pariwar-scoped-only admin (does NOT carry pariwar.provision at global). */
  async function grantPariwarAdmin(userId: string, pariwarId: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      // $3 (not a reused $2) — pg deduces inconsistent types for a reused param
      // (uuid vs text); the documented scope-tx.spec.ts landmine.
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, 'pariwar_admin', 'pariwar', $3)`,
        [userId, pariwarId, pariwarId],
      );
    } finally {
      c.release();
    }
  }

  async function provision(client: Client): Promise<ProvisionedPariwarShape> {
    const res = await client.inject({ method: 'POST', url: '/api/v1/provisioning/pariwars', payload: VALID_BODY });
    expect(res.statusCode).toBe(200);
    const body = res.json<ProvisionedPariwarShape>();
    provisionedPariwarIds.push(body.passport.pariwarId);
    return body;
  }

  beforeEach(() => {
    fakeWebauthn.nextRegistration = undefined;
  });

  // ── AC-1 + AC-7: provision → status → trigger (dev/fake substrate) ──────────
  it('super_admin provisions a new Pariwar: mints id, persists passport, derives /p/<id>/', async () => {
    const { client, userId } = await authenticate();
    await grantGlobalSuperAdmin(userId);

    const body = await provision(client);
    expect(body.passport.pariwarId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.passport.displayNameEn).toBe(VALID_BODY.displayNameEn);
    expect(body.pathScope).toBe(`/p/${body.passport.pariwarId}/`);
    expect(body.latestDeploy).toBeNull(); // no deploy triggered yet

    // The provisioning audit event fired with the new id.
    const provisioned = td.auditSink.ofType('pariwar.provisioned');
    expect(provisioned.some((e) => e.pariwarId === body.passport.pariwarId)).toBe(true);
  });

  it('the status view reflects the newly provisioned Pariwar (membership, not count)', async () => {
    const { client, userId } = await authenticate();
    await grantGlobalSuperAdmin(userId);
    const body = await provision(client);

    const res = await client.inject({ method: 'GET', url: '/api/v1/provisioning/pariwars?limit=100' });
    expect(res.statusCode).toBe(200);
    const list = res.json<ProvisionedPariwarShape[]>();
    const found = list.find((p) => p.passport.pariwarId === body.passport.pariwarId);
    expect(found).toBeDefined();
    expect(found!.pathScope).toBe(`/p/${body.passport.pariwarId}/`);
  });

  it('AC-7 in-story proof: provision → trigger build → status reflects the deploy', async () => {
    const { client, userId } = await authenticate();
    await grantGlobalSuperAdmin(userId);
    const body = await provision(client);
    const pid = body.passport.pariwarId;

    const deployRes = await client.inject({ method: 'POST', url: `/api/v1/provisioning/pariwars/${pid}/deploy`, payload: {} });
    expect(deployRes.statusCode).toBe(200);
    const deploy = deployRes.json<{ pariwarId: string; pathScope: string; deploy: { status: string; deployId: string } }>();
    expect(deploy.pariwarId).toBe(pid);
    expect(deploy.pathScope).toBe(`/p/${pid}/`);
    expect(deploy.deploy.status).toBe('triggered');

    // The deploy-triggered audit event fired.
    expect(td.auditSink.ofType('pariwar.deploy_triggered').some((e) => e.pariwarId === pid)).toBe(true);

    // The status view now carries the latest deploy for this Pariwar.
    const listRes = await client.inject({ method: 'GET', url: '/api/v1/provisioning/pariwars?limit=100' });
    const found = listRes.json<ProvisionedPariwarShape[]>().find((p) => p.passport.pariwarId === pid);
    expect(found?.latestDeploy?.status).toBe('triggered');
    expect(found?.latestDeploy?.deployId).toBe(deploy.deploy.deployId);
  });

  it('deploy on a non-existent Pariwar 404s (not a 500)', async () => {
    const { client, userId } = await authenticate();
    await grantGlobalSuperAdmin(userId);
    const res = await client.inject({ method: 'POST', url: `/api/v1/provisioning/pariwars/${randomUUID()}/deploy`, payload: {} });
    expect(res.statusCode).toBe(404);
  });

  it('two provisions mint DISTINCT ids — the self-scoped write only writes its own new id', async () => {
    const { client, userId } = await authenticate();
    await grantGlobalSuperAdmin(userId);
    const a = await provision(client);
    const b = await provision(client);
    expect(a.passport.pariwarId).not.toBe(b.passport.pariwarId);
  });

  // ── AC-8: the global pariwar.provision gate (allow/deny matrix) ─────────────
  it('unauthenticated requests are 401 on all three endpoints', async () => {
    const anon = makeClient(app);
    expect((await anon.inject({ method: 'POST', url: '/api/v1/provisioning/pariwars', payload: VALID_BODY })).statusCode).toBe(401);
    expect((await anon.inject({ method: 'GET', url: '/api/v1/provisioning/pariwars' })).statusCode).toBe(401);
    expect((await anon.inject({ method: 'POST', url: `/api/v1/provisioning/pariwars/${randomUUID()}/deploy`, payload: {} })).statusCode).toBe(401);
  });

  it('an authenticated admin WITHOUT pariwar.provision is FORBIDDEN (403)', async () => {
    const { client } = await authenticate(); // no grant
    expect((await client.inject({ method: 'POST', url: '/api/v1/provisioning/pariwars', payload: VALID_BODY })).statusCode).toBe(403);
    expect((await client.inject({ method: 'GET', url: '/api/v1/provisioning/pariwars' })).statusCode).toBe(403);
    expect((await client.inject({ method: 'POST', url: `/api/v1/provisioning/pariwars/${randomUUID()}/deploy`, payload: {} })).statusCode).toBe(403);
  });

  it('a Pariwar-scoped-only admin CANNOT provision (403) — global gate + cross-tenant write isolation', async () => {
    const { client, userId } = await authenticate();
    await grantPariwarAdmin(userId, randomUUID());
    const res = await client.inject({ method: 'POST', url: '/api/v1/provisioning/pariwars', payload: VALID_BODY });
    expect(res.statusCode).toBe(403);
  });

  it('rejects an invalid Add-Pariwar payload (400) — non-hex colour', async () => {
    const { client, userId } = await authenticate();
    await grantGlobalSuperAdmin(userId);
    const res = await client.inject({
      method: 'POST',
      url: '/api/v1/provisioning/pariwars',
      payload: { ...VALID_BODY, brandingBundle: { ...VALID_BODY.brandingBundle, primary_color: 'navy' } },
    });
    expect(res.statusCode).toBe(400);
  });
});
