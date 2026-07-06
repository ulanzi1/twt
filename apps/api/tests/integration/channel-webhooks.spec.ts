// WhatsApp inbound-webhook ingress primitive — Story 5.4 (Task 4; AC2).
//
// Drives the real Fastify app via fastify.inject for the per-Pariwar Meta webhook:
//   · GET  /api/v1/webhooks/whatsapp/:pariwarId — subscription-verification challenge (verify-token auth).
//   · POST /api/v1/webhooks/whatsapp/:pariwarId — verify X-Hub-Signature-256 → persist raw payload → ack 200.
// The test resolveChannelSecret fake maps a NAME → `test-secret::<name>` so the HMAC round-trip is testable
// without Secret Manager. Config rows are seeded directly (the test login bypasses RLS); the webhook route is
// PUBLIC (no session) — the signature / verify-token is the auth. Fresh random pariwarId per test.

import { createHmac, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import { buildServer } from '../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from './_setup.js';

const webhookUrl = (pariwarId: string): string => `/api/v1/webhooks/whatsapp/${pariwarId}`;

/** The test fake resolves a NAME → this value (see _setup.ts resolveChannelSecret). */
const resolvedSecret = (name: string): string => `test-secret::${name}`;

describe.skipIf(!hasDatabase)('WhatsApp inbound-webhook ingress (Story 5.4)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    td = buildTestDeps();
    deps = td.deps;
    app = await buildServer(deps);
  });

  afterAll(async () => {
    await app.close();
    await td.pool.end();
  });

  /** Seed a WA config row carrying the app-secret + verify-token NAMEs (RLS bypassed under the test login). */
  async function seedConfig(
    pariwarId: string,
    opts: { appSecretName?: string | null; verifyTokenName?: string | null } = {},
  ): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO pariwar_wa_config (pariwar_id, app_secret_secret_name, webhook_verify_token_secret_name)
           VALUES ($1, $2, $3)`,
        [
          pariwarId,
          opts.appSecretName === undefined ? `app-secret-${pariwarId}` : opts.appSecretName,
          opts.verifyTokenName === undefined ? `verify-token-${pariwarId}` : opts.verifyTokenName,
        ],
      );
    } finally {
      c.release();
    }
  }

  async function persistedEventCount(pariwarId: string): Promise<number> {
    const c = await td.pool.connect();
    try {
      const res = await c.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM wa_inbound_webhook_events WHERE pariwar_id = $1`,
        [pariwarId],
      );
      return Number(res.rows[0]?.n ?? '0');
    } finally {
      c.release();
    }
  }

  // ── GET challenge ──────────────────────────────────────────────────────────────────────────────────
  it('GET challenge: echoes hub.challenge on a matching verify token', async () => {
    const pariwarId = randomUUID();
    await seedConfig(pariwarId);
    const client = makeClient(app);
    const token = resolvedSecret(`verify-token-${pariwarId}`);
    const res = await client.inject({
      method: 'GET',
      url: `${webhookUrl(pariwarId)}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(token)}&hub.challenge=CHALLENGE123`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('CHALLENGE123');
  });

  it('GET challenge: fails closed (403) on a wrong verify token', async () => {
    const pariwarId = randomUUID();
    await seedConfig(pariwarId);
    const client = makeClient(app);
    const res = await client.inject({
      method: 'GET',
      url: `${webhookUrl(pariwarId)}?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=CHALLENGE123`,
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET challenge: fails closed when no verify-token NAME is configured', async () => {
    const pariwarId = randomUUID();
    await seedConfig(pariwarId, { verifyTokenName: null });
    const client = makeClient(app);
    const res = await client.inject({
      method: 'GET',
      url: `${webhookUrl(pariwarId)}?hub.mode=subscribe&hub.verify_token=anything&hub.challenge=X`,
    });
    expect(res.statusCode).toBe(403);
  });

  // ── POST persist + ack ─────────────────────────────────────────────────────────────────────────────
  it('POST: a validly-signed inbound webhook is persisted + acked 200', async () => {
    const pariwarId = randomUUID();
    await seedConfig(pariwarId);
    const client = makeClient(app);
    const bodyStr = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'x' }] });
    const secret = resolvedSecret(`app-secret-${pariwarId}`);
    const signature = `sha256=${createHmac('sha256', secret).update(Buffer.from(bodyStr, 'utf8')).digest('hex')}`;

    const res = await client.inject({
      method: 'POST',
      url: webhookUrl(pariwarId),
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature },
      payload: bodyStr,
    });
    expect(res.statusCode).toBe(200);
    expect(await persistedEventCount(pariwarId)).toBe(1);
  });

  it('POST: an invalid signature fails closed (403) and persists NOTHING', async () => {
    const pariwarId = randomUUID();
    await seedConfig(pariwarId);
    const client = makeClient(app);
    const bodyStr = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });

    const res = await client.inject({
      method: 'POST',
      url: webhookUrl(pariwarId),
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=' + '0'.repeat(64) },
      payload: bodyStr,
    });
    expect(res.statusCode).toBe(403);
    expect(await persistedEventCount(pariwarId)).toBe(0);
  });

  it('POST: a missing signature header fails closed (403)', async () => {
    const pariwarId = randomUUID();
    await seedConfig(pariwarId);
    const client = makeClient(app);
    const res = await client.inject({
      method: 'POST',
      url: webhookUrl(pariwarId),
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ object: 'whatsapp_business_account', entry: [] }),
    });
    expect(res.statusCode).toBe(403);
    expect(await persistedEventCount(pariwarId)).toBe(0);
  });
});
