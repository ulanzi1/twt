// Idempotency keyed store — Story 1.12 (Task 3, AC-2 / AC-4 / DD-2).
//
// The replay-safe primitive every downstream queue consumer reuses to make its
// handler run-once. The flow:
//
//   const outcome = await store.claim(key, ttlSeconds);
//   if (outcome === 'acquired') {        // we own this key — do the work once
//     const result = await doWork();
//     await store.recordResult(key, result);
//   } else {                              // someone else already ran it
//     const result = await store.getResult(key);  // observe their result (AC-4)
//   }
//
// ── Mechanism (DD-2) ──────────────────────────────────────────────────────────
// `claim` runs inside its OWN short transaction on a dedicated pool client:
//   1. `pg_advisory_xact_lock(hashtext(key))` serializes concurrent claimants of
//      the SAME key (the lock auto-releases at COMMIT/ROLLBACK — no leak), closing
//      the TOCTOU gap between the INSERT-conflict and the SELECT/UPDATE below.
//   2. `INSERT … ON CONFLICT (key) DO NOTHING`. rowCount === 1 → we inserted →
//      'acquired' (path a).
//   3. On conflict, inspect the existing row: if it is EXPIRED, reclaim it via
//      UPDATE → 'acquired' (path b); otherwise it is a live claim → 'already_claimed'
//      (path c).
// The claim transaction COMMITS independently of any caller transaction: an
// idempotency claim MUST be durable even if the caller's own work later rolls back
// or the process crashes — the TTL is what makes a crashed/abandoned claim
// reclaimable (path b).
//
// ── Clock injection (architecture L3911-3915) ─────────────────────────────────
// `expires_at` / `created_at` / `completed_at` derive from the injected `clock`, not
// a bare `new Date()` in the query path. Tests drive a controllable clock to prove
// expiry/reclaim deterministically. The default `() => new Date()` is the sanctioned
// injection seam (the composition-root clock) — business logic below only ever calls
// `clock()`.
//
// ── TTL sizing (caller contract) ──────────────────────────────────────────────
// `ttlSeconds` MUST exceed the maximum handler runtime for the key. If a handler
// runs longer than its TTL, the key can expire mid-execution and be reclaimed by a
// concurrent caller (path b) — at which point `recordResult` would complete the
// OTHER caller's claim. Size the TTL with headroom; this is documented in the
// job-queue runbook.

import type pg from 'pg';

/** Outcome of `claim`: we acquired the key (run the work) or someone else holds it. */
export type ClaimOutcome = 'acquired' | 'already_claimed';

/** The replay-safe keyed-store operations (AC-2). */
export interface KeyedStore {
  /**
   * Attempt to claim `key` for `ttlSeconds`. Returns `'acquired'` if this caller
   * now owns the key (a fresh insert OR a reclaim of an expired key), or
   * `'already_claimed'` if a live claim exists. Serialized per-key by an advisory
   * lock; commits its own transaction.
   */
  claim(key: string, ttlSeconds: number): Promise<ClaimOutcome>;
  /**
   * Persist `result` for a previously-claimed `key` (status → 'completed'). Throws
   * if the key is absent (never claimed, or expired + vacuumed mid-execution — a
   * signal the TTL was too short).
   */
  recordResult(key: string, result: unknown): Promise<void>;
  /**
   * Return the stored result for a completed, non-expired `key`, or `null` if there
   * is none / it expired (AC-2). The replay path the second caller uses (AC-4).
   */
  getResult(key: string): Promise<unknown>;
}

export interface KeyedStoreOptions {
  /**
   * Time source for `expires_at` / `created_at` / `completed_at`. Inject a fixed
   * clock in tests; defaults to the real wall clock (the DI seam). Architecture
   * forbids bare `new Date()` in the query path — everything below calls `clock()`.
   */
  clock?: () => Date;
}

/** Thrown by `recordResult` when the key no longer exists (see method doc). */
export class IdempotencyKeyNotClaimedError extends Error {
  readonly key: string;
  constructor(key: string) {
    super(
      `[idempotency] recordResult called for an unclaimed/expired key — claim it first ` +
        `and ensure ttlSeconds exceeds the handler runtime`,
    );
    this.name = 'IdempotencyKeyNotClaimedError';
    this.key = key;
  }
}

