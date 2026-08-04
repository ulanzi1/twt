// createFlagVersion — TRUE two-connection concurrency on the version unique constraint
// (Story 10.8 Review Pass 2).
//
// ⚠ WHY THIS FILE EXISTS. `registry.spec.ts` carried a test titled "a CONCURRENT duplicate version
// raises FlagVersionConflictError (the 409 seam)" whose final act was a RAW `tx.insert(...)`
// asserting `code === '23505'` — i.e. it asserted that Postgres enforces its own unique constraint,
// and never invoked `createFlagVersion` a second time. Neither `isUniqueViolation` (which reads
// `err.code` AND `err.cause.code`) nor the 23505 → FlagVersionConflictError mapping was exercised by
// any test in the repo: deleting the entire `catch` block left the suite green.
//
// A version collision CANNOT be produced on a single connection: `createFlagVersion` computes
// `max(version) + 1`, so seeding a row just raises the max and the next call claims a free number.
// The race is only reachable with two connections whose reads interleave before either commits —
// which is also the production failure mode (two admins flipping the same flag from two pods).
//
// Load-bearing-invariant checklist family 2: "true two-connection races proven live (exactly one
// write, N−1 losers)".
//
// ⚠ Own-committing (NOT setupLiveDb): a real race needs REAL concurrent COMMITs on SEPARATE pool
// clients, which a rollback-per-test harness cannot provide. Cleanup is by the specific flag rows
// this suite creates, and assertions are membership/shape rather than global counts
// ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { drizzle } from 'drizzle-orm/node-postgres';

import { setPariwarScope } from '../../../src/db.js';
import type { Db } from '../../../src/db.js';
import { FlagVersionConflictError } from '../../../src/feature-flags/errors.js';
import { createFlagVersion } from '../../../src/feature-flags/registry.js';
import { PARIWAR_A } from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

// ⚠ A DISTINCT flag key from registry.spec.ts's `kyc_manual_fallback`. This suite OWN-COMMITS rows
// that stay visible to every other transaction until its afterAll runs, and shares the PARIWAR_A
// tenant scope — a colliding key would corrupt that spec's three-tier resolution assertions if the
// two files happen to run concurrently in separate forked processes. `telegram_mirror` is registered
// and admitted to the capability bar but has no wired consumer, so flipping it changes no behaviour.
const KEY = 'telegram_mirror';
const DEAD_BY = new Date('2027-06-30T00:00:00.000Z');

describe.skipIf(!hasDatabase)('createFlagVersion — two-connection version race (own-committing)', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, ssl: false });
    pool.on('error', (err) => console.error('[flag-flip-concurrency pool]', err.message));
  });

  afterAll(async () => {
    if (!pool) return;
    const admin = await pool.connect();
    try {
      // UNCONDITIONAL cleanup, not happy-path-only: a failing assertion mid-test would otherwise
      // leave a committed row behind that shadows this key for every later run.
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM feature_flag_versions WHERE flag_key = $1', [KEY]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[flag-flip-concurrency.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  }, 20_000);

  it('⚠ two parallel first-flips: exactly ONE wins, the loser gets FlagVersionConflictError (409 seam)', async () => {
    // ⚠ A DETERMINISTIC RENDEZVOUS, not a hoped-for interleave (2026-08-04). The race this file
    // exists to prove is only reachable when BOTH connections have read `max(version)` before
    // EITHER commits. Left to chance that is load-sensitive: under a starved CI runner connection A
    // can complete end-to-end before B reads, B then sees the higher max, claims a free number, and
    // BOTH succeed — observed in Actions as `expected [ …(2) ] to have a length of 1`. The barrier
    // below makes the precondition structural, so the test proves the same invariant on a busy
    // runner as on an idle laptop.
    //
    // REPEATABLE READ pins each transaction's snapshot at its first real query (a `SET` is a utility
    // statement and takes none — hence the explicit SELECT). With both snapshots taken pre-commit,
    // both calls compute the same next version and the loser MUST hit the unique constraint.
    let releaseBarrier!: () => void;
    const barrier = new Promise<void>((resolve) => {
      releaseBarrier = resolve;
    });
    let arrived = 0;
    const arriveAndWait = (): Promise<void> => {
      if (++arrived === 2) releaseBarrier();
      return barrier;
    };

    async function attempt(client: pg.PoolClient, rationale: string): Promise<number> {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, PARIWAR_A);
      const db = drizzle(client) as unknown as Db;
      // Force the snapshot before the barrier — this is the "read" half of the race.
      await client.query('SELECT max(version) FROM feature_flag_versions WHERE flag_key = $1', [
        KEY,
      ]);
      await arriveAndWait();
      try {
        const row = await createFlagVersion(db, {
          flagKey: KEY,
          pariwarId: PARIWAR_A,
          state: 'canary',
          cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: ['patna'] }] },
          fallbackDefault: false,
          owner: 'comms-desk',
          deadBy: DEAD_BY,
          rationale,
          actorWhoFlipped: null,
      actorDisplay: null,
          auditId: randomUUID(),
        });
        await client.query('COMMIT');
        return row.version;
      } catch (e) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw e;
      }
    }

    const c1 = await pool.connect();
    const c2 = await pool.connect();
    try {
      // Both read "no rows" and both compute nextVersion = 2 before either commits.
      const [r1, r2] = await Promise.allSettled([
        attempt(c1, 'connection A — the winner or the loser, whichever lands first'),
        attempt(c2, 'connection B — the other one'),
      ]);

      const fulfilled = [r1, r2].filter((r) => r.status === 'fulfilled');
      const rejected = [r1, r2].filter((r) => r.status === 'rejected');

      // EXACTLY ONE write. Never a silent overwrite, never two rows at the same version.
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((fulfilled[0] as PromiseFulfilledResult<number>).value).toBe(2);

      // ⚠ THE ASSERTION THAT WAS MISSING. The loser must receive the TYPED domain error, because
      // that discriminant is what the admin route maps to a 409 rather than a 500.
      const reason = (rejected[0] as PromiseRejectedResult).reason;
      expect(reason).toBeInstanceOf(FlagVersionConflictError);
      expect((reason as FlagVersionConflictError).flagKey).toBe(KEY);
      expect((reason as FlagVersionConflictError).version).toBe(2);
    } finally {
      c1.release();
      c2.release();
    }
  }, 20_000);
});
