// Telegram inbound-update webhook ingress primitive — Story 5.5 (Task 5; AC8).
//
// Drives the real Fastify app via fastify.inject for the per-Pariwar Telegram webhook:
//   · POST /api/v1/webhooks/telegram/:pariwarId — verify X-Telegram-Bot-Api-Secret-Token → persist raw update
//     → ack 200. Telegram is POST-only (NO GET challenge). The test resolveChannelSecret fake maps a NAME →
//     `test-secret::<name>` so the secret-token compare is testable without Secret Manager. Config rows are
//     seeded directly (the test login bypasses RLS); the webhook route is PUBLIC (no session). Fresh random
//     pariwarId per test.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import { buildServer } from '../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from './_setup.js';

const webhookUrl = (pariwarId: string): string => `/api/v1/webhooks/telegram/${pariwarId}`;

/** The test fake resolves a NAME → this value (see _setup.ts resolveChannelSecret). */
const resolvedSecret = (name: string): string => `test-secret::${name}`;

describe.skipIf(!hasDatabase)('Telegram inbound-update webhook ingress (Story 5.5)', () => {
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

  /** Seed a Telegram config row carrying the webhook secret-token NAME (RLS bypassed under the test login). */
  async function seedConfig(
    pariwarId: string,
    opts: { webhookSecretName?: string | null } = {},
  ): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO pariwar_telegram_config (pariwar_id, enabled, webhook_secret_token_secret_name)
           VALUES ($1, true, $2)`,
        [
          pariwarId,
          opts.webhookSecretName === undefined ? `tg-secret-${pariwarId}` : opts.webhookSecretName,
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
        `SELECT count(*)::text AS n FROM telegram_inbound_webhook_events WHERE pariwar_id = $1`,
        [pariwarId],
      );
      return Number(res.rows[0]?.n ?? '0');
    } finally {
      c.release();
    }
  }

  it('POST: a valid secret token is persisted + acked 200', async () => {
    const pariwarId = randomUUID();
    await seedConfig(pariwarId);
    const client = makeClient(app);
    const res = await client.inject({
      method: 'POST',
      url: webhookUrl(pariwarId),
      headers: {
        'content-type': 'application/json',
        'x-telegram-bot-api-secret-token': resolvedSecret(`tg-secret-${pariwarId}`),
      },
      payload: JSON.stringify({ update_id: 1, message: { text: '/start TWT-ABCDEFGH', chat: { id: 42 } } }),
    });
    expect(res.statusCode).toBe(200);
    expect(await persistedEventCount(pariwarId)).toBe(1);
  });

  it('POST: a wrong secret token fails closed (403) and persists NOTHING', async () => {
    const pariwarId = randomUUID();
    await seedConfig(pariwarId);
    const client = makeClient(app);
    const res = await client.inject({
      method: 'POST',
      url: webhookUrl(pariwarId),
      headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'WRONG' },
      payload: JSON.stringify({ update_id: 2 }),
    });
    expect(res.statusCode).toBe(403);
    expect(await persistedEventCount(pariwarId)).toBe(0);
  });

  it('POST: a missing secret-token header fails closed (403)', async () => {
    const pariwarId = randomUUID();
    await seedConfig(pariwarId);
    const client = makeClient(app);
    const res = await client.inject({
      method: 'POST',
      url: webhookUrl(pariwarId),
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ update_id: 3 }),
    });
    expect(res.statusCode).toBe(403);
    expect(await persistedEventCount(pariwarId)).toBe(0);
  });

  it('POST: fails closed when no secret-token NAME is configured', async () => {
    const pariwarId = randomUUID();
    await seedConfig(pariwarId, { webhookSecretName: null });
    const client = makeClient(app);
    const res = await client.inject({
      method: 'POST',
      url: webhookUrl(pariwarId),
      headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'anything' },
      payload: JSON.stringify({ update_id: 4 }),
    });
    expect(res.statusCode).toBe(403);
    expect(await persistedEventCount(pariwarId)).toBe(0);
  });
});
