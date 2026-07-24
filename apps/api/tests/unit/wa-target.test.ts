// WA delivery-resolver wrapper — DB-free unit test (Story 5.4, Task 7; AC6 / Story 8.8 Task 1).
//
// ── What moved, and where the real assertions now live ─────────────────────────────────────────────
// Story 8.8 (Task 1; D4) relocated `resolveWaTarget` into `@twt/domain` so the live notification
// fan-out in `apps/jobs` can call it (apps cannot import apps). The full DUAL-GATE behavioural suite —
// admin toggle AND an ACTIVE, in-window member opt-in; either gate off ⇒ null with the later gate not
// even consulted — moved with it and now lives in
// `packages/domain/tests/notifications/delivery-targets.test.ts`, unchanged.
//
// What remains apps/api's own responsibility is the ADAPTER: that this module still exists at its
// original path with its original signature, and forwards the caller's `{ db, encryption }` bundle to
// the one domain implementation rather than growing a second one. That is what this file pins.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const domainResolveWaTarget = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    notifications: { ...actual.notifications, resolveWaTarget: domainResolveWaTarget },
  };
});

const { resolveWaTarget } = await import('../../src/modules/channel-config/composition.js');
const { ids } = await import('@twt/domain');

const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const MEMBER = ids.memberId('22222222-2222-2222-2222-222222222222');
const DB = { marker: 'db' } as never;
const ENCRYPTION = { marker: 'enc' } as never;
const DEPS = { db: DB, encryption: ENCRYPTION };

describe('resolveWaTarget — the apps/api adapter over the relocated domain read', () => {
  beforeEach(() => {
    domainResolveWaTarget.mockReset();
  });

  it('forwards db + encryption + scope (and the optional `at`) to the ONE domain implementation', async () => {
    const at = new Date('2026-07-23T00:00:00.000Z');
    domainResolveWaTarget.mockResolvedValue({ channel: 'whatsapp', address: '+919876543210' });

    const target = await resolveWaTarget(DEPS, PARIWAR, MEMBER, at);

    expect(target).toEqual({ channel: 'whatsapp', address: '+919876543210' });
    expect(domainResolveWaTarget).toHaveBeenCalledWith(DB, ENCRYPTION, PARIWAR, MEMBER, at);
  });

  it('passes the null (no-delivery) resolution straight through — the adapter adds no policy', async () => {
    domainResolveWaTarget.mockResolvedValue(null);
    expect(await resolveWaTarget(DEPS, PARIWAR, MEMBER)).toBeNull();
    expect(domainResolveWaTarget).toHaveBeenCalledWith(DB, ENCRYPTION, PARIWAR, MEMBER, undefined);
  });
});
