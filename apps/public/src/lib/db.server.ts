// The public surface's own DB pool + the unauthenticated read-scope helper
// (Story 2.5, Dev Notes §"Data path"; AC8).
//
// `apps/public` owns its OWN pool (its own `DATABASE_URL`) per the per-workspace
// pool-isolation principle — it never shares apps/api's pool. The pool is
// constructed via `@twt/domain`'s `createDb` (NOT a raw `new pg.Pool()` — the
// shared lint rule keeps pool construction in the data layer), so no `pg` value
// import appears here. `*.server.ts` ⇒ server-only: never in a client island graph.
//
// `withPublicScope` is the public, UNAUTHENTICATED read counterpart of apps/api's
// `openScopeTx`: BEGIN → `SET LOCAL ROLE twt_app` (shed any superuser login so RLS
// is genuinely enforced — the AC8 "scope tx pattern, NOT a superuser bypass") →
// `setPariwarScope` → run the read on the scope-bound handle → COMMIT/ROLLBACK +
// release. There is NO session and NO auth boundary (Story 2.5 ships zero
// authenticated fragments); the only data crossing is public-tier Niyamavali content.
import { bindScopedDb, createDb, type Db, setPariwarScope } from '@twt/domain';
import type pg from 'pg';

import { ACTIVE_PARIWAR_ID } from './pariwar.server.js';

let cached: { db: Db; pool: pg.Pool } | null = null;

/** Lazily construct (and memoise) the per-process pool from `DATABASE_URL`. */
export function getDb(): { db: Db; pool: pg.Pool } {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url || url.length === 0) {
    throw new Error('[apps/public] DATABASE_URL is required to render public pages');
  }
  cached = createDb(url);
  return cached;
}

/**
 * Run a read under the active Pariwar's RLS scope as `twt_app`. The callback
 * receives a transaction-bound Drizzle handle; the tx is read-only by intent and
 * always rolled back (a public render never writes), then the client is released.
 */
export async function withPublicScope<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const { pool } = getDb();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app'); // shed superuser → RLS applies (AC8)
    await setPariwarScope(client, ACTIVE_PARIWAR_ID); // strict-UUID re-parse + SET LOCAL
    const result = await fn(bindScopedDb(client));
    await client.query('ROLLBACK'); // read-only render — nothing to persist
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
