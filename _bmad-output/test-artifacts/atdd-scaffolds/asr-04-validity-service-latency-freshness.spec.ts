/**
 * ASR-4 — FR-12A Member Validity Service: latency p95 < 200 ms at 4L synthetic
 * AND cache freshness ≤ 60 s after Niyamavali amendment or member-state change.
 *
 * Target stories: Story 4.6 (FR-12A canonical service) + Story 4.8 (per-cohort
 *                 cache invalidation with conservative-recompute fallback)
 * Target final location: apps/api/__tests__/perf/validity-service-latency.spec.ts
 *                       + apps/api/__tests__/chaos/validity-cache-freshness.spec.ts
 * Risks burned down: TECH-3, TECH-12, NFR-5, NFR-6
 *
 * RED-PHASE STATUS: test.skip()s in place. Activation blocked on:
 *   - TC-4 clock provider abstraction (lands with Story 1.12)
 *   - TC-5 4L synthetic factory (Epic 1)
 *
 * Lane: latency = Weekly (load runner); freshness = Nightly (chaos).
 *
 * Execution:  pnpm vitest --grep "@P0 @FR-12A"
 */

import { describe, expect, test, beforeAll } from 'vitest';
import { synth4LMembers, newPariwarId } from '../_fixtures/test-data';

// Imports do NOT exist yet — they land with Stories 4.6 / 4.8 / 1.12.
// import { fetchMemberValidity } from '@twt/api-client/validity';
// import { TestClock } from '@twt/test-utils/clock';
// import { amendNiyamavali } from '@twt/api-client/niyamavali';
// import { runLoad } from '@twt/test-utils/load';

declare function fetchMemberValidity(member_id: string): Promise<{
  evaluated_at: string;
  rule_registry_version: string;
  is_valid: boolean;
  is_active: boolean;
}>;

declare function runLoad(
  fn: () => Promise<unknown>,
  options: { vus: number; durationSeconds: number },
): Promise<{ p50_ms: number; p95_ms: number; p99_ms: number; rps: number }>;

declare class TestClock {
  static install(): TestClock;
  advance(seconds: number): Promise<void>;
  uninstall(): void;
}

declare function amendNiyamavali(args: {
  pariwar_id: string;
  clause_id: string;
  new_value: unknown;
}): Promise<{ version: string }>;

describe('@P0 @FR-12A @Latency @Weekly Member Validity Service load', () => {
  beforeAll(async () => {
    // Pre-seed: 4L synthetic members with mixed lifecycle states.
    // (Done via /test/seed-bulk; synth4LMembers feeds the seeder.)
    const pariwar_id = newPariwarId('bihar');
    const _seeded = Array.from(synth4LMembers(pariwar_id, 400_000));
    expect(_seeded).toHaveLength(400_000);
  });

  test.skip(
    'p95 < 200 ms under 50 VUs × 60 s against fully-populated registry',
    async () => {
      const result = await runLoad(
        async () => {
          const memberIndex = Math.floor(Math.random() * 400_000);
          const member_id = `m4L-${memberIndex.toString().padStart(7, '0')}`;
          await fetchMemberValidity(member_id);
        },
        { vus: 50, durationSeconds: 60 },
      );

      expect(result.p95_ms).toBeLessThan(200); // NFR-5 hard threshold
      expect(result.p99_ms).toBeLessThan(500); // soft ceiling — alerts on breach
    },
    { timeout: 5 * 60 * 1000 },
  );
});

describe('@P0 @FR-12A @Freshness @Chaos cache freshness invariant', () => {
  let clock: TestClock;

  beforeAll(() => {
    clock = TestClock.install();
  });

  test.skip('Niyamavali amendment propagates to all-members read within 60 s', async () => {
    const pariwar_id = newPariwarId('bihar');
    const member_id = 'm4L-0000123';

    const before = await fetchMemberValidity(member_id);
    expect(before.is_valid).toBe(true);

    // Amend a clause that disqualifies the member (e.g., medical-disclosure
    // tightening). Triggers per-cohort invalidation per Story 4.8.
    const amendment = await amendNiyamavali({
      pariwar_id,
      clause_id: 'R8_skip_allowance',
      new_value: { allowed_skips_per_year: 0 },
    });
    expect(amendment.version).not.toBe(before.rule_registry_version);

    // Advance clock < 60 s — read must already reflect the amendment OR be
    // serving a stale-but-permitted value (within invariant).
    await clock.advance(59);
    const within = await fetchMemberValidity(member_id);
    // Invariant: by t = 60 s the read MUST reflect the new version.
    if (within.rule_registry_version === before.rule_registry_version) {
      // still stale at t=59s — must flip by t=60s.
      await clock.advance(2);
      const flipped = await fetchMemberValidity(member_id);
      expect(flipped.rule_registry_version).toBe(amendment.version);
    } else {
      expect(within.rule_registry_version).toBe(amendment.version);
    }
  });

  test.skip('conservative all-members fallback fires when scope confidence is insufficient', async () => {
    // Story 4.8 invariant: per-cohort invalidation is permitted but MUST fall
    // back to all-members recompute when the cohort scope confidence is
    // insufficient (e.g., amendment affects unscoped predicates).
    const pariwar_id = newPariwarId('bihar');

    const beforeVersion = (await fetchMemberValidity('m4L-0000001')).rule_registry_version;

    const amendment = await amendNiyamavali({
      pariwar_id,
      clause_id: 'R5_C_2', // affects all members; cohort scope insufficient
      new_value: { reinterpret_actual_cause_of_death: true },
    });

    await clock.advance(60);

    // Sample 100 random members; every single one must be at the new version.
    for (let i = 0; i < 100; i++) {
      const idx = Math.floor(Math.random() * 400_000);
      const member_id = `m4L-${idx.toString().padStart(7, '0')}`;
      const v = await fetchMemberValidity(member_id);
      expect(v.rule_registry_version).toBe(amendment.version);
    }

    expect(beforeVersion).not.toBe(amendment.version);
  });
});
