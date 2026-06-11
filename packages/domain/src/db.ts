// Drizzle client factory bound to a node-postgres pool.
//
// Each workspace (apps/api, apps/jobs, …) invokes this factory with its own
// connection string so pools are NOT shared across workspaces — per-workspace
// pool isolation principle per architecture §1.1 line 706-710. Production
// pool-sizing belongs to operations policy + Category 5 commitments; the
// defaults below are placeholders, not ceilings.

import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { InvalidPariwarScopeError, PariwarScopeMissingError } from './errors.js';
import * as schema from './schema/index.js';

export type DbSchema = typeof schema;
export type Db = NodePgDatabase<DbSchema>;

/**
 * RFC-shaped UUID matcher (any version). Matches the Story 1.4 `_common`
 * `UuidString` semantics (`z.string().uuid()`); intentionally simple — no
 * version-bit check, since Story 1.3 emits v4 (`gen_random_uuid()`) and
 * downstream Stories may supply v7/v8 UUIDs. Also structurally rejects the
 * single-quote / semicolon characters that would matter for the SET LOCAL
 * interpolation in setPariwarScope below.
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/**
 * Sets the `app.pariwar_id` session variable that the events_log RLS policies
 * key on (architecture §1.2 line 753-756). Re-parses `pariwarId` as a strict
 * UUID; throws InvalidPariwarScopeError on failure — a second independent guard
 * (alongside the apps/api middleware's own parse) against an auth bug that
 * passes an attacker-controlled value.
 *
 * ⚠ MUST be called INSIDE an active transaction (`BEGIN` already issued).
 * `SET LOCAL` is transaction-scoped — outside a tx it behaves like `SET` and the
 * value persists for the connection's lifetime, leaking pariwarId to the next
 * request that receives the same pooled client. Story 1.9's scope-resolution
 * middleware MUST open a transaction before calling this. `withPariwarScope`
 * below is safe (opens its own tx).
 *
 * Note on the production role posture: in production the connection runs as the
 * non-superuser application login role (a member of `twt_app`), so the RLS
 * policies apply directly. In local Docker / CI the login role is a superuser
 * and bypasses RLS — integration tests `SET LOCAL ROLE twt_app` to shed
 * superuser before asserting policy behaviour (see the test-utils helper).
 */
export async function setPariwarScope(
  client: pg.PoolClient,
  pariwarId: string,
): Promise<void> {
  if (!UUID_REGEX.test(pariwarId)) {
    throw new InvalidPariwarScopeError(pariwarId);
  }
  // UUID_REGEX structurally rejects quote/semicolon chars; single-quote
  // interpolation is safe. (SET LOCAL does not accept bind parameters in all
  // pg versions; the regex guard is the injection defense — see deferred D7-1.6.)
  await client.query(`SET LOCAL app.pariwar_id = '${pariwarId.toLowerCase()}'`);
}

/**
 * Connection-level fail-closed guard (architecture §1.2 line 749-751). Reads
 * back `app.pariwar_id`; throws PariwarScopeMissingError when unset,
 * InvalidPariwarScopeError when not a valid UUID. Call as the FIRST DB query in
 * a request handler to ensure scope-resolution middleware ran — it fails loudly
 * before any policy-relying query executes. (The DB-layer RLS policy is the
 * QUIET fail-closed — an unset scope returns 0 rows; this helper is the LOUD
 * complement that turns "silently empty" into an explicit error.)
 */
export async function assertPariwarScopeSet(client: pg.PoolClient): Promise<string> {
  const { rows } = await client.query<{ pariwar_id: string }>(
    `SELECT current_setting('app.pariwar_id', true) AS pariwar_id`,
  );
  const value = rows[0]?.pariwar_id ?? '';
  if (value === '') throw new PariwarScopeMissingError();
  if (!UUID_REGEX.test(value)) throw new InvalidPariwarScopeError(value);
  return value;
}

/**
 * Higher-order wrapper for scripts/jobs: checks out a client, opens a
 * transaction, calls setPariwarScope, runs the callback against a
 * transaction-bound Drizzle handle, commits (or rolls back on throw).
 *
 * ⚠ Commits its own transaction — CANNOT be nested inside the per-test rollback
 * isolation of setupLiveDb. For integration tests requiring rollback isolation,
 * drive `ctx.client` from setupLiveDb with raw `SET LOCAL` instead (see the
 * Story 1.6 "Per-test isolation choice" dev note).
 */
export async function withPariwarScope<T>(
  pool: pg.Pool,
  pariwarId: string,
  fn: (db: Db, client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setPariwarScope(client, pariwarId);
    const tx = drizzle(client, { schema }) as unknown as Db;
    const result = await fn(tx, client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
