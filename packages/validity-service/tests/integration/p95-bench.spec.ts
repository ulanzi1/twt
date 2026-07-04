// p95 benchmark harness — live-DB (Story 4.6, Task 6; confirmed D3-A).
//
// Establishes + RECORDS the UNCACHED-path p95 of getValidityAt as a tracked budget. Per D3-A, 4.6's
// gate is that the harness RUNS and the budget is RECORDED — the 200ms@4L (400,000-member) target is
// DELIVERED by Story 4.8's materialized-view + per-cohort cache (architecture §1.10), NOT the uncached
// 4.6 path. The AC's "measured under realistic load in CI / pre-launch validation" is MEASUREMENT, not
// green-at-4L pre-cache.
//
// The instant is varied per iteration so the engine's idempotency memo MISSES every call — measuring
// the true uncached compute path (resolve → produce facts → evaluate R12 → assemble → hash), not a
// cache-hit replay. Seeding the full 4L dataset is impractical in CI; this measures single-member
// uncached latency + records it (the per-cohort 4L scale-out is Story 4.8's harness).
//
// R7/R8 read-amplification ([[CR-4.2-D1]] / [[CR-4.3-D2]]): NOTHING to measure at 4.6 — R7/R8 are gated
// OFF (no contribution producer, D2-A), so those ladders never evaluate. The read-amplification measure
// re-triggers when the Epic 8/9 contribution producer wires them (recorded as a deferred CR).

import { randomUUID } from 'node:crypto';

import { createDb, ids, idempotency, schema, type Db } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getValidityAt, type ValidityServiceDeps } from '../../src/index.js';
import { R12_PAYLOAD } from '../fixtures/r12-clause.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const ITERATIONS = 120;
const WARMUP = 10;
/** A LOOSE sanity ceiling for the uncached single-member path — NOT the 200ms@4L target (Story 4.8). */
const SANITY_CEILING_MS = 2000;

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx]!;
}

describe.skipIf(!hasDatabase)('validity-service — p95 benchmark harness (D3-A; live DB) (:5433)', () => {
  let db: Db;
  let pool: pg.Pool;
  let deps: ValidityServiceDeps;
  const pariwarId = ids.pariwarId(randomUUID());
  const memberId = ids.memberId(randomUUID());

  beforeAll(async () => {
    if (!hasDatabase) return;
    const created = createDb(DATABASE_URL!, { ssl: false, max: 8 });
    db = created.db;
    pool = created.pool;
    deps = { db, keyedStore: idempotency.createKeyedStore(pool), servicePool: pool };
    const joinedAt = new Date('2010-06-01T00:00:00Z');
    const at = (n: number): Date => new Date(joinedAt.getTime() + n * 1000);
    await db.insert(schema.eventsLog).values([
      { streamId: memberId, eventType: 'member.signup_initiated', payload: {}, eventVersion: 1, actorId: null, pariwarId, occurredAt: joinedAt },
      { streamId: memberId, eventType: 'member.kyc_completed', payload: {}, eventVersion: 2, actorId: null, pariwarId, occurredAt: at(2) },
      { streamId: memberId, eventType: 'member.vyawastha_shulk_paid', payload: {}, eventVersion: 3, actorId: null, pariwarId, occurredAt: at(3) },
      { streamId: memberId, eventType: 'member.lock_in_expired', payload: { kyc_verified: true }, eventVersion: 4, actorId: null, pariwarId, occurredAt: at(4) },
    ]);
    await db.insert(schema.clauseVersions).values({
      clauseVersionId: ids.clauseVersionId(randomUUID()),
      clauseId: ids.clauseId('niy.retirement-coverage.r12'),
      pariwarId,
      version: 1,
      effectiveDate: new Date('2000-01-01T00:00:00Z'),
      payload: { ...R12_PAYLOAD },
      benefitMechanism: 'pool',
    });
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    await pool.query('DELETE FROM clause_versions WHERE pariwar_id = $1', [pariwarId]).catch(() => undefined);
    await pool.query('DELETE FROM events_log WHERE pariwar_id = $1', [pariwarId]).catch(() => undefined);
    await pool.query('DELETE FROM idempotency_keys WHERE key LIKE $1', [`rule-eval:v1:%:${memberId}:%`]).catch(() => undefined);
    await pool.end();
  });

  it('measures + records the uncached getValidityAt p95 (budget establishment, D3-A)', async () => {
    const baseAt = new Date('2025-06-01T00:00:00Z').getTime();
    const samples: number[] = [];
    for (let i = 0; i < WARMUP + ITERATIONS; i++) {
      // Vary the instant so the engine memo MISSES → true uncached compute path each call.
      const at = new Date(baseAt + i * 1000);
      const t0 = performance.now();
      await getValidityAt(deps, { pariwarId, memberId }, at, { internal: true });
      const dt = performance.now() - t0;
      if (i >= WARMUP) samples.push(dt);
    }
    samples.sort((a, b) => a - b);
    const budget = {
      iterations: ITERATIONS,
      p50_ms: Number(percentile(samples, 50).toFixed(2)),
      p95_ms: Number(percentile(samples, 95).toFixed(2)),
      p99_ms: Number(percentile(samples, 99).toFixed(2)),
      note: 'uncached single-member path; 200ms@4L is delivered by Story 4.8 cache (D3-A)',
    };
    // RECORD the budget (tracked in the run log; see tests/bench/p95-budget.md for the committed record).
    console.log('[validity-service p95 budget]', JSON.stringify(budget));

    // The harness must PRODUCE a finite measurement (D3-A gate). A loose sanity ceiling guards against a
    // pathological regression WITHOUT asserting the 200ms@4L target (that is Story 4.8's cache to green).
    expect(Number.isFinite(budget.p95_ms)).toBe(true);
    expect(budget.p95_ms).toBeLessThan(SANITY_CEILING_MS);
  });
});
