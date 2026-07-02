// Data-export build-job producer — Story 3.11 (Task 5, Dev Notes §"First API-side enqueue").
//
// The FIRST request-path queue producer in `apps/api`. All prior queue work was cron-registered inside
// apps/jobs; this story adds a SEND-ONLY client to the API: it enqueues a DATA_EXPORT_BUILD job when a
// member requests an export. `@twt/queue` is the shared seam both apps import independently (apps
// cannot depend on apps). The API PRODUCES only — it NEVER calls `boss.work()` (apps/jobs consumes).

import {
  QUEUE_NAMES,
  createQueueClient,
  stopQueueClient,
  type JobEnvelope,
  type QueueClient,
} from '@twt/queue';

import type { DataExportEnqueuer } from '../../context.js';

/**
 * Construct + start a send-only pg-boss client and wrap it as a {@link DataExportEnqueuer}. The client
 * is started once at boot (creates/attaches the `pgboss` schema — apps/jobs already created it) and
 * held on AppDeps. `close` drains it on shutdown. Enqueue failures propagate to the caller so the
 * request handler can compensate (mark the orphaned `pending` row failed).
 */
export async function createPgBossDataExportEnqueuer(
  connectionString: string,
): Promise<DataExportEnqueuer> {
  const boss: QueueClient = createQueueClient(connectionString, { applicationName: 'twt-api' });
  await boss.start();
  await boss.createQueue(QUEUE_NAMES.DATA_EXPORT_BUILD);

  return {
    async enqueueBuild(envelope: JobEnvelope<{ exportId: string }>): Promise<void> {
      await boss.send(QUEUE_NAMES.DATA_EXPORT_BUILD, envelope);
    },
    async close(): Promise<void> {
      await stopQueueClient(boss);
    },
  };
}
