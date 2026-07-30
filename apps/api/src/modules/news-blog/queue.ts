// News/Blog publish job producer — Story 10.5 (Task 4/5). The apps/api send-only enqueuer.
//
// Mirrors `createPgBossReconciliationMatchEnqueuer`: constructs a send-only pg-boss client + the
// NEWS_PUBLISH queue, and posts a job carrying the ALS envelope + `{ postId, mode }`. `singletonKey =
// "<postId>:<mode>"` dedups a re-enqueue of the SAME mode (e.g. double-clicking Schedule), while
// keeping the `scheduled` and `immediate` job for one post on DISTINCT keys — a `schedule()` delayed
// job and a later out-of-band `publish()` zero-delay job must NOT collide on one singleton slot, or
// pg-boss silently drops the second `send()` as a duplicate and its fan-out never fires. The DELAYED
// (`startAfter`) form is used for the scheduled trigger. The apps/jobs worker consumes it (NEVER
// `boss.work()` here). The fan-out lives in apps/jobs (the member Tier-1 crypto boundary — the 10.4
// lesson) and is itself idempotent per post (deterministic `alert_id`), so either job firing after
// the other already published is a safe re-attempt, not a duplicate notification.

import {
  createQueueClient,
  QUEUE_NAMES,
  stopQueueClient,
  type JobEnvelope,
  type QueueClient,
} from '@twt/queue';

import type { NewsPublishEnqueuer } from '../../context.js';

/** The NEWS_PUBLISH job payload (structurally aligned with the apps/jobs worker's `NewsPublishPayload`). */
export interface NewsPublishJobPayload {
  postId: string;
  mode: 'immediate' | 'scheduled';
}

export async function createPgBossNewsPublishEnqueuer(connectionString: string): Promise<NewsPublishEnqueuer> {
  const boss: QueueClient = createQueueClient(connectionString, { applicationName: 'twt-api' });
  await boss.start();
  await boss.createQueue(QUEUE_NAMES.NEWS_PUBLISH);

  return {
    async enqueuePublish(input): Promise<void> {
      await boss.send(
        QUEUE_NAMES.NEWS_PUBLISH,
        {
          requestId: input.requestId,
          pariwarId: input.pariwarId,
          actorId: input.actorId,
          traceId: input.traceId,
          payload: { postId: input.postId, mode: input.mode },
        } satisfies JobEnvelope<NewsPublishJobPayload>,
        // singletonKey = "<postId>:<mode>" dedups a re-enqueue of the SAME mode, without colliding
        // across modes (see the header note). The scheduled trigger delays until `startAfter`.
        input.mode === 'scheduled' && input.at
          ? { singletonKey: `${input.postId}:scheduled`, startAfter: input.at }
          : { singletonKey: `${input.postId}:immediate` },
      );
    },
    async close(): Promise<void> {
      await stopQueueClient(boss);
    },
  };
}
