// Cycle-open alert trigger — Story 8.1 (Task 8; AC3/AC4/AC6). The apps/jobs runtime driver
// for the alert lifecycle: it consumes Epic 7's `cycle.frozen` and mints the cycle's canonical
// alert, driving it draft → frozen → published → live (the contribution window opens). The
// domain half is @twt/domain alert/project.ts (openCycleAlert); this is the pg-boss trigger driver
// (architecture §4.4 :4320 scheduler home).
//
// ── D4 — enqueue is primary, the sweep is recovery (DECIDED — build BOTH) ──────
// There is no generic events_log fan-out subscriber. The cycle-open alert is minted via two
// paths with DISTINCT roles:
//   1. PRIMARY — the cycle-spawn CHILD worker enqueues a CYCLE_OPEN_ALERT job POST-COMMIT the
//      instant `finalizeCycleIfComplete` returns `frozen: true` (the enqueue seam in
//      cycle-spawn.ts). This is the normal route by which every cycle-open alert is minted.
//   2. RECOVERY — a periodic self-healing sweep (runCycleOpenAlertSweep) scans for cycle streams
//      with a `cycle.frozen` but NO minted alert and re-enqueues. It exists ONLY to heal a
//      dropped/failed primary enqueue — NOT to be the hot path.
// Idempotency is guaranteed by the deterministic alert_id (alert.deriveAlertId): at-least-once
// delivery from EITHER path is safe (a redelivery genesis-races to a no-op; no second alert). A
// failed enqueue never rolls back the committed freeze — the sweep is the safety net.
//
// ── AC4 degraded-mode ─────────────────────────────────────────────────────────
// openCycleAlert (domain) reads the Pariwar's degraded-mode state at the cycle-freeze
// committed_at and sets `time_critical: true` on the emitted alert.published when a
// `cycle_open_sms_bridge` declaration is active. This module does NOT send SMS (Story 5.8/8.8).

import { alert as alertDomain, withPariwarScope } from '@twt/domain';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import type pg from 'pg';

/** Default recovery-sweep cadence (IST) — RECOVERY only, so an hourly tick is ample (the primary
 *  enqueue mints in real time). Operations policy, overridable via env. */
export const DEFAULT_CYCLE_OPEN_ALERT_SWEEP_CRON = '20 * * * *'; // hourly at :20 IST
export const CYCLE_OPEN_ALERT_SWEEP_TZ = 'Asia/Kolkata';

/** The max cycles one sweep run re-enqueues. Bounds the recovery scan; a full batch is logged
 *  (no silent cap — the next tick picks up the remainder). */
export const DEFAULT_CYCLE_OPEN_ALERT_SWEEP_LIMIT = 500;

export interface CycleOpenAlertDeps {
  /** BYPASSRLS service pool. The worker uses it as the withPariwarScope pool; the sweep uses it
   *  for the cross-tenant "frozen-but-no-alert" scan. */
  readonly pool: pg.Pool;
  /** Recovery-sweep batch bound. Defaults to {@link DEFAULT_CYCLE_OPEN_ALERT_SWEEP_LIMIT}. */
  readonly sweepLimit?: number;
  /** Failure alarm sink — a console stub by default. */
  readonly onAlarm?: (message: string) => void;
}

/** CYCLE_OPEN_ALERT payload (wrapped in a JobEnvelope; pariwarId rides the envelope). NON-PII. */
export interface CycleOpenAlertPayload {
  /** The cycle boundary == cycle_freeze_commits.commit_id == the cycle stream_id. */
  readonly cycleId: string;
}

/** Result of one CYCLE_OPEN_ALERT run (stored in the pg-boss job `output`). NON-PII. */
export interface CycleOpenAlertResult {
  readonly cycleId: string;
  readonly alertId: string;
  /** `false` on the idempotent no-op path (the alert was already minted). */
  readonly minted: boolean;
  readonly state: string;
  readonly timeCritical: boolean;
}

/** The envelope context a CYCLE_OPEN_ALERT enqueue carries (threaded from the originating
 *  cycle-spawn child job, or synthesized by the recovery sweep). */
