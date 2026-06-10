// packages/contracts/tests/validation-parity.test.ts
//
// Per architecture §4.4 line 2567-2572 cross-surface validation parity test.
//
// At Story 1.4 only the Zod runtime is in-tree. Downstream Stories add:
//   - fastify-type-provider-zod (apps/api substantive routes, Story 1.9+)
//   - @hookform/resolvers/zod (apps/admin + apps/mobile forms, Stories 1.9+ / 3.x / 6.x / 9.x)
//   - Astro Actions (apps/public, Story 2.x)
//
// The harness shape committed at Story 1.4 is what downstream Stories extend.

import { describe, it, expect } from 'vitest';
import { PaginationQuery } from '../src/_common/pagination.js';

type FixtureRuntime = {
  name: string;
  validate: (input: unknown) => { ok: true } | { ok: false; reason: string };
};

type FixtureRow = { input: unknown; expected: 'accept' | 'reject' };

function runFixtureSet(
  runtimes: ReadonlyArray<FixtureRuntime>,
  inputs: ReadonlyArray<FixtureRow>,
): Array<{
  runtime: string;
  results: Array<{ ok: boolean; expected: 'accept' | 'reject'; reason?: string }>;
}> {
  return runtimes.map((runtime) => ({
    runtime: runtime.name,
    results: inputs.map((entry) => {
      const r = runtime.validate(entry.input);
      return r.ok
        ? { ok: true, expected: entry.expected }
        : { ok: false, expected: entry.expected, reason: r.reason };
    }),
  }));
}

describe('cross-surface validation parity (Story 1.4 scaffold; per architecture §4.4)', () => {
  const fixtures: ReadonlyArray<FixtureRow> = [
    { input: {}, expected: 'accept' },
    { input: { limit: 25 }, expected: 'accept' },
    { input: { cursor: 'abc', limit: 50 }, expected: 'accept' },
    { input: { limit: 100 }, expected: 'reject' }, // FR-91 cap
    { input: { limit: -1 }, expected: 'reject' },
    { input: { limit: 'twenty' }, expected: 'reject' },
  ];

  const zodRuntime: FixtureRuntime = {
    name: 'zod',
    validate: (input) => {
      const r = PaginationQuery.safeParse(input);
      return r.success ? { ok: true } : { ok: false, reason: r.error.message };
    },
  };

  // Story 1.9+ extends `runtimes` with fastify-type-provider-zod runtime.
  // Story 3.x / 6.x / 9.x extends with @hookform/resolvers/zod runtime.
  // Story 2.x extends with Astro Actions runtime.
  const runtimes: ReadonlyArray<FixtureRuntime> = [zodRuntime];

  it('all runtimes produce identical accept/reject partitions', () => {
    const results = runFixtureSet(runtimes, fixtures);
    for (const runtimeResult of results) {
      for (let i = 0; i < runtimeResult.results.length; i += 1) {
        const r = runtimeResult.results[i]!;
        const matches =
          (r.ok && r.expected === 'accept') || (!r.ok && r.expected === 'reject');
        expect(
          matches,
          `runtime=${runtimeResult.runtime} fixture=${i} expected=${r.expected} ok=${r.ok}`,
        ).toBe(true);
      }
    }
  });

  it('partition rows agree across runtimes (placeholder for ≥2 runtimes; Story 1.9+ asserts substantively)', () => {
    const results = runFixtureSet(runtimes, fixtures);
    // With one runtime the assertion is trivially satisfied; the test is
    // committed at Story 1.4 to lock the harness shape. Downstream Stories
    // add runtimes to `runtimes` array and the cross-runtime agreement
    // becomes load-bearing.
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < results.length; i += 1) {
      const baseline = results[0]!.results;
      const compare = results[i]!.results;
      for (let j = 0; j < baseline.length; j += 1) {
        expect(
          compare[j]!.ok,
          `runtime=${results[i]!.runtime} fixture=${j} disagrees with baseline runtime=${results[0]!.runtime}`,
        ).toBe(baseline[j]!.ok);
      }
    }
  });
});
