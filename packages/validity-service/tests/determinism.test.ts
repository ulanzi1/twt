// The P0 determinism-replay GATE — Story 4.6 (Task 6; AC2, confirmed D4-A).
//
// Runs the SAME pinned-instant composition 100× across REAL OS worker threads (`worker_threads`) and
// asserts exactly ONE distinct `validity_payload_hash`. ANY variance FAILS CI as a P0 architectural
// violation. This genuinely exposes hash-map / async-completion-order nondeterminism at the service
// composition layer that a single-threaded 100× loop would not (D4-A vs the weaker D4-B).
//
// Wired into ci.yml as a dedicated `determinism-replay` P0 job. Any FUTURE optimization (parallel rule
// execution, async rule evaluation, hash-map traversal in indeterminate order) MUST keep this green or
// be rejected at code review (AC2 final bullet).

import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { describe, expect, it } from 'vitest';

const WORKER_URL = new URL('./determinism.worker.mjs', import.meta.url);
const TOTAL_RUNS = 100;
const WORKERS = 8;

/**
 * Spawn one REAL OS worker thread and collect its hashes. The worker is plain JS (`.mjs`) that registers
 * tsx at runtime, then dynamic-imports the TS composition (see determinism.worker.mjs for why the
 * `--import tsx` execArgv route does not work under Node 22 native type-stripping).
 */
function runWorker(runs: number, baseSeed: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(fileURLToPath(WORKER_URL));
    worker.once('message', (hashes: string[]) => {
      void worker.terminate();
      resolve(hashes);
    });
    worker.once('error', reject);
    worker.postMessage({ runs, baseSeed });
  });
}

describe('P0 determinism-replay gate (AC2 — 100× across real OS threads)', () => {
  it(
    'produces exactly ONE distinct validity_payload_hash across 100 threaded evaluations',
    async () => {
      // Distribute 100 runs across 8 real worker threads (scrambled async completion order inside each).
      const perWorker = Math.ceil(TOTAL_RUNS / WORKERS);
      const batches = await Promise.all(
        Array.from({ length: WORKERS }, (_v, w) => runWorker(perWorker, w * 1000)),
      );
      const hashes = batches.flat();
      expect(hashes.length).toBeGreaterThanOrEqual(TOTAL_RUNS);

      const distinct = new Set(hashes);
      // THE P0 ASSERTION: byte-identical payload hash for every threaded run.
      expect(distinct.size).toBe(1);
      // Every hash is a well-formed 64-hex digest.
      expect([...distinct][0]).toMatch(/^[0-9a-f]{64}$/);
    },
    // Each of the 8 workers registers tsx's ESM resolve hook + dynamic-imports a TS module from cold —
    // real transpilation work, not free. Under `pnpm turbo run test` across all ~20 monorepo packages
    // (this machine: 8 cores), that startup cost can get starved past a tight budget. The assertion above
    // is unaffected — this is wall-clock headroom for CI/local full-parallel contention, not a weaker gate.
    90_000,
  );
});
