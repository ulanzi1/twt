// Trustee-facing audit-integrity UI endpoints — Story 1.11b (DD-3/DD-5/DD-6).
//
// Drives the real Fastify app via fastify.inject with a fake WebAuthn provider to
// reach an authenticated admin session, then exercises the THREE new endpoints:
//   - GET  /api/v1/auth/session             — global-scope grant introspection (DD-6)
//   - GET  /api/v1/audit/integrity-checks   — history + acknowledgement join (DD-3)
//   - POST /api/v1/audit/integrity-checks/:checkId/acknowledge (DD-5)
//
// ⚠ audit_integrity_checks / audit_integrity_acknowledgements are append-only —
// inserted check + ack rows CANNOT be cleaned up and accumulate in the dev/CI DB.
// Assertions therefore key on MEMBERSHIP of OUR rows (by checkId), never on absolute
// counts (live-DB gotcha [[project_live_db_test_gotchas]]). role_grants rows ARE
// deletable and are cleaned up per test.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import * as service from '../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../src/server.js';
import {
  buildTestDeps,
  hasDatabase,
  makeClient,
  type TestDeps,
} from './_setup.js';
import { FakeWebAuthnProvider } from './_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

interface IntegrityCheckListItem {
  checkId: string;
  chainValid: boolean;
  triggerSource: string;
  acknowledgement: { acknowledgementId: string; ticketRef: string; checkId: string } | null;
}

