// Unit test for the createDb factory's pool-config shape.
//
// No live DB connection — pg.Pool is mocked. Asserts that defaults match the
// architecture-committed values + that overrides flow through unchanged.
// Integration tests against a live DB land downstream (Story 1.3 + 1.6 + 3.1+).

import { describe, expect, it, vi } from 'vitest';

const poolCtorSpy = vi.fn();
const drizzleSpy = vi.fn();

vi.mock('pg', () => ({
  default: {
    Pool: vi.fn().mockImplementation((cfg: unknown) => {
      poolCtorSpy(cfg);
      return { __isMockPool: true, end: vi.fn().mockResolvedValue(undefined) };
    }),
  },
}));

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: (pool: unknown, opts: unknown) => {
    drizzleSpy(pool, opts);
    return { __isMockDrizzle: true };
  },
}));

const CONN = 'postgresql://app:secret@127.0.0.1:5432/db?sslmode=require';

describe('createDb', () => {
  it('builds a pool with defaults (max=10, idleTimeout=30s, ssl rejectUnauthorized=false)', async () => {
    const { createDb } = await import('../src/db');

    createDb(CONN);

    expect(poolCtorSpy).toHaveBeenCalledTimes(1);
    expect(poolCtorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: CONN,
        max: 10,
        idleTimeoutMillis: 30_000,
        ssl: { rejectUnauthorized: false },
      }),
    );
  });

  it('respects overrides for max / idleTimeoutMillis / ssl', async () => {
    poolCtorSpy.mockClear();
    const { createDb } = await import('../src/db');

    createDb(CONN, { max: 4, idleTimeoutMillis: 5_000, ssl: false });

    expect(poolCtorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ max: 4, idleTimeoutMillis: 5_000, ssl: false }),
    );
  });

  it('reads DRIZZLE_LOG_QUERIES env var for default logger toggle', async () => {
    const original = process.env['DRIZZLE_LOG_QUERIES'];
    process.env['DRIZZLE_LOG_QUERIES'] = '1';
    drizzleSpy.mockClear();

    const { createDb } = await import('../src/db');
    createDb(CONN);

    expect(drizzleSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ logger: true }),
    );

    if (original === undefined) delete process.env['DRIZZLE_LOG_QUERIES'];
    else process.env['DRIZZLE_LOG_QUERIES'] = original;
  });
});
