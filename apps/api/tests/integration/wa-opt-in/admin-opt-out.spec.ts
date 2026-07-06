// Trustee admin_action WhatsApp opt-out — E2E (live DB :5433) — Story 5.4 (Task 6/8; AC4).
//
// Drives POST /api/v1/p/:pariwarId/admin/members/:memberId/wa-opt-out through the scoped-admin chain
// [requireAdminSession, scopeResolutionHook, requirePermissionHook(member.moderate)]:
//   · pariwar_admin (carries member.moderate) → 200 REVOKED; the opt-in flips to REVOKED, the consent row is
//     revoked, and an admin_action audit line lands (actor = the admin, NEVER a secret in the hash).
//   · state_trustee (granted in the Pariwar but WITHOUT member.moderate) → fail-closed (never 200), no state
//     change (AI-4-3(b)).
//   · a member with no ACTIVE opt-in → 409 (nothing to revoke), never an illegal transition.
//
// Admin auth mirrors channel-config.spec.ts (fake WebAuthn passkey enroll + login + authenticate). The opt-in
// + consent rows are seeded directly (RLS bypassed under the test login). Fresh random ids per test;
// audit_log_entries is append-only + own-committing, so assertions key on MEMBERSHIP, never counts.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const optOutUrl = (pariwarId: string, memberId: string): string =>
  `/api/v1/p/${pariwarId}/admin/members/${memberId}/wa-opt-out`;

describe.skipIf(!hasDatabase)('Trustee admin_action WA opt-out (Story 5.4)', () => {
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
    const email = `waadmin-${randomUUID()}@example.test`;
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

  /** Grant pariwar_admin (carries member.moderate — catalog v5) in a Pariwar. */
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

  /** Grant state_trustee (does NOT carry member.moderate — catalog v5). */
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

  /** Seed an ACTIVE opt-in + its linked (unrevoked) whatsapp_opt_in consent row. Returns the opt-in id. */
  async function seedActiveOptIn(pariwarId: string, memberId: string): Promise<string> {
    const c = await td.pool.connect();
    try {
      const consent = await c.query<{ consent_id: string }>(
        `INSERT INTO consent_records (subject_id, pariwar_id, consent_type, granted_via_actor, consent_payload)
           VALUES ($1, $2, 'whatsapp_opt_in', 'member_self', '{}'::jsonb) RETURNING consent_id`,
        [memberId, pariwarId],
      );
      const consentId = consent.rows[0]!.consent_id;
      const optIn = await c.query<{ opt_in_id: string }>(
        `INSERT INTO member_wa_opt_in
           (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, window_expires_at, consent_id, matched_at)
           VALUES ($1, $2, 'ACTIVE', $3, $4, now() + interval '24 hours', $5, now()) RETURNING opt_in_id`,
        [pariwarId, memberId, `TWT-${randomUUID().slice(0, 8).toUpperCase().replace(/[^A-Z2-9]/g, 'A')}`, `blind-${memberId}`, consentId],
      );
      return optIn.rows[0]!.opt_in_id;
    } finally {
      c.release();
    }
  }

  async function stateOf(optInId: string): Promise<string> {
    const r = await td.pool.query<{ state: string }>(`SELECT state FROM member_wa_opt_in WHERE opt_in_id = $1`, [optInId]);
    return r.rows[0]!.state;
  }

  async function consentRevoked(pariwarId: string, memberId: string): Promise<boolean> {
    const r = await td.pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM consent_records
         WHERE pariwar_id = $1 AND subject_id = $2 AND consent_type = 'whatsapp_opt_in' AND revoked_at IS NOT NULL`,
      [pariwarId, memberId],
    );
    return Number(r.rows[0]!.n) >= 1;
  }

  async function auditRows(actorId: string, pariwarId: string): Promise<{ n: number; hash: string | null }> {
    const c = await td.pool.connect();
    try {
      const res = await c.query<{ n: string; hash: string | null }>(
        `SELECT count(*)::text AS n, max(request_payload_hash) AS hash FROM audit_log_entries
           WHERE actor_id = $1 AND action = 'member.wa_opt_in_revoked' AND pariwar_id = $2`,
        [actorId, pariwarId],
      );
      return { n: Number(res.rows[0]?.n ?? '0'), hash: res.rows[0]?.hash ?? null };
    } finally {
      c.release();
    }
  }

  it('pariwar_admin (member.moderate) force-opt-out → 200 REVOKED + consent revoked + admin_action audit', async () => {
    const pariwarId = randomUUID();
    const memberId = randomUUID();
    const optInId = await seedActiveOptIn(pariwarId, memberId);
    const { client, userId } = await authenticate();
    await grantPariwarAdmin(userId, pariwarId);

    const res = await client.inject({ method: 'POST', url: optOutUrl(pariwarId, memberId) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ state: 'REVOKED' });

    expect(await stateOf(optInId)).toBe('REVOKED');
    expect(await consentRevoked(pariwarId, memberId)).toBe(true);
    const audit = await auditRows(userId, pariwarId);
    expect(audit.n).toBeGreaterThanOrEqual(1);
    expect(audit.hash).toMatch(/^[0-9a-f]{64}$/); // opaque hash, never a raw value
  });

  it('fail-closed: state_trustee WITHOUT member.moderate cannot force-opt-out (never 200); no state change', async () => {
    const pariwarId = randomUUID();
    const memberId = randomUUID();
    const optInId = await seedActiveOptIn(pariwarId, memberId);
    const { client, userId } = await authenticate();
    await grantStateTrustee(userId, pariwarId);

    const res = await client.inject({ method: 'POST', url: optOutUrl(pariwarId, memberId) });
    expect(res.statusCode).not.toBe(200);
    expect([403, 404]).toContain(res.statusCode);
    // No transition happened.
    expect(await stateOf(optInId)).toBe('ACTIVE');
    expect(await consentRevoked(pariwarId, memberId)).toBe(false);
    expect((await auditRows(userId, pariwarId)).n).toBe(0);
  });

  it('a member with no ACTIVE opt-in → 409 (nothing to revoke)', async () => {
    const pariwarId = randomUUID();
    const memberId = randomUUID(); // no opt-in seeded
    const { client, userId } = await authenticate();
    await grantPariwarAdmin(userId, pariwarId);

    const res = await client.inject({ method: 'POST', url: optOutUrl(pariwarId, memberId) });
    expect(res.statusCode).toBe(409);
  });
});
