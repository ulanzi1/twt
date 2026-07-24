// Telegram delivery-resolver wrapper — DB-free unit test (Story 5.5, Task 8/11; AC5 / Story 8.8 Task 1).
//
// ── What moved, and where the real assertions now live ─────────────────────────────────────────────
// Story 8.8 (Task 1; D4) relocated `resolveTelegramTarget` into `@twt/domain` so the live notification
// fan-out in `apps/jobs` can call it (apps cannot import apps). The full DUAL-GATE behavioural suite —
// admin toggle AND an ACTIVE opt-in (no window), the captured `chat_id` as the address, and the
// load-bearing "gate 2 reads the OPERATIONAL state, never a consent-registry read" invariant — moved
// with it and now lives in `packages/domain/tests/notifications/delivery-targets.test.ts`, unchanged.
//
// What remains apps/api's own responsibility is the ADAPTER: that this module still exists at its
// original path with its original signature, and forwards to the one domain implementation.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const domainResolveTelegramTarget = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    notifications: {
      ...actual.notifications,
      resolveTelegramTarget: domainResolveTelegramTarget,
    },
  };
});

const { resolveTelegramTarget } = await import('../../src/modules/channel-config/composition.js');
const { ids } = await import('@twt/domain');

const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const MEMBER = ids.memberId('22222222-2222-2222-2222-222222222222');
const DB = { marker: 'db' } as never;
const DEPS = { db: DB };

describe('resolveTelegramTarget — the apps/api adapter over the relocated domain read', () => {
  beforeEach(() => {
    domainResolveTelegramTarget.mockReset();
  });

  it('forwards db + scope to the ONE domain implementation (no encryption — chat_id is not PII-enveloped)', async () => {
    domainResolveTelegramTarget.mockResolvedValue({ channel: 'telegram', address: 'chat-42' });

    const target = await resolveTelegramTarget(DEPS, PARIWAR, MEMBER);

    expect(target).toEqual({ channel: 'telegram', address: 'chat-42' });
    expect(domainResolveTelegramTarget).toHaveBeenCalledWith(DB, PARIWAR, MEMBER);
  });

  it('passes the null (no-delivery) resolution straight through — the adapter adds no policy', async () => {
    domainResolveTelegramTarget.mockResolvedValue(null);
    expect(await resolveTelegramTarget(DEPS, PARIWAR, MEMBER)).toBeNull();
  });
});
