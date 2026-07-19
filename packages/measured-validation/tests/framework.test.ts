// Unit tests for the measured-validation framework CORE (AI-6-2) — DB-free, so they run in the ci:local
// `test (unit)` lane. Cover: percentile math + measureP95 concurrency shape, the versioned-evidence record
// (schema stamp, git provenance, config-delta comparison), and the STRONGER-THAN-HASH replay proof
// (deep-equal gap, degenerate/constant hash, discrimination) — the three teeth the framework must have.

import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it, vi } from 'vitest';

import {
  assertReplayStable,
  buildRecord,
  compareRecords,
  envInt,
  gitCommit,
  measureP95,
  percentile,
  pgServerVersion,
  readRecords,
  recordEvidence,
  type BenchmarkConfig,
  type BenchmarkRecord,
} from '../src/index.js';

const AT = '2026-07-17T00:00:00.000Z';
const H1 = 'a'.repeat(64);
const H2 = 'b'.repeat(64);

function cfg(over: Partial<BenchmarkConfig> = {}): BenchmarkConfig {
  return {
    n: null,
    m: 1000,
    concurrency: 8,
    iterations: 100,
    warmup: 10,
    cryptoAdapter: 'dev-fake-kms',
    env: 'ci-local-smoke',
    dbVersion: '16.0',
    ...over,
  };
}

describe('percentile', () => {
  it('indexes a sorted sample', () => {
    const s = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(s, 50)).toBe(6);
    expect(percentile(s, 95)).toBe(10);
    expect(percentile(s, 99)).toBe(10);
  });
  it('throws on an empty sample (never a silent 0)', () => {
    expect(() => percentile([], 95)).toThrow(/empty/);
  });
  it('rejects an out-of-range p (never a silent negative-index read)', () => {
    expect(() => percentile([1, 2, 3], -1)).toThrow(/0, 100/);
    expect(() => percentile([1, 2, 3], 101)).toThrow(/0, 100/);
  });
});

describe('measureP95', () => {
  it('discards warmup, measures `iterations`, and returns finite percentiles', async () => {
    const seen: number[] = [];
    const r = await measureP95(
      async (i) => {
        seen.push(i);
      },
      { iterations: 50, warmup: 5, concurrency: 4 },
    );
    expect(r.count).toBe(50); // warmup excluded from the measured set
    expect(seen).toHaveLength(55); // but every invocation (warmup + measured) ran
    expect(Number.isFinite(r.p95)).toBe(true);
    expect(r.p50).toBeLessThanOrEqual(r.p95);
    expect(r.p95).toBeLessThanOrEqual(r.p99);
  });

  it('never runs more than `concurrency` ops in flight at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await measureP95(
      async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((res) => setTimeout(res, 2));
        inFlight--;
      },
      { iterations: 40, concurrency: 5, warmup: 0 },
    );
    expect(maxInFlight).toBeLessThanOrEqual(5);
    expect(maxInFlight).toBeGreaterThan(1); // it actually parallelised
  });

  it('rejects a non-positive iteration count', async () => {
    await expect(measureP95(async () => undefined, { iterations: 0 })).rejects.toThrow(/iterations/);
  });

  it('runs the warmup phase to FULL completion before any measured invocation starts', async () => {
    let warmupInFlight = 0;
    let warmupCompleted = 0;
    let measuredStartedWhileWarmupInFlight = false;
    await measureP95(
      async (i) => {
        // `i` is phase-local (resets to 0 for the measured phase); use `warmupCompleted` as the phase
        // discriminator instead — once ALL 6 warmup calls have finished, we're in the measured phase.
        const inWarmupPhase = warmupCompleted < 6;
        if (inWarmupPhase) {
          warmupInFlight++;
          await new Promise((res) => setTimeout(res, 3));
          warmupInFlight--;
          warmupCompleted++;
        } else {
          if (warmupInFlight > 0) measuredStartedWhileWarmupInFlight = true;
        }
        void i;
      },
      { iterations: 10, warmup: 6, concurrency: 4 },
    );
    expect(warmupCompleted).toBe(6);
    expect(measuredStartedWhileWarmupInFlight).toBe(false);
  });

  it('cancels sibling workers when one invocation rejects (no orphaned workers left running)', async () => {
    let started = 0;
    const op = async (i: number): Promise<void> => {
      started++;
      if (i === 2) throw new Error('boom');
      await new Promise((res) => setTimeout(res, 20));
    };
    await expect(measureP95(op, { iterations: 20, concurrency: 4, warmup: 0 })).rejects.toThrow('boom');
    // Give any orphaned (uncancelled) workers a chance to keep running — if cancellation works, no
    // further invocations start once the pool has observed the rejection.
    const startedAtFailure = started;
    await new Promise((res) => setTimeout(res, 50));
    expect(started).toBe(startedAtFailure); // no NEW invocation started after the rejection propagated
  });
});

