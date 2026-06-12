// Postgres-backed session store for @fastify/session (AC-3 + Dev Note "Fastify
// session store").
//
// `connect-pg-simple` has a documented @fastify/session interop issue
// (fastify/help #604) — so this is a direct implementation: four methods (get,
// set, destroy, touch) over the SAME pg pool the rest of the app uses (single
// pool, no interop bug, aligns with the Postgres-only §1.4 posture). Backed by
// raw parameterized SQL (not the Drizzle query builder) so the framework-landing
// (Task 1) does not couple to the `admin_sessions` Drizzle schema object that
// lands in Task 2 — the table name + (sid, sess, expire) column shape are the
// stable contract. Recorded in ADR-0009.
//
// The whole session object (cookie + auth state) is persisted as JSONB in `sess`;
// `expire` is the absolute expiry the GET path filters on (server-side revocation
// by row delete + automatic expiry — §2.4). The table is GLOBAL (carve-out family,
// Reconciliation R2): a session row is keyed by the human's user id, not a Pariwar.

import type pg from 'pg';

import type { Session } from 'fastify';

type Callback = (err?: unknown) => void;
type GetCallback = (err: unknown, session?: Session | null) => void;

const TABLE = 'admin_sessions';

export interface PgSessionStoreOpts {
  /** Fallback TTL (ms) when a session carries no cookie.expires. */
  fallbackTtlMs: number;
  /** Injectable clock for deterministic expiry in tests. */
  now?: () => Date;
}

/**
 * Compute the absolute `expire` timestamp for a session from its cookie, or fall
 * back to now + fallbackTtlMs. @fastify/session sets `cookie.expires` from the
 * configured cookie maxAge; we honour it so idle/rolling expiry stays consistent.
 */
function expiryOf(session: Session, now: Date, fallbackTtlMs: number): Date {
  const expires = session.cookie?.expires;
  if (expires instanceof Date && !Number.isNaN(expires.getTime())) return expires;
  return new Date(now.getTime() + fallbackTtlMs);
}

/**
 * Structurally satisfies @fastify/session's `SessionStore` (set/get/destroy +
 * optional touch) — passed to the `store` option, which type-checks it by shape.
 * Not declared `implements SessionStore` because that type lives behind the
 * package's `export =` namespace and is not importable from `'fastify'`.
 */
export class PgSessionStore {
  private readonly now: () => Date;

  public constructor(
    private readonly pool: pg.Pool,
    private readonly opts: PgSessionStoreOpts,
  ) {
    this.now = opts.now ?? ((): Date => new Date());
  }

  public set(sessionId: string, session: Session, callback: Callback): void {
    const now = this.now();
    const expire = expiryOf(session, now, this.opts.fallbackTtlMs);
    // userId may be absent for pre-auth sessions; written NULL and populated post-login.
    const userId = (session as unknown as Record<string, unknown>)['userId'] as string | undefined ?? null;
    this.pool
      .query(
        `INSERT INTO ${TABLE} (sid, sess, expire, user_id) VALUES ($1, $2, $3, $4)
           ON CONFLICT (sid) DO UPDATE SET sess = EXCLUDED.sess, expire = EXCLUDED.expire, user_id = EXCLUDED.user_id`,
        [sessionId, JSON.stringify(session), expire.toISOString(), userId],
      )
      .then(() => callback())
      .catch((err: unknown) => callback(err));
  }

  public get(sessionId: string, callback: GetCallback): void {
    const now = this.now();
    this.pool
      .query<{ sess: unknown; expire: Date }>(
        `SELECT sess, expire FROM ${TABLE} WHERE sid = $1`,
        [sessionId],
      )
      .then((res) => {
        const row = res.rows[0];
        if (!row) {
          callback(null, null);
          return;
        }
        // Server-side expiry: an expired row is treated as absent + lazily reaped.
        const expire = row.expire instanceof Date ? row.expire : new Date(row.expire as string);
        if (expire.getTime() <= now.getTime()) {
          this.destroy(sessionId, () => callback(null, null));
          return;
        }
        const sess = (typeof row.sess === 'string' ? JSON.parse(row.sess) : row.sess) as Session;
        callback(null, sess);
      })
      .catch((err: unknown) => callback(err));
  }

  public destroy(sessionId: string, callback: Callback): void {
    this.pool
      .query(`DELETE FROM ${TABLE} WHERE sid = $1`, [sessionId])
      .then(() => callback())
      .catch((err: unknown) => callback(err));
  }

  /** Refresh expiry without rewriting the payload — the rolling-session touch path. */
  public touch(sessionId: string, session: Session, callback: Callback): void {
    const now = this.now();
    const expire = expiryOf(session, now, this.opts.fallbackTtlMs);
    this.pool
      .query(`UPDATE ${TABLE} SET expire = $2 WHERE sid = $1`, [sessionId, expire.toISOString()])
      .then(() => callback())
      .catch((err: unknown) => callback(err));
  }

  /** Delete every session for a user — the FR-56 suspension cascade seam (§2.4). */
  public async destroyForUser(userId: string): Promise<number> {
    const res = await this.pool.query(`DELETE FROM ${TABLE} WHERE user_id = $1`, [userId]);
    return res.rowCount ?? 0;
  }
}
