// Fixed-amount schedule admin surface — E2E (Story 7.5, Task 7; AC1/AC3/AC4). (:5433)
//
// The three trustee routes end-to-end against real Postgres: an authenticated pariwar_admin (as
// Trustee-Lite) with the pariwar-dimension keys drives the GET view, a STANDARD (12-month-notice)
// change, and an EMERGENCY override (step-up-gated + fail-closed R5 display + immutable attestation).
// Proves the security boundary (no session → 401; missing grant → 403; emergency without step-up →
// 403 step_up_required), the notification seam fires with the right cadence, and the audit sink records
// the non-PII change lines.
//
// ⚠ Own-committing seed writes; fresh random pariwarId per test; role_grants cleaned in afterAll.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../../src/server.js';
import {
  buildTestDeps,
  hasDatabase,
  makeClient,
  type CapturingAuditSink,
  type CapturingPoolFixedAmountHook,
  type CapturingStepUpDelivery,
  type TestDeps,
} from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const DAY_MS = 24 * 60 * 60 * 1000;

describe.skipIf(!hasDatabase)('fixed-amount schedule surface — E2E (:5433)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let adminStepUp: CapturingStepUpDelivery;
  let auditSink: CapturingAuditSink;
  let hook: CapturingPoolFixedAmountHook;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const createdPariwars: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    adminStepUp = td.adminStepUpDelivery;
    auditSink = td.auditSink;
    hook = td.poolFixedAmountHook;
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
      if (createdPariwars.length > 0) {
        await c.query(`DELETE FROM pool_fixed_amount_emergency_attestations WHERE pariwar_id = ANY($1)`, [createdPariwars]);
        await c.query(`DELETE FROM pool_fixed_amount_schedule WHERE pariwar_id = ANY($1)`, [createdPariwars]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  async function authenticate(opts: { displayName?: string | null } = {}): Promise<{ client: Client; userId: string }> {
    const email = `fa-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, {
      email,
      password,
      ...(opts.displayName != null ? { displayName: opts.displayName } : {}),
    });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(app);
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function grant(userId: string, pariwarId: string, role: string, opts: { dimension?: string; value?: string } = {}): Promise<void> {
    const dimension = opts.dimension ?? 'pariwar';
    const value = opts.value ?? pariwarId;
    const c = await td.pool.connect();
    try {
      await c.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [
        userId,
        pariwarId,
        role,
        dimension,
        value,
      ]);
    } finally {
      c.release();
    }
  }

  async function pariwarAdmin(pariwarId: string, displayName: string | null = 'Trustee One'): Promise<{ client: Client; userId: string }> {
    const a = await authenticate({ displayName });
    await grant(a.userId, pariwarId, 'pariwar_admin');
    return a;
  }

  async function elevate(client: Client): Promise<void> {
    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'pool_fixed_amount_emergency' } });
    expect(req.statusCode).toBe(200);
    const code = adminStepUp.last?.code as string;
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } });
    expect(ver.statusCode).toBe(200);
  }

  const viewUrl = (p: string) => `/api/v1/p/${p}/admin/pool-fixed-amount`;
  const scheduleUrl = (p: string) => `/api/v1/p/${p}/admin/pool-fixed-amount/schedule`;
  const emergencyUrl = (p: string) => `/api/v1/p/${p}/admin/pool-fixed-amount/emergency`;

  function freshPariwar(): string {
    const p = randomUUID();
    createdPariwars.push(p);
    return p;
  }

  it('401 when unauthenticated', async () => {
    const p = freshPariwar();
    const anon = makeClient(app);
    const res = await anon.inject({ method: 'GET', url: viewUrl(p) });
    expect(res.statusCode).toBe(401);
  });

  it('404 when the actor has no grant for the Pariwar (tenant isolation — scope unresolvable)', async () => {
    const p = freshPariwar();
    const a = await authenticate({ displayName: 'No Grant' });
    // No role grant at all → the scope-resolution hook cannot resolve the tenant → 404 (don't reveal existence).
    const res = await a.client.inject({ method: 'GET', url: viewUrl(p) });
    expect(res.statusCode).toBe(404);
  });

  it('403 when the actor holds a Pariwar role that LACKS the fixed-amount key', async () => {
    const p = freshPariwar();
    const a = await authenticate({ displayName: 'Helpline Op' });
    // helpline_operator resolves the tenant scope but does NOT hold pool.fixed_amount_set → 403.
    await grant(a.userId, p, 'helpline_operator');
    const res = await a.client.inject({ method: 'GET', url: viewUrl(p) });
    expect(res.statusCode).toBe(403);
  });

  it('standard change: schedules a +365d change, fires the seam (queued), audits, and shows in the view', async () => {
    const p = freshPariwar();
    const a = await pariwarAdmin(p);
    const effectiveFrom = new Date(Date.now() + 400 * DAY_MS).toISOString();

    const before = hook.events.length;
    const res = await a.client.inject({
      method: 'POST',
      url: scheduleUrl(p),
      payload: { fixed_amount: 600, effective_from: effectiveFrom },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { entry: { version: number; fixed_amount: number; change_type: string } };
    expect(body.entry.fixed_amount).toBe(600);
    expect(body.entry.change_type).toBe('standard');

    // The notification seam fired with the queued cadence.
    const fired = hook.events.slice(before);
    expect(fired).toHaveLength(1);
    expect(fired[0]).toMatchObject({ pariwarId: p, fixedAmount: 600, changeType: 'standard', cadence: 'queued' });

    // A non-PII audit line was recorded.
    const audits = auditSink.events.filter((e) => e.type === 'admin_pool_fixed_amount.schedule');
    expect(audits.some((e) => (e.context as { fixed_amount?: number }).fixed_amount === 600)).toBe(true);

    // The view lists the entry.
    const view = await a.client.inject({ method: 'GET', url: viewUrl(p) });
    expect(view.statusCode).toBe(200);
    const vbody = view.json() as { schedule: Array<{ version: number; fixed_amount: number }> };
    expect(vbody.schedule.some((s) => s.fixed_amount === 600)).toBe(true);
  });

  it('standard change: rejects a short-notice (<365d) effective_from with 400', async () => {
    const p = freshPariwar();
    const a = await pariwarAdmin(p);
    const res = await a.client.inject({
      method: 'POST',
      url: scheduleUrl(p),
      payload: { fixed_amount: 600, effective_from: new Date(Date.now() + 10 * DAY_MS).toISOString() },
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: { code: string } }).error.code).toBe('pool.fixed_amount_notice_too_short');
  });

  it('emergency override: 403 step_up_required without elevation, then succeeds after step-up with an immutable record', async () => {
    const p = freshPariwar();
    const a = await pariwarAdmin(p, 'Trustee One');
    // The panel needs at least 2 DISTINCT actors, each with a resolvable R5 display (fail-closed
    // attestation attribution); no grant is required (7.5 records the panel composition, it does NOT
    // check panel-member permissions — that is the deliberate boundary vs the R9 voting lifecycle).
    const panelMember = await authenticate({ displayName: 'Panel Member' });
    const panelMember2 = await authenticate({ displayName: 'Panel Member Two' });

    const payload = {
      fixed_amount: 750,
      effective_from: new Date().toISOString(),
      documented_reason: 'reserve adequacy — actuarial review',
      panel_actor_ids: [panelMember.userId, panelMember2.userId],
    };

    // Without step-up → 403 auth.step_up_required.
    const noStepUp = await a.client.inject({ method: 'POST', url: emergencyUrl(p), payload });
    expect(noStepUp.statusCode).toBe(403);
    expect((noStepUp.json() as { error: { code: string } }).error.code).toBe('auth.step_up_required');

    // Elevate + retry → 201 with the immutable Emergency Adjustment Record.
    await elevate(a.client);
    const before = hook.events.length;
    const ok = await a.client.inject({ method: 'POST', url: emergencyUrl(p), payload });
    expect(ok.statusCode).toBe(201);
    const body = ok.json() as {
      entry: { change_type: string; version: number };
      emergency_record: { schedule_version: number; documented_reason: string; panel: Array<{ actor_display: string }> };
    };
    expect(body.entry.change_type).toBe('emergency');
    expect(body.emergency_record.schedule_version).toBe(body.entry.version);
    expect(body.emergency_record.documented_reason).toContain('reserve adequacy');
    expect(body.emergency_record.panel[0]!.actor_display).toBe('Panel Member');

    // The seam fired with the IMMEDIATE cadence; the audit line carries the panel roster + reason (non-PII).
    const fired = hook.events.slice(before);
    expect(fired[0]).toMatchObject({ fixedAmount: 750, changeType: 'emergency', cadence: 'immediate' });
    const audit = auditSink.events.filter((e) => e.type === 'admin_pool_fixed_amount.emergency').at(-1);
    expect((audit?.context as { documented_reason?: string }).documented_reason).toContain('reserve adequacy');
  });

  it('emergency override: fail-closed 409 when the acting trustee has no R5 display', async () => {
    const p = freshPariwar();
    const a = await authenticate({ displayName: null });
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const res = await a.client.inject({
      method: 'POST',
      url: emergencyUrl(p),
      payload: {
        fixed_amount: 800,
        effective_from: new Date().toISOString(),
        documented_reason: 'inflation adjustment',
        panel_actor_ids: [randomUUID(), randomUUID()],
      },
    });
    expect(res.statusCode).toBe(409);
  });
});