function assertKey(key: string): void {
  if (typeof key !== 'string' || key.length === 0) {
    throw new TypeError('[idempotency] key must be a non-empty string');
  }
}

/**
 * Construct a keyed store bound to a node-postgres pool. The store checks out a
 * client per operation and manages its own transactions — do NOT pass a
 * request-scoped client (claim must commit independently of the caller's tx).
 */
export function createKeyedStore(pool: pg.Pool, options: KeyedStoreOptions = {}): KeyedStore {
  const clock = options.clock ?? (() => new Date());

  async function claim(key: string, ttlSeconds: number): Promise<ClaimOutcome> {
    assertKey(key);
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      throw new RangeError('[idempotency] ttlSeconds must be a positive, finite number');
    }

    const now = clock();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Serialize concurrent claimants of the SAME key; auto-released at COMMIT.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);

      const inserted = await client.query(
        `INSERT INTO idempotency_keys (key, status, created_at, expires_at)
         VALUES ($1, 'pending', $2, $3)
         ON CONFLICT (key) DO NOTHING`,
        [key, now, expiresAt],
      );
      if (inserted.rowCount === 1) {
        await client.query('COMMIT');
        return 'acquired'; // path (a): fresh claim
      }

      // Conflict: a row already exists under the lock. Inspect its expiry.
      const existing = await client.query<{ expires_at: Date }>(
        `SELECT expires_at FROM idempotency_keys WHERE key = $1`,
        [key],
      );
      const row = existing.rows[0];
      if (row && row.expires_at.getTime() < now.getTime()) {
        // path (b): the prior claim expired — reclaim it (reset result + window).
        await client.query(
          `UPDATE idempotency_keys
             SET status = 'pending', result = NULL, created_at = $2, expires_at = $3, completed_at = NULL
           WHERE key = $1`,
          [key, now, expiresAt],
        );
        await client.query('COMMIT');
        return 'acquired';
      }

      await client.query('COMMIT');
      return 'already_claimed'; // path (c): a live claim holds the key
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async function recordResult(key: string, result: unknown): Promise<void> {
    assertKey(key);
    const now = clock();
    // JSON.stringify so any JSON-serialisable value (object/array/string/number/
    // boolean/null) becomes a valid jsonb literal; `?? null` coerces undefined.
    const serialized = JSON.stringify(result ?? null);
    const client = await pool.connect();
    try {
      const updated = await client.query(
        `UPDATE idempotency_keys
           SET status = 'completed', result = $2::jsonb, completed_at = $3
         WHERE key = $1`,
        [key, serialized, now],
      );
      if (updated.rowCount === 0) {
        throw new IdempotencyKeyNotClaimedError(key);
      }
    } finally {
      client.release();
    }
  }

  async function getResult(key: string): Promise<unknown> {
    assertKey(key);
    const now = clock();
    const client = await pool.connect();
    try {
      // AC-2: completed AND not-yet-expired. The Task-3 pseudocode omits the expiry
      // guard, but AC-2 says "null if … expired" — honoured here so a stale result
      // (past its TTL, pre-vacuum) reads as absent.
      const { rows } = await client.query<{ result: unknown }>(
        `SELECT result FROM idempotency_keys
         WHERE key = $1 AND status = 'completed' AND expires_at >= $2`,
        [key, now],
      );
      return rows.length === 0 ? null : (rows[0]?.result ?? null);
    } finally {
      client.release();
    }
  }

  return { claim, recordResult, getResult };
}

/**
 * TTL vacuum: delete every expired key in one statement (AC-5). Wired as the first
 * pg-boss-scheduled cron consumer in apps/jobs/src/boot.ts. Uses the DB clock
 * (`now()`) deliberately — this is maintenance, not per-key business logic, so it
 * needs no injected clock (the DB-authoritative time is correct and avoids skew
 * between the worker host and Postgres). Returns the number of rows deleted.
 */
export async function purgeExpiredKeys(pool: pg.Pool): Promise<number> {
  const result = await pool.query('DELETE FROM idempotency_keys WHERE expires_at < now()');
  return result.rowCount ?? 0;
}
