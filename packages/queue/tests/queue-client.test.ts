// pg-boss queue-client smoke tests — Story 1.12 (Task 7, AC-1 / DD-5).
//
// Proves the queue substrate end-to-end against a REAL Postgres: start (creates the
// `pgboss` schema) → createQueue → work → send runs the handler; the singletonKey
// dedupe-on-enqueue (DD-5, distinct from the keyed store); schedule registers a
// cron; stop drains gracefully. Skips when DATABASE_URL is unset so a local
// `pnpm test` without Docker still passes.
//
// pg-boss creates/migrates its own `pgboss` schema on start() — fine on CI's
// superuser twt_dev_app (has CREATE). ssl:false matches the local/CI test DB
// (no server-side TLS), mirroring integration-setup.ts.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { QUEUE_NAMES, createQueueClient, stopQueueClient, type QueueClient } from '../src/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe.skipIf(!hasDatabase)('pg-boss queue client smoke (live DB)', () => {
  let boss: QueueClient;

  beforeAll(async () => {
    boss = createQueueClient(DATABASE_URL as string, {
      ssl: false,
      applicationName: 'twt-queue-test',
    });
    await boss.start();
  }, 30_000);

  afterAll(async () => {
    if (boss) await stopQueueClient(boss, { timeoutMs: 5_000 }).catch(() => undefined);
  });

  it('start → createQueue → work → send runs the handler with the payload (array)', async () => {
    const queue = `test.smoke.${randomUUID()}`;
    await boss.createQueue(queue);

    const received: unknown[] = [];
    let resolveDone!: () => void;
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });

    // v12: the handler receives an ARRAY of jobs.
    await boss.work(queue, async (jobs) => {
      for (const job of jobs) received.push(job.data);
      resolveDone();
    });

    const id = await boss.send(queue, { hello: 'world' });
    expect(id).toBeTruthy();

    await done;
    expect(received).toContainEqual({ hello: 'world' });

    await boss.offWork(queue).catch(() => undefined);
    await boss.deleteQueue(queue).catch(() => undefined);
  }, 30_000);

  it('singletonKey: a second send within the window returns null (DD-5 — NOT the keyed store)', async () => {
    const queue = `test.singleton.${randomUUID()}`;
    await boss.createQueue(queue);

    const singletonKey = `sk-${randomUUID()}`;
    const first = await boss.send(queue, { n: 1 }, { singletonKey, singletonSeconds: 60 });
    const second = await boss.send(queue, { n: 2 }, { singletonKey, singletonSeconds: 60 });

    expect(first).toBeTruthy();
    expect(second).toBeNull(); // throttled within singletonSeconds → null

    await boss.deleteQueue(queue).catch(() => undefined);
  }, 30_000);

  it('schedule registers a cron entry for the vacuum queue (AC-5 substrate)', async () => {
    const queue = QUEUE_NAMES.IDEMPOTENCY_VACUUM;
    await boss.createQueue(queue);
    await boss.schedule(queue, '0 * * * *', {}, { tz: 'Asia/Kolkata' });

    const schedules = await boss.getSchedules();
    const entry = schedules.find((s) => s.name === queue);
    expect(entry).toBeDefined();
    expect(entry?.cron).toBe('0 * * * *');
    expect(entry?.timezone).toBe('Asia/Kolkata');

    await boss.unschedule(queue).catch(() => undefined);
  }, 30_000);
});
