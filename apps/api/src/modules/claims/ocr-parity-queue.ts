// Claim-document OCR + parity job producer — Story 6.5 (Task 5).
//
// A SEND-ONLY pg-boss client (mirror data-export/queue.ts): the upload endpoint enqueues a
// CLAIM_OCR_PARITY job after storing the document bytes in object storage. `@twt/queue` is the
// shared seam both apps import independently (apps cannot depend on apps). The API PRODUCES
// only — it NEVER calls `boss.work()` (apps/jobs consumes).

import {
  QUEUE_NAMES,
  createQueueClient,
  stopQueueClient,
  type JobEnvelope,
  type QueueClient,
} from '@twt/queue';

import type { ClaimOcrParityEnqueuer, ClaimOcrParityJobPayload } from '../../context.js';

/**
 * Construct + start a send-only pg-boss client and wrap it as a {@link ClaimOcrParityEnqueuer}.
 * Started once at boot (attaches the `pgboss` schema — apps/jobs already created it) and held
 * on AppDeps. `close` drains it on shutdown. Enqueue failures propagate so the upload handler
 * can compensate (the document bytes were stored but the OCR job did not enqueue).
 */
export async function createPgBossClaimOcrParityEnqueuer(
  connectionString: string,
): Promise<ClaimOcrParityEnqueuer> {
  const boss: QueueClient = createQueueClient(connectionString, { applicationName: 'twt-api' });
  await boss.start();
  await boss.createQueue(QUEUE_NAMES.CLAIM_OCR_PARITY);

  return {
    async enqueue(envelope: JobEnvelope<ClaimOcrParityJobPayload>): Promise<void> {
      await boss.send(QUEUE_NAMES.CLAIM_OCR_PARITY, envelope);
    },
    async close(): Promise<void> {
      await stopQueueClient(boss);
    },
  };
}
