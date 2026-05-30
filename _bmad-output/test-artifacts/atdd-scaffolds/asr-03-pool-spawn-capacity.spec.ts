/**
 * ASR-3 — Pool-spawn capacity gate: N=50, M=4L synthetic ⇒ p95 < 60 s.
 * NFR-7 measured-validation gate; Phase-1 launch blocker.
 *
 * Target story: Story 7.9 (Pool Engine Pre-Launch Measured-Validation Gate)
 * Target final location: apps/api/__tests__/perf/pool-spawn-capacity.spec.ts
 * Risks burned down: TECH-4 (capacity breach), PERF-1, OPS-4 (queue saturation)
 *
 * RED-PHASE STATUS: orchestration scaffold uses test.skip(). The actual load
 * profile is a co-located k6 or Artillery script (skeleton below). Activation
 * blocked on:
 *   - B-1: Pool Engine snapshot format (AR-11 ADR)
 *   - TC-5: 4L synthetic-member factory (Epic 1 infra)
 *   - Story 7.3 saga (parent → N child jobs)
 *
 * Lane: Weekly (dedicated runner). Not run on PR.
 *
 * Execution:
 *   k6 run apps/api/__tests__/perf/pool-spawn.k6.js   # external load
 *   pnpm vitest --grep "@P0 @Pool @Capacity"          # orchestration assertions
 */

import { describe, expect, test } from 'vitest';
import { synth4LMembers, newPariwarId, newCycleId } from '../_fixtures/test-data';

// Imports do NOT exist yet — they land with Stories 7.3 / 7.9.
// import { triggerCycleFreeze, getSpawnMetrics } from '@twt/jobs/pool-engine-harness';

declare function triggerCycleFreeze(args: {
  pariwar_id: string;
  cycle_id: string;
  approved_claim_count: number; // = N
}): Promise<{ run_id: string }>;

declare function getSpawnMetrics(run_id: string): Promise<{
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  pool_count: number;
  members_assigned: number;
  saga_status: 'succeeded' | 'partial' | 'failed';
  child_job_failures: number;
}>;

describe('@P0 @Pool @Capacity @Weekly Pool spawn capacity envelope', () => {
  test.skip(
    'N=50 / M=4L spawn p95 < 60 s on the Weekly runner',
    async () => {
      const pariwar_id = newPariwarId('bihar');
      const cycle_id = newCycleId('2026-06');

      // Pre-step: 4L synthetic members seeded via /test/seed-bulk
      // (the synth4LMembers generator is consumed by the seeder upstream).
      const fourL = Array.from(synth4LMembers(pariwar_id, 400_000));
      expect(fourL).toHaveLength(400_000);

      // Trigger cycle freeze with 50 approved claims → 50 pools spawned.
      const { run_id } = await triggerCycleFreeze({
        pariwar_id,
        cycle_id,
        approved_claim_count: 50,
      });

      const metrics = await getSpawnMetrics(run_id);

      // NFR-7 hard threshold: p95 < 60 s.
      expect(metrics.p95_ms).toBeLessThan(60_000);
      expect(metrics.pool_count).toBe(50);
      expect(metrics.members_assigned).toBe(400_000);
      expect(metrics.saga_status).toBe('succeeded');
      expect(metrics.child_job_failures).toBe(0);
    },
    { timeout: 10 * 60 * 1000 }, // 10-minute test envelope; gate fires < 60 s
  );

  test.skip('mid-sweep N=10 / M=4L stays under capacity envelope (Nightly proxy)', async () => {
    // Lighter proxy that the Nightly lane can run; gates the trend, not the
    // launch. The full Weekly gate above is the launch-blocking measurement.
    const pariwar_id = newPariwarId('bihar');
    const cycle_id = newCycleId('2026-06');

    const { run_id } = await triggerCycleFreeze({
      pariwar_id,
      cycle_id,
      approved_claim_count: 10,
    });

    const metrics = await getSpawnMetrics(run_id);
    expect(metrics.p95_ms).toBeLessThan(30_000); // N=10 proxy budget
    expect(metrics.saga_status).toBe('succeeded');
  });
});

/* ───────────────────────────────────────────────────────────────────────────
   K6 SKELETON (co-located; replace `// TODO` lines once endpoints land)
   File: apps/api/__tests__/perf/pool-spawn.k6.js  (created once k6 toolchain
   is installed — see test-design-qa.md §Tooling & Access for runner spec.)

   import http from 'k6/http';
   import { check } from 'k6';

   export const options = {
     scenarios: {
       cycle_freeze: {
         executor: 'shared-iterations',
         vus: 1,
         iterations: 1,
         maxDuration: '10m',
       },
     },
     thresholds: {
       'http_req_duration{name:cycle_freeze}': ['p(95)<60000'],
     },
   };

   export default function () {
     const res = http.post(`${__ENV.API_BASE}/p/${__ENV.PARIWAR_ID}/admin/cycle/freeze`, {
       cycle_id: __ENV.CYCLE_ID,
       approved_claim_count: 50,
     }, { tags: { name: 'cycle_freeze' } });
     check(res, { 'status is 202': (r) => r.status === 202 });
   }
   ─────────────────────────────────────────────────────────────────────── */
