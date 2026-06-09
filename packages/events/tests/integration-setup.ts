// Integration-test substrate — per-test transaction-rollback isolation.
//
// Story 1.3 Task 5.6 choice (a): each vitest test acquires a dedicated pg
// client, opens a transaction, runs against a drizzle handle bound to that
// transaction, and ROLLBACKs in afterEach. The triggers installed by
// migration 0001 block DELETE / TRUNCATE for cleanup — transaction-rollback
// is the only mechanism that keeps the table clean.
//
// Tests SKIP when DATABASE_URL is unset (CI default at Story 1.3 — Story 1.6
// adds the live-DB CI substrate per deferred-work D2-1.3).
//
// IMPORTANT: run integration tests with --pool=forks (not --pool=threads) so
// each test file gets its own Node.js process and module scope. The pool and
// activeClient variables are local to each setupLiveDb() invocation but the
// module-level txContext is shared within a process — forks isolation prevents
// concurrent test files from racing on that shared state.
//
// Local invocation:
//   docker run --rm -d -p 5433:5432 \
//     -e POSTGRES_USER=twt_dev_app \
//     -e POSTGRES_PASSWORD=devpass \
//     -e POSTGRES_DB=twt_dev \
//     --name twt-test-pg postgres:16-alpine
//
//   DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable \
//     pnpm --filter @twt/domain db:migrate
//
//   DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable \
//     pnpm --filter @twt/events test

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

import { schema, type Db } from '@twt/domain';

export const DATABASE_URL = process.env['DATABASE_URL'];
export const hasDatabase = Boolean(DATABASE_URL);

/**
 * Per-test handle: a transaction-bound drizzle Db. All queries run inside
 * a single connection's BEGIN/ROLLBACK envelope so test mutations never
 * persist (and the no-update / no-delete / no-truncate triggers don't
 * block cleanup).
 */
export interface TxContext {
  tx: Db;
  /** The raw pg client backing tx — for tests that need to drive raw SQL. */
  client: pg.PoolClient;
}

const txContext: { current: TxContext | null } = { current: null };

export function getTx(): TxContext {
  if (!txContext.current) {
    throw new Error(
      'integration-setup: tx is null; setupLiveDb() must be called inside describe',
    );
  }
  return txContext.current;
}

/**
 * Wire the per-test transaction lifecycle into a vitest describe block.
 * Call from the top of every integration test file.
 *
 * pool and activeClient are scoped locally to each setupLiveDb() invocation
 * so multiple describe blocks (or test files in fork mode) don't share state.
 */
export function setupLiveDb(): void {
  // Local to this invocation — not module-level globals.
  let pool: pg.Pool | null = null;
  let activeClient: pg.PoolClient | null = null;

  beforeAll(() => {
    if (!hasDatabase) return;
    pool = new pg.Pool({
      connectionString: DATABASE_URL,
      max: 4,
      ssl: false,
      connectionTimeoutMillis: 5000,
    });
    // Prevent uncaught idle-client errors from crashing the test process
    // (same pattern as packages/domain/src/db.ts per Story 1.2 review P7).
    pool.on('error', (err) => {
      console.error('[integration-setup] idle client error:', err.message);
    });
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
      pool = null;
    }
  });

  beforeEach(async () => {
    if (!hasDatabase || !pool) return;
    try {
      activeClient = await pool.connect();
    } catch (err) {
      txContext.current = null;
      throw err;
    }
    await activeClient.query('BEGIN');
    const tx = drizzle(activeClient, { schema }) as unknown as Db;
    txContext.current = { tx, client: activeClient };
  });

  afterEach(async () => {
    if (!activeClient) return;
    try {
      await activeClient.query('ROLLBACK');
    } finally {
      activeClient.release();
      activeClient = null;
      txContext.current = null;
    }
  });
}
