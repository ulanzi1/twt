// Pool spawn saga workers — Story 7.3 (Task 5; AC1/AC2/AC3).
//
// The pg-boss runtime half of the parent → N-child spawn saga (the domain half is
// @twt/domain pool/spawn.ts). Registered in boot.ts. Two Class-A queues:
//   · CYCLE_SPAWN_PARENT — one per cycle-freeze commit (enqueued by the apps/api post-commit
//     trigger). Plans the cycle (reserve names + allocate identifiers + derive N pool ids) and
//     fans out N child jobs. The plan's canonical-identifier allocation is the one NON-idempotent
//     step (it bumps a counter), so it is wrapped in the run-once keyed store: a parent retry
//     reuses the recorded child specs, never re-allocating (which would burn identifier sequences
//     and hand different children different ids). Children are ALWAYS (re-)enqueued from the
//     stable specs — re-enqueue is safe because children are idempotent + singleton-keyed.
//   · CYCLE_SPAWN_CHILD — one per pool, dispatched concurrently. Spawns the pool in its own tx,
//     then finalizes the cycle if it was the last to commit. On a spawn FAILURE it records a
//     retryable `cycle.spawn.aborted` breadcrumb and rethrows so pg-boss retries/DLQs.
//
// Register the CHILD queue BEFORE the PARENT so the child queue exists when the parent enqueues
// onto it (the OCR→SELECT ordering precedent).

import { ids, idempotency, pool as poolDomain, withPariwarScope } from '@twt/domain';
import { type Job, type JobEnvelope, type QueueClient, QUEUE_NAMES } from '@twt/queue';

/** How long the parent's run-once idempotency claim is held. MUST exceed the parent's runtime
 *  (a few DB round-trips), with generous headroom — a claim that expires mid-run could be
 *  reclaimed by a concurrent retry and re-allocate identifiers. 5 min is ample. */
export const DEFAULT_PARENT_IDEMPOTENCY_TTL_SECONDS = 300;

/** Default number of CYCLE_SPAWN_CHILD workers pg-boss spawns for this node (its
 *  `localConcurrency`) when `POOL_SPAWN_CHILD_CONCURRENCY` is unset. Each worker polls +
 *  processes one child job independently — this is what makes children ACTUALLY dispatched
 *  concurrently (a sequential per-batch loop with a single worker would serialize them,
 *  contradicting the "no inter-pool serialization" design commitment the <60s p95 envelope
 *  depends on). Named-env-var override, not an inline magic number (the
 *  PEER_MESH_WINDOW_SECONDS precedent). */
export const DEFAULT_CHILD_LOCAL_CONCURRENCY = 8;

/**
 * The v1 fixed-contribution amount (whole INR) snapshotted at spawn. Story 7.5 (BACKLOG) replaces
 * this single config value with the real "effective at cycle-freeze date" per-Pariwar snapshot;
 * v1 threads one configured positive value through every pool. NOT a magic number inline — sourced
 * from `POOL_SPAWN_FIXED_AMOUNT_INR` in boot.ts.
 */
export interface CycleSpawnDeps {
  /** The domain-table pool. withPariwarScope sets the tenant scope per job. */
  readonly pool: import('pg').Pool;
  /** v1 fixed-amount source (config-backed; Story 7.5 replaces with the real snapshot). */
  readonly fixedAmount: number;
  /** The deterministic member-assignment seam. Story 7.4 fills it (createPoolAssignmentSeam, wired
   *  in boot.ts); the default is the no-op emptyAssignmentSeam. */
  readonly assignmentSeam?: poolDomain.PoolAssignmentSeam;
  /** Parent run-once claim TTL (seconds). */
  readonly parentIdempotencyTtlSeconds?: number;
  /** CYCLE_SPAWN_CHILD worker count (pg-boss `localConcurrency`) — sourced from
   *  `POOL_SPAWN_CHILD_CONCURRENCY` in boot.ts. Defaults to {@link DEFAULT_CHILD_LOCAL_CONCURRENCY}. */
  readonly childConcurrency?: number;
  /** Failure alarm sink — a console stub by default. */
  readonly onAlarm?: (message: string) => void;
}

/** CYCLE_SPAWN_PARENT payload (wrapped in a JobEnvelope; pariwarId rides the envelope). NON-PII. */
export interface CycleSpawnParentPayload {
  /** The cycle boundary == cycle_freeze_commits.commit_id. */
  readonly cycleId: string;
  /** The committed claim set — ORDERED (index i → pool_index i). */
  readonly frozenClaims: readonly { readonly claimCaseId: string }[];
}

/** CYCLE_SPAWN_CHILD payload == the domain ChildSpawnSpec (JSON-serializable). */
export type CycleSpawnChildPayload = poolDomain.ChildSpawnSpec;

/** Result of one parent run (stored in the pg-boss job `output`). NON-PII. */
export interface CycleSpawnParentResult {
  readonly cycleId: string;
  readonly poolCount: number;
  /** `true` on the fresh-plan path, `false` on the idempotent replay path. */
  readonly planned: boolean;
}

