// Idempotency keyed-store live-DB integration tests — Story 1.12 (Task 7, AC-2/AC-4/AC-5).
//
// These prove the advisory-lock + ON CONFLICT claim race, the replay path, expiry
// reclaim, and the TTL vacuum AGAINST A REAL POSTGRES — the mechanics cannot be
// exercised by mocks.
//
// ⚠ Own-committing, NOT setupLiveDb (Story 1.12 Testing note + [[project_live_db_test_gotchas]]):
// the claim race needs REAL concurrent transactions on SEPARATE pool clients, so
// these run their OWN pool and the keyed store commits its own transactions. They
// therefore CANNOT use setupLiveDb's single per-test rollback tx. Cleanup is by the
// specific known keys this suite created (idempotency_keys is MUTABLE — DELETE works,
// no append-only trigger). Assertions key on membership / our own keys, never on
// absolute row counts (the shared live DB accumulates rows across suites).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createKeyedStore, purgeExpiredKeys } from '../../../src/idempotency/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe.skipIf(!hasDatabase)('idempotency keyed store (live DB, own-committing)', () => {
  let pool: pg.Pool;
  const createdKeys: string[] = [];

  function track(key: string): string {
    createdKeys.push(key);
    return key;
  }

  beforeAll(() => {
    pool = new pg.Pool({
      connectionString: DATABASE_URL,
      max: 12,
      ssl: false,
      connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => {
      console.error('[keyed-store.spec] idle client error:', err.message);
    });
  });

  afterAll(async () => {
    if (createdKeys.length > 0) {
      await pool
        .query('DELETE FROM idempotency_keys WHERE key = ANY($1)', [createdKeys])
        .catch(() => undefined);
    }
    await pool.end();
  });

  it('N concurrent claim(key) → exactly one acquired, the rest already_claimed', async () => {
    const store = createKeyedStore(pool);
    const key = track(`test:concurrent:${randomUUID()}`);
    const N = 8;

    const outcomes = await Promise.all(Array.from({ length: N }, () => store.claim(key, 60)));

    expect(outcomes.filter((o) => o === 'acquired')).toHaveLength(1);
    expect(outcomes.filter((o) => o === 'already_claimed')).toHaveLength(N - 1);
  });

  it('recordResult then getResult returns the stored result (null while pending)', async () => {
    const store = createKeyedStore(pool);
    const key = track(`test:record:${randomUUID()}`);

    expect(await store.claim(key, 60)).toBe('acquired');
    expect(await store.getResult(key)).toBeNull(); // pending → no result yet

    const result = { ok: true, value: 42, nested: { a: 'x' }, list: [1, 2, 3] };
    await store.recordResult(key, result);
    expect(await store.getResult(key)).toEqual(result);
  });

  it('AC-4: run twice with the same key → ONE execution, both observe the same result', async () => {
    const store = createKeyedStore(pool);
    const key = track(`test:ac4:${randomUUID()}`);
    let executions = 0;

    async function runOnce(): Promise<unknown> {
      const outcome = await store.claim(key, 60);
      if (outcome === 'acquired') {
        executions += 1;
        const result = { runId: randomUUID(), executions };
        await store.recordResult(key, result);
        return result;
      }
      return store.getResult(key);
    }

    const first = await runOnce();
    const second = await runOnce();

    expect(executions).toBe(1);
    expect(second).toEqual(first);
  });

  it('AC-4 concurrent: two simultaneous runs of the same key → one execution', async () => {
    const store = createKeyedStore(pool);
    const key = track(`test:ac4-concurrent:${randomUUID()}`);
    let executions = 0;

    async function runOnce(): Promise<unknown> {
      const outcome = await store.claim(key, 60);
      if (outcome === 'acquired') {
        executions += 1;
        const result = { value: `run-${executions}` };
        await store.recordResult(key, result);
        return result;
      }
      // Loser must wait for the winner to record (it may observe pending briefly).
      for (let i = 0; i < 50; i += 1) {
        const r = await store.getResult(key);
        if (r !== null) return r;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      return null;
    }

    const [a, b] = await Promise.all([runOnce(), runOnce()]);
    expect(executions).toBe(1);
    // Both callers must observe the same non-null result (AC-4).
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a).toEqual(b);
  });

  it('expired key is reclaimable (path b); a live key is not (path c)', async () => {
    const key = track(`test:expired:${randomUUID()}`);
    let nowMs = Date.UTC(2026, 0, 1, 0, 0, 0);
    const store = createKeyedStore(pool, { clock: () => new Date(nowMs) });

    expect(await store.claim(key, 10)).toBe('acquired'); // t0, expires t0+10s
    expect(await store.claim(key, 10)).toBe('already_claimed'); // still live
    nowMs += 11_000; // advance past expiry
    expect(await store.claim(key, 10)).toBe('acquired'); // reclaimed
  });

  it('getResult returns null for an expired completed key (AC-2 "null if expired")', async () => {
    const key = track(`test:expired-result:${randomUUID()}`);
    let nowMs = Date.UTC(2026, 0, 2, 0, 0, 0);
    const store = createKeyedStore(pool, { clock: () => new Date(nowMs) });

    expect(await store.claim(key, 10)).toBe('acquired');
    await store.recordResult(key, { v: 1 });
    expect(await store.getResult(key)).toEqual({ v: 1 });

    nowMs += 11_000; // past expiry
    expect(await store.getResult(key)).toBeNull();
  });

  it('recordResult on an unclaimed/absent key throws', async () => {
    const store = createKeyedStore(pool);
    const key = `test:unclaimed:${randomUUID()}`; // never claimed → no row to complete
    await expect(store.recordResult(key, { x: 1 })).rejects.toThrow(/unclaimed|expired/i);
  });

  it('purgeExpiredKeys deletes expired keys but not live ones (vacuum, AC-5)', async () => {
    const expiredKey = track(`test:purge:expired:${randomUUID()}`);
    const liveKey = track(`test:purge:live:${randomUUID()}`);

    // Expired: claim with a clock far in the PAST so expires_at < DB now() (purge
    // uses the DB clock, not the injected one).
    const pastStore = createKeyedStore(pool, { clock: () => new Date(Date.UTC(2000, 0, 1)) });
    expect(await pastStore.claim(expiredKey, 10)).toBe('acquired');

    // Live: real clock + long ttl → expires_at well in the future.
    const liveStore = createKeyedStore(pool);
    expect(await liveStore.claim(liveKey, 3600)).toBe('acquired');

    const deleted = await purgeExpiredKeys(pool);
    expect(deleted).toBeGreaterThanOrEqual(1); // membership — shared DB may have other expired rows

    const expiredRows = await pool.query('SELECT 1 FROM idempotency_keys WHERE key = $1', [
      expiredKey,
    ]);
    expect(expiredRows.rowCount).toBe(0);
    const liveRows = await pool.query('SELECT 1 FROM idempotency_keys WHERE key = $1', [liveKey]);
    expect(liveRows.rowCount).toBe(1);
  });
});
