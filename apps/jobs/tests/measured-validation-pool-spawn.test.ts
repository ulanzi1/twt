// Story 7.9 — Pool Engine Pre-Launch Measured-Validation Gate (N=50 / M=4L < 60s p95) (:5433).
//
// Drives the REAL Pool-Spawn saga at envelope capacity and records `schema_version`-stamped p95 evidence —
// the measurement the whole Pool Engine (Stories 7.1–7.8) was built against. It turns "we believe < 60s"
// into "we measured p95 = X across ≥ 10 runs, here is the git-diffable record." ZERO new measurement
// tooling: the percentile / evidence / replay / provenance core is imported from `@twt/measured-validation`
// (the AI-6-2 framework core, extracted to its own package at 7.9 time). See
// `_bmad-output/research/pool-engine-validation-gate.md` (the committed evidence doc) +
// `packages/measured-validation/src/index.ts` (the seam this reuses).
//
// ── The measured unit (AC1) — the saga DECOMPOSITION, not pg-boss poll latency ─
// t0 = the post-bulk-approval `CYCLE_SPAWN_PARENT` trigger (here: `planCycleSpawn` driven DIRECTLY — the
// server-side equivalent of the trustee "click"; there is no live bulk-approval UI at Epic 7). The N child
// specs then fan out CONCURRENTLY (a bounded pool matching the real worker's
// `DEFAULT_CHILD_LOCAL_CONCURRENCY`), each running the REAL `runCycleSpawnChild` — full-wire through the
// AI-7-2 assignable-roster resolver + the 7.4 assignment seam. t1 = the `cycle.frozen` event the last child
// to commit appends (`finalizeCycleIfComplete`). We drive the DOMAIN saga functions directly rather than
// the pg-boss workers so the ~2s poll interval does not dominate + misrepresent the decomposition's compute
// cost (see the story §Fidelity note). The frozen engine (packages/domain/src/pool/*, cycle-spawn.ts) is
// DRIVEN here, never modified.
//
// ── Three tiers, env-gated (mirrors AI-6-2 exactly — NO 4L job in the per-PR gate) ─
//   · Default (`DATABASE_URL` unset): the DB suite skips; only the harness-level unit assertions run
//     (percentile-math wiring, evidence-record shape/teeth, the replay co-attestation over the PURE
//     assignment engine).
//   · `DATABASE_URL=…:5433` (ci:local): a small-N scaled-down SMOKE — the harness is exercised with teeth
//     against the real DB; evidence goes to a SCRATCH temp file (the committed doc is NOT rewritten).
//   · `MEASURED_VALIDATION=1` + `DATABASE_URL`: the on-demand 4L / N=50 pre-launch run — records the real
//     p95 to the COMMITTED evidence doc, git-commit + db-version + scale + date labelled.

import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalJsonStringify, createDb, ids, pool as poolDomain, withPariwarScope } from '@twt/domain';
import {
  assertReplayStable,
  buildRecord,
  envInt,
  gitCommit,
  measureP95,
  pgServerVersion,
  recordEvidence,
  type BenchmarkConfig,
  type ReplaySample,
} from '@twt/measured-validation';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAssignableRosterResolver } from '../src/assignable-roster.js';
import { DEFAULT_CHILD_LOCAL_CONCURRENCY, runCycleSpawnChild, type CycleSpawnDeps } from '../src/cycle-spawn.js';
import { cleanupPoolCohort, seedPoolCohort, type SeededPoolCohort } from './pool-cohort-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
/** On-demand/pre-launch 4L gate — records to the committed doc + asserts the pinned 60s budget at scale. */
const isPreLaunch = process.env['MEASURED_VALIDATION'] === '1';
// A pre-launch run with no DATABASE_URL would otherwise skip the whole live-DB suite silently
// (describe.skipIf(!hasDatabase)) and report success with zero measurement taken — fail loudly instead.
if (isPreLaunch && !hasDatabase) {
  throw new Error('[7.9 harness] MEASURED_VALIDATION=1 requires DATABASE_URL to be set');
}