/** Result of one child run. NON-PII. */
export interface CycleSpawnChildResult {
  readonly poolId: string;
  readonly spawned: boolean;
  readonly frozen: boolean;
}

interface StoredParentPlan {
  readonly children: poolDomain.ChildSpawnSpec[];
}

/**
 * The parent worker body. Drive it in isolation with a fake pool + a capturing enqueue callback.
 * Throws on an unrecoverable condition (missing pariwarId; the keyed-store result not yet recorded
 * by a concurrent claimant) so pg-boss retries/DLQs.
 */
export async function runCycleSpawnParent(
  deps: CycleSpawnDeps,
  boss: Pick<QueueClient, 'send'>,
  envelope: JobEnvelope<CycleSpawnParentPayload>,
): Promise<CycleSpawnParentResult> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const { pariwarId } = envelope;
  const p = envelope.payload;

  if (!pariwarId) {
    alarm(`[jobs] cycle-spawn-parent: missing pariwarId for cycle ${p.cycleId}`);
    throw new Error(`[jobs] cycle-spawn-parent: missing pariwarId for cycle ${p.cycleId}`);
  }

  const store = idempotency.createKeyedStore(deps.pool);
  const ttl = deps.parentIdempotencyTtlSeconds ?? DEFAULT_PARENT_IDEMPOTENCY_TTL_SECONDS;
  const key = `cycle.spawn.parent:${p.cycleId}`;
  const brandedPariwarId = ids.pariwarId(pariwarId);
  const brandedCycleId = ids.cycleFreezeCommitId(p.cycleId);

  let children: poolDomain.ChildSpawnSpec[];
  let planned: boolean;

  const outcome = await store.claim(key, ttl);
  if (outcome === 'acquired') {
    try {
      const result = await withPariwarScope(deps.pool, pariwarId, async (db) => {
        const planResult = await poolDomain.planCycleSpawn(db, {
          pariwarId: brandedPariwarId,
          cycleId: brandedCycleId,
          frozenClaims: p.frozenClaims,
          fixedAmount: deps.fixedAmount,
        });
        // Durable "parent-job-started" audit marker (AC4) — same tx as the plan, so a planning
        // failure never leaves it behind without the plan it describes.
        await poolDomain.appendCycleSpawnStarted(db, {
          pariwarId: brandedPariwarId,
          cycleId: brandedCycleId,
          poolCount: planResult.children.length,
        });
        return planResult;
      });
      children = result.children;
      await store.recordResult(key, { children } satisfies StoredParentPlan);
      planned = true;
    } catch (err) {
      // Planning (or recording the plan) failed — release the claim immediately instead of
      // making every retry before now wait out the full TTL. If planCycleSpawn's counter-bump
      // had already committed before this failure (e.g. recordResult itself is what failed),
      // that canonical-identifier range is orphaned on the next attempt — an accepted gap
      // (identifiers only need to be unique, not contiguous, like an invoice/sequence number),
      // not a correctness bug.
      alarm(`[jobs] cycle-spawn-parent: planning failed for cycle ${p.cycleId} — ${String(err)}`);
      await store.release(key).catch((releaseErr: unknown) => {
        alarm(
          `[jobs] cycle-spawn-parent: failed to release claim for cycle ${p.cycleId} — ${String(releaseErr)}`,
        );
      });
      throw err;
    }
  } else {
    const stored = (await store.getResult(key)) as StoredParentPlan | null;
    if (!stored) {
      // A concurrent claimant holds the key but has not recorded the plan yet (in-flight), or the
      // completed result expired + was vacuumed. Either way, retry: pg-boss re-runs the parent and
      // the recorded plan (or a fresh claim) resolves it.
      throw new Error(`[jobs] cycle-spawn-parent: plan not yet recorded for cycle ${p.cycleId} — retry`);
    }
    children = stored.children;
    planned = false;
  }

  // Fan out the child jobs from the stable specs. Re-enqueue is idempotent (children are
  // singleton-keyed + idempotent), so re-running the parent never double-spawns.
  for (const spec of children) {
    await boss.send(
      QUEUE_NAMES.CYCLE_SPAWN_CHILD,
      {
        requestId: envelope.requestId,
        pariwarId: envelope.pariwarId,
        actorId: envelope.actorId,
        traceId: envelope.traceId,
        payload: spec,
      } satisfies JobEnvelope<CycleSpawnChildPayload>,
      { singletonKey: `${spec.cycleId}:${String(spec.poolIndex)}` },
    );
  }

  const poolCount = children.length;
  console.info('[jobs] cycle-spawn-parent', JSON.stringify({ cycleId: p.cycleId, poolCount, planned }));
  return { cycleId: p.cycleId, poolCount, planned };
}

/**
 * The child worker body. Drive it in isolation with a fake pool. Spawns the pool in its own tx,
 * then (in a second tx) finalizes the cycle if it was the last to commit. On a spawn failure it
 * records a retryable `cycle.spawn.aborted` breadcrumb, then rethrows so pg-boss retries/DLQs — the
 * breadcrumb never gates a retry (a cycle stream may carry many aborted events before cycle.frozen).
 */
