// WA dual-gated delivery-resolver read — DB-free unit test (Story 5.4, Task 7; AC6).
//
// Asserts resolveWaTarget resolves a WhatsApp SendTarget ONLY when BOTH gates pass (admin toggle enabled AND
// the member opt-in isOptInActive); any gate off ⇒ null. The domain reads + the mobile decryption are mocked.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getWaConfig = vi.fn();
const isOptInActive = vi.fn();
const getMemberMobileCiphertext = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    channelConfig: { ...actual.channelConfig, getWaConfig },
    waOptIn: { ...actual.waOptIn, isOptInActive, getMemberMobileCiphertext },
  };
});

const decryptMobile = vi.fn();
vi.mock('../../src/modules/auth/shared/mobile-index.js', () => ({ decryptMobile }));

const { resolveWaTarget } = await import('../../src/modules/channel-config/composition.js');
const { ids } = await import('@twt/domain');

const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const MEMBER = ids.memberId('22222222-2222-2222-2222-222222222222');
const DEPS = { db: {} as never, encryption: {} as never };

describe('resolveWaTarget — dual gate (AC6)', () => {
  beforeEach(() => {
    getWaConfig.mockReset();
    isOptInActive.mockReset();
    getMemberMobileCiphertext.mockReset();
    decryptMobile.mockReset();
  });

  it('both gates pass → resolves a whatsapp SendTarget', async () => {
    getWaConfig.mockResolvedValue({ enabled: true, displayPhoneNumber: '+91 98765 43210' });
    isOptInActive.mockResolvedValue(true);
    getMemberMobileCiphertext.mockResolvedValue('enc:v1:xyz');
    decryptMobile.mockResolvedValue('+919876543210');

    const target = await resolveWaTarget(DEPS, PARIWAR, MEMBER);
    expect(target).toEqual({ channel: 'whatsapp', address: '+919876543210' });
  });

  it('admin toggle off → null (opt-in gate not even consulted)', async () => {
    getWaConfig.mockResolvedValue({ enabled: false });
    const target = await resolveWaTarget(DEPS, PARIWAR, MEMBER);
    expect(target).toBeNull();
    expect(isOptInActive).not.toHaveBeenCalled();
  });

  it('no config row → null', async () => {
    getWaConfig.mockResolvedValue(null);
    expect(await resolveWaTarget(DEPS, PARIWAR, MEMBER)).toBeNull();
  });

  it('opt-in NOT active → null (even with the admin toggle on)', async () => {
    getWaConfig.mockResolvedValue({ enabled: true });
    isOptInActive.mockResolvedValue(false);
    const target = await resolveWaTarget(DEPS, PARIWAR, MEMBER);
    expect(target).toBeNull();
    expect(getMemberMobileCiphertext).not.toHaveBeenCalled();
  });

  it('both gates pass but the member has no mobile on file → null', async () => {
    getWaConfig.mockResolvedValue({ enabled: true });
    isOptInActive.mockResolvedValue(true);
    getMemberMobileCiphertext.mockResolvedValue(null);
    expect(await resolveWaTarget(DEPS, PARIWAR, MEMBER)).toBeNull();
    expect(decryptMobile).not.toHaveBeenCalled();
  });
});
