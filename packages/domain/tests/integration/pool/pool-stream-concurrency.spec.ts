// Pool stream CONCURRENCY — true two-connection race on `projectPoolState` (Story 7.1
// review; closes the untested PoolStreamConcurrencyError gap). Twin of
// packages/events/tests/append-event.test.ts's "true concurrency (two connections)"
// block + claim/state-trustee-cycle-freeze-concurrency.spec.ts's own-committing
// pattern — a single-connection SAVEPOINT test cannot exercise the real production
// failure mode (two pooled clients racing on the same `(stream_id, event_version)`).
//
// Two genuinely concurrent `pool.spawned` appends target the SAME fresh poolId (both
// see an empty stream in their own transaction snapshot, so both legally attempt
// event_version = 1). The `events_log_stream_id_event_version_uq` unique index is the
// backstop: the loser's INSERT blocks on the winner's uncommitted index entry until the
// winner COMMITs, then surfaces the unique-violation, which the projector maps to
// `PoolStreamConcurrencyError` (verifying the hardcoded constraint name in
// pool/errors.ts actually matches migration 0001's real index).
//
// ⚠ Own-committing (NOT setupLiveDb): a real race needs REAL concurrent COMMITs on
// SEPARATE pool clients. Cleanup is by the specific pool id this suite creates —
// [[project_live_db_test_gotchas]].

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { cycleFreezeCommitId as toCycleId, claimId as toClaimId, poolId as toPoolId } from '../../../src/ids/index.js';
import { PoolStreamConcurrencyError, projectPoolState } from '../../../src/pool/index.js';
import { PARIWAR_A } from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe.skipIf(!hasDatabase)('pool stream — two-connection concurrency (own-committing)', () => {
  let pool: pg.Pool;
  const createdPools: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, ssl: false });
    pool.on('error', (err) => console.error('[pool-stream-concurrency pool]', err.message));
  });

  afterAll(async () => {
    if (!pool) return;
    const admin = await pool.connect();
    try {
      // events_log is append-only (AR-8 trigger) — replica role sheds the trigger for
      // the test-only purge. pools is left to the winning row's committed state
      // (own-committed rows do NOT roll back).
      await admin.query('DELETE FROM pools WHERE pool_id = ANY($1)', [createdPools]).catch(() => undefined);
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [createdPools]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[pool-stream-concurrency.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  it('two parallel pool.spawned appends on the SAME fresh pool — one wins, one throws PoolStreamConcurrencyError', async () => {
    // Forcing a genuine collision on the unique index depends on both connections'
    // BEGIN/SET ROLE/scope round-trips landing close enough in time to overlap. On a
    // fast local loopback DB that's reliable; on GitHub Actions' service-container
    // Postgres it was observed NOT overlapping 2/2 times (both attempts cleanly
    // sequential — version 1 then 2, no collision) — see
    // [[project_known_livedb_test_failures]] #11. Two mitigations, neither of which
    // touches production code: (a) a same-tick readiness barrier removes the
    // accumulated setup-round-trip skew before either side fires the racing call, and
    // (b) a bounded retry on a fresh poolId absorbs whatever skew the barrier doesn't.
    // If the unique-index backstop were actually broken, no number of retries would
    // ever produce a collision, so this still fails loud rather than masking a real gap.
    const MAX_ATTEMPTS = 5;
    let lastOutcome = '';

    for (let attemptNum = 1; attemptNum <= MAX_ATTEMPTS; attemptNum++) {
      const poolId = toPoolId(randomUUID());
      createdPools.push(poolId);
      const cycleId = randomUUID();
      const claimCaseId = randomUUID();

      const spawnInput = {
        poolId,
        pariwarId: PARIWAR_A,
        cycleId: toCycleId(cycleId),
        claimCaseId: toClaimId(claimCaseId),
        poolIndex: 0,
        poolCanonicalIdentifier: 'P-2026-07-999',
        supportCategory: 'death_support' as const,
        benefitMechanism: 'pool' as const,
        fixedAmount: 500,
        eventType: 'pool.spawned' as const,
        payload: {
          from_state: null,
          to_state: 'spawned',
          trigger: 'cycle_freeze_commit:spawn',
          actor: 'system' as const,
          support_category: 'death_support' as const,
          benefit_mechanism: 'pool' as const,
          fixed_amount: 500,
          pool_index: 0,
          cycle_id: cycleId,
          pool_canonical_identifier: 'P-2026-07-999',
        },
        actorId: null,
      };

      let arrivals = 0;
      let releaseBarrier!: () => void;
      const barrier = new Promise<void>((resolve) => {
        releaseBarrier = resolve;
      });
      async function arriveAtBarrier(): Promise<void> {
        arrivals += 1;
        if (arrivals === 2) releaseBarrier();
        await barrier;
      }

      async function attempt(client: pg.PoolClient): Promise<number> {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE twt_app');
        await setPariwarScope(client, PARIWAR_A);
        await arriveAtBarrier();
        try {
          const res = await projectPoolState(client, spawnInput);
          await client.query('COMMIT');
          return res.eventVersion;
        } catch (e) {
          await client.query('ROLLBACK').catch(() => undefined);
          throw e;
        }
      }

      const c1 = await pool.connect();
      const c2 = await pool.connect();
      let fulfilled: PromiseSettledResult<number>[];
      let rejected: PromiseSettledResult<number>[];
      try {
        const [r1, r2] = await Promise.allSettled([attempt(c1), attempt(c2)]);
        fulfilled = [r1, r2].filter((r) => r.status === 'fulfilled');
        rejected = [r1, r2].filter((r) => r.status === 'rejected');
      } finally {
        c1.release();
        c2.release();
      }

      if (fulfilled.length === 1 && rejected.length === 1) {
        expect((fulfilled[0] as PromiseFulfilledResult<number>).value).toBe(1);
        const reason = (rejected[0] as PromiseRejectedResult).reason;
        expect(reason).toBeInstanceOf(PoolStreamConcurrencyError);
        expect(reason).toMatchObject({ name: 'PoolStreamConcurrencyError', poolId, attemptedVersion: 1 });
        return;
      }
      lastOutcome = `attempt ${attemptNum}: ${fulfilled.length} fulfilled / ${rejected.length} rejected`;
    }

    throw new Error(
      `pool-stream-concurrency: no collision observed across ${MAX_ATTEMPTS} attempts (${lastOutcome}) — ` +
        `either the unique-index backstop is broken, or the two connections never overlapped.`,
    );
  }, 60_000);
});