export async function runCycleSpawnChild(
  deps: CycleSpawnDeps,
  envelope: JobEnvelope<CycleSpawnChildPayload>,
): Promise<CycleSpawnChildResult> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const { pariwarId } = envelope;
  const spec = envelope.payload;

  if (!pariwarId) {
    alarm(`[jobs] cycle-spawn-child: missing pariwarId for cycle ${spec.cycleId} pool ${String(spec.poolIndex)}`);
    throw new Error(`[jobs] cycle-spawn-child: missing pariwarId for cycle ${spec.cycleId}`);
  }
  const assignmentSeam = deps.assignmentSeam ?? poolDomain.emptyAssignmentSeam;
  const brandedPariwarId = ids.pariwarId(pariwarId);
  const brandedCycleId = ids.cycleFreezeCommitId(spec.cycleId);

  // Best-effort `cycle.spawn.aborted` breadcrumb (its own tx) — used by BOTH failure points
  // below. Never throws: a breadcrumb-recording failure only alarms, it never masks or replaces
  // the real error the caller is about to rethrow.
  const recordAborted = async (err: unknown): Promise<void> => {
    const reason = err instanceof Error ? err.message : String(err);
    try {
      await withPariwarScope(deps.pool, pariwarId, (_db, client) =>
        poolDomain.appendCycleAborted(client, {
          pariwarId: brandedPariwarId,
          cycleId: brandedCycleId,
          reason,
        }),
      );
    } catch (abortErr) {
      alarm(
        `[jobs] cycle-spawn-child: failed to record cycle.spawn.aborted for cycle ${spec.cycleId} — ${String(abortErr)}`,
      );
    }
  };

  // (1) Spawn the pool (its own tx). A real failure records the breadcrumb + rethrows; an
  // idempotent no-op returns normally.
  let spawnResult: poolDomain.SpawnChildPoolResult;
  try {
    spawnResult = await withPariwarScope(deps.pool, pariwarId, (_db, client) =>
      poolDomain.spawnChildPool(client, spec, assignmentSeam),
    );
  } catch (err) {
    await recordAborted(err);
    throw err;
  }

  // (2) Finalize the cycle if this child was the last to commit (its own tx). A finalize failure
  // records the same breadcrumb (previously silent — the spawn succeeded but the failure had no
  // trace on the stream), then rethrows → pg-boss retries → the spawn no-ops + the finalize
  // recomputes (forward recovery).
  let fin: poolDomain.FinalizeCycleResult;
  try {
    fin = await withPariwarScope(deps.pool, pariwarId, (_db, client) =>
      poolDomain.finalizeCycleIfComplete(client, {
        pariwarId: brandedPariwarId,
        cycleId: brandedCycleId,
        poolCount: spec.poolCount,
      }),
    );
  } catch (err) {
    await recordAborted(err);
    throw err;
  }

  console.info(
    '[jobs] cycle-spawn-child',
    JSON.stringify({
      cycleId: spec.cycleId,
      poolIndex: spec.poolIndex,
      spawned: spawnResult.spawned,
      frozen: fin.frozen,
      committedCount: fin.committedCount,
    }),
  );
  return { poolId: spawnResult.poolId, spawned: spawnResult.spawned, frozen: fin.frozen };
}

/**
 * Register the CYCLE_SPAWN_CHILD + CYCLE_SPAWN_PARENT queues + workers. Mirrors
 * registerClaimShepherdAssignWorker's build shape. The CHILD queue is created first so it exists
 * when the parent enqueues onto it.
 */
export async function registerCycleSpawnWorkers(boss: QueueClient, deps: CycleSpawnDeps): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.CYCLE_SPAWN_CHILD);
  // `localConcurrency` workers, each polling + processing independently, is what actually
  // dispatches children concurrently (the batchSize-1 default + this single `for` loop only
  // determine how many jobs ONE worker's handler invocation receives, not how many workers run).
  await boss.work(
    QUEUE_NAMES.CYCLE_SPAWN_CHILD,
    { localConcurrency: deps.childConcurrency ?? DEFAULT_CHILD_LOCAL_CONCURRENCY },
    async (jobs: Job[]) => {
      const results: CycleSpawnChildResult[] = [];
      for (const job of jobs) {
        results.push(await runCycleSpawnChild(deps, job.data as JobEnvelope<CycleSpawnChildPayload>));
      }
      return { processed: results.length, results };
    },
  );

  await boss.createQueue(QUEUE_NAMES.CYCLE_SPAWN_PARENT);
  await boss.work(QUEUE_NAMES.CYCLE_SPAWN_PARENT, async (jobs: Job[]) => {
    const results: CycleSpawnParentResult[] = [];
    for (const job of jobs) {
      results.push(await runCycleSpawnParent(deps, boss, job.data as JobEnvelope<CycleSpawnParentPayload>));
    }
    return { processed: results.length, results };
  });
}
