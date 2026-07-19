// Measured-validation framework — the concurrent-load p95 CORE (AI-6-2 / AI-4-1).
//
// ONE percentile + concurrency-driver core that BOTH surfaces import (validity FR-12A cached-path,
// 4.7 admin-search-with-KMS) and Story 7.9's pool-engine plug-in reuses — no duplicated measurement
// code (the "no duplicate tooling" contract). Superseding the SCOPE of the two placeholder benches
// (`p95-bench.spec.ts` uncached-validity + `search-projection-bench.spec.ts` no-KMS page query), not
// their files: this measures the REAL delivery path under configurable concurrency at parameterized
// scale, the measurement the retros' AI-4-1 has carried un-done for three retrospectives.

/**
 * p-th percentile (0..100) of an ALREADY-SORTED ascending numeric sample.
 *
 * Convention: FLOOR-INDEXED NEAREST-RANK — `sortedAsc[floor((p/100) * n)]`, clamped to the last index.
 * This is a DELIBERATE, FIXED convention (not linear interpolation): a different convention would
 * report a different number for an identical sample, which is exactly the kind of silent
 * apples-to-oranges the versioned-evidence discipline exists to prevent. Every evidence record produced
 * by this framework uses THIS convention; a comparison against a number produced by a different tool
 * (e.g. one that interpolates) is not automatically valid even at matching `schema_version` + config.
 */
export function percentile(sortedAsc: readonly number[], p: number): number {
  if (sortedAsc.length === 0) throw new Error('[measured-validation] percentile of an empty sample');
  if (p < 0 || p > 100) throw new Error(`[measured-validation] percentile p must be within [0, 100], got ${p}`);
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length));
  return sortedAsc[idx]!;
}

/** The measured percentiles for one benchmark run (ms), plus the count of measured (post-warmup) samples. */
export interface Percentiles {
  p50: number;
  p95: number;
  p99: number;
  /** Number of MEASURED iterations (warmup excluded). */
  count: number;
}

export interface MeasureOptions {
  /** Total MEASURED iterations (after warmup). */
  iterations: number;
  /** How many `op` invocations run concurrently (realistic-load contention). Default 1 (serial). */
  concurrency?: number;
  /** Discarded warmup iterations run BEFORE measurement (JIT / pool warm / cache prime). Default 0. */
  warmup?: number;
}

/** Round a millisecond figure to 2dp (evidence records stay diff-stable, not float-noisy). */
function round2(ms: number): number {
  return Number(ms.toFixed(2));
}

/**
 * Run `count` invocations of `op` under a bounded concurrency pool (`concurrency` workers each pulling
 * the next phase-local index until exhausted). If any invocation REJECTS, sibling workers are signalled
 * to stop pulling new work before the rejection propagates — no orphaned workers left running in the
 * background after the caller has already seen the failure (a source of post-test "connection already
 * closed" / "cannot log after tests done" flakiness otherwise).
 */
async function runPool(count: number, concurrency: number, op: (i: number) => Promise<unknown>, onSample?: (dt: number) => void): Promise<void> {
  if (count === 0) return;
  let next = 0;
  let cancelled = false;

  async function worker(): Promise<void> {
    for (;;) {
      if (cancelled) return;
      const i = next++;
      if (i >= count) return;
      const t0 = performance.now();
      await op(i);
      if (onSample) onSample(performance.now() - t0);
    }
  }

  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, count) }, () => worker()));
  } catch (err) {
    cancelled = true;
    throw err;
  }
}

/**
 * Drive `op` under a bounded concurrency pool, timing EACH invocation individually
 * (`performance.now()` around the awaited op) so the reported p95 reflects per-request latency UNDER
 * contention — the number FR-12A/4.7 budgets are stated against. Runs as TWO SEQUENTIAL phases — the
 * warmup pool runs to FULL completion, THEN the measured pool starts — so no measured invocation can
 * ever begin before every warmup invocation has finished (JIT / pool warm / cache prime is genuinely
 * complete before timing starts; under `concurrency > 1` a single shared-counter pool could otherwise
 * let a measured invocation start while warmup invocations were still in flight). Returns p50/p95/p99
 * over the measured set.
 *
 * The op receives its PHASE-LOCAL invocation index (0-based within its own phase — warmup indices reset
 * to 0 for the measured phase) so a caller can vary the input per call (e.g. a different member / a
 * jittered instant) to defeat single-key memoisation.
 */
export async function measureP95(
  op: (invocationIndex: number) => Promise<unknown>,
  options: MeasureOptions,
): Promise<Percentiles> {
  const warmup = Math.max(0, options.warmup ?? 0);
  const concurrency = Math.max(1, options.concurrency ?? 1);
  if (options.iterations <= 0) throw new Error('[measured-validation] iterations must be > 0');

  // Phase 1: warmup runs to full completion — its samples are discarded.
  await runPool(warmup, concurrency, op);

  // Phase 2: the measured set.
  const samples: number[] = [];
  await runPool(options.iterations, concurrency, op, (dt) => samples.push(dt));

  samples.sort((a, b) => a - b);
  return {
    p50: round2(percentile(samples, 50)),
    p95: round2(percentile(samples, 95)),
    p99: round2(percentile(samples, 99)),
    count: samples.length,
  };
}
