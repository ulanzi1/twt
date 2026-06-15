// Rate-limit enforcement (Story 1.14, AC-1 + AC-5 + AC-6) — discharges CR-D-2.
//
// CR-D-2 ("AC-7 rate-limit fires — zero coverage") asked for exactly this: a
// dedicated spec that builds an app with a LOW ceiling (per-test env override) and
// proves the N+1th request is 429 AND a `rate_limit.exceeded` audit line was
// captured. All hermetic (no DATABASE_URL): the rate-limit hook runs at onRequest,
// BEFORE the session/handler, so a DB-less route (health) or even an unauthenticated
// request to a gated route trips the limiter without touching Postgres.
//
// Two limiters are proven:
//   1. The GLOBAL per-IP ceiling (health route — no per-route config).
//   2. A NAMED per-route per-session ceiling (audit-list route) — which ALSO proves
//      the per-route config INHERITS the global onExceeded audit emit + the
//      ErrorResponse envelope (mergeParams = Object.assign over the global params).

import { afterEach, describe, expect, it } from 'vitest';

import { createTestApp, teardown, type TestApp } from './_setup.js';

const FROZEN = new Date('2026-06-15T12:00:00.000Z');

describe('Rate-limit enforcement (AC-1/AC-5/AC-6, hermetic — no DB)', () => {
  let apps: TestApp[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((t) => teardown(t)));
    apps = [];
  });

  async function appWith(env: NodeJS.ProcessEnv): Promise<TestApp> {
    // Freeze the clock so the audit dedupe window-bucket is deterministic.
    const t = await createTestApp({ env, clock: () => FROZEN });
    apps.push(t);
    return t;
  }

  it('trips the GLOBAL per-IP ceiling: N+1th request → 429 + rate_limit.exceeded audit line', async () => {
    const t = await appWith({ RATE_LIMIT_MAX: '3' });
    const url = '/api/v1/_meta/health';

    const codes: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const res = await t.app.inject({ method: 'GET', url });
      codes.push(res.statusCode);
    }

    expect(codes).toEqual([200, 200, 200, 429]);
    expect(t.auditSink.ofType('rate_limit.exceeded').length).toBeGreaterThanOrEqual(1);
  });

  it('the 429 body is the project ErrorResponse envelope (code rate_limit.exceeded + request_id)', async () => {
    const t = await appWith({ RATE_LIMIT_MAX: '1' });
    const url = '/api/v1/_meta/health';

    await t.app.inject({ method: 'GET', url }); // 1st ok
    const tripped = await t.app.inject({ method: 'GET', url }); // 2nd trips

    expect(tripped.statusCode).toBe(429);
    const body = tripped.json<{ error: { code: string; message: string; request_id: string } }>();
    expect(body.error.code).toBe('rate_limit.exceeded');
    expect(typeof body.error.message).toBe('string');
    expect(typeof body.error.request_id).toBe('string');
    expect(body.error.request_id.length).toBeGreaterThan(0);
  });

  it('a NAMED per-route limit (audit-list) trips at its own ceiling AND inherits the global audit emit', async () => {
    // Global stays at the 100000 test ceiling; only the read ceiling is lowered, so
    // the trip is the PER-ROUTE limiter, not the global one.
    const t = await appWith({ READ_RATE_MAX: '3' });
    const url = '/api/v1/audit/integrity-checks?limit=5';

    const codes: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const res = await t.app.inject({ method: 'GET', url });
      codes.push(res.statusCode);
    }

    // The first 3 pass the rate limiter but hit the login-wall (no session) → 401.
    expect(codes.slice(0, 3)).toEqual([401, 401, 401]);
    // The 4th trips the per-route ceiling at onRequest, BEFORE the session preHandler.
    expect(codes[3]).toBe(429);
    // The per-route config carried no onExceeded of its own → this proves it INHERITED
    // the global audit emit (the load-bearing inheritance fact this story relies on).
    expect(t.auditSink.ofType('rate_limit.exceeded').length).toBeGreaterThanOrEqual(1);
  });

  it('emits ONE audit line per key-per-window despite many rejected requests (CR-B-1 anti-flood)', async () => {
    const t = await appWith({ RATE_LIMIT_MAX: '2' });
    const url = '/api/v1/_meta/health';

    // 2 ok, then 6 rejected — onExceeded fires on each rejection, but the
    // window-bucketed dedupe must collapse them to a single audit line.
    for (let i = 0; i < 8; i += 1) {
      await t.app.inject({ method: 'GET', url });
    }

    expect(t.auditSink.ofType('rate_limit.exceeded')).toHaveLength(1);
  });

  it('the audit line carries the non-secret trip context (ip, routeUrl, key)', async () => {
    const t = await appWith({ RATE_LIMIT_MAX: '1' });
    const url = '/api/v1/_meta/health';

    await t.app.inject({ method: 'GET', url });
    await t.app.inject({ method: 'GET', url });

    const [trip] = t.auditSink.ofType('rate_limit.exceeded');
    expect(trip).toBeDefined();
    expect(trip?.type).toBe('rate_limit.exceeded');
    const ctx = trip?.context as { ip?: string; routeUrl?: string | null; key?: string };
    expect(ctx.routeUrl).toBe('/api/v1/_meta/health');
    expect(typeof ctx.ip).toBe('string');
    expect(typeof ctx.key).toBe('string');
  });
});
