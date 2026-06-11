// Integration-test substrate — per-test transaction-rollback isolation.
//
// Relocated from packages/events/tests/integration-setup.ts at Story 1.6 so both
// @twt/domain and @twt/events consume one per-test transaction lifecycle. The
// old path is now a thin re-export (preserving the Story 1.3 test imports).
//
// Each vitest test acquires a dedicated pg client, opens a transaction, runs
// against a drizzle handle bound to that transaction, and ROLLBACKs in
// afterEach. The append-only triggers installed by migration 0001 block DELETE
// / TRUNCATE for cleanup — transaction-rollback is the only mechanism that keeps
// events_log clean. Story 1.6's RLS policies do NOT change this contract: the
// test login role (twt_dev_app) is a Docker/CI superuser and bypasses RLS, so
// the Story 1.3 events tests run unchanged; the RLS-enforcement tests explicitly
// `SET LOCAL ROLE twt_app` on ctx.client to shed superuser before asserting
// policy behaviour (see packages/domain/tests/integration/).
//
// Tests SKIP when DATABASE_URL is unset (so local `pnpm test` passes without
// Docker). Story 1.6 adds the live-DB CI substrate (the integration-tests job in
// .github/workflows/ci.yml) that sets DATABASE_URL so these run in CI.
//
// IMPORTANT: run integration tests with --pool=forks (not --pool=threads) so
// each test file gets its own Node.js process and module scope. The pool and
// activeClient variables are local to each setupLiveDb() invocation, but the
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
//     pnpm --filter @twt/domain test
//   DATABASE_URL=… pnpm --filter @twt/events test

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

import type { Db } from '../db.js';
import * as schema from '../schema/index.js';

export const DATABASE_URL = process.env['DATABASE_URL'];
export const hasDatabase = Boolean(DATABASE_URL);

/**
 * Per-test handle: a transaction-bound drizzle Db. All queries run inside a
 * single connection's BEGIN/ROLLBACK envelope so test mutations never persist
 * (and the no-update / no-delete / no-truncate triggers don't block cleanup).
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
 * Wire the per-test transaction lifecycle into a vitest describe block. Call
 * from the top of every integration test file.
 *
 * pool and activeClient are scoped locally to each setupLiveDb() invocation so
 * multiple describe blocks (or test files in fork mode) don't share state.
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
    let acquired: pg.PoolClient | null = null;
    try {
      acquired = await pool.connect();
      await acquired.query('BEGIN');
      const tx = drizzle(acquired, { schema }) as unknown as Db;
      txContext.current = { tx, client: acquired };
      activeClient = acquired;
    } catch (err) {
      // Release the client if connect() succeeded but BEGIN (or drizzle setup) failed;
      // without this the pool connection leaks and subsequent tests starve (review P4).
      if (acquired) acquired.release();
      txContext.current = null;
      throw err;
    }
  });

  afterEach(async () => {
    if (!activeClient) return;
    let destroyOnRelease = false;
    try {
      await activeClient.query('ROLLBACK');
    } catch {
      // ROLLBACK failure (e.g., broken TCP) — destroy the connection so a broken
      // transaction is not returned to the pool for the next test (review P5).
      // Optional catch binding (no error var) — the failure mode is identified by
      // the comment, not the error object, and an unused `_err` binding trips
      // @typescript-eslint/no-unused-vars (caughtErrors: 'all'); fixes the
      // baseline lint failure committed in Story 1.6 (PR #12).
      destroyOnRelease = true;
    } finally {
      activeClient.release(destroyOnRelease);
      activeClient = null;
      txContext.current = null;
    }
  });
}
