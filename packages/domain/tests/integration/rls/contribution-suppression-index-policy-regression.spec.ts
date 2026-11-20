// AP-P2: verify the migrated indexes and the actual accessor's bounded query can use all their keys.
import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import { describe, expect, it } from 'vitest';

import { listActedMemberIdsForPool } from '../../../src/contribution/read.js';
import { alertId, poolId } from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

describe.skipIf(!hasDatabase)('AP-P2 — migrated suppression lookup indexes', () => {
  setupLiveDb();

  it('indexes the member and reversal reference paths and supports the actual scoped statement', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'
       AND indexname IN ('contribution_acted_pool_member_idx', 'contribution_reversed_pool_reference_idx')`,
    );
    expect(rows).toHaveLength(2);
    const member = rows.find(row => row.indexname === 'contribution_acted_pool_member_idx')!.indexdef;
    expect(member).toContain('pariwar_id');
    expect(member).toContain('contribution_pool_id');
    expect(member).toContain('contribution_member_id');
    expect(member).toContain('contribution.confirmed');
    expect(member).toContain('contribution.utr-attested');
    const reversal = rows.find(row => row.indexname === 'contribution_reversed_pool_reference_idx')!.indexdef;
    expect(reversal).toContain('contribution_reversed_event_id');
    expect(reversal).toContain('reconciliation.confirmation-reversed');
    const statements: { query: string; params: unknown[] }[] = [];
    const db = drizzle(client, { logger: { logQuery(query, params) { statements.push({ query, params }); } } });
    // Review 2026-10-26 (R4-P1): the roster is ONE `text[]` parameter (`= ANY(...)`) and a bounded job carries up to 8 members.
    // On an EMPTY pool the planner costs "member as Index Cond" and "member as Filter" alike and may pick the Filter — the old
    // single-member IN-list only passed because `IN ($1)` collapses to `=`. Seed a realistic pool (its acted events) and
    // ANALYZE, then check the third key is an index condition for an 8-member job.
    const pool = randomUUID();
    await client.query(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id)
       SELECT gen_random_uuid(), 'contribution.confirmed', jsonb_build_object('poolId', $1::text, 'memberId', gen_random_uuid()::text), 1, $2
       FROM generate_series(1, 2000)`,
      [pool, PARIWAR_A],
    );
    await client.query('ANALYZE events_log');
    await enterAppScope(client, PARIWAR_A);
    await listActedMemberIdsForPool(db as never, {
      pariwarId: PARIWAR_A, alertId: alertId(randomUUID()), poolId: poolId(pool), memberIds: Array.from({ length: 8 }, () => randomUUID()),
    });
    expect(statements).toHaveLength(1);
    // A tiny fixture legitimately prefers a sequential scan. Disable that cost choice to check index eligibility,
    // including the third key (not merely tenant/pool); this is not a production latency benchmark.
    await client.query('SET LOCAL enable_seqscan = off');
    const statement = statements[0]!;
    const plan = await client.query(`EXPLAIN (FORMAT JSON) ${statement.query}`, statement.params);
    const printed = JSON.stringify(plan.rows);
    expect(printed).toContain('contribution_acted_pool_member_idx');
    expect(printed).toContain('contribution_reversed_pool_reference_idx');
    expect(printed).toMatch(/"Index Cond":"[^"]*contribution_member_id/);
    expect(printed).toMatch(/"Index Cond":"[^"]*contribution_reversed_event_id/);
    const generated = await client.query<{ column_name: string; is_generated: string }>(
      `SELECT column_name, is_generated FROM information_schema.columns WHERE table_schema = 'public'
       AND table_name = 'events_log' AND column_name IN ('contribution_pool_id', 'contribution_member_id', 'contribution_reversed_event_id')`,
    );
    expect(generated.rows).toHaveLength(3);
    expect(generated.rows.every(row => row.is_generated === 'ALWAYS')).toBe(true);
    statements.length = 0;
    expect(await listActedMemberIdsForPool(db as never, { pariwarId: PARIWAR_A, alertId: alertId(randomUUID()), poolId: poolId(randomUUID()), memberIds: [] }))
      .toEqual({ confirmed: [], attested: [] });
    expect(statements).toHaveLength(0);
  });

  it('prevents a caller from forging a generated member lookup value', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(client.query(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, contribution_member_id)
       VALUES ($1, 'contribution.confirmed', $2, 1, $3, $4)`,
      [randomUUID(), { poolId: randomUUID(), memberId: randomUUID() }, PARIWAR_A, randomUUID()],
    )).rejects.toMatchObject({ code: '428C9' });
  });
});
