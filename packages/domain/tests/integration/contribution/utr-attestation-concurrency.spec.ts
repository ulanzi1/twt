// contribution.utr-attested — true two-connection CONCURRENCY on the `tr` idempotency backstop (Story 8.4
// review finding: the migration-0079 PARTIAL UNIQUE index on `(payload->>'tr')` — and the
// `CONTRIBUTION_TR_CONSTRAINT` recovery branch that treats a losing 23505 as idempotent — had zero test
// coverage of the actual concurrent race it exists to handle; the single-connection SAVEPOINT tests only
// ever exercised sequential re-pastes. Twin of pool/pool-stream-concurrency.spec.ts's two-connection
// pattern — a single-connection test cannot exercise the real production failure mode (two pooled clients
// racing on the SAME constraint).
//
// Two genuinely concurrent `attestContributionUtr` calls target the SAME (member, alert) — the SAME
// deterministic `tr`. Unlike pool.spawned's version race (where the loser THROWS), this primitive is
// designed to make BOTH calls resolve successfully: the loser hits the `tr` unique constraint (directly,
// or after first bouncing off the shared alert-stream's `(stream_id, event_version)` constraint and
// retrying — either way it converges), recognizes it via `uniqueViolationConstraint`, re-reads the
// winner's row, and returns `{ idempotent: true }` with the SAME eventId — never a second yellow claim,
// never an unhandled rejection.
//
// ⚠ Own-committing (NOT setupLiveDb): a real race needs REAL concurrent COMMITs on SEPARATE pool clients.
// Cleanup is by the specific alert stream this suite creates — [[project_live_db_test_gotchas]].

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { attestContributionUtr } from '../../../src/contribution/write.js';
import { deriveContributionReference } from '../../../src/pool/contribution-reference.js';
import {
  alertId as toAlertId,
  memberId as toMemberId,
  poolId as toPoolId,
} from '../../../src/ids/index.js';
import { PARIWAR_A } from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

// A DISTINCT literal from utr-attestation.spec.ts's VALID_UTR — this suite own-commits real rows (visible
// to any other transaction until its afterAll cleanup runs), and shares the same PARIWAR_A tenant scope;
// a colliding literal would false-positive that spec's `duplicateUtrAcrossMembers` assertions if the two
// files happen to run concurrently (separate forked processes hitting the same live Postgres).
const VALID_UTR = '987654321098';

describe.skipIf(!hasDatabase)('attestContributionUtr — two-connection concurrency on the tr backstop (own-committing)', () => {
  let pool: pg.Pool;
  const createdAlerts: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, ssl: false });
    pool.on('error', (err) => console.error('[utr-attestation-concurrency pool]', err.message));
  });

  afterAll(async () => {
    if (!pool) return;
    const admin = await pool.connect();
    try {
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [createdAlerts]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[utr-attestation-concurrency.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  }, 20_000);

  it('two parallel attestations for the SAME (member, alert) — both resolve, exactly ONE non-idempotent winner', async () => {
    const alertId = randomUUID();
    createdAlerts.push(alertId);
    const poolId = randomUUID();
    const memberId = randomUUID();
    const tr = deriveContributionReference({
      memberId: toMemberId(memberId),
      alertId: toAlertId(alertId),
    });

    async function attempt(client: pg.PoolClient) {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, PARIWAR_A);
      try {
        const res = await attestContributionUtr(client, {
          pariwarId: PARIWAR_A,
          alertId: toAlertId(alertId),
          poolId: toPoolId(poolId),
          memberId: toMemberId(memberId),
          tr,
          utr: VALID_UTR,
          actorId: memberId,
        });
        await client.query('COMMIT');
        return res;
      } catch (e) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw e;
      }
    }

    const c1 = await pool.connect();
    const c2 = await pool.connect();
    try {
      const [r1, r2] = await Promise.allSettled([attempt(c1), attempt(c2)]);

      // The design goal: NEITHER call rejects — the tr backstop converts the loser's conflict into an
      // idempotent no-op, never an unhandled error surfaced to the member.
      expect(r1.status).toBe('fulfilled');
      expect(r2.status).toBe('fulfilled');

      const results = [r1, r2]
        .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof attestContributionUtr>>> => r.status === 'fulfilled')
        .map((r) => r.value);

      const winners = results.filter((r) => !r.idempotent);
      const losers = results.filter((r) => r.idempotent);
      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(1);
      // Both resolve to the SAME persisted event — never a second yellow claim for this tr.
      expect(losers[0]?.eventId).toBe(winners[0]?.eventId);
      // Same tr, same claim — never flagged as a cross-member duplicate.
      expect(winners[0]?.duplicateUtrAcrossMembers).toBe(false);
      expect(losers[0]?.duplicateUtrAcrossMembers).toBe(false);
    } finally {
      c1.release();
      c2.release();
    }
  }, 20_000);
});
