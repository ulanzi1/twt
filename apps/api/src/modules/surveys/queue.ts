// Survey publish job producer — Story 10.15 (Task 6; AC8). The apps/api SEND-ONLY enqueuer.
//
// Mirrors `createPgBossNewsPublishEnqueuer`: constructs a send-only pg-boss client + the
// SURVEY_PUBLISH queue, and posts a job carrying the ALS envelope + `{ surveyId }`.
//
// ⛔ THIS FILE NEVER CALLS `boss.work()`. apps/api ENQUEUES; apps/jobs FANS OUT. The reason is the
// 10.4 crypto-boundary lesson ([[project_helpdesk_responder_surface_104]]):
// `resolveMemberDeliveryContext` / `fanOutAlert` resolve MEMBER Tier-1 field crypto, and apps/api's
// request path carries ADMIN-identity keys. A fan-out here would need member key material in the
// admin process.
//
// ⭐ SIMPLER THAN THE NEWS ENQUEUER, and the difference is worth stating: NEWS_PUBLISH carries a
// `mode` discriminator and a DELAYED (`startAfter`) form because a news post has a scheduled-publish
// TRANSITION. A survey has none — publishing with a future `valid_from` leaves the row `published`
// and simply reading as `scheduled` until the clock passes, because the window is a pure read-time
// derivation with no sweep (AC2). So there is exactly one trigger, one job shape, and no mode-scoped
// singleton-key collision to design around.
//
// `singletonKey = <surveyId>` dedups a re-enqueue from a double-clicked Publish. Redelivery safety
// comes from the WORKER's per-member idempotency claims, not from this key.

import {
  createQueueClient,
  QUEUE_NAMES,
  stopQueueClient,
  type JobEnvelope,
  type QueueClient,
} from '@twt/queue';

import type { SurveyPublishEnqueuer } from '../../context.js';

/** The SURVEY_PUBLISH job payload (structurally aligned with the apps/jobs worker's own type). */
export interface SurveyPublishJobPayload {
  surveyId: string;
}

export async function createPgBossSurveyPublishEnqueuer(connectionString: string): Promise<SurveyPublishEnqueuer> {
  const boss: QueueClient = createQueueClient(connectionString, { applicationName: 'twt-api' });
  await boss.start();
  await boss.createQueue(QUEUE_NAMES.SURVEY_PUBLISH);

  return {
    async enqueuePublish(input): Promise<void> {
      await boss.send(
        QUEUE_NAMES.SURVEY_PUBLISH,
        {
          requestId: input.requestId,
          pariwarId: input.pariwarId,
          actorId: input.actorId,
          traceId: input.traceId,
          payload: { surveyId: input.surveyId },
        } satisfies JobEnvelope<SurveyPublishJobPayload>,
        { singletonKey: input.surveyId },
      );
    },
    async close(): Promise<void> {
      await stopQueueClient(boss);
    },
  };
}
