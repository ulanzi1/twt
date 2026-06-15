// Turnstile enforcement — the AC-3 regression guard (Story 1.13, AC-8).
//
// Proves the load-bearing fix: admin-auth.handlers now ENFORCE the Turnstile verdict
// (the boolean was previously discarded — a real verifier returning false would have
// been inert). A verifier returning false rejects the auth entry points with the
// GENERIC credential envelope (anti-enumeration) BEFORE any credential/DB work — so
// the rejection assertions are HERMETIC (no DATABASE_URL needed): the gate fires
// pre-DB. `saveUninitialized:false` means the untouched session never writes a row.
//
// The "true → proceeds" direction is exercised both by the existing Story 1.9 auth
// suite (every test uses the no-op true verifier and logs in) and by the db-gated
// pass-through block below, which flips false-vs-true on the SAME valid account.

import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import * as service from '../../src/modules/auth/admin/admin-auth.service.js';
import type { TurnstileVerifier } from '../../src/modules/auth/shared/turnstile.js';
import { buildServer } from '../../src/server.js';
import {
  CapturingAuditSink,
  buildTestDeps,
  hasDatabase,
  makeClient,
  type TestDeps,
} from './_setup.js';

const rejectingTurnstile: TurnstileVerifier = { verify: async (): Promise<boolean> => false };
const passingTurnstile: TurnstileVerifier = { verify: async (): Promise<boolean> => true };

describe('Turnstile enforcement at auth entry points (AC-3, hermetic — no DB)', () => {
  let td: TestDeps;
  let audit: CapturingAuditSink;
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeEach(async () => {
    audit = new CapturingAuditSink();
    td = buildTestDeps({ turnstile: rejectingTurnstile, auditSink: audit });
    app = await buildServer(td.deps);
  });

  afterEach(async () => {
    await app.close();
    await td.pool.end().catch(() => undefined);
  });

  it('login REJECTS with a generic 401 when Turnstile fails (verdict no longer discarded)', async () => {
    const client = makeClient(app);
    const res = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'someone@example.test', password: 'whatever-long-password' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('auth.invalid_credentials');
    // Anti-enumeration: the envelope must NOT reveal that the captcha/turnstile failed.
    expect(res.body.toLowerCase()).not.toContain('turnstile');
    expect(res.body.toLowerCase()).not.toContain('captcha');
    // Audited as login.failure reason=turnstile; the first factor never ran.
    const failures = audit.ofType('login.failure');
    expect(failures).toHaveLength(1);
    expect(failures[0]?.context).toMatchObject({ reason: 'turnstile' });
    expect(audit.ofType('login.success')).toHaveLength(0);
  });

  it('password-reset/request REJECTS with a generic 401 when Turnstile fails', async () => {
    const client = makeClient(app);
    const res = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/request',
      payload: { email: 'someone@example.test' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('auth.invalid_credentials');
    const failures = audit.ofType('password_reset.failure');
    expect(failures).toHaveLength(1);
    expect(failures[0]?.context).toMatchObject({ reason: 'turnstile' });
  });
});

describe.skipIf(!hasDatabase)('Turnstile pass-through vs block on a real account (live DB)', () => {
  let passTd: TestDeps;
  let rejectTd: TestDeps;
  let passApp: Awaited<ReturnType<typeof buildServer>>;
  let rejectApp: Awaited<ReturnType<typeof buildServer>>;
  let email: string;
  let password: string;
  let userId: string;

  beforeAll(async () => {
    passTd = buildTestDeps({ turnstile: passingTurnstile });
    rejectTd = buildTestDeps({ turnstile: rejectingTurnstile });
    passApp = await buildServer(passTd.deps);
    rejectApp = await buildServer(rejectTd.deps);
    email = `admin-${randomUUID()}@example.test`;
    password = 'CorrectHorseBatteryStaple9';
    userId = await service.createAdminAccount(passTd.deps, { email, password });
  });

  afterAll(async () => {
    const c = await passTd.pool.connect();
    try {
      await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = $1`, [userId]);
      await c.query(`DELETE FROM users WHERE id = $1`, [userId]); // cascades credentials
    } finally {
      c.release();
    }
    await passApp.close();
    await rejectApp.close();
    await passTd.pool.end().catch(() => undefined);
    await rejectTd.pool.end().catch(() => undefined);
  });

  it('a PASSING verifier lets valid credentials reach mfa_required (proceeds)', async () => {
    const client = makeClient(passApp);
    const res = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ status: string }>().status).toBe('mfa_required');
  });

  it('a REJECTING verifier blocks the SAME valid credentials with a generic 401', async () => {
    const client = makeClient(rejectApp);
    const res = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('auth.invalid_credentials');
  });
});