export interface CycleOpenAlertEnqueueInput {
  readonly cycleId: string;
  readonly pariwarId: string;
  readonly requestId: string;
  readonly actorId: string | null;
  readonly traceId: string;
}

/**
 * Enqueue a CYCLE_OPEN_ALERT job (send-only, at-least-once). singletonKey = cycle_id so a
 * duplicate enqueue for the same cycle collapses; the mint is idempotent regardless. This is the
 * ONE place the CYCLE_OPEN_ALERT queue/envelope is constructed — both the primary (cycle-spawn
 * child) seam and the recovery sweep call it.
 */
export async function enqueueCycleOpenAlert(
  boss: Pick<QueueClient, 'send'>,
  input: CycleOpenAlertEnqueueInput,
): Promise<void> {
  await boss.send(
    QUEUE_NAMES.CYCLE_OPEN_ALERT,
    {
      requestId: input.requestId,
      pariwarId: input.pariwarId,
      actorId: input.actorId,
      traceId: input.traceId,
      payload: { cycleId: input.cycleId },
    } satisfies JobEnvelope<CycleOpenAlertPayload>,
    { singletonKey: input.cycleId },
  );
}

/**
 * The CYCLE_OPEN_ALERT worker body. Drive it in isolation with a fake pool. In one scoped tx it
 * loads the cycle.frozen payload, resolves the AR-18 time_critical signal, and mints + opens the
 * alert (draft → frozen → published → live) via the domain orchestration. Idempotent: a
 * redelivery for an already-minted cycle no-ops (minted: false). Throws on a missing pariwarId or
 * a cycle with no cycle.frozen (a real defect — the trigger fires only after the freeze) so
 * pg-boss retries/DLQs.
 */
export async function runCycleOpenAlert(
  deps: CycleOpenAlertDeps,
  envelope: JobEnvelope<CycleOpenAlertPayload>,
): Promise<CycleOpenAlertResult> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const { pariwarId } = envelope;
  const { cycleId } = envelope.payload;

  if (!pariwarId) {
    alarm(`[jobs] cycle-open-alert: missing pariwarId for cycle ${cycleId}`);
    throw new Error(`[jobs] cycle-open-alert: missing pariwarId for cycle ${cycleId}`);
  }

  const result = await withPariwarScope(deps.pool, pariwarId, (_db, client) =>
    alertDomain.openCycleAlert(client, { cycleId }),
  );

  console.info(
    '[jobs] cycle-open-alert',
    JSON.stringify({
      cycleId,
      alertId: result.alertId,
      minted: result.minted,
      state: result.state,
      timeCritical: result.timeCritical,
    }),
  );
  return {
    cycleId,
    alertId: result.alertId,
    minted: result.minted,
    state: result.state,
    timeCritical: result.timeCritical,
  };
}

interface FrozenWithoutAlertRow {
  readonly cycle_id: string;
  readonly pariwar_id: string;
}

/**
 * The RECOVERY sweep body (D4). Scans (cross-tenant, on the BYPASSRLS service pool) for cycle
 * streams that carry a `cycle.frozen` but have no minted alert — a dropped/failed primary enqueue
 * — and re-enqueues CYCLE_OPEN_ALERT for each. Bounded per run; a full batch is logged so the cap
 * is never silent. Returns the number of cycles re-enqueued. Recovery-only — the post-commit
 * enqueue is the normal route.
 */
