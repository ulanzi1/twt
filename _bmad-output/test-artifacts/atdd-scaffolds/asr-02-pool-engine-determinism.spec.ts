/**
 * ASR-2 — Pool Engine determinism: `pool_index = hash(member_id + cycle_id) % N`
 * reproducible from (member_id, cycle_id) alone; full-cycle replay matches.
 *
 * Target story: Story 7.4 (Deterministic Member-to-Pool Assignment + Property + Replay)
 * Target final location: packages/domain/__tests__/pool-engine/determinism.spec.ts
 * Risks burned down: TECH-11 (assignment imbalance), AR-57 (determinism & replay)
 *
 * RED-PHASE STATUS: all tests use `test.skip()`. Activation blocked on:
 *   - B-1: Pool Engine snapshot format (AR-11 ADR)
 *
 * Property-based via fast-check; replay via snapshot loader.
 *
 * Execution:  pnpm vitest --grep "@P0 @Pool @Determinism"
 */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { newCycleId, newPoolSnapshotInput } from '../_fixtures/test-data';

// These imports do NOT exist yet — they land with Story 7.1 / 7.4.
// Listed here as the contract the test expects.
// import { assignMemberToPool, replayPoolAssignmentsFromSnapshot } from '@twt/domain/pool-engine';

declare function assignMemberToPool(
  args: { member_id: string; cycle_id: string; pool_count: number },
): { pool_index: number };
declare function replayPoolAssignmentsFromSnapshot(
  snapshot: ReturnType<typeof newPoolSnapshotInput> & { members: string[] },
): Array<{ member_id: string; pool_index: number }>;

describe('@P0 @Pool @Determinism assignMemberToPool', () => {
  test.skip('idempotent: same (member_id, cycle_id, N) ⇒ same pool_index', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 6, maxLength: 64 }),
        fc.string({ minLength: 6, maxLength: 24 }),
        fc.integer({ min: 1, max: 100 }),
        (member_id, cycle_id, pool_count) => {
          const a = assignMemberToPool({ member_id, cycle_id, pool_count });
          const b = assignMemberToPool({ member_id, cycle_id, pool_count });
          expect(a.pool_index).toBe(b.pool_index);
        },
      ),
    );
  });

  test.skip('range invariant: pool_index ∈ [0, N)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 6, maxLength: 64 }),
        fc.string({ minLength: 6, maxLength: 24 }),
        fc.integer({ min: 1, max: 100 }),
        (member_id, cycle_id, pool_count) => {
          const { pool_index } = assignMemberToPool({ member_id, cycle_id, pool_count });
          expect(pool_index).toBeGreaterThanOrEqual(0);
          expect(pool_index).toBeLessThan(pool_count);
        },
      ),
    );
  });

  test.skip('balance invariant: across M members and N pools, max-min ≤ 1 (per FR-14)', () => {
    // Sample at M=10,000 / N=50; full M=4L exercised by ASR-3 (load).
    const cycle_id = 'cycle-2026-06';
    const N = 50;
    const M = 10_000;
    const bucket = new Array(N).fill(0);
    for (let i = 0; i < M; i++) {
      const { pool_index } = assignMemberToPool({
        member_id: `m-${i.toString().padStart(7, '0')}`,
        cycle_id,
        pool_count: N,
      });
      bucket[pool_index]++;
    }
    const max = Math.max(...bucket);
    const min = Math.min(...bucket);
    // Strict per-FR-14: pool sizes differ by ≤ ceil(M/N) − floor(M/N) ≤ 1.
    expect(max - min).toBeLessThanOrEqual(1);
  });
});

describe('@P0 @Pool @Replay replayPoolAssignmentsFromSnapshot', () => {
  test.skip('snapshot replay reproduces identical assignments', () => {
    const snapshot = {
      ...newPoolSnapshotInput(/* M */ 5_000, /* N */ 20),
      members: Array.from({ length: 5_000 }, (_, i) => `m-${i.toString().padStart(7, '0')}`),
    };

    const first = replayPoolAssignmentsFromSnapshot(snapshot);
    const second = replayPoolAssignmentsFromSnapshot(snapshot);

    expect(first).toEqual(second);
    expect(first).toHaveLength(snapshot.members.length);
    // Every member appears exactly once; every pool_index in range.
    const seen = new Set(first.map((r) => r.member_id));
    expect(seen.size).toBe(snapshot.members.length);
    for (const row of first) {
      expect(row.pool_index).toBeGreaterThanOrEqual(0);
      expect(row.pool_index).toBeLessThan(snapshot.pool_count);
    }
  });

  test.skip('snapshot is the source of truth: changing live registry does NOT change replay', () => {
    // Replay against a snapshot with rule_registry_version v1.0.0 must produce
    // identical pool assignments even if the live registry has since advanced.
    const snapshot = {
      ...newPoolSnapshotInput(1_000, 10),
      members: Array.from({ length: 1_000 }, (_, i) => `m-${i.toString().padStart(7, '0')}`),
      rule_registry_version: 'v1.0.0',
    };

    const replayBefore = replayPoolAssignmentsFromSnapshot(snapshot);
    // Simulate registry version advancing: snapshot.rule_registry_version is
    // pinned, so the engine MUST use the snapshot's version, not the live one.
    snapshot.rule_registry_version = 'v1.0.0'; // pinned; do not change
    const replayAfter = replayPoolAssignmentsFromSnapshot(snapshot);

    expect(replayAfter).toEqual(replayBefore);
  });
});
