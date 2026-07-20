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
import { deriveAlertId, projectAlertState } from '../../../src/alert/index.js';
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

    async function attempt(client: pg.PoolClient): Promise<number> {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, PARIWAR_A);
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
});
