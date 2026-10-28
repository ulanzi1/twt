// F9 — the hourly idempotency vacuum and the cycle-open recovery sweep, PROVEN live (Story 5.8b, Task 8; deferred-work's 5.8b item
// "Hourly re-fan of a live cycle-open alert — inferred, not run", whose trigger is this task: "prove or disprove the purge, and record
// which"). ⭐ PROVEN: a member's cycle-open claim is RECORDED (`completed`) with the 300 s TTL and `recordResult` ⛔ extends
// `expires_at`, so the production `purgeExpiredKeys` (`DELETE … WHERE expires_at < now()`, ANY status) removes it at the next hourly
// vacuum; the sweep's coverage probe then counts the member as un-notified, and the child's claim for that member is `acquired` AGAIN.
// ⇒ every live cycle-open alert is re-fanned hourly for its live window. For a BRIDGED member the send row keeps the text at most once
// AND (FS3 (a)) the found `accepted` row returns `sent` before the ladder — ⛔ push; an UN-bridged member's push goes again. Recorded in
// deferred-work (8.8's, ⛔ fixed here).
//
// ⚠ The vacuum runs inside a transaction that is ROLLED BACK — on a shared database it must ⛔ purge other suites' rows.

import { randomUUID } from 'node:crypto';

import { idempotency } from '@twt/domain';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS } from '../src/scheduler/contribution-notify-triggers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe.skipIf(!hasDatabase)('F9 — the hourly vacuum purges a RECORDED cycle-open claim (live)', { timeout: 30_000 }, () => {
  let pool: pg.Pool;
  const keys: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3, ssl: false });
  });
  afterAll(async () => {
    try {
      if (keys.length > 0) await pool.query('DELETE FROM idempotency_keys WHERE key = ANY($1)', [keys]);
    } finally {
      await pool.end();
    }
  });

  it('⭐ PROVEN — a claim recorded an hour ago is gone after `purgeExpiredKeys`; the sweep\'s probe no longer counts it; the member is claimed AGAIN', async () => {
    const alertId = randomUUID();
    const memberId = randomUUID();
    const key = `contribution.notify:${alertId}:${memberId}:cycle_open`;
    keys.push(key);
    const anHourAgo = new Date(Date.now() - 60 * 60_000);
    // The child's own calls, an hour ago: claim with the cycle-open TTL, then record the result (the member WAS notified).
    const then = idempotency.createKeyedStore(pool, { clock: () => anHourAgo });
    expect(await then.claim(key, DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS)).toBe('acquired');
    await then.recordResult(key, { delivered: true, outcome: 'delivered' });
    const probe = `SELECT count(*)::int AS n FROM idempotency_keys k WHERE k.key LIKE 'contribution.notify:' || $1 || ':%:cycle_open'`;
    expect((await pool.query<{ n: number }>(probe, [alertId])).rows[0]!.n).toBe(1);
    const row = (await pool.query<{ status: string; expired: boolean }>(`SELECT status, expires_at < now() AS expired FROM idempotency_keys WHERE key = $1`, [key])).rows[0];
    expect(row).toEqual({ status: 'completed', expired: true }); // recordResult did ⛔ extend expires_at

    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      // The production vacuum, on this transaction's client only.
      const purged = await idempotency.purgeExpiredKeys({ query: (sql: string) => c.query(sql) } as unknown as pg.Pool);
      expect(purged).toBeGreaterThanOrEqual(1);
      expect((await c.query<{ n: number }>(probe, [alertId])).rows[0]!.n).toBe(0); // the sweep would re-enqueue this alert
      await c.query('ROLLBACK');
    } finally {
      c.release();
    }

    // …and once purged, the child's claim for the SAME member is acquired again (the re-fan) — shown on a key of our own.
    const again = `contribution.notify:${randomUUID()}:${memberId}:cycle_open`;
    keys.push(again);
    const store = idempotency.createKeyedStore(pool);
    expect(await store.claim(again, DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS)).toBe('acquired');
    await pool.query('DELETE FROM idempotency_keys WHERE key = $1', [again]);
    expect(await store.claim(again, DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS)).toBe('acquired');
  });
});
