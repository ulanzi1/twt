// Pool-spawn parent-job producer — Story 7.3 (Task 6).
//
// Replaces the Story 6.13 `consolePoolSpawnTrigger` stub with the REAL producer: a SEND-ONLY
// pg-boss client (mirror data-export/queue.ts + ocr-parity-queue.ts) that durably enqueues the
// `CYCLE_SPAWN_PARENT` job when the cycle-freeze commit handler fires the post-commit trigger.
// `@twt/queue` is the shared seam both apps import independently (apps cannot depend on apps). The
// API PRODUCES only — it NEVER calls `boss.work()` (apps/jobs runs the saga).
//
// The trigger stays best-effort + post-commit: enqueue is durable (pg-boss persists the job), so
// once enqueued the saga runs/retries independently of the request. singletonKey = commit_id makes
// a re-fired trigger (the redelivery self-healing path) a no-op rather than a duplicate parent.

import {
  QUEUE_NAMES,
  createQueueClient,
  stopQueueClient,
  type JobEnvelope,
  type QueueClient,
} from '@twt/queue';

import type { PoolSpawnTriggerEnqueuer } from '../../context.js';

/**
 * The CYCLE_SPAWN_PARENT job payload. Structurally aligned with the apps/jobs
 * `CycleSpawnParentPayload` (apps cannot depend on apps, so it is redeclared here — the
 * ClaimOcrParityJobPayload precedent). pariwarId + attestation actor ride the JobEnvelope.
 */
interface CycleSpawnParentJobPayload {
  cycleId: string;
  frozenClaims: { claimCaseId: string }[];
}

/**
 * Construct + start a send-only pg-boss client wrapped as a {@link PoolSpawnTriggerEnqueuer}. Started
 * once at boot (attaches the `pgboss` schema — apps/jobs already created it) and held on AppDeps.
 * `close` drains it on shutdown. An enqueue failure propagates to the handler, which swallows it
 * (best-effort trigger — a failed enqueue leaves `trigger_delivered=false`, so the next commit replay
 * retries delivery — the Story 6.13 self-healing contract, unchanged).
 */
export async function createPgBossCycleSpawnEnqueuer(
  connectionString: string,
): Promise<PoolSpawnTriggerEnqueuer> {
  const boss: QueueClient = createQueueClient(connectionString, { applicationName: 'twt-api' });
  await boss.start();
  await boss.createQueue(QUEUE_NAMES.CYCLE_SPAWN_PARENT);

  return {
    async enqueue(payload): Promise<void> {
      const envelope: JobEnvelope<CycleSpawnParentJobPayload> = {
        // No request-scoped id crosses the post-commit trigger; the durable commit_id is the
        // correlation anchor for the whole saga.
        requestId: payload.commit_id,
        pariwarId: payload.pariwar_id,
        actorId: payload.attestation.actor_id,
        traceId: payload.commit_id,
        payload: {
          cycleId: payload.commit_id,
          frozenClaims: payload.frozen_claims.map((c) => ({ claimCaseId: c.claim_case_id })),
        },
      };
      await boss.send(QUEUE_NAMES.CYCLE_SPAWN_PARENT, envelope, { singletonKey: payload.commit_id });
    },
    async close(): Promise<void> {
      await stopQueueClient(boss);
    },
  };
}
