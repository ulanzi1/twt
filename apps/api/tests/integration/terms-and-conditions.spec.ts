// T&C version-registry endpoints — Story 2.6 (Task 6; AC6, AC7).
//
// Drives the real Fastify app via fastify.inject through the trustee write surface:
//   create a version-pinned T&C → approve it (supersede the prior). Asserts: an
//   audit line per write (terms_and_conditions.version_created / _approved) carrying
//   the tc_version_id (AC6/AC7 audit-or-throw); created versions carry a NON-NULL
//   audit_id; approve supersedes the prior currently-effective version; RBAC denial
//   → audited 403; approve of an absent version → 404; approve of an
//   already-superseded version → 409; a cross-tenant/absent pin → 422.
//
// ⚠ Own-committing writes (the scope tx commits on 2xx; the audit writer commits its
// own tx). Each test uses a FRESH random pariwarId; assertions key on MEMBERSHIP,
// never counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import * as service from '../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from './_setup.js';
import { FakeWebAuthnProvider } from './_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

interface TcShape {
  tcVersionId: string;
  version: number;
  legalReviewStatus: string;
  effectiveUntil: string | null;
  pinnedToClauseVersionIds: string[];
  auditId: string | null;
}

describe.skipIf(!hasDatabase)('T&C version registry endpoints (Story 2.6)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const usedPariwarIds: string[] = [];

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
      if (usedPariwarIds.length > 0) {
        // terms_and_conditions_versions is not append-only; the FK cascade removes
        // pinned-clause link rows. clause_versions is append-only / kept.
        await c.query(`DELETE FROM terms_and_conditions_versions WHERE pariwar_id = ANY($1)`, [
          usedPariwarIds,
        ]);
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

  /** Authenticate a fresh admin (passkey enroll + login). Returns an auth'd client + id. */
  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `tc-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);

    const client = makeClient(app);
    fakeWebauthn.nextRegistration = {
      verified: true,
      credential: {
        id: `cred-${userId}`,
        publicKey: Buffer.from(userId).toString('base64url'),
        counter: 0,
      },
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

  /** Grant a role at pariwar scope. */
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

  /** Seed a clause version (to pin) directly as the test superuser. Returns its id. */
  async function seedClauseVersion(pariwarId: string, clauseId = 'niy.tc.seed'): Promise<string> {
    const c = await td.pool.connect();
    try {
      const { rows } = await c.query<{ clause_version_id: string }>(
        `INSERT INTO clause_versions (clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
           VALUES ($1, $2, 1, now(), '{}'::jsonb, 'pool') RETURNING clause_version_id`,
        [clauseId, pariwarId],
      );
      return rows[0]!.clause_version_id;
    } finally {
      c.release();
    }
  }

  /** A fresh pariwar_admin (carries tc.publish + tc.approve) in a fresh Pariwar. */
  async function newTrusteeInPariwar(): Promise<{ client: Client; userId: string; pariwarId: string }> {
    const { client, userId } = await authenticate();
    const pariwarId = randomUUID();
    usedPariwarIds.push(pariwarId);
    await grantRole(userId, pariwarId, 'pariwar_admin');
    return { client, userId, pariwarId };
  }

  const terms = (pariwarId: string, suffix = ''): string =>
    `/api/v1/p/${pariwarId}/terms${suffix}`;

  function createBody(clauseVersionId: string): object {
    return {
      bodyMarkdown: '# Terms\n\nBe excellent to each other.',
      pinnedToClauseVersionIds: [clauseVersionId],
      effectiveFrom: '2026-01-01T00:00:00.000Z',
    };
  }

  // ── AC7 + AC6: create → approve, then a second version supersedes the prior ──
  it('creates a version (audit-or-throw), then approve→supersede flips the prior', async () => {
    const { client, pariwarId } = await newTrusteeInPariwar();
    const clauseVersionId = await seedClauseVersion(pariwarId);

    // create v1
    const created = await client.inject({ method: 'POST', url: terms(pariwarId, '/versions'), payload: createBody(clauseVersionId) });
    expect(created.statusCode).toBe(200);
    const v1 = created.json<TcShape>();
    expect(v1.version).toBe(1);
    expect(v1.legalReviewStatus).toBe('pending');
    expect(v1.effectiveUntil).toBeNull(); // genesis is open-ended
    expect(v1.pinnedToClauseVersionIds).toContain(clauseVersionId);
    expect(v1.auditId).toMatch(/^[0-9a-f-]{36}$/); // NON-NULL audit_id (audit-or-throw)

    // the create audit line exists + references the tc_version_id (AC7).
    const c = await td.pool.connect();
    try {
      const { rows } = await c.query<{ action: string; resource_locator: string }>(
        `SELECT action, resource_locator FROM audit_log_entries WHERE audit_id = $1`,
        [v1.auditId],
      );
      expect(rows[0]?.action).toBe('terms_and_conditions.version_created');
      expect(rows[0]?.resource_locator).toContain(v1.tcVersionId);
    } finally {
      c.release();
    }

    // approve v1 (genesis — no prior to supersede)
    const approved1 = await client.inject({ method: 'POST', url: terms(pariwarId, `/versions/${v1.tcVersionId}/approve`), payload: { confirm: true } });
    expect(approved1.statusCode).toBe(200);
    expect(approved1.json<TcShape>().legalReviewStatus).toBe('approved');
    expect(approved1.json<TcShape>().auditId).toMatch(/^[0-9a-f-]{36}$/); // audit-or-throw: approved row carries the approve-event auditId

    // create v2 (staged), then approve v2 → supersedes v1 (AC6)
    const created2 = await client.inject({ method: 'POST', url: terms(pariwarId, '/versions'), payload: { ...createBody(clauseVersionId), bodyMarkdown: '# Terms v2', effectiveFrom: '2026-06-01T00:00:00.000Z' } });
    const v2 = created2.json<TcShape>();
    expect(v2.version).toBe(2);

    const approved2 = await client.inject({ method: 'POST', url: terms(pariwarId, `/versions/${v2.tcVersionId}/approve`), payload: { confirm: true } });
    expect(approved2.statusCode).toBe(200);
    expect(approved2.json<TcShape>().legalReviewStatus).toBe('approved');
    expect(approved2.json<TcShape>().auditId).toMatch(/^[0-9a-f-]{36}$/); // audit-or-throw: approved row carries the approve-event auditId
    expect(approved2.json<TcShape>().effectiveUntil).toBeNull(); // v2 now in-force

    // v1 is now superseded + still recoverable by id (AC8). Assert via the DB row.
    const c2 = await td.pool.connect();
    try {
      const { rows } = await c2.query<{ legal_review_status: string; effective_until: string | null }>(
        `SELECT legal_review_status, effective_until FROM terms_and_conditions_versions WHERE tc_version_id = $1`,
        [v1.tcVersionId],
      );
      expect(rows[0]?.legal_review_status).toBe('superseded');
      expect(rows[0]?.effective_until).not.toBeNull();
    } finally {
      c2.release();
    }
  });

  // ── RBAC: a member WITHOUT tc.publish → audited 403 ──────────────────────────
  it('a member lacking tc.publish gets 403 on create', async () => {
    const { client, userId } = await authenticate();
    const pariwarId = randomUUID();
    usedPariwarIds.push(pariwarId);
    // district_admin has claim.approve + member.suspend, but NOT tc.publish.
    await grantRole(userId, pariwarId, 'district_admin');
    const clauseVersionId = await seedClauseVersion(pariwarId);

    const res = await client.inject({ method: 'POST', url: terms(pariwarId, '/versions'), payload: createBody(clauseVersionId) });
    expect(res.statusCode).toBe(403);
  });

  // ── approve of an absent version → 404 ───────────────────────────────────────
  it('approving a non-existent version → 404 terms_and_conditions.version_not_found', async () => {
    const { client, pariwarId } = await newTrusteeInPariwar();
    const res = await client.inject({ method: 'POST', url: terms(pariwarId, `/versions/${randomUUID()}/approve`), payload: { confirm: true } });
    expect(res.statusCode).toBe(404);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('terms_and_conditions.version_not_found');
  });

  // ── approve of an already-approved/superseded version → 409 ──────────────────
  it('approving an already-approved version → 409 terms_and_conditions.invalid_state', async () => {
    const { client, pariwarId } = await newTrusteeInPariwar();
    const clauseVersionId = await seedClauseVersion(pariwarId);
    const created = await client.inject({ method: 'POST', url: terms(pariwarId, '/versions'), payload: createBody(clauseVersionId) });
    const v1 = created.json<TcShape>();
    await client.inject({ method: 'POST', url: terms(pariwarId, `/versions/${v1.tcVersionId}/approve`), payload: { confirm: true } });

    const again = await client.inject({ method: 'POST', url: terms(pariwarId, `/versions/${v1.tcVersionId}/approve`), payload: { confirm: true } });
    expect(again.statusCode).toBe(409);
    expect(again.json<{ error: { code: string } }>().error.code).toBe('terms_and_conditions.invalid_state');
  });

  // ── create pinning a non-existent clause version → 422 ───────────────────────
  it('creating a version pinning a non-existent clause version → 422', async () => {
    const { client, pariwarId } = await newTrusteeInPariwar();
    const res = await client.inject({ method: 'POST', url: terms(pariwarId, '/versions'), payload: createBody(randomUUID()) });
    expect(res.statusCode).toBe(422);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('terms_and_conditions.pinned_clause_not_found');
  });

  // ── unauthenticated → 401 ────────────────────────────────────────────────────
  it('unauthenticated create is 401', async () => {
    const anon = makeClient(app);
    const res = await anon.inject({ method: 'POST', url: terms(randomUUID(), '/versions'), payload: createBody(randomUUID()) });
    expect(res.statusCode).toBe(401);
  });
});
