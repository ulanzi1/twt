// Reconciliation UTR-matcher job producer — Story 9.4 (Task 3; Decision D7, the enqueue-primary).
//
// A SEND-ONLY pg-boss client (the Story 3.11 data-export producer precedent): after a bank-statement upload
// commits, the reconciliation route enqueues a RECONCILIATION_MATCH job for the pool's cycle — the D7
// latency optimizer (a new statement is the only thing that changes match outcomes, so this gives near-real-
// time confirmation instead of waiting up to 4h for the recovery-sweep cron). The API PRODUCES only; the
// apps/jobs matcher worker consumes. Best-effort at the call site (a failed enqueue never fails the upload).

import {
  QUEUE_NAMES,
  createQueueClient,
  stopQueueClient,
  type JobEnvelope,
  type QueueClient,
} from '@twt/queue';

import type { ReconciliationMatchEnqueuer } from '../../context.js';

/** RECONCILIATION_MATCH payload (mirrors the apps/jobs worker's ReconciliationMatchPayload). NON-PII. */
interface ReconciliationMatchPayload {
  readonly cycleId: string;
}

/**
 * Construct + start a send-only pg-boss client and wrap it as a {@link ReconciliationMatchEnqueuer}. Started
 * once at boot (attaches the `pgboss` schema — apps/jobs already created it) and held on AppDeps. `close`
 * drains it on shutdown. singletonKey = cycle_id so a duplicate enqueue collapses; the matcher is idempotent
 * regardless. Enqueue failures propagate to the caller, which swallows them (best-effort — the cron heals).
 */
export async function createPgBossReconciliationMatchEnqueuer(
  connectionString: string,
): Promise<ReconciliationMatchEnqueuer> {
  const boss: QueueClient = createQueueClient(connectionString, { applicationName: 'twt-api' });
  await boss.start();
  await boss.createQueue(QUEUE_NAMES.RECONCILIATION_MATCH);

  return {
    async enqueueMatch(input): Promise<void> {
      await boss.send(
        QUEUE_NAMES.RECONCILIATION_MATCH,
        {
          requestId: input.requestId,
          pariwarId: input.pariwarId,
          actorId: input.actorId,
          traceId: input.traceId,
          payload: { cycleId: input.cycleId },
        } satisfies JobEnvelope<ReconciliationMatchPayload>,
        { singletonKey: input.cycleId },
      );
    },
    async close(): Promise<void> {
      await stopQueueClient(boss);
    },
  };
}
