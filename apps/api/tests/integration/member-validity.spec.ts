// Member-validity + admin member-search endpoints — Story 4.7 (Task 4/7; AC1, D5).
//
// Drives the real Fastify app via fastify.inject for the admin surfaces:
//   · GET  /p/:pariwarId/admin/members/:memberId/validity — a nonexistent member → 404 (memberExists
//     probe; without it getMemberStateAt would fabricate a 200 pending-kyc payload + a phantom audit).
//   · POST /p/:pariwarId/admin/members/search — scope-gated + AUDITED: a `member.search` audit line is
//     written for the actor/Pariwar (D5-A: admin search is audit-logged; it bulk-decrypts identity).
//   · the permission gate: an admin WITHOUT the grant → 403 (member.view_validity, fail-closed).
//
// The member-self redaction + not-audited behaviour is proven at the service layer (Story 4.6
// validity-service.spec.ts) and re-exercised here only via the boundary's caller construction.
//
// ⚠ Own-committing writes (the scope tx commits on 2xx; the audit writer commits its own tx).
// audit_log_entries is append-only and CANNOT be deleted, so assertions key on MEMBERSHIP (actor_id +
// action), never counts, and each test uses a FRESH random pariwarId ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import * as service from '../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from './_setup.js';
import { FakeWebAuthnProvider } from './_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const adminBase = (pariwarId: string): string => `/api/v1/p/${pariwarId}/admin/members`;

describe.skipIf(!hasDatabase)('Member-validity + admin member-search (Story 4.7)', () => {
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

  /** Authenticate a fresh admin (passkey enroll + login). Returns an auth'd client + id. */
  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `mv-${randomUUID()}@example.test`;
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

  /** Grant pariwar_admin (carries member.view_validity — catalog v3) in a Pariwar. */
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

  /** Grant state_trustee (carries member.view_validity but NOT validity.invalidate_cache — catalog v4) in a Pariwar. */
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

  async function readCohortEpoch(pariwarId: string): Promise<number> {
    const c = await td.pool.connect();
    try {
      const res = await c.query<{ epoch: string }>(
        `SELECT epoch::text AS epoch FROM cohort_invalidation_epochs WHERE pariwar_id = $1`,
        [pariwarId],
      );
      return Number(res.rows[0]?.epoch ?? '0');
    } finally {
      c.release();
    }
  }

  async function countAudits(actorId: string, action: string, pariwarId: string): Promise<number> {
    const c = await td.pool.connect();
    try {
      const res = await c.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM audit_log_entries
          WHERE actor_id = $1 AND action = $2 AND pariwar_id = $3`,
        [actorId, action, pariwarId],
      );
      return Number(res.rows[0]?.n ?? '0');
    } finally {
      c.release();
    }
  }

  it('admin validity read of a NONEXISTENT member → 404 (memberExists probe, no phantom payload/audit)', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantPariwarAdmin(userId, pariwarId);

    const res = await client.inject({
      method: 'GET',
      url: `${adminBase(pariwarId)}/${randomUUID()}/validity`,
    });

    expect(res.statusCode).toBe(404);
    expect((res.json() as { error?: { code?: string } }).error?.code).toBe('member.not_found');
    // No phantom `validity.evaluate` audit line was written for the nonexistent member.
    expect(await countAudits(userId, 'validity.evaluate', pariwarId)).toBe(0);
  });

  it('admin member-search is scope-gated + AUDITED (a member.search line per search)', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantPariwarAdmin(userId, pariwarId);

    const res = await client.inject({
      method: 'POST',
      url: `${adminBase(pariwarId)}/search`,
      payload: { by: 'pariwar' },
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray((res.json() as { results?: unknown[] }).results)).toBe(true);
    // D5-A: the search (which bulk-decrypts identity for display) left an audit trail.
    expect(await countAudits(userId, 'member.search', pariwarId)).toBeGreaterThanOrEqual(1);
  });

  it('admin member-search with NO grant in the Pariwar is denied, fail-closed (never 200)', async () => {
    const pariwarId = randomUUID();
    const { client } = await authenticate(); // authenticated, but NOT granted in this Pariwar

    const res = await client.inject({
      method: 'POST',
      url: `${adminBase(pariwarId)}/search`,
      payload: { by: 'pariwar' },
    });

    // Scope-resolution denies an actor with no grant in the Pariwar with a 404 (existence-non-leaking)
    // BEFORE the member.view_validity permission hook runs; a granted-but-under-privileged actor would
    // hit the hook's 403. Either way the surface is fail-closed — never a 200 leak.
    expect(res.statusCode).not.toBe(200);
    expect([403, 404]).toContain(res.statusCode);
  });

  it('admin "invalidate all" (pariwar_admin) bumps the cohort epoch + writes an emergency-invalidation audit line', async () => {
    // pariwar_admin, not state_trustee: the route's permission check runs at `pariwar` scope dimension, and
    // state_trustee's `state` scopeCeiling is structurally narrower — it can never satisfy a pariwar-wide
    // check regardless of grant (see packages/domain/tests/rbac/roles.test.ts).
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantPariwarAdmin(userId, pariwarId);
    const before = await readCohortEpoch(pariwarId);

    const res = await client.inject({
      method: 'POST',
      url: `/api/v1/p/${pariwarId}/admin/validity-cache/invalidate-all`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ invalidated: true, pariwarId });
    expect(await readCohortEpoch(pariwarId)).toBe(before + 1);
    expect(await countAudits(userId, 'validity_cache.invalidate_all', pariwarId)).toBeGreaterThanOrEqual(1);
  });

  it('admin "invalidate all" is denied for a state_trustee that only holds the READ-only member.view_validity grant', async () => {
    // Story 4.8 code-review fix: invalidate-all is gated on validity.invalidate_cache (pariwar_admin-only),
    // NOT member.view_validity — a caller who may merely READ validity must not force a tenant-wide
    // cache invalidation. state_trustee holds member.view_validity but not the new key.
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantStateTrustee(userId, pariwarId);

    const res = await client.inject({
      method: 'POST',
      url: `/api/v1/p/${pariwarId}/admin/validity-cache/invalidate-all`,
    });

    expect(res.statusCode).toBe(403);
  });
});
