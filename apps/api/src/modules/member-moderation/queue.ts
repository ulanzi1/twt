// Member-moderation notice job producer — Story 10.10 (Task 5; AC8). The apps/api send-only enqueuer.
//
// Mirrors `createPgBossNewsPublishEnqueuer`: constructs a send-only pg-boss client + the
// MEMBER_MODERATION_NOTIFY queue, and posts a job carrying the ALS envelope + the routing keys.
//
// `singletonKey = moderationActionId` — one notice per DECISION RECORD. That is the right grain:
// a pg-boss redelivery of the same job cannot double-notify, while two legitimate actions on the
// same member (a suspend, then the terminate that follows it) are distinct decisions and each earns
// its own notice. Keying on `memberId` would have silently swallowed the second.
//
// ⚠ The payload carries the reason CODE and the routing ids ONLY — never the rationale, never a
// name. The worker resolves whatever else it needs from the DB under Pariwar scope. A pg-boss job
// payload is plaintext JSONB in the queue tables, so it is held to the same R1 discipline as an
// `events_log` payload.

import {
  createQueueClient,
  QUEUE_NAMES,
  stopQueueClient,
  type JobEnvelope,
  type QueueClient,
} from '@twt/queue';

import type { ModerationNotifyEnqueuer } from '../../context.js';

/** The MEMBER_MODERATION_NOTIFY payload (structurally aligned with the apps/jobs worker's type). */
export interface ModerationNotifyJobPayload {
  moderationActionId: string;
  memberId: string;
  action: 'suspend' | 'terminate' | 'restore' | 'appeal_upheld' | 'appeal_allowed';
  reasonCode: string;
  /** Present iff `action` is an appeal-outcome kind — see `ModerationNotifyEnqueuer` (context.ts). */
  appealId?: string;
}

export async function createPgBossModerationNotifyEnqueuer(
  connectionString: string,
): Promise<ModerationNotifyEnqueuer> {
  const boss: QueueClient = createQueueClient(connectionString, { applicationName: 'twt-api' });
  await boss.start();
  await boss.createQueue(QUEUE_NAMES.MEMBER_MODERATION_NOTIFY);

  return {
    async enqueueModerationNotice(input): Promise<void> {
      await boss.send(
        QUEUE_NAMES.MEMBER_MODERATION_NOTIFY,
        {
          requestId: input.requestId,
          pariwarId: input.pariwarId,
          actorId: input.actorId,
          traceId: input.traceId,
          payload: {
            moderationActionId: input.moderationActionId,
            memberId: input.memberId,
            action: input.action,
            reasonCode: input.reasonCode,
            ...(input.appealId === undefined ? {} : { appealId: input.appealId }),
          },
        } satisfies JobEnvelope<ModerationNotifyJobPayload>,
        // ⚠ `appealId` when present — NEVER `moderationActionId` — see the doc-comment on
        // `ModerationNotifyEnqueuer.enqueueModerationNotice` (context.ts) for why.
        { singletonKey: input.appealId ?? input.moderationActionId },
      );
    },
    async close(): Promise<void> {
      await stopQueueClient(boss);
    },
  };
}
