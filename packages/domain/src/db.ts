// Drizzle client factory bound to a node-postgres pool.
//
// Each workspace (apps/api, apps/jobs, …) invokes this factory with its own
// connection string so pools are NOT shared across workspaces — per-workspace
// pool isolation principle per architecture §1.1 line 706-710. Production
// pool-sizing belongs to operations policy + Category 5 commitments; the
// defaults below are placeholders, not ceilings.

import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from './schema/index.js';

export type DbSchema = typeof schema;
export type Db = NodePgDatabase<DbSchema>;

export interface CreateDbOptions {
  /**
   * pg.Pool max-connection ceiling. Default 10.
   * Per-workspace pool sizing is operations policy; this default is a placeholder.
   */
  max?: number;
  /** pg.Pool idleTimeoutMillis. Default 30s. */
  idleTimeoutMillis?: number;
  /** Drizzle query-logging toggle; default reads DRIZZLE_LOG_QUERIES === '1'. */
  logger?: boolean;
  /** Override SSL config (e.g., for local Postgres without TLS). */
  ssl?: pg.PoolConfig['ssl'];
}

export interface CreatedDb {
  db: Db;
  pool: pg.Pool;
}

export function createDb(connectionString: string, options: CreateDbOptions = {}): CreatedDb {
  const pool = new pg.Pool({
    connectionString,
    max: options.max ?? 10,
    idleTimeoutMillis: options.idleTimeoutMillis ?? 30_000,
    ssl: options.ssl ?? { rejectUnauthorized: false },
  });

  const db = drizzle(pool, {
    schema,
    logger: options.logger ?? process.env['DRIZZLE_LOG_QUERIES'] === '1',
  });

  return { db, pool };
}
