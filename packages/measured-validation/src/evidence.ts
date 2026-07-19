// Measured-validation framework — VERSIONED-EVIDENCE record (AI-6-2; "benchmark config IS versioned
// evidence", BigDev 2026-07-17).
//
// A bare "p95 = 9.6ms" is un-attestable the moment anyone asks "at what scale, concurrency, adapter,
// commit?" — the exact decay the retros keep punishing ([[feedback_record_unattested_no_backfill]]).
// So every recorded run is a STRUCTURED, `schema_version`-stamped record pinning its own provenance
// (config + git_commit + env + results + budget + pass), committed and git-diffable. `schema_version`
// guards the subtlest failure: silently comparing a new p95 against an old one measured under a
// DIFFERENT config (4L-cached vs 1k-uncached) and drawing a false regression conclusion. A config
// change bumps the version; comparison across versions/config surfaces the DELTA, never a silent
// apples-to-oranges compare.

import { appendFileSync, closeSync, openSync, readFileSync, unlinkSync } from 'node:fs';

import type { Percentiles } from './percentiles.js';

/**
 * The evidence-record schema version. BUMP THIS whenever the `config`/`results` SHAPE changes (a new
 * config field, a changed budget semantic) so runs are never silently compared across incompatible
 * shapes. A config VALUE change (different scale/concurrency) does NOT bump this — that is a config
 * delta surfaced by {@link compareRecords}, not a schema change.
 */
export const EVIDENCE_SCHEMA_VERSION = 1 as const;

/** The reproducibility-defining configuration of a run. Two runs compare ONLY at identical config. */
export interface BenchmarkConfig {
  /** N (per-op cardinality, e.g. page size / pool size) — null when not applicable to this surface. */
  n: number | null;
  /** M (dataset scale, e.g. seeded member count). */
  m: number;
  concurrency: number;
  iterations: number;
  warmup: number;
  /** Which crypto adapter produced the numbers — `dev-fake-kms` (CI-representative) or `cloud-kms` (real). */
  cryptoAdapter: 'dev-fake-kms' | 'cloud-kms' | 'n/a';
  /** The run environment label (`ci-local-smoke` | `pre-launch-4L` | a caller-chosen tag). */
  env: string;
  /** The Postgres server_version the run measured against (null when DB-free). */
  dbVersion: string | null;
}

/** A single, self-describing benchmark record — the ONLY thing ever written to an evidence doc. */
export interface BenchmarkRecord {
  schemaVersion: typeof EVIDENCE_SCHEMA_VERSION;
  /** A stable label for WHAT was measured (e.g. `fr12a-cached-p95`, `admin-search-kms-p95`). */
  metric: string;
  config: BenchmarkConfig;
  gitCommit: string;
  results: Percentiles;
  /** The named budget this run was asserted against (ms) and whether it passed. */
  budgetMs: number;
  pass: boolean;
  /** ISO-8601 instant the record was stamped — supplied by the CALLER (scripts have no Date.now()). */
  recordedAt: string;
  /** Optional co-attestation hash (e.g. an `assertReplayStable` digest) recorded alongside this run's
   *  capacity number — additive/optional so existing callers/records are unaffected. */
  attestationHash?: string;
}

/** Build a fully-formed, schema-stamped record from its parts (the single constructor — no bare literals). */
export function buildRecord(input: {
  metric: string;
  config: BenchmarkConfig;
  gitCommit: string;
  results: Percentiles;
  budgetMs: number;
  recordedAt: string;
  attestationHash?: string;
}): BenchmarkRecord {
  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    metric: input.metric,
    config: input.config,
    gitCommit: input.gitCommit,
    results: input.results,
    budgetMs: input.budgetMs,
    pass: input.results.p95 < input.budgetMs,
    recordedAt: input.recordedAt,
    ...(input.attestationHash !== undefined ? { attestationHash: input.attestationHash } : {}),
  };
}

/** Render one record as a fenced ```json block for a human-readable, git-diffable committed evidence doc. */
export function renderRecord(record: BenchmarkRecord): string {
  return ['```json', JSON.stringify(record, null, 2), '```', ''].join('\n');
}

