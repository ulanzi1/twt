// The field-worker MOVE REQUEST escalation sweep — Story 13.1d (Task 5; decision `2026-11-08-458` AD8 (a); the Panel's `-443` Q1 A: "A
// request left unanswered for 7 days goes to the Pariwar Admin and is never accepted by default").
//
// Hourly (`'17 * * * *'`, Asia/Kolkata), ONE tick at a time on its OWN pool ([[project_jobs_pool_two_connection_starvation]] — each row's
// scope transaction holds one connection while its audit line commits on another). A tick:
//   1. refuses — ONE `rls_bound_role` alarm — under a login that cannot read across Pariwars (roster Row 26, the code-SMS sweep's guard);
//   2. reads the `pending` requests opened ≥ 7 × 24 h ago by the DATABASE clock, oldest first, bounded (`findStaleMoveRequests`; the
//      bound hit is alarmed — the next tick starts again from the oldest);
//   3. per row: ONE system audit line (`actorId: null`, `actorRole: 'system'`, action `field_worker_move_request.escalated`) whose
//      `mutate` escalates it in its Pariwar's scope transaction (`escalateStaleMoveRequest` — the worker's lock, then the request's; it
//      re-checks `pending` and the age under them). A row answered or withdrawn meanwhile escalates nothing: the intent's `_rolled_back`
//      twin is written and the row is counted skipped. The Pariwar Admins and the opener are told (the command's notices).
// ⛔⛔ It NEVER accepts, refuses, closes or moves anything (I3) — `escalated` is the one system act. A row's failure is that row's
// (alarmed; the next row runs); a second tick finds nothing left to do (idempotent).

import { createHash, randomUUID } from 'node:crypto';

import { audit, canonicalJsonStringify, fieldWorker, ids, smsDelivery, withPariwarScope } from '@twt/domain';
import { QUEUE_NAMES, type Job, type QueueClient } from '@twt/queue';
import type pg from 'pg';

export const DEFAULT_FIELD_WORKER_MOVE_REQUEST_ESCALATION_CRON = '17 * * * *';
export const FIELD_WORKER_MOVE_REQUEST_ESCALATION_TZ = 'Asia/Kolkata';
export const FIELD_WORKER_MOVE_REQUEST_ESCALATION_AUDIT_ACTION = 'field_worker_move_request.escalated';

export interface FieldWorkerMoveRequestEscalationDeps {
  /** The sweep's OWN pool — a login that can read across Pariwars (roster Row 26). */
  readonly pool: pg.Pool;
  readonly onAlarm?: (message: string) => void;
  /** Tests only — the tick's bound. */
  readonly limit?: number;
}

export interface FieldWorkerMoveRequestEscalationTickResult {
  readonly refused: boolean;
  readonly scanned: number;
  readonly escalated: number;
  readonly skipped: number;
  readonly failed: number;
}

/** Thrown inside `mutate` when the row is no longer due under its locks — the intent's twin is written, nothing else. */
class NoLongerDue extends Error {
  public override readonly name = 'NoLongerDue';
}

function errorName(err: unknown): string {
  return err instanceof Error ? err.name : typeof err;
}

/** One tick. It always resolves. */
export async function runFieldWorkerMoveRequestEscalationTick(
  deps: FieldWorkerMoveRequestEscalationDeps,
): Promise<FieldWorkerMoveRequestEscalationTickResult> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  let rows: Awaited<ReturnType<typeof fieldWorker.findStaleMoveRequests>>;
  const limit = deps.limit ?? fieldWorker.STALE_MOVE_REQUESTS_TICK_MAX;
  try {
    if (!(await smsDelivery.canReadAcrossPariwars(deps.pool))) {
      alarm(
        '[jobs] field-worker-move-request-escalation: field_worker_move_request.rls_bound_role — the pool role cannot read across Pariwars (roster Row 26); ' +
          '⛔ swept — a request unanswered for 7 days stays pending, unseen by the Pariwar Admin, until it can',
      );
      return { refused: true, scanned: 0, escalated: 0, skipped: 0, failed: 0 };
    }
    rows = await fieldWorker.findStaleMoveRequests(deps.pool, { limit });
  } catch (err) {
    alarm(`[jobs] field-worker-move-request-escalation: field_worker_move_request.sweep_failed:${errorName(err)} — this tick escalated nothing`);
    return { refused: false, scanned: 0, escalated: 0, skipped: 0, failed: 0 };
  }
  if (rows.length >= limit) alarm(`[jobs] field-worker-move-request-escalation: the tick's bound (${String(limit)}) was hit — the rest wait for the next tick`);

  let escalated = 0;
  let skipped = 0;
  let failed = 0;
  for (const r of rows) {
    try {
      await audit.withCompensatingAudit(deps.pool, {
        auditIntent: {
          pariwarId: r.pariwarId,
          actorId: null,
          actorRole: 'system',
          action: FIELD_WORKER_MOVE_REQUEST_ESCALATION_AUDIT_ACTION,
          resourceLocator: `field_worker_move_request/${r.moveRequestId}`,
          requestPayloadHash: createHash('sha256')
            .update(canonicalJsonStringify({ move_request_id: r.moveRequestId, cause: 'unanswered_7_days' }), 'utf8')
            .digest('hex'),
          traceId: null,
        },
        mutate: async ({ auditId }) =>
          withPariwarScope(deps.pool, r.pariwarId, async (_db, client) => {
            const done = await fieldWorker.escalateStaleMoveRequest(client, {
              pariwarId: ids.pariwarId(r.pariwarId),
              moveRequestId: r.moveRequestId,
              auditId,
            });
            if (done === null) throw new NoLongerDue();
            return done;
          }),
      });
      escalated += 1;
    } catch (err) {
      if (err instanceof NoLongerDue) {
        skipped += 1;
        continue;
      }
      failed += 1;
      alarm(`[jobs] field-worker-move-request-escalation: a row failed (${errorName(err)}) — it stays pending for the next tick — pariwar ${r.pariwarId} request ${r.moveRequestId}`);
    }
  }
  if (rows.length > 0) console.info('[jobs] field-worker-move-request-escalation tick', JSON.stringify({ scanned: rows.length, escalated, skipped, failed, tick: randomUUID() }));
  return { refused: false, scanned: rows.length, escalated, skipped, failed };
}

/** Register the queue + worker + hourly cron (IST). `localConcurrency: 1` — ONE tick at a time (pg-boss `^12` hands the handler an ARRAY). */
export async function registerFieldWorkerMoveRequestEscalationCron(
  boss: QueueClient,
  deps: FieldWorkerMoveRequestEscalationDeps,
  opts: { cron?: string; tz?: string } = {},
): Promise<void> {
  const cron = opts.cron ?? DEFAULT_FIELD_WORKER_MOVE_REQUEST_ESCALATION_CRON;
  const tz = opts.tz ?? FIELD_WORKER_MOVE_REQUEST_ESCALATION_TZ;
  await boss.createQueue(QUEUE_NAMES.FIELD_WORKER_MOVE_REQUEST_ESCALATION);
  await boss.work(QUEUE_NAMES.FIELD_WORKER_MOVE_REQUEST_ESCALATION, { localConcurrency: 1 }, async (jobs: Job[]) => {
    const result = await runFieldWorkerMoveRequestEscalationTick(deps);
    return { jobs: jobs.length, ...result };
  });
  await boss.schedule(QUEUE_NAMES.FIELD_WORKER_MOVE_REQUEST_ESCALATION, cron, {}, { tz });
}
