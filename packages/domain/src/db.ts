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
  /** pg.Pool connectionTimeoutMillis. Default 10s — fail fast on stalled proxy or partition. */
  connectionTimeoutMillis?: number;
  /** Drizzle query-logging toggle; default reads DRIZZLE_LOG_QUERIES === '1'. */
  logger?: boolean;
  /**
   * Override SSL config. Default: { rejectUnauthorized: false }.
   *
   * This default is intentional for the Cloud SQL Auth Proxy topology: the proxy
   * runs on localhost (127.0.0.1) and handles mutual-TLS with Cloud SQL itself,
   * so there is no server cert to verify on the loopback socket. For direct
   * private-IP connections without the proxy, pass `ssl: true` (or a full
   * tls.ConnectionOptions object) to enable cert verification.
   */
  ssl?: pg.PoolConfig['ssl'];
}

export interface CreatedDb {
  db: Db;
  pool: pg.Pool;
}

export function createDb(connectionString: string, options: CreateDbOptions = {}): CreatedDb {
  if (!connectionString) {
    throw new Error('[createDb] connectionString must not be empty');
  }

  const pool = new pg.Pool({
    connectionString,
    max: options.max ?? 10,
    idleTimeoutMillis: options.idleTimeoutMillis ?? 30_000,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 10_000,
    ssl: options.ssl ?? { rejectUnauthorized: false },
  });

  // Attach an error handler so idle-client errors from Cloud SQL (e.g., server-
  // side connection termination) do not crash the Node process as an unhandled
  // EventEmitter error. Only `code` + `message` are logged — `pg` error objects
  // may include connection-config fragments or query text in some failure modes.
  pool.on('error', (err: Error & { code?: string }) => {
    console.error('[db] pool idle-client error:', err.code ?? 'NO_CODE', err.message);
  });

  const db = drizzle(pool, {
    schema,
    logger: options.logger ?? process.env['DRIZZLE_LOG_QUERIES'] === '1',
  });

  return { db, pool };
}
