// Telegram dual-gated delivery-resolver read — DB-free unit test (Story 5.5, Task 8/11; AC5).
//
// Asserts resolveTelegramTarget resolves a Telegram SendTarget ONLY when BOTH gates pass (admin toggle enabled
// AND the member opt-in isOptInActive); any gate off ⇒ null. The captured chat_id is the address (no
// decryption — Telegram carries no PII envelope). The domain reads are mocked. Gate 2 reads the OPERATIONAL
// state (isOptInActive), NEVER a consent-registry read (the load-bearing invariant).

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getTelegramConfig = vi.fn();
const isOptInActive = vi.fn();
const getChatIdForMember = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    channelConfig: { ...actual.channelConfig, getTelegramConfig },
    telegramOptIn: { ...actual.telegramOptIn, isOptInActive, getChatIdForMember },
  };
});

const { resolveTelegramTarget } = await import('../../src/modules/channel-config/composition.js');
const { ids } = await import('@twt/domain');

const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const MEMBER = ids.memberId('22222222-2222-2222-2222-222222222222');
const DEPS = { db: {} as never };

describe('resolveTelegramTarget — dual gate (AC5)', () => {
  beforeEach(() => {
    getTelegramConfig.mockReset();
    isOptInActive.mockReset();
    getChatIdForMember.mockReset();
  });

  it('both gates pass → resolves a telegram SendTarget with the captured chat id', async () => {
    getTelegramConfig.mockResolvedValue({ enabled: true });
    isOptInActive.mockResolvedValue(true);
    getChatIdForMember.mockResolvedValue('chat-42');

    const target = await resolveTelegramTarget(DEPS, PARIWAR, MEMBER);
    expect(target).toEqual({ channel: 'telegram', address: 'chat-42' });
  });

  it('admin toggle off → null (opt-in gate not even consulted)', async () => {
    getTelegramConfig.mockResolvedValue({ enabled: false });
    const target = await resolveTelegramTarget(DEPS, PARIWAR, MEMBER);
    expect(target).toBeNull();
    expect(isOptInActive).not.toHaveBeenCalled();
  });

  it('no config row → null', async () => {
    getTelegramConfig.mockResolvedValue(null);
    expect(await resolveTelegramTarget(DEPS, PARIWAR, MEMBER)).toBeNull();
  });

  it('opt-in NOT active → null (even with the admin toggle on)', async () => {
    getTelegramConfig.mockResolvedValue({ enabled: true });
    isOptInActive.mockResolvedValue(false);
    const target = await resolveTelegramTarget(DEPS, PARIWAR, MEMBER);
    expect(target).toBeNull();
    expect(getChatIdForMember).not.toHaveBeenCalled();
  });

  it('both gates pass but no chat id captured → null', async () => {
    getTelegramConfig.mockResolvedValue({ enabled: true });
    isOptInActive.mockResolvedValue(true);
    getChatIdForMember.mockResolvedValue(null);
    expect(await resolveTelegramTarget(DEPS, PARIWAR, MEMBER)).toBeNull();
  });
});