describe('versioned evidence record', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mv-evidence-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('stamps schema_version + provenance and derives pass from p95 vs budget', () => {
    const rec = buildRecord({
      metric: 'fr12a-cached-p95',
      config: cfg(),
      gitCommit: 'deadbeef',
      results: { p50: 5, p95: 9.6, p99: 15, count: 100 },
      budgetMs: 200,
      recordedAt: AT,
    });
    expect(rec.schemaVersion).toBe(1);
    expect(rec.gitCommit).toBe('deadbeef');
    expect(rec.pass).toBe(true); // 9.6 < 200
    const breach = buildRecord({ ...{ metric: 'x', config: cfg(), gitCommit: 'c', budgetMs: 200, recordedAt: AT }, results: { p50: 1, p95: 250, p99: 300, count: 1 } });
    expect(breach.pass).toBe(false); // 250 ≥ 200
  });

  it('round-trips appended records through the doc (never a bare number)', () => {
    const doc = join(dir, 'evidence.md');
    const rec = buildRecord({ metric: 'm', config: cfg(), gitCommit: 'c', results: { p50: 1, p95: 2, p99: 3, count: 10 }, budgetMs: 200, recordedAt: AT });
    recordEvidence(doc, rec);
    recordEvidence(doc, buildRecord({ metric: 'm', config: cfg({ m: 2000 }), gitCommit: 'c', results: { p50: 4, p95: 5, p99: 6, count: 10 }, budgetMs: 200, recordedAt: AT }));
    const back = readRecords(doc);
    expect(back).toHaveLength(2);
    expect(back[0]!.metric).toBe('m');
    expect(back[1]!.config.m).toBe(2000);
    // The doc stays human-readable (fenced json), not an opaque blob.
    expect(readFileSync(doc, 'utf-8')).toContain('```json');
  });

  it('compares numbers ONLY at matching schema + metric + config; else surfaces a delta', () => {
    const base: BenchmarkRecord = buildRecord({ metric: 'm', config: cfg(), gitCommit: 'c', results: { p50: 1, p95: 10, p99: 12, count: 10 }, budgetMs: 200, recordedAt: AT });
    const same = buildRecord({ metric: 'm', config: cfg(), gitCommit: 'd', results: { p50: 2, p95: 13, p99: 14, count: 10 }, budgetMs: 200, recordedAt: AT });
    const cmp = compareRecords(base, same);
    expect(cmp.comparable).toBe(true);
    if (cmp.comparable) expect(cmp.p95DeltaMs).toBe(3); // 13 − 10

    // A different scale is NOT silently comparable — the config delta is surfaced.
    const scaled = buildRecord({ metric: 'm', config: cfg({ m: 400_000, cryptoAdapter: 'cloud-kms' }), gitCommit: 'e', results: { p50: 2, p95: 13, p99: 14, count: 10 }, budgetMs: 200, recordedAt: AT });
    const cmp2 = compareRecords(base, scaled);
    expect(cmp2.comparable).toBe(false);
    if (!cmp2.comparable) {
      expect(cmp2.reason).toBe('config_mismatch');
      expect(cmp2.delta.join(' ')).toMatch(/m: 1000 → 400000/);
      expect(cmp2.delta.join(' ')).toMatch(/cryptoAdapter/);
    }
  });

  it('readRecords returns [] for a missing doc but RETHROWS a non-ENOENT fs error', () => {
    expect(readRecords(join(dir, 'never-written.md'))).toEqual([]);
    // A path that is a DIRECTORY, not a file, fails with EISDIR — not ENOENT — and must propagate.
    expect(() => readRecords(dir)).toThrow();
  });

  it('skips a malformed or config-less record block (loudly), keeping only well-formed ones', () => {
    const doc = join(dir, 'malformed.md');
    const good = buildRecord({ metric: 'm', config: cfg(), gitCommit: 'c', results: { p50: 1, p95: 2, p99: 3, count: 10 }, budgetMs: 200, recordedAt: AT });
    recordEvidence(doc, good);
    appendFileSync(doc, '\n```json\nnot valid json{{\n```\n', 'utf-8');
    appendFileSync(doc, '\n```json\n{"schemaVersion": 1, "metric": "no-config"}\n```\n', 'utf-8');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const records = readRecords(doc);
    expect(records).toHaveLength(1);
    expect(records[0]!.metric).toBe('m');
    expect(warnSpy).toHaveBeenCalled(); // the drop is LOUD, not silent
    warnSpy.mockRestore();
  });

  it('recordEvidence: repeated lock-guarded appends to the SAME doc all land intact (round-trip, none dropped)', () => {
    // recordEvidence is synchronous and lock-guarded (see withDocLock in evidence.ts) — the lock's real
    // target is TWO SEPARATE PROCESSES appending to the same committed doc (e.g. two `MEASURED_VALIDATION=1`
    // spec files under vitest's parallel-FILE execution), which a single-process unit test cannot exercise
    // directly. This is the in-process regression check: N appends in a row all round-trip cleanly.
    const doc = join(dir, 'repeated.md');
    for (let i = 0; i < 8; i++) {
      recordEvidence(doc, buildRecord({ metric: `m${i}`, config: cfg(), gitCommit: 'c', results: { p50: 1, p95: 2, p99: 3, count: 10 }, budgetMs: 200, recordedAt: AT }));
    }
    const back = readRecords(doc);
    expect(back).toHaveLength(8);
    expect(new Set(back.map((r) => r.metric)).size).toBe(8); // every record intact, none merged/corrupted
  });
});

