// AI-4-1 — FR-12A concurrent-load p95 harness (measured-validation framework; live DB) (:5433).
//
// Measures the REAL delivery path — Story 4.8's per-cohort cache (`getValidityCached`), NOT the uncached
// `getValidityAt` placeholder (`p95-bench.spec.ts`, H-4) — under configurable concurrency at parameterized
// scale, through the ONE shared framework core. This is the measurement AI-4-1 has carried un-done for
// three retrospectives: a real concurrent-load p95 of the path that actually has to meet 200ms@4L.
//
// D1 posture: a small-N smoke runs in ci:local (harness exercised with teeth, LOOSE CI ceiling — cached
// reads can spike under full-parallel suite contention, exactly as the placeholder's 2000ms ceiling
// guards); the true 4L run is on-demand/pre-launch (`MEASURED_VALIDATION=1`), asserts the real 200ms
// budget, and appends a versioned record to the committed p95-budget.md. No 4L job in the per-PR gate.

import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDb, ids, idempotency, type Db } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getValidityCached, type ValidityServiceDeps } from '../../src/index.js';
import {
  buildRecord,
  envInt,
  gitCommit,
  measureP95,
  pgServerVersion,
  recordEvidence,
  seedValidityMembers,
  type BenchmarkConfig,
} from '../framework/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
/** On-demand/pre-launch 4L gate — asserts the REAL 200ms budget + records to the committed doc. */
const isPreLaunch = process.env['MEASURED_VALIDATION'] === '1';

// Scale + concurrency are env-tunable so the pre-launch 4L run reuses this exact harness (D1: same tooling).
// `envInt` throws on a non-numeric override instead of silently coercing a typo to NaN → a zeroed seed.
const SCALE = envInt('MEASURED_VALIDATION_SCALE', isPreLaunch ? 400_000 : 60);
const ITERATIONS = envInt('MEASURED_VALIDATION_ITERS', isPreLaunch ? 2000 : 120);
const CONCURRENCY = envInt('MEASURED_VALIDATION_CONCURRENCY', 8);
const WARMUP = 20;
/** FR-12A budget = 200ms@4L pre-launch; a LOOSE CI ceiling for the smoke (cached reads spike under load). */
const BUDGET_MS = isPreLaunch ? 200 : 2000;
const COMMITTED_DOC = join(dirname(fileURLToPath(import.meta.url)), '..', 'bench', 'p95-budget.md');

describe.skipIf(!hasDatabase)('AI-4-1 — FR-12A cached-path concurrent-load p95 (framework; live DB) (:5433)', () => {
  let db: Db;
  let pool: pg.Pool;
  let deps: ValidityServiceDeps;
  let memberIds: ids.MemberId[];
  const pariwarId = ids.pariwarId(randomUUID());
  const scratchDir = mkdtempSync(join(tmpdir(), 'mv-fr12a-'));

  beforeAll(async () => {
    if (!hasDatabase) return;
    const created = createDb(DATABASE_URL!, { ssl: false, max: Math.max(8, CONCURRENCY + 2) });
    db = created.db;
    pool = created.pool;
    deps = { db, keyedStore: idempotency.createKeyedStore(pool), servicePool: pool };
    memberIds = await seedValidityMembers(db, { scale: SCALE, pariwarId });
  }, isPreLaunch ? 600_000 : 120_000);

  afterAll(async () => {
    if (!hasDatabase) return;
    // Own-committing cleanup scoped to our OWN Pariwar (membership, not global counts) — additive
    // discipline. NOTE: idempotency_keys are deliberately NOT swept here — a `LIKE 'rule-eval:v1:%'` delete
    // is GLOBAL and would race concurrently-running suites' in-flight keys ([[project_live_db_test_gotchas]]);
    // the rule-eval memo keys TTL-expire and every run uses fresh member ids, so no collision accrues.
    for (const t of ['member_validity_cache', 'cohort_invalidation_epochs', 'clause_versions', 'events_log']) {
      await pool.query(`DELETE FROM ${t} WHERE pariwar_id = $1`, [pariwarId]).catch(() => undefined);
    }
    await pool.end();
    rmSync(scratchDir, { recursive: true, force: true });
  });

  it(
    'measures + records the getValidityCached p95 under concurrency (delivery-path budget)',
    async () => {
      // Warm only a FRACTION of the cohort before timing — the remaining members are deliberately left
      // COLD so the timed run's first touch of them is a genuine cache miss. The frozen Boundary requires
      // measuring "warm + cold-miss mix", not a 100%-pre-warmed-then-measure artifact: pre-warming the
      // WHOLE cohort (the prior shape) meant every timed sample was a warm hit, with zero cold-miss
      // component in the recorded p95 (review fix).
      const WARM_FRACTION = 0.7;
      const warmCount = Math.max(0, Math.floor(memberIds.length * WARM_FRACTION));
      await measureP95((i) => getValidityCached(deps, { pariwarId, memberId: memberIds[i]! }, { internal: true }), {
        iterations: warmCount,
        concurrency: CONCURRENCY,
        warmup: 0,
      });

      // The timed run draws from the FULL cohort (not just the pre-warmed slice): the ~30% left cold above
      // takes its cache miss inside the MEASURED set on first touch, then warms for any later repeat touch
      // within the same run — a real warm+cold mix in the recorded p95, not warmup-phase-only.
      const results = await measureP95(
        (i) => getValidityCached(deps, { pariwarId, memberId: memberIds[(i * 7 + 3) % memberIds.length]! }, { internal: true }),
        { iterations: ITERATIONS, concurrency: CONCURRENCY, warmup: WARMUP },
      );

      const config: BenchmarkConfig = {
        n: null,
        m: SCALE,
        concurrency: CONCURRENCY,
        iterations: ITERATIONS,
        warmup: WARMUP,
        cryptoAdapter: 'n/a', // FR-12A NEVER decrypts Tier-1 (producer.ts) — a pure compute+cache budget.
        env: isPreLaunch ? 'pre-launch-4L' : 'ci-local-smoke',
        dbVersion: await pgServerVersion(pool),
      };
      const record = buildRecord({
        metric: 'fr12a-cached-p95',
        config,
        gitCommit: gitCommit(),
        results,
        budgetMs: BUDGET_MS,
        recordedAt: new Date().toISOString(),
      });

      // Pre-launch → append the versioned record to the COMMITTED evidence doc; smoke → a scratch file so
      // the committed doc is not rewritten on every CI run (but the appender is still exercised with teeth).
      recordEvidence(isPreLaunch ? COMMITTED_DOC : join(scratchDir, 'evidence.md'), record);
      console.log('[AI-4-1 fr12a-cached-p95]', JSON.stringify(record.results), 'adapter=', config.cryptoAdapter, 'scale=', SCALE);

      expect(results.count).toBe(ITERATIONS);
      expect(Number.isFinite(results.p95)).toBe(true);
      // Pre-launch asserts the REAL 200ms budget (fail + remediation); smoke asserts the loose CI ceiling.
      expect(results.p95).toBeLessThan(BUDGET_MS);
    },
    isPreLaunch ? 600_000 : 60_000,
  );
});