// Scale + shape are env-tunable so the pre-launch 4L run reuses this EXACT harness. `envInt` throws on a
// non-numeric override instead of silently coercing a typo to NaN → a zeroed seed.
const N = envInt('MEASURED_VALIDATION_POOL_N', isPreLaunch ? 50 : 3);
const M = envInt('MEASURED_VALIDATION_POOL_M', isPreLaunch ? 400_000 : 200);
const ITERATIONS = envInt('MEASURED_VALIDATION_POOL_ITERS', isPreLaunch ? 10 : 3);
const WARMUP = envInt('MEASURED_VALIDATION_POOL_WARMUP', isPreLaunch ? 2 : 1);
/** The inner child concurrency the envelope actually tests — the real worker's `localConcurrency`. */
const CHILD_CONCURRENCY = envInt('POOL_SPAWN_CHILD_CONCURRENCY', DEFAULT_CHILD_LOCAL_CONCURRENCY);
/** The AR-68 / NFR-7 budget — PINNED at 60_000 ms. A green run over a doctored ceiling is not the
 *  deliverable, so this is a constant on BOTH tiers (the smoke passes it comfortably at small scale; the
 *  4L run is where it has real teeth). `pass = p95 < budgetMs`, and the run ASSERTS `pass === true`. */
const BUDGET_MS = 60_000;

const HERE = dirname(fileURLToPath(import.meta.url));
/** 7.9's named committed evidence file (the framework README names it verbatim). apps/jobs/tests → repo root. */
const COMMITTED_DOC = join(HERE, '..', '..', '..', '_bmad-output', 'research', 'pool-engine-validation-gate.md');

// ── DB-free unit tier: the harness-level assertions that run even with DATABASE_URL unset ──────────────

/** A replay observation of the PURE assignment engine: the full member→pool map (canonical array) + its
 *  digest. `assertReplayStable` proves same input → identical map AND hash; a `cycle_id` perturbation MUST
 *  change the hash (discrimination) — the AI-6-2 stronger-than-hash proof, reusing Story 7.4's engine. */
function assignmentReplaySample(memberIds: readonly string[], cycleId: string, n: number): ReplaySample {
  const map = poolDomain.assignMembersToPools(memberIds, cycleId, n);
  const payload = [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([member_id, pool_index]) => ({ member_id, pool_index }));
  const hash = createHash('sha256').update(canonicalJsonStringify(payload)).digest('hex');
  return { payload, hash };
}