describe('assertReplayStable — stronger than same-hash', () => {
  const payload = { a: 1, nested: { b: [2, 3], c: 'x' } };

  it('passes for identical payloads + one hash + a discriminating perturbation', () => {
    const stable = assertReplayStable({
      replays: [
        { payload, hash: H1 },
        { payload: { nested: { c: 'x', b: [2, 3] }, a: 1 }, hash: H1 }, // key-reordered — canonically equal
      ],
      perturbed: { payload: { a: 2, nested: { b: [2, 3], c: 'x' } }, hash: H2 },
    });
    expect(stable).toBe(H1);
  });

  it('FAILS a non-deterministic hash across replays', () => {
    expect(() => assertReplayStable({ replays: [{ payload, hash: H1 }, { payload, hash: H2 }] })).toThrow(/non-deterministic/);
  });

  it('FAILS a diverging non-hashed field even when the hash is stable (coverage gap)', () => {
    // Same hash, but a payload field differs — a stable hash that does NOT cover a varying field.
    expect(() =>
      assertReplayStable({
        replays: [
          { payload: { a: 1, note: 'first' }, hash: H1 },
          { payload: { a: 1, note: 'DIFFERENT' }, hash: H1 },
        ],
      }),
    ).toThrow(/DIVERGED|field-coverage/);
  });

  it('FAILS a vacuous/degenerate hash that does not discriminate a real change', () => {
    expect(() =>
      assertReplayStable({
        replays: [{ payload, hash: H1 }, { payload, hash: H1 }],
        perturbed: { payload: { a: 999 }, hash: H1 }, // perturbed but SAME hash → vacuous
      }),
    ).toThrow(/VACUOUS|discriminating/);
  });

  it('FAILS a malformed/empty hash', () => {
    expect(() => assertReplayStable({ replays: [{ payload, hash: '' }, { payload, hash: '' }] })).toThrow(/malformed|degenerate/);
  });

  it('requires ≥2 replays', () => {
    expect(() => assertReplayStable({ replays: [{ payload, hash: H1 }] })).toThrow(/≥2|need/);
  });

  it('FAILS a non-deterministic hash on an UNPERTURBED payload (a hash-stability bug, not discrimination)', () => {
    // The "perturbed" input canonicalises IDENTICALLY to the stable replay (a no-op perturbation), yet its
    // hash differs — this must be reported as a non-determinism bug, never accepted as valid discrimination.
    expect(() =>
      assertReplayStable({
        replays: [{ payload, hash: H1 }, { payload, hash: H1 }],
        perturbed: { payload: { a: 1, nested: { b: [2, 3], c: 'x' } }, hash: H2 }, // canonically == `payload`
      }),
    ).toThrow(/non-deterministic hash on an UNCHANGED payload/);
  });

  it('accepts an unperturbed payload that ALSO keeps the same hash (a trivially consistent no-op)', () => {
    const stable = assertReplayStable({
      replays: [{ payload, hash: H1 }, { payload, hash: H1 }],
      perturbed: { payload: { a: 1, nested: { b: [2, 3], c: 'x' } }, hash: H1 }, // same payload, same hash
    });
    expect(stable).toBe(H1);
  });
});

describe('provenance', () => {
  it('gitCommit() returns a short-hex commit ref inside a git checkout', () => {
    expect(gitCommit()).toMatch(/^[0-9a-f]{4,40}$/);
  });

  it('pgServerVersion() returns null (not a throw) when the query fails', async () => {
    const failingPool = { query: () => Promise.reject(new Error('connection refused')) } as unknown as Parameters<typeof pgServerVersion>[0];
    await expect(pgServerVersion(failingPool)).resolves.toBeNull();
  });
});

describe('envInt', () => {
  it('returns the fallback when the env var is unset', () => {
    expect(envInt('MV_TEST_UNSET_VAR', 42)).toBe(42);
  });

  it('parses a valid numeric override', () => {
    process.env['MV_TEST_VAR'] = '99';
    try {
      expect(envInt('MV_TEST_VAR', 1)).toBe(99);
    } finally {
      delete process.env['MV_TEST_VAR'];
    }
  });

  it('throws (never silently NaN) on a non-numeric override', () => {
    process.env['MV_TEST_VAR'] = 'not-a-number';
    try {
      expect(() => envInt('MV_TEST_VAR', 1)).toThrow(/non-negative finite number/);
    } finally {
      delete process.env['MV_TEST_VAR'];
    }
  });

  it('throws on a negative override', () => {
    process.env['MV_TEST_VAR'] = '-5';
    try {
      expect(() => envInt('MV_TEST_VAR', 1)).toThrow(/non-negative finite number/);
    } finally {
      delete process.env['MV_TEST_VAR'];
    }
  });
});
