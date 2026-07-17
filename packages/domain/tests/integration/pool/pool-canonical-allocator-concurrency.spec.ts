// Canonical-identifier allocator CONCURRENCY — a true two-connection race (Story 7.2,
// Tasks 2/3/7; AC1 "race-safe"). Twin of pool-stream-concurrency.spec.ts.
//
// AC1's race-safety claim is the reason the allocator exists at all, and a
// single-connection test cannot exercise it: the real production failure mode is two
// pooled clients (two cycle-freeze jobs, or a retry overlapping its original) allocating
// for the SAME (pariwar_id, period) at the same instant.
//
// THE PROPERTY UNDER TEST — both allocators SUCCEED with DISJOINT ranges. The counter row
// serializes them: the second `INSERT … ON CONFLICT DO UPDATE` blocks on the first's row
// lock until it COMMITs, then re-reads the bumped value. Nobody duplicates, nobody fails.
//
// This is precisely what the rejected `MAX(sequence)` design could NOT do: `FOR UPDATE`
// locks only rows that already exist, so two allocators against a fresh month would both
// read NULL, both pick 001, and one would die on the 7.1 unique index. This suite is the
// evidence for that design decision — if someone later "simplifies" the allocator back to
// a MAX() derivation, this test goes red.
//
// ⚠ Own-committing (NOT setupLiveDb): a real race needs REAL concurrent COMMITs on
// SEPARATE pool clients, which the per-test ROLLBACK harness cannot produce. Each test
// uses a FRESH random pariwarId so its counter row is unique to this run — own-committed
// rows accumulate and must never be asserted by absolute count
// ([[project_live_db_test_gotchas]]). Cleanup is by the specific ids created.

import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope, type Db } from '../../../src/db.js';
import { pariwarId as toPariwarId, type PariwarId } from '../../../src/ids/index.js';
import { allocateCanonicalIdentifierRange } from '../../../src/pool/naming.js';
import * as schema from '../../../src/schema/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const MAY_2026 = { year: 2026, month: 5 };

describe.skipIf(!hasDatabase)('canonical-id allocator — two-connection concurrency (own-committing)', () => {
  let pool: pg.Pool;
  const createdPariwars: string[] = [];

  beforeAll(() => {
    // max MUST exceed the most clients any single test holds concurrently (4 racers) —
    // otherwise a test that also needs an admin connection while holding them all deadlocks
    // waiting on itself, and the afterAll cleanup then times out too.
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false });
    pool.on('error', (err) => console.error('[allocator-concurrency pool]', err.message));
  });

  afterAll(async () => {
    if (!pool) return;
    const admin = await pool.connect();
    try {
      // pool_canonical_counters is a plain counter table (no append-only trigger), so a
      // direct DELETE of THIS suite's rows is enough.
      await admin
        .query('DELETE FROM pool_canonical_counters WHERE pariwar_id = ANY($1)', [createdPariwars])
        .catch(() => undefined);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  /** Allocate `count` ids on a dedicated connection, committing for real. */
  async function allocate(client: pg.PoolClient, pariwar: PariwarId, count: number): Promise<string[]> {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, pariwar);
    try {
      const db = drizzle(client, { schema }) as unknown as Db;
      const ids = await allocateCanonicalIdentifierRange(db, {
        pariwarId: pariwar,
        freezeMonth: MAY_2026,
        count,
      });
      await client.query('COMMIT');
      return ids;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    }
  }

  it('two parallel allocators on the SAME (pariwar, month) → both succeed with DISJOINT ranges', async () => {
    const pariwar = toPariwarId(randomUUID());
    createdPariwars.push(pariwar);

    const c1 = await pool.connect();
    const c2 = await pool.connect();
    try {
      const [r1, r2] = await Promise.allSettled([allocate(c1, pariwar, 3), allocate(c2, pariwar, 3)]);

      // BOTH succeed — the counter serializes rather than collides (the MAX() design fails here).
      expect(r1.status).toBe('fulfilled');
      expect(r2.status).toBe('fulfilled');

      const ids1 = (r1 as PromiseFulfilledResult<string[]>).value;
      const ids2 = (r2 as PromiseFulfilledResult<string[]>).value;
      expect(ids1).toHaveLength(3);
      expect(ids2).toHaveLength(3);

      // NO duplicate canonical identifiers across the two winners — the AC1 property.
      const all = [...ids1, ...ids2];
      expect(new Set(all).size).toBe(6);

      // Together they form the contiguous 001..006 block: no sequence burned, none skipped.
      expect([...all].sort()).toEqual([
        'P-2026-05-001',
        'P-2026-05-002',
        'P-2026-05-003',
        'P-2026-05-004',
        'P-2026-05-005',
        'P-2026-05-006',
      ]);

      // Each allocator's OWN range is internally contiguous — a spawn saga assigns
      // result[i] to pool_index i, so an interleaved range would scatter a cycle's ids.
      for (const ids of [ids1, ids2]) {
        const seqs = ids.map((id) => Number(id.slice(-3)));
        expect(seqs[1]).toBe(seqs[0]! + 1);
        expect(seqs[2]).toBe(seqs[1]! + 1);
      }
    } finally {
      c1.release();
      c2.release();
    }
  }, 20_000);

  it('four parallel allocators → 10 unique ids, no collisions, counter lands exactly at 11', async () => {
    const pariwar = toPariwarId(randomUUID());
    createdPariwars.push(pariwar);

    const clients = await Promise.all([pool.connect(), pool.connect(), pool.connect(), pool.connect()]);
    let all: string[];
    try {
      const counts = [1, 2, 3, 4];
      const results = await Promise.all(clients.map((c, i) => allocate(c, pariwar, counts[i]!)));
      all = results.flat();
    } finally {
      // Release the racers BEFORE taking the admin connection — holding them would only
      // add contention to a pool this suite shares with itself.
      for (const c of clients) c.release();
    }

    expect(all).toHaveLength(10);
    // Membership, not an absolute table count (own-committing — other rows accumulate).
    expect(new Set(all).size).toBe(10);
    expect([...all].sort()).toEqual(
      Array.from({ length: 10 }, (_, i) => `P-2026-05-${String(i + 1).padStart(3, '0')}`).sort(),
    );

    // The counter for THIS pariwar/period ends at exactly 11 — every bump landed, none lost.
    const admin = await pool.connect();
    try {
      const { rows } = await admin.query<{ next_sequence: number }>(
        'SELECT next_sequence FROM pool_canonical_counters WHERE pariwar_id = $1 AND period = $2',
        [pariwar, '2026-05'],
      );
      expect(rows[0]?.next_sequence).toBe(11);
    } finally {
      admin.release();
    }
  }, 20_000);
});