/** Synchronous sleep via `Atomics.wait` on a throwaway `SharedArrayBuffer` — no external dependency. */
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Acquire an exclusive, `EEXIST`-guarded sibling `.lock` file around `fn` so concurrent processes
 * appending to the SAME committed evidence doc (e.g. two `MEASURED_VALIDATION=1` spec files running in
 * the same `vitest` pass, per vitest's default parallel-file execution) never interleave writes and
 * corrupt a fenced ```json block.
 */
function withDocLock<T>(docPath: string, fn: () => T): T {
  const lockPath = `${docPath}.lock`;
  const start = Date.now();
  for (;;) {
    try {
      closeSync(openSync(lockPath, 'wx'));
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      if (Date.now() - start > 30_000) {
        throw new Error(`[measured-validation] timed out waiting for the evidence-doc lock: ${lockPath}`);
      }
      sleepSync(25);
    }
  }
  try {
    return fn();
  } finally {
    try {
      unlinkSync(lockPath);
    } catch {
      // Already released/removed by a prior failed attempt — nothing to clean up.
    }
  }
}

/**
 * Append a versioned record to an evidence doc (the ONLY writer — never a bare number). The record is
 * rendered as a fenced ```json block so the doc stays human-readable AND machine-parseable. Callers point
 * this at the COMMITTED doc only for on-demand / pre-launch runs; the per-PR smoke points it at a scratch
 * file so the committed evidence doc is not rewritten on every CI run. Lock-guarded (see {@link withDocLock})
 * so concurrent appenders never interleave.
 */
export function recordEvidence(docPath: string, record: BenchmarkRecord): void {
  withDocLock(docPath, () => {
    appendFileSync(docPath, '\n' + renderRecord(record), 'utf-8');
  });
}

/** Every ```json record block previously appended to an evidence doc (for regression comparison). */
export function readRecords(docPath: string): BenchmarkRecord[] {
  let text: string;
  try {
    text = readFileSync(docPath, 'utf-8');
  } catch (err) {
    // A MISSING doc genuinely means "no records yet". Any OTHER fs error (permissions, a directory,
    // I/O failure) must NOT be silently treated as "no records" — that would mask a real problem.
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  const records: BenchmarkRecord[] = [];
  const blocks = text.split(/```json/g).slice(1);
  for (const block of blocks) {
    const end = block.indexOf('```');
    if (end === -1) continue;
    let parsed: Partial<BenchmarkRecord> | undefined;
    try {
      parsed = JSON.parse(block.slice(0, end)) as Partial<BenchmarkRecord>;
    } catch {
      console.warn(`[measured-validation] ${docPath}: skipping a malformed (non-JSON) evidence block`);
      continue;
    }
    const wellFormed =
      typeof parsed?.schemaVersion === 'number' &&
      typeof parsed.metric === 'string' &&
      parsed.metric.length > 0 &&
      typeof parsed.config === 'object' &&
      parsed.config !== null;
    if (wellFormed) {
      records.push(parsed as BenchmarkRecord);
    } else {
      // A hand-authored / malformed / partial block is dropped — but LOUDLY, not silently, so a corrupt
      // evidence entry is never mistaken for "there were never any prior records".
      console.warn(`[measured-validation] ${docPath}: skipping an evidence block missing schemaVersion/metric/config`);
    }
  }
  return records;
}

/** The comparability verdict between two records: comparable numbers, or a surfaced config/schema delta. */
export type CompareResult =
  | { comparable: true; p95DeltaMs: number }
  | { comparable: false; reason: 'schema_version_mismatch' | 'metric_mismatch' | 'config_mismatch'; delta: string[] };

/** Canonical (key-sorted) JSON of a config — the equality basis for comparability. */
function canonicalConfig(config: BenchmarkConfig): string {
  const keys = Object.keys(config).sort() as (keyof BenchmarkConfig)[];
  return JSON.stringify(keys.map((k) => [k, config[k]]));
}

/**
 * Compare two records. Numbers are comparable ONLY at matching `schema_version` + `metric` + IDENTICAL
 * config; otherwise the mismatch is SURFACED as a delta (never a silent apples-to-oranges compare — the
 * versioned-evidence discipline). When comparable, returns the p95 delta (candidate − baseline) in ms.
 */
export function compareRecords(baseline: BenchmarkRecord, candidate: BenchmarkRecord): CompareResult {
  if (baseline.schemaVersion !== candidate.schemaVersion) {
    return {
      comparable: false,
      reason: 'schema_version_mismatch',
      delta: [`schema_version ${baseline.schemaVersion} → ${candidate.schemaVersion}`],
    };
  }
  if (baseline.metric !== candidate.metric) {
    return { comparable: false, reason: 'metric_mismatch', delta: [`metric ${baseline.metric} → ${candidate.metric}`] };
  }
  if (canonicalConfig(baseline.config) !== canonicalConfig(candidate.config)) {
    const delta: string[] = [];
    const keys = Object.keys(baseline.config) as (keyof BenchmarkConfig)[];
    for (const k of keys) {
      if (JSON.stringify(baseline.config[k]) !== JSON.stringify(candidate.config[k])) {
        delta.push(`${k}: ${JSON.stringify(baseline.config[k])} → ${JSON.stringify(candidate.config[k])}`);
      }
    }
    return { comparable: false, reason: 'config_mismatch', delta };
  }
  return { comparable: true, p95DeltaMs: Number((candidate.results.p95 - baseline.results.p95).toFixed(2)) };
}