describe.skipIf(!hasDatabase)('audit-integrity UI endpoints (Story 1.11b)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const insertedCheckIds: string[] = [];

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
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]); // cascades creds/recovery
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

  /** Directly INSERT a synthetic integrity-check verdict (append-only; cannot be cleaned). */
  async function insertCheck(opts: {
    chainValid: boolean;
    triggerSource: string;
  }): Promise<string> {
    const c = await td.pool.connect();
    try {
      const broken = opts.chainValid
        ? { firstBrokenSeq: null as number | null, firstBrokenAuditId: null as string | null }
        : { firstBrokenSeq: 7, firstBrokenAuditId: randomUUID() };
      const res = await c.query<{ check_id: string }>(
        `INSERT INTO audit_integrity_checks
           (chain_valid, start_seq, start_audit_id, end_seq, end_audit_id,
            first_broken_seq, first_broken_audit_id, rows_verified, verifier_actor, trigger_source)
         VALUES ($1, 1, $2, 6, $3, $4, $5, 6, $6, $7)
         RETURNING check_id`,
        [
          opts.chainValid,
          randomUUID(),
          randomUUID(),
          broken.firstBrokenSeq,
          broken.firstBrokenAuditId,
          `test:${randomUUID()}`,
          opts.triggerSource,
        ],
      );
      const checkId = res.rows[0]!.check_id;
      insertedCheckIds.push(checkId);
      return checkId;
    } finally {
      c.release();
    }
  }

  beforeEach(() => {
    fakeWebauthn.nextRegistration = undefined;
  });

  // ── DD-6: session introspection ─────────────────────────────────────────────
  it('GET /auth/session returns userId + empty nationalGrants when no global grant', async () => {
    const { client, userId } = await authenticate();
    const res = await client.inject({ method: 'GET', url: '/api/v1/auth/session' });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ userId: string; nationalGrants: string[] }>();
    expect(body.userId).toBe(userId);
    expect(body.nationalGrants).toEqual([]);
  });

  it('a pariwar-scoped auditor grant does NOT surface audit.verify (only global scope counts)', async () => {
    const { client, userId } = await authenticate();
    const pariwarId = randomUUID();
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, 'auditor', 'pariwar', $3)`,
        [userId, pariwarId, pariwarId],
      );
    } finally {
      c.release();
    }
    const res = await client.inject({ method: 'GET', url: '/api/v1/auth/session' });
    expect(res.json<{ nationalGrants: string[] }>().nationalGrants).not.toContain('audit.verify');
  });

  it('a global super_admin grant surfaces audit.verify in nationalGrants (AC-1 gate source)', async () => {
    const { client, userId } = await authenticate();
    const c = await td.pool.connect();
    try {
      // scope_value is NULL for a global grant (covers everything).
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, 'super_admin', 'global', NULL)`,
        [userId, randomUUID()],
      );
    } finally {
      c.release();
    }
    const res = await client.inject({ method: 'GET', url: '/api/v1/auth/session' });
    expect(res.json<{ nationalGrants: string[] }>().nationalGrants).toContain('audit.verify');
  });

  it('GET /auth/session requires an authenticated session (401 unauthenticated)', async () => {
    const anon = makeClient(app);
    const res = await anon.inject({ method: 'GET', url: '/api/v1/auth/session' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /audit/integrity-checks requires an authenticated session (401 unauthenticated)', async () => {
    const anon = makeClient(app);
    const res = await anon.inject({ method: 'GET', url: '/api/v1/audit/integrity-checks' });
    expect(res.statusCode).toBe(401);
  });

  it('POST /audit/integrity-checks/:checkId/acknowledge requires an authenticated session (401 unauthenticated)', async () => {
    const anon = makeClient(app);
    const res = await anon.inject({
      method: 'POST',
      url: `/api/v1/audit/integrity-checks/${randomUUID()}/acknowledge`,
      payload: { ticketRef: 'JIRA-anon' },
    });
    expect(res.statusCode).toBe(401);
  });

  // ── DD-3: history list ──────────────────────────────────────────────────────
  it('GET /audit/integrity-checks returns persisted verdicts newest-first', async () => {
    const { client } = await authenticate();
    const olderId = await insertCheck({ chainValid: true, triggerSource: 'cron' });
    const newerId = await insertCheck({ chainValid: false, triggerSource: 'on_demand' });

    const res = await client.inject({ method: 'GET', url: '/api/v1/audit/integrity-checks?limit=200' });
    expect(res.statusCode).toBe(200);
    const items = res.json<IntegrityCheckListItem[]>();
    const ids = items.map((i) => i.checkId);
    expect(ids).toContain(olderId);
    expect(ids).toContain(newerId);
    // The newer insert sorts ahead of the older one (verified_at DESC).
    expect(ids.indexOf(newerId)).toBeLessThan(ids.indexOf(olderId));
    // Never-acknowledged checks carry a null acknowledgement.
    expect(items.find((i) => i.checkId === newerId)!.acknowledgement).toBeNull();
  });

  it('the triggerSource filter narrows the history to one source', async () => {
    const { client } = await authenticate();
    const cronId = await insertCheck({ chainValid: true, triggerSource: 'cron' });
    await insertCheck({ chainValid: true, triggerSource: 'on_demand' });

    const res = await client.inject({
      method: 'GET',
      url: '/api/v1/audit/integrity-checks?limit=200&triggerSource=cron',
    });
    const items = res.json<IntegrityCheckListItem[]>();
    expect(items.map((i) => i.checkId)).toContain(cronId);
    expect(items.every((i) => i.triggerSource === 'cron')).toBe(true);
  });

  // ── DD-5: acknowledgement ───────────────────────────────────────────────────
  it('POST acknowledge records an append-only ack + the list then carries it', async () => {
    const { client, userId } = await authenticate();
    const checkId = await insertCheck({ chainValid: false, triggerSource: 'cron' });

    const ackRes = await client.inject({
      method: 'POST',
      url: `/api/v1/audit/integrity-checks/${checkId}/acknowledge`,
      payload: { ticketRef: 'JIRA-9001' },
    });
    expect(ackRes.statusCode).toBe(200);
    const ack = ackRes.json<{ checkId: string; ticketRef: string; acknowledgedBy: string }>();
    expect(ack.checkId).toBe(checkId);
    expect(ack.ticketRef).toBe('JIRA-9001');
    expect(ack.acknowledgedBy).toBe(userId);

    // The history list now joins the acknowledgement onto that check (banner clears).
    const listRes = await client.inject({ method: 'GET', url: '/api/v1/audit/integrity-checks?limit=200' });
    const item = listRes.json<IntegrityCheckListItem[]>().find((i) => i.checkId === checkId);
    expect(item?.acknowledgement?.ticketRef).toBe('JIRA-9001');
  });

  it('acknowledging an unknown check 404s (not a 500 FK leak)', async () => {
    const { client } = await authenticate();
    const res = await client.inject({
      method: 'POST',
      url: `/api/v1/audit/integrity-checks/${randomUUID()}/acknowledge`,
      payload: { ticketRef: 'JIRA-404' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('acknowledge rejects an empty ticketRef (validation)', async () => {
    const { client } = await authenticate();
    const checkId = await insertCheck({ chainValid: false, triggerSource: 'cron' });
    const res = await client.inject({
      method: 'POST',
      url: `/api/v1/audit/integrity-checks/${checkId}/acknowledge`,
      payload: { ticketRef: '   ' },
    });
    expect(res.statusCode).toBe(400);
  });
});
