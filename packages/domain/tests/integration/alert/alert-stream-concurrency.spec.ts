// Alert stream CONCURRENCY — true two-connection race on `projectAlertState` genesis
// (Story 8.1 review finding: AC6's de-risk suite only exercised sequential same-transaction
// redelivery, which short-circuits at mintAndOpenAlert's fast-path existence check and never
// reaches the `PoolStreamConcurrencyError` catch branch). Twin of
// packages/domain/tests/integration/pool/pool-stream-concurrency.spec.ts — a single-connection
// SAVEPOINT test cannot exercise the real production failure mode (two pooled clients racing on
// the same `(stream_id, event_version)` slot).
//
// Two genuinely concurrent `alert.frozen` genesis appends target the SAME fresh alertId (both
// see an empty stream in their own transaction snapshot, so both legally attempt
// event_version = 1). The `events_log_stream_id_event_version_uq` unique index is the backstop:
// the loser's INSERT blocks on the winner's uncommitted index entry until the winner COMMITs,
// then surfaces the unique-violation, which the projector maps to `PoolStreamConcurrencyError`
// (the same generic stream-concurrency detector `pool/spawn.ts` uses — reused, not reimplemented).
//
// ⚠ Own-committing (NOT setupLiveDb): a real race needs REAL concurrent COMMITs on SEPARATE pool
// clients. Cleanup is by the specific alert id this suite creates — [[project_live_db_test_gotchas]].

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { cycleFreezeCommitId as toCycleId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { PoolStreamConcurrencyError } from '../../../src/pool/index.js';
import { closeCycleAlert, deriveAlertId, projectAlertState } from '../../../src/alert/index.js';
import { PARIWAR_A } from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe.skipIf(!hasDatabase)('alert stream — two-connection concurrency (own-committing)', () => {
  let pool: pg.Pool;
  const createdAlerts: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, ssl: false });
    pool.on('error', (err) => console.error('[alert-stream-concurrency pool]', err.message));
  });

  afterAll(async () => {
    if (!pool) return;
    const admin = await pool.connect();
    try {
      // events_log is append-only (AR-8 trigger) — replica role sheds the trigger for the
      // test-only purge. `alerts` is left at the winning row's committed state (own-committed
      // rows do NOT roll back).
      await admin.query('DELETE FROM alerts WHERE alert_id = ANY($1)', [createdAlerts]).catch(() => undefined);
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [createdAlerts]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[alert-stream-concurrency.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  it('two parallel alert.frozen genesis appends on the SAME fresh alert — one wins, one throws PoolStreamConcurrencyError', async () => {
    const cycleId = randomUUID();
    const alertId = deriveAlertId(cycleId);
    createdAlerts.push(alertId);
    const poolIds = [randomUUID()];

    const frozenPayload = {
      from_state: 'draft' as const,
      to_state: 'frozen' as const,
      trigger: 'cycle.frozen:cycle_open',
      actor: 'system' as const,
      cycle_id: cycleId,
      pariwar_id: PARIWAR_A,
      pool_count: 1,
      pool_ids: poolIds,
      attestation: {
        actor_id: 'trustee-actor-1',
        actor_display: 'Trustee One',
        committed_at: new Date('2026-07-15T06:00:00Z').toISOString(),
      },
    };

    // ⚠ A DETERMINISTIC RENDEZVOUS, not a hoped-for interleave (2026-08-04). Same fix, same reason as
    // feature-flags/flag-flip-concurrency.spec.ts. The genesis race is only reachable when BOTH
    // connections read the stream before EITHER commits: if connection A commits first, B's
    // `projectAlertState` reads an ALREADY-FROZEN alert and the state machine rejects the transition
    // with its own error — so the loser throws `[projectAlertState] 'alert.frozen'…` instead of
    // `PoolStreamConcurrencyError`, and the assertion below fails through no fault of the code.
    // Observed in Actions 2026-08-04 (run 30894481332) even under `--concurrency=1`; passes on an
    // idle laptop, which is exactly the profile of a load-sensitive precondition.
    //
    // REPEATABLE READ pins each transaction's snapshot at its first real query (a `SET` is a utility
    // statement and takes none — hence the explicit SELECT against the stream the projector reads).
    // With both snapshots taken pre-commit, both attempt version 1 and the loser MUST lose on the
    // stream's version uniqueness, which is the invariant under test.
    let releaseBarrier!: () => void;
    const barrier = new Promise<void>((resolve) => {
      releaseBarrier = resolve;
    });
    let arrived = 0;
    const arriveAndWait = (): Promise<void> => {
      if (++arrived === 2) releaseBarrier();
      return barrier;
    };

    async function attempt(client: pg.PoolClient): Promise<number> {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, PARIWAR_A);
      // Force the snapshot before the barrier — this is the "read" half of the race.
      await client.query('SELECT max(event_version) FROM events_log WHERE stream_id = $1', [
        alertId,
      ]);
      await arriveAndWait();
      try {
        const res = await projectAlertState(client, {
          alertId,
          cycleId: toCycleId(cycleId),
          pariwarId: toPariwarId(PARIWAR_A),
          poolCount: 1,
          createdByActor: 'trustee-actor-1',
          actorId: null,
          eventType: 'alert.frozen',
          payload: frozenPayload,
        });
        await client.query('COMMIT');
        return res.eventVersion;
      } catch (e) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw e;
      }
    }

    const c1 = await pool.connect();
    const c2 = await pool.connect();
    try {
      const [r1, r2] = await Promise.allSettled([attempt(c1), attempt(c2)]);

      const fulfilled = [r1, r2].filter((r) => r.status === 'fulfilled');
      const rejected = [r1, r2].filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((fulfilled[0] as PromiseFulfilledResult<number>).value).toBe(1);

      const reason = (rejected[0] as PromiseRejectedResult).reason;
      expect(reason).toBeInstanceOf(PoolStreamConcurrencyError);
      expect(reason).toMatchObject({ name: 'PoolStreamConcurrencyError', poolId: alertId, attemptedVersion: 1 });
    } finally {
      c1.release();
      c2.release();
    }
  }, 20_000);

  // ── Story 8.14 (AC4) — the CLOSE half of the same race ────────────────────────────────────────
  // The genesis race above proves version 1 is arbitrated. The close is the OTHER concurrency shape
  // the emitter can actually hit in production: two sweep ticks (or a redelivered job racing the
  // next tick) both find the same alert `live` and both attempt the SAME next version. The sweep
  // treats the loser's `PoolStreamConcurrencyError` as benign — but only because exactly one close
  // is ever appended, which is what this pins.
  it('two parallel closes on the SAME live alert — one wins, one throws PoolStreamConcurrencyError; ONE alert.closed', async () => {
    const cycleId = randomUUID();
    const alertId = deriveAlertId(cycleId);
    createdAlerts.push(alertId, cycleId);
    const committedAt = new Date('2026-07-15T06:00:00Z');
    const closeAt = new Date(committedAt.getTime() + 15 * 24 * 60 * 60 * 1000);

    // Seed a COMMITTED live alert + the cycle.frozen the close's D3 guard validates against.
    const setup = await pool.connect();
    try {
      await setup.query('BEGIN');
      await setPariwarScope(setup, PARIWAR_A);
      await setup.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id)
         VALUES ($1,'cycle.frozen',$2::jsonb,1,NULL,$3)`,
        [
          cycleId,
          JSON.stringify({
            cycle_id: cycleId,
            pariwar_id: PARIWAR_A,
            pool_count: 1,
            pool_ids: [randomUUID()],
            pool_canonical_identifiers: ['P-CLOSE-RACE'],
            attestation: {
              actor_id: 'trustee-actor-1',
              actor_display: 'Trustee One',
              committed_at: committedAt.toISOString(),
            },
          }),
          PARIWAR_A,
        ],
      );
      const common = {
        alertId,
        cycleId: toCycleId(cycleId),
        pariwarId: toPariwarId(PARIWAR_A),
        poolCount: 1,
        createdByActor: 'trustee-actor-1',
        actorId: null,
      } as const;
      await projectAlertState(setup, {
        ...common,
        eventType: 'alert.frozen',
        payload: {
          from_state: 'draft',
          to_state: 'frozen',
          trigger: 'cycle.frozen:cycle_open',
          actor: 'system',
          cycle_id: cycleId,
          pariwar_id: PARIWAR_A,
          pool_count: 1,
          pool_ids: [randomUUID()],
          attestation: {
            actor_id: 'trustee-actor-1',
            actor_display: 'Trustee One',
            committed_at: committedAt.toISOString(),
          },
        },
      });
      await projectAlertState(setup, {
        ...common,
        eventType: 'alert.published',
        payload: {
          from_state: 'frozen',
          to_state: 'published',
          trigger: 'cycle.frozen:cycle_open',
          actor: 'system',
          time_critical: false,
        },
      });
      await projectAlertState(setup, {
        ...common,
        eventType: 'alert.live',
        payload: {
          from_state: 'published',
          to_state: 'live',
          trigger: 'cycle.frozen:cycle_open',
          actor: 'system',
        },
      });
      await setup.query('COMMIT');
    } catch (e) {
      await setup.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      setup.release();
    }

    // Same deterministic rendezvous as the genesis race above, and for the same reason: without a
    // pinned pre-commit snapshot the loser would read an ALREADY-closed alert and short-circuit on
    // the idempotent no-op arm — a legitimate outcome, but not the one under test here.
    let releaseBarrier!: () => void;
    const barrier = new Promise<void>((resolve) => {
      releaseBarrier = resolve;
    });
    let arrived = 0;
    const arriveAndWait = (): Promise<void> => {
      if (++arrived === 2) releaseBarrier();
      return barrier;
    };

    async function attemptClose(client: pg.PoolClient): Promise<boolean> {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, PARIWAR_A);
      await client.query('SELECT max(event_version) FROM events_log WHERE stream_id = $1', [alertId]);
      await arriveAndWait();
      try {
        const res = await closeCycleAlert(client, { cycleId, closeAt });
        await client.query('COMMIT');
        return res.closed;
      } catch (e) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw e;
      }
    }

    const c1 = await pool.connect();
    const c2 = await pool.connect();
    try {
      const [r1, r2] = await Promise.allSettled([attemptClose(c1), attemptClose(c2)]);
      const fulfilled = [r1, r2].filter((r) => r.status === 'fulfilled');
      const rejected = [r1, r2].filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((fulfilled[0] as PromiseFulfilledResult<boolean>).value).toBe(true);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(PoolStreamConcurrencyError);
      expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
        poolId: alertId,
        attemptedVersion: 4,
      });
    } finally {
      c1.release();
      c2.release();
    }

    // AC4's load-bearing assertion: no second `alert.closed` was ever appended to the stream.
    const { rows } = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM events_log WHERE stream_id = $1 AND event_type = 'alert.closed'`,
      [alertId],
    );
    expect(Number(rows[0]!.n)).toBe(1);
    const { rows: proj } = await pool.query<{ current_state: string }>(
      'SELECT current_state FROM alerts WHERE alert_id = $1',
      [alertId],
    );
    expect(proj[0]!.current_state).toBe('closed');
  }, 20_000);
});
