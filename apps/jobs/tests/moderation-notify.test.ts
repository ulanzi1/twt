// Moderation-notify worker registration tests — Story 10.10 code-review follow-up.
//
// Edge Case Hunter finding: the malformed-envelope guard checked `pariwarId` / `memberId` /
// `moderationActionId` but not `action`. A missing or unrecognized `action` slipped past the
// guard and made `NOTICE_KEYS[input.action]` resolve to `undefined` deep inside
// `buildModerationAlert`, throwing unguarded inside the bare `for (const job of jobs)` loop —
// aborting every OTHER job in that `boss.work` batch, not just the malformed one. This pins the
// widened guard (the `cycle-spawn.test.ts` "capture the registered handler, invoke it directly"
// pattern).

import { randomUUID } from 'node:crypto';

import type { QueueClient } from '@twt/queue';
import { QUEUE_NAMES } from '@twt/queue';
import { describe, expect, it, vi } from 'vitest';

import type { ContributionNotifyDeps } from '../src/scheduler/contribution-notify.js';
import {
  registerModerationNotifyWorker,
  type ModerationNotifyPayload,
  type ModerationNotifyWorkerDeps,
} from '../src/scheduler/moderation-notify.js';

function makeFakeQueueClient(): QueueClient {
  return {
    createQueue: vi.fn().mockResolvedValue(undefined),
    work: vi.fn().mockResolvedValue('sub-id'),
  } as unknown as QueueClient;
}

function makeDeps(): ModerationNotifyWorkerDeps {
  // The malformed-envelope path never reaches `deps.notify` — it is rejected by the guard before
  // any DB/crypto/fan-out dependency is touched, so an empty stub is sufficient here.
  return { notify: {} as ContributionNotifyDeps };
}

function validPayload(): ModerationNotifyPayload {
  return {
    moderationActionId: randomUUID(),
    memberId: randomUUID(),
    action: 'suspend',
    reasonCode: 'r14-forgery',
  };
}

async function capturedHandler(
  boss: QueueClient,
): Promise<(jobs: { id: string; data: unknown }[]) => Promise<unknown>> {
  await registerModerationNotifyWorker(boss, makeDeps());
  const call = (boss.work as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
    (c: unknown[]) => c[0] === QUEUE_NAMES.MEMBER_MODERATION_NOTIFY,
  )!;
  return call[1] as (jobs: { id: string; data: unknown }[]) => Promise<unknown>;
}

describe('registerModerationNotifyWorker — the malformed-envelope guard (review fix)', () => {
  it('a missing `action` is rejected by the guard, logged, and does not throw', async () => {
    const boss = makeFakeQueueClient();
    const handler = await capturedHandler(boss);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { action, ...rest } = validPayload();
    void action;
    await expect(
      handler([{ id: 'job-1', data: { pariwarId: randomUUID(), payload: rest } }]),
    ).resolves.not.toThrow();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('malformed job envelope'),
      expect.any(String),
    );
    errorSpy.mockRestore();
  });

  it('an unrecognized `action` value is rejected by the guard, logged, and does not throw', async () => {
    const boss = makeFakeQueueClient();
    const handler = await capturedHandler(boss);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const bogus = { ...validPayload(), action: 'bogus-action' };
    await expect(
      handler([{ id: 'job-2', data: { pariwarId: randomUUID(), payload: bogus } }]),
    ).resolves.not.toThrow();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('malformed job envelope'),
      expect.any(String),
    );
    errorSpy.mockRestore();
  });

  it('a well-formed envelope is NOT rejected by the guard (it proceeds past it)', async () => {
    const boss = makeFakeQueueClient();
    const handler = await capturedHandler(boss);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    // No live DB/crypto deps are wired, so `runModerationNotify` itself will reject once it tries
    // to use them — the point of this test is only that the GUARD let it through, not that the
    // full dispatch succeeded (that is the live-DB integration spec's job).
    await handler([{ id: 'job-3', data: { pariwarId: randomUUID(), payload: validPayload() } }]).catch(
      () => undefined,
    );

    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining('malformed job envelope'), expect.any(String));
    errorSpy.mockRestore();
  });
});
