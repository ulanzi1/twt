// The P0 determinism-replay GATE for channels — Story 5.1 (Task 6; AC5).
//
// Renders the SAME fixed alert_id payload 100× across REAL OS worker threads (`worker_threads`) and
// asserts exactly ONE distinct rendered-output hash PER CHANNEL (byte-identical). ANY variance FAILS CI as
// a P0 architectural violation. This IS Epic 4's determinism muscle in the channel domain (epic-4-retro §6
// signal 1); modeled on packages/validity-service/tests/determinism.test.ts.
//
// ⚠ RENDER phase only — the gate never calls `send`. Provider delivery (message_id/timing/retries) is
// non-deterministic by nature and outside the AC5 guarantee.

import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { describe, expect, it } from 'vitest';

import { render } from '../src/render.js';
import { announcement } from './fixtures.js';

const WORKER_URL = new URL('./determinism.worker.mjs', import.meta.url);
const TOTAL_RUNS = 100;
const WORKERS = 8;
const CHANNELS = ['push', 'whatsapp', 'sms', 'telegram'] as const;

/** Spawn one REAL OS worker thread and collect its per-channel hashes. */
function runWorker(runs: number): Promise<Record<string, string[]>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(fileURLToPath(WORKER_URL));
    worker.once('message', (hashes: Record<string, string[]>) => {
      void worker.terminate();
      resolve(hashes);
    });
    worker.once('error', reject);
    worker.postMessage({ runs });
  });
}

describe('P0 determinism-replay gate (AC5 — 100× per channel across real OS threads)', () => {
  it(
    'produces exactly ONE distinct rendered hash per channel across 100 threaded renders',
    async () => {
      const perWorker = Math.ceil(TOTAL_RUNS / WORKERS);
      const batches = await Promise.all(Array.from({ length: WORKERS }, () => runWorker(perWorker)));

      for (const channel of CHANNELS) {
        const hashes = batches.flatMap((b) => b[channel] ?? []);
        expect(hashes.length, `${channel} run count`).toBeGreaterThanOrEqual(TOTAL_RUNS);
        const distinct = new Set(hashes);
        // THE P0 ASSERTION: byte-identical rendered output for every threaded run of this channel.
        expect(distinct.size, `${channel} must render byte-identically`).toBe(1);
        expect([...distinct][0]).toMatch(/^[0-9a-f]{64}$/);
      }
    },
    // Each of the 8 workers registers tsx's ESM resolve hook + dynamic-imports a TS module from cold —
    // real transpilation work, not free. Under `pnpm turbo run test` across all ~20 monorepo packages
    // (this machine: 8 cores), that startup cost can get starved past a tight budget. The assertion above
    // is unaffected — this is wall-clock headroom for CI/local full-parallel contention, not a weaker gate.
    90_000,
  );

  // Story 5.2 (AC6): the byte-identical hash above already covers the push deep-link/data field (it is
  // part of the RenderedMessage the worker hashes), so a non-deterministic deep-link would break the
  // single-hash assertion. This guard makes the coverage EXPLICIT: the push render carries a stable,
  // grammar-shaped deep-link that a regression dropping the field (→ null) or randomizing it would trip.
  it('push render carries a stable, non-null deep-link (covered by the byte-identical gate)', () => {
    const a = render(announcement(), 'push');
    const b = render(announcement(), 'push');
    expect(a.deepLink).not.toBeNull();
    expect(a.deepLink).toMatch(/^twt:\/\/p\/[0-9a-f-]+\/announcements\/[0-9a-f-]+$/);
    expect(a.deepLink).toBe(b.deepLink); // replay-stable
  });

  // Story 5.3 (AC7): the byte-identical hash above already covers the WA template body (it is part of the
  // RenderedMessage the worker hashes), so a non-deterministic WA render would break the single-hash
  // assertion. This guard makes the coverage EXPLICIT: the WA body is a stable, Meta-valid, whitespace-
  // normalized string (no newlines/tabs/4+ spaces) that a regression would trip.
  it('whatsapp render is replay-stable + whitespace-normalized (covered by the byte-identical gate)', () => {
    const a = render(announcement(), 'whatsapp');
    const b = render(announcement(), 'whatsapp');
    expect(a.body).toBe(b.body); // replay-stable
    expect(a.body).not.toMatch(/[\n\t]/);
    expect(a.body).not.toMatch(/ {4,}/);
    expect(a.body).toBe(a.body.trim());
  });
});
