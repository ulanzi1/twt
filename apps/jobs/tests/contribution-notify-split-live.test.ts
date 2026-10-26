// AP-P1: exercise the registered conversion against pg-boss's real STANDARD queue and primary key.
// R4-P2 (review 2026-10-26): the conversion is ONE atomic `insert` — a failure enqueues NONE of the bounded jobs.
import { randomUUID } from 'node:crypto';

import { QUEUE_NAMES } from '@twt/queue';
import pg from 'pg';
import { PgBoss } from 'pg-boss';
import { describe, expect, it, vi } from 'vitest';

import { registerContributionNotifyWorkers } from '../src/scheduler/contribution-notify-triggers.js';

const DATABASE_URL = process.env['DATABASE_URL'];

describe.skipIf(!DATABASE_URL)('AP-P1 — legacy split redelivery on a real standard queue', () => {
  it('a failed split enqueues nothing; redelivery never recreates a child (even a completed one); a new parent retains its own budget', { timeout: 60_000 }, async () => {
    const schema = `split_${randomUUID().replaceAll('-', '')}`;
    const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
    const boss = new PgBoss({ connectionString: DATABASE_URL!, schema, supervise: false, schedule: false });
    boss.on('error', () => undefined);
    try {
      await boss.start();
      const handlers = new Map<string, (jobs: unknown[]) => Promise<unknown>>();
      let failInsert = true;
      const adapter = {
        createQueue: boss.createQueue.bind(boss),
        schedule: vi.fn(async () => undefined),
        work: vi.fn(async (name: string, a: unknown, b?: unknown) => {
          handlers.set(name, (typeof a === 'function' ? a : b) as never);
          return 'captured';
        }),
        send: boss.send.bind(boss),
        // The failure is injected INSIDE the real statement (narrow review of R4): the LAST job carries an id that is not a
        // uuid, so PostgreSQL rejects the one INSERT … SELECT — proving all or nothing, ⛔ a throw before pg-boss is called.
        insert: async (name: string, jobs: Parameters<typeof boss.insert>[1], options?: Parameters<typeof boss.insert>[2]) =>
          boss.insert(name, failInsert ? jobs.map((j, i) => (i === jobs.length - 1 ? { ...j, id: 'not-a-uuid' } : j)) : jobs, options),
      };
      // Conversion never enters member fan-out; no providers or domain writes should be needed.
      await registerContributionNotifyWorkers(adapter as never, { onAlarm: vi.fn() } as never);
      const run = handlers.get(QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH)!;
      const job = { id: randomUUID(), retryCount: 0, retryLimit: 4, data: {
        pariwarId: randomUUID(), requestId: randomUUID(), payload: {
          kind: 'pending_match_escalated', alertId: randomUUID(), poolId: randomUUID(), cycleId: randomUUID(),
          memberIds: Array.from({ length: 17 }, () => randomUUID()), timeCritical: false,
        },
      } };
      const rows = () => pool.query<{ id: string; state: string; retry_limit: number }>(
        `SELECT id, state, retry_limit FROM "${schema}".job WHERE name = $1 ORDER BY id`,
        [QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH],
      );
      await expect(run([job])).rejects.toThrow(/uuid/);
      expect((await rows()).rows).toHaveLength(0); // ⛔ a prefix: the first two jobs were valid, the statement failed whole
      failInsert = false;
      await run([{ ...job, retryCount: 1 }]);
      const firstChild = await boss.fetch(QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH);
      expect(firstChild).toHaveLength(1);
      await boss.complete(QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH, firstChild[0]!.id);
      const afterRetry = (await rows()).rows;
      expect(afterRetry).toHaveLength(3);
      expect(afterRetry.find(row => row.id === firstChild[0]!.id)?.state).toBe('completed');
      expect(afterRetry.every(row => row.retry_limit === 4)).toBe(true);
      // A redelivered source job (its completion lost) inserts the SAME ids: `ON CONFLICT DO NOTHING` — the completed child stays.
      await run([{ ...job, retryCount: 2 }]);
      expect((await rows()).rows).toEqual(afterRetry);
      await run([{ ...job, id: randomUUID() }]);
      expect((await rows()).rows).toHaveLength(6);
    } finally {
      await boss.stop({ graceful: false });
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await pool.end();
    }
  });
});
