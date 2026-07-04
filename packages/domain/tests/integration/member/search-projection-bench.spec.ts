// AR-65 member-search p95 benchmark harness — live-DB (Story 4.7, Task 7; AC1 ~5s@4L).
//
// Establishes + RECORDS the p95 of the compound-read-model search (`searchMembers`, ONE join-free query
// per page). Per the 4.6 D3-A precedent, the gate is that the harness RUNS and the budget is RECORDED:
// the ~5s@4L (400,000-member) AR-65 target is a SCALE budget for the whole admin-search compound read,
// measured under a synthetic ~4L dataset in pre-launch validation — seeding a full 4L set is impractical
// in CI, so this measures the query-shape latency over a realistic seeded page and records it, with a
// LOOSE sanity ceiling (the AR-65 ~5s budget itself). Distinct from the 200ms@4L validity-payload cache
// (Story 4.8).

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDb, setPariwarScope, type Db } from '../../../src/db.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { projectMemberState, searchMembers } from '../../../src/member/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const SEED_MEMBERS = 60;
const ITERATIONS = 100;
const WARMUP = 10;
/** LOOSE sanity ceiling = the AR-65 ~5s admin-search budget (NOT the 200ms@4L validity cache). */
const SANITY_CEILING_MS = 5000;

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx]!;
}

describe.skipIf(!hasDatabase)('member-search projection — p95 benchmark (AR-65; live DB) (:5433)', () => {
  let db: Db;
  let pool: pg.Pool;
  const pariwarId = toPariwarId(randomUUID());
  const seededMemberIds: string[] = [];

  beforeAll(async () => {
    if (!hasDatabase) return;
    const created = createDb(DATABASE_URL!, { ssl: false, max: 4 });
    db = created.db;
    pool = created.pool;

    // Seed SEED_MEMBERS members into a fresh Pariwar via the projector (which writes the projection row).
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, pariwarId);
      for (let i = 0; i < SEED_MEMBERS; i++) {
        const mid = toMemberId(randomUUID());
        seededMemberIds.push(mid);
        await projectMemberState(client, {
          memberId: mid,
          pariwarId,
          eventType: 'member.signup_initiated',
          payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
          actorId: null,
        });
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    // Deleting members cascades member_search_projection (FK ON DELETE CASCADE); then the event stream.
    await pool.query('DELETE FROM members WHERE pariwar_id = $1', [pariwarId]).catch(() => undefined);
    await pool.query('DELETE FROM events_log WHERE pariwar_id = $1', [pariwarId]).catch(() => undefined);
    await pool.end();
  });

  it('measures + records the searchMembers p95 for a browse page (budget establishment)', async () => {
    const samples: number[] = [];
    for (let i = 0; i < WARMUP + ITERATIONS; i++) {
      const t0 = performance.now();
      const rows = await searchMembers(db, { pariwarId, criteria: { by: 'pariwar' }, limit: 200 });
      const dt = performance.now() - t0;
      if (i === 0) expect(rows.length).toBeGreaterThanOrEqual(SEED_MEMBERS);
      if (i >= WARMUP) samples.push(dt);
    }
    samples.sort((a, b) => a - b);
    const budget = {
      seededMembers: SEED_MEMBERS,
      iterations: ITERATIONS,
      p50_ms: Number(percentile(samples, 50).toFixed(2)),
      p95_ms: Number(percentile(samples, 95).toFixed(2)),
      p99_ms: Number(percentile(samples, 99).toFixed(2)),
      note: 'one join-free query per page; ~5s@4L is the AR-65 scale budget for a synthetic 4L set',
    };
    // RECORD the budget (tracked in the run log; see tests/bench/member-search-p95-budget.md).
    console.log('[member-search p95 budget]', JSON.stringify(budget));

    // A single join-free page read is far under the AR-65 ~5s budget; the sanity ceiling guards against
    // a gross query-shape regression (e.g. an accidental N+1 reintroduced into the accessor).
    expect(percentile(samples, 95)).toBeLessThan(SANITY_CEILING_MS);
  });
});
