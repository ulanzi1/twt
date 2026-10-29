// The admin "Posts" list's domain read — `listAnnouncementActivity` (Story 5.14 review G2-P8). Each cycle's pool count is COUNTED IN
// SQL (it is the curated-name `reserveNames` count, and must equal the job's `getAnnouncementPool` count), ⛔ recomputed from the capped
// pool list; and the pool cap is PER CYCLE, so one oversized cycle never crowds another cycle's pools out (the old cross-cycle
// `LIMIT cap × limit` truncated in cycle-UUID order). Live DB only; per-test ROLLBACK (setupLiveDb); seeded as the superuser.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getAnnouncementPool, listAnnouncementActivity } from '../../../src/announcement-channels/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, seedAlert } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

/** A cycle frozen an hour ago, its live alert and `n` pools (indexes 0 … n − 1). */
async function seedCycle(client: Client, cycleId: string, n: number): Promise<string> {
  const { tx } = getTx();
  await client.query(
    `INSERT INTO cycle_freeze_commits (commit_id, pariwar_id, actor_id, actor_display, committed_claim_ids, committed_at)
     VALUES ($1, $2, 'system', 'System', '{}'::uuid[], clock_timestamp() - interval '1 hour')`,
    [cycleId, PARIWAR_A],
  );
  const alertId = await seedAlert(tx, PARIWAR_A, { cycleId, poolCount: n });
  await client.query("SET LOCAL app.pool_state_writer = 'on'");
  await client.query(
    `INSERT INTO pools (pool_id, pariwar_id, cycle_id, claim_case_id, pool_index, pool_canonical_identifier, support_category,
                        benefit_mechanism, fixed_amount, current_state, state_event_version, public_token)
     SELECT gen_random_uuid(), $1, $2, gen_random_uuid(), g, $4::text || g, 'death_support', 'pool', 500, 'spawned', 1,
            md5(random()::text || g::text)
       FROM generate_series(0, $3::int - 1) AS g`,
    [PARIWAR_A, cycleId, n, `P-${randomUUID().slice(0, 8)}-`],
  );
  await client.query("SET LOCAL app.pool_state_writer = 'off'");
  return alertId;
}

describe.skipIf(!hasDatabase)('listAnnouncementActivity — the pool count and the per-cycle cap (review G2-P8)', { timeout: 30000 }, () => {
  setupLiveDb();

  it('⭐ the pool count is counted in SQL (⛔ the capped list\'s length) and equals the job\'s; ⛔ one cycle crowds out another', async () => {
    const { client } = getTx();
    // The big cycle's id sorts FIRST, so the old cross-cycle `LIMIT 500 × 2` (ordered by cycle id) filled up on it alone.
    const big = `00000000-0000-4000-8000-${randomUUID().slice(-12)}`;
    const small = `ffffffff-ffff-4fff-8fff-${randomUUID().slice(-12)}`;
    await seedCycle(client, big, 1001);
    await seedCycle(client, small, 2);
    const activity = await listAnnouncementActivity(client, { pariwarId: PARIWAR_A, now: new Date(), cycleWindowDays: 15, limit: 2 });
    const of = (cycleId: string) => activity.find((c) => c.cycleId === cycleId)!;
    expect(of(big).pools).toHaveLength(500);
    expect(of(big).poolCount).toBe(1001);
    expect(of(big).pools.map((p) => p.poolIndex)).toEqual(Array.from({ length: 500 }, (_, i) => i));
    expect(of(small).pools.map((p) => p.poolIndex)).toEqual([0, 1]);
    expect(of(small).poolCount).toBe(2);
    // the job's per-pool read counts the same cycle the same way — so the curated-name index can never differ between the two
    const job = await getAnnouncementPool(client, { pariwarId: PARIWAR_A, poolId: of(big).pools[0]!.poolId });
    expect(job?.poolCount).toBe(of(big).poolCount);
  });
});