describe('Story 7.9 — measured-validation harness unit assertions (DB-free)', () => {
  it('percentile-math wiring: measureP95 returns finite percentiles + the measured count', async () => {
    const results = await measureP95(async (i) => Promise.resolve(i * 2), { iterations: 20, concurrency: 4, warmup: 5 });
    expect(results.count).toBe(20);
    expect(Number.isFinite(results.p50)).toBe(true);
    expect(Number.isFinite(results.p95)).toBe(true);
    expect(Number.isFinite(results.p99)).toBe(true);
  });

  it('evidence-record teeth: buildRecord computes pass = p95 < budget (a breach FAILS the gate)', () => {
    const config: BenchmarkConfig = {
      n: N,
      m: M,
      concurrency: CHILD_CONCURRENCY,
      iterations: ITERATIONS,
      warmup: WARMUP,
      cryptoAdapter: 'n/a',
      env: 'unit',
      dbVersion: null,
    };
    const base = { metric: 'pool-spawn-saga-wallclock-p95', config, gitCommit: gitCommit(), budgetMs: BUDGET_MS, recordedAt: '2026-07-19T00:00:00.000Z' };
    const withinBudget = buildRecord({ ...base, results: { p50: 100, p95: 200, p99: 300, count: ITERATIONS } });
    const overBudget = buildRecord({ ...base, results: { p50: 100, p95: BUDGET_MS + 1, p99: BUDGET_MS + 2, count: ITERATIONS } });
    expect(withinBudget.pass).toBe(true);
    expect(overBudget.pass).toBe(false); // the gate fails loudly on a breach — it is NOT a doctored ceiling.
  });

  it('replay co-attestation (AC9): the assignment map is replay-stable + cycle_id-discriminating', () => {
    // A ≥20-member roster so a cycle_id perturbation reliably re-buckets at least one member (discrimination).
    const roster = Array.from({ length: 25 }, () => randomUUID());
    const cycleId = randomUUID();
    const n = 5;
    const replays = [0, 1, 2].map(() => assignmentReplaySample(roster, cycleId, n));
    const perturbed = assignmentReplaySample(roster, randomUUID(), n); // different cycle_id → different map+hash
    // Full assignment-map DEEP EQUALITY across replays + single stable hash + perturbation discrimination.
    const stableHash = assertReplayStable({ replays, perturbed });
    expect(stableHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ── DB tier: the real seeded saga measurement (skips cleanly when DATABASE_URL is unset) ───────────────

/** Run `specs` through `fn` under a bounded concurrency pool, preserving result order. The inner fan-out
 *  the envelope tests: N children dispatched concurrently at `concurrency` (the real worker's shape). */
async function runBounded<T, R>(items: readonly T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!);
    }
  }
  // Promise.allSettled (not Promise.all) so a single child's rejection does not leave siblings' in-flight
  // DB writes unawaited — those would otherwise still be running when the NEXT serial iteration starts
  // (outer concurrency: 1), contending on the same `pool` and skewing that iteration's measured wall-clock.
  const settled = await Promise.allSettled(
    Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => worker()),
  );
  const firstRejection = settled.find((s): s is PromiseRejectedResult => s.status === 'rejected');
  if (firstRejection) throw firstRejection.reason;
  return results;
}

describe.skipIf(!hasDatabase)('Story 7.9 — pool-spawn-saga wall-clock p95 (framework; live DB) (:5433)', () => {
  // NOTE: `describe.skipIf` still EXECUTES this factory body during collection (only the it/hook bodies
  // are skipped) — so nothing here may allocate a resource that needs cleanup; anything that does belongs
  // in `beforeAll`, guarded by `hasDatabase`, so a no-DATABASE_URL run allocates nothing to leak.
  let pool: pg.Pool | undefined;
  let cohort: SeededPoolCohort;
  let childDeps: CycleSpawnDeps;
  let scratchDir: string | undefined;
  const pariwarId = randomUUID();
  const brandedPariwarId = ids.pariwarId(pariwarId);

  beforeAll(async () => {
    if (!hasDatabase) return;
    scratchDir = mkdtempSync(join(tmpdir(), 'mv-pool-spawn-'));
    const created = createDb(DATABASE_URL!, { ssl: false, max: Math.max(20, CHILD_CONCURRENCY * 2 + 4) });
    pool = created.pool;
    // One distinct cycle per measured + warmup iteration (fresh cycle_id → fresh pool_ids, no collision).
    cohort = await seedPoolCohort(pool, { scale: M, n: N, cycleCount: WARMUP + ITERATIONS, pariwarId });
    // Full-wire deps: the REAL AI-7-2 roster resolver + the REAL 7.4 assignment seam (not the empty seam).
    childDeps = {
      pool,
      assignmentSeam: poolDomain.createPoolAssignmentSeam(),
      resolveAssignableRoster: createAssignableRosterResolver({ pool }),
      childConcurrency: CHILD_CONCURRENCY,
      onAlarm: (m: string): void => console.warn(m),
    };
  }, isPreLaunch ? 1_800_000 : 300_000);

  afterAll(async () => {
    // `pool` stays undefined if `beforeAll` threw before `createDb` completed (e.g. a bad DATABASE_URL) —
    // guard so that setup failure surfaces on its own instead of being buried under a secondary
    // "cannot read property of undefined" from cleanup, and skip the scratch-dir removal it never created.
    if (!hasDatabase || !pool) return;
    await cleanupPoolCohort(pool, pariwarId);
    await pool.end();
    if (scratchDir) rmSync(scratchDir, { recursive: true, force: true });
  });

  it(
    'drives the real spawn saga at envelope capacity + records the p95 evidence',
    async () => {
      // `pool`/`scratchDir` are guaranteed set by `beforeAll` by the time this runs (a failed `beforeAll`
      // skips this `it`) — narrowed once here so the rest of the body isn't fighting `| undefined`.
      if (!pool || !scratchDir) throw new Error('[7.9 harness] setup did not complete — pool/scratchDir missing');
      const dbPool = pool;
      const scratch = scratchDir;

      let cursor = 0;
      // The measured unit: ONE full cycle spawn — plan (t0) → N concurrent children → cycle.frozen (t1).
      const op = async (): Promise<void> => {
        const cycle = cohort.cycles[cursor++];
        if (!cycle) throw new Error('[7.9 harness] ran out of pre-seeded cycles — seed WARMUP + ITERATIONS');
        // t0: drive the parent planner DIRECTLY (excludes pg-boss poll latency).
        const plan = await withPariwarScope(dbPool, pariwarId, (db) =>
          poolDomain.planCycleSpawn(db, {
            pariwarId: brandedPariwarId,
            cycleId: ids.cycleFreezeCommitId(cycle.cycleId),
            frozenClaims: cycle.frozenClaims,
          }),
        );
        // Fan out the N children concurrently at the real child concurrency, full-wire via runCycleSpawnChild.
        const childResults = await runBounded(plan.children, CHILD_CONCURRENCY, (spec) =>
          runCycleSpawnChild(childDeps, {
            requestId: randomUUID(),
            pariwarId,
            actorId: null,
            traceId: randomUUID(),
            payload: spec,
          }),
        );
        // t1: exactly one child emits cycle.frozen (LAST-CHILD-FINALIZES). A wrong count means the saga did
        // not complete this cycle — fail the whole run rather than record a p95 over a half-spawned cycle.
        const frozenCount = childResults.filter((r) => r.frozen).length;
        if (frozenCount !== 1) {
          throw new Error(`[7.9 harness] expected exactly one cycle.frozen for cycle ${cycle.cycleId}, got ${frozenCount}`);
        }
      };

      // Outer concurrency = 1 (distinct cycles run serially); the INNER child concurrency is the envelope knob.
      const results = await measureP95(op, { iterations: ITERATIONS, concurrency: 1, warmup: WARMUP });

      const config: BenchmarkConfig = {
        n: N,
        m: M,
        concurrency: CHILD_CONCURRENCY,
        iterations: ITERATIONS,
        warmup: WARMUP,
        cryptoAdapter: 'n/a', // pool spawn never decrypts Tier-1 — a pure compute + concurrent-write budget.
        env: isPreLaunch ? 'pre-launch-4L' : 'ci-local-smoke',
        dbVersion: await pgServerVersion(dbPool),
      };

      // Replay co-attestation (AC9): the seeded roster's assignment map is replay-stable + cycle_id-
      // discriminating — the "correct AND fast" pair, recorded alongside the capacity number. PURE (Story
      // 7.4's engine), so it needs no DB read; computed over the actual seeded member ids. `seedPoolCohort`
      // requires `scale ≥ 1`, so `cohort.memberIds` is never empty — no fabricated fallback ids needed.
      const attestationHash = assertReplayStable({
        replays: [0, 1, 2].map(() => assignmentReplaySample(cohort.memberIds, cohort.cycles[0]!.cycleId, N)),
        perturbed: assignmentReplaySample(cohort.memberIds, randomUUID(), N),
      });

      const record = buildRecord({
        metric: 'pool-spawn-saga-wallclock-p95',
        config,
        gitCommit: gitCommit(),
        results,
        budgetMs: BUDGET_MS,
        recordedAt: new Date().toISOString(),
        attestationHash,
      });

      // Pre-launch → append the versioned record to the COMMITTED doc; smoke → a scratch file (the appender
      // is still exercised with teeth, but the committed evidence doc is not rewritten on every ci:local run).
      recordEvidence(isPreLaunch ? COMMITTED_DOC : join(scratch, 'evidence.md'), record);
      console.log(
        '[7.9 pool-spawn-saga-wallclock-p95]',
        JSON.stringify(record.results),
        'env=', config.env,
        'n=', N,
        'm=', M,
        'childConcurrency=', CHILD_CONCURRENCY,
        'replayHash=', attestationHash.slice(0, 12),
      );

      expect(results.count).toBe(ITERATIONS);
      expect(Number.isFinite(results.p95)).toBe(true);
      // The gate: ANY p95 ≥ 60s FAILS (remediation precedes launch). `pass` is p95 < the PINNED budget.
      expect(record.pass).toBe(true);
      expect(results.p95).toBeLessThan(BUDGET_MS);
    },
    isPreLaunch ? 1_800_000 : 300_000,
  );
});
