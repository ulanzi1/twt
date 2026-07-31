// Report-export build-job producer — Story 10.7 (Task 6). The admin analog of the data-export producer.
//
// A SEND-ONLY pg-boss client: the API enqueues a REPORT_EXPORT_BUILD job when an admin requests a report
// export. `@twt/queue` is the shared seam both apps import independently (apps cannot depend on apps).
// The API PRODUCES only — it NEVER calls `boss.work()` (apps/jobs consumes).

import {
  QUEUE_NAMES,
  createQueueClient,
  stopQueueClient,
  type JobEnvelope,
  type QueueClient,
} from '@twt/queue';

import type { ReportExportEnqueuer } from '../../context.js';

/**
 * Construct + start a send-only pg-boss client and wrap it as a {@link ReportExportEnqueuer}. Started
 * once at boot; held on AppDeps. `close` drains it on shutdown. Enqueue failures propagate to the caller
 * so the request handler can compensate (mark the orphaned `pending` row failed).
 */
export async function createPgBossReportExportEnqueuer(
  connectionString: string,
): Promise<ReportExportEnqueuer> {
  const boss: QueueClient = createQueueClient(connectionString, { applicationName: 'twt-api' });
  await boss.start();
  await boss.createQueue(QUEUE_NAMES.REPORT_EXPORT_BUILD);

  return {
    async enqueueBuild(envelope: JobEnvelope<{ reportExportId: string }>): Promise<void> {
      await boss.send(QUEUE_NAMES.REPORT_EXPORT_BUILD, envelope);
    },
    async close(): Promise<void> {
      await stopQueueClient(boss);
    },
  };
}
