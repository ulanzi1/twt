// Framework-landing smoke test (Task 1.5) — boots the real app in-process via
// fastify.inject (no port, no supertest) and proves the substrate is wired:
// liveness route + Zod response serialization, request-id correlation, and the
// ErrorResponse envelope on unmatched routes. DB-less (liveness does not query).

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp, teardown, type TestApp } from './integration/_setup.js';

describe('@twt/api framework landing (Task 1)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await teardown(t);
  });

  it('boots and serves the liveness probe with a Zod-validated body', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/v1/_meta/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });

  it('generates and echoes the x-request-id correlation header', async () => {
    const provided = await t.app.inject({
      method: 'GET',
      url: '/api/v1/_meta/health',
      headers: { 'x-request-id': 'trace-fixture-123' },
    });
    expect(provided.headers['x-request-id']).toBe('trace-fixture-123');

    const generated = await t.app.inject({ method: 'GET', url: '/api/v1/_meta/health' });
    expect(typeof generated.headers['x-request-id']).toBe('string');
    expect((generated.headers['x-request-id'] as string).length).toBeGreaterThan(0);
  });

  it('maps unmatched routes to the ErrorResponse envelope (404)', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/v1/does-not-exist' });
    expect(res.statusCode).toBe(404);
    const body = res.json() as { error: { code: string; request_id: string } };
    expect(body.error.code).toBe('request.not_found');
    expect(typeof body.error.request_id).toBe('string');
  });

  it('exposes the OpenAPI doc derived from the Zod route schemas', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/docs/json' });
    expect(res.statusCode).toBe(200);
    const doc = res.json() as { paths: Record<string, unknown> };
    expect(doc.paths['/api/v1/_meta/health']).toBeDefined();
  });
});