export async function runCycleOpenAlertSweep(
  deps: CycleOpenAlertDeps,
  boss: Pick<QueueClient, 'send'>,
): Promise<number> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  // Guard against a misconfigured 0/negative sweepLimit (Review Finding): 0 would produce a
  // misleading "cap hit" alarm on every tick, and a negative value would malform the SQL LIMIT.
  const limit = Math.max(1, deps.sweepLimit ?? DEFAULT_CYCLE_OPEN_ALERT_SWEEP_LIMIT);

  // A cycle.frozen event whose cycle_id has no row in `alerts` = a cycle-open alert that the
  // primary enqueue never delivered (or whose worker never ran). LEFT JOIN + NULL is the gap.
  // ORDER BY the event's occurred_at (Review Finding) so repeated ticks make deterministic,
  // oldest-first progress through the backlog instead of an arbitrary unordered slice.
  const { rows } = await deps.pool.query<FrozenWithoutAlertRow>(
    `SELECT e.stream_id AS cycle_id, e.pariwar_id
       FROM events_log e
       LEFT JOIN alerts a ON a.cycle_id = e.stream_id
      WHERE e.event_type = 'cycle.frozen' AND a.alert_id IS NULL
      ORDER BY e.occurred_at ASC
      LIMIT $1`,
    [limit],
  );

  // Review Finding fix: the return value must reflect cycles actually RE-ENQUEUED, not merely
  // scanned — a per-row enqueue failure is caught/logged (must not abort the whole sweep) but
  // must not count toward the reported success total either.
  let reEnqueued = 0;
  for (const row of rows) {
    try {
      await enqueueCycleOpenAlert(boss, {
        cycleId: row.cycle_id,
        pariwarId: row.pariwar_id,
        requestId: `cycle.open.alert.sweep:${row.cycle_id}`,
        actorId: null,
        traceId: `cycle.open.alert.sweep:${row.cycle_id}`,
      });
      reEnqueued += 1;
    } catch (err) {
      // One cycle failing to re-enqueue must not abort the whole sweep — the next tick retries it.
      alarm(`[jobs] cycle-open-alert-sweep: failed to re-enqueue cycle ${row.cycle_id} — ${String(err)}`);
    }
  }

  if (rows.length >= limit) {
    alarm(
      `[jobs] cycle-open-alert-sweep: hit the ${String(limit)}-cycle batch cap — more frozen-but-unminted ` +
        `cycles remain; the next tick will pick them up (raise sweepLimit if this recurs)`,
    );
  }
  console.info('[jobs] cycle-open-alert-sweep', JSON.stringify({ reEnqueued, scanned: rows.length, limit }));
  return reEnqueued;
}

/**
 * Register the CYCLE_OPEN_ALERT worker + the recovery-sweep queue/worker/cron. Mirrors the
 * registerCycleSpawnWorkers + registerDeviceTokenCleanupCron shapes. The primary enqueue seam is
 * wired separately (into registerCycleSpawnWorkers' deps in boot.ts).
 */
export async function registerCycleOpenAlertWorkers(
  boss: QueueClient,
  deps: CycleOpenAlertDeps,
  opts: { sweepCron?: string; sweepTz?: string } = {},
): Promise<void> {
  // The mint worker (the primary + recovery both enqueue onto THIS queue).
  await boss.createQueue(QUEUE_NAMES.CYCLE_OPEN_ALERT);
  await boss.work(QUEUE_NAMES.CYCLE_OPEN_ALERT, async (jobs: Job[]) => {
    const results: CycleOpenAlertResult[] = [];
    for (const job of jobs) {
      results.push(await runCycleOpenAlert(deps, job.data as JobEnvelope<CycleOpenAlertPayload>));
    }
    return { processed: results.length, results };
  });

  // The recovery-sweep cron.
  const sweepCron = opts.sweepCron ?? DEFAULT_CYCLE_OPEN_ALERT_SWEEP_CRON;
  const sweepTz = opts.sweepTz ?? CYCLE_OPEN_ALERT_SWEEP_TZ;
  await boss.createQueue(QUEUE_NAMES.CYCLE_OPEN_ALERT_SWEEP);
  await boss.work(QUEUE_NAMES.CYCLE_OPEN_ALERT_SWEEP, async (jobs: Job[]) => {
    try {
      const reEnqueued = await runCycleOpenAlertSweep(deps, boss);
      console.info('[jobs] cycle-open-alert-sweep tick', JSON.stringify({ jobs: jobs.length, reEnqueued }));
      return { reEnqueued };
    } catch (err) {
      console.error('[jobs] cycle-open-alert-sweep failed', err);
      throw err;
    }
  });
  await boss.schedule(QUEUE_NAMES.CYCLE_OPEN_ALERT_SWEEP, sweepCron, {}, { tz: sweepTz });
}
