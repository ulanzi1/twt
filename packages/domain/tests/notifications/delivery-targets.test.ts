// Delivery-target resolvers — DB-free unit tests (Stories 5.4 / 5.5 / 5.6; RELOCATED by Story 8.8).
//
// These assertions were authored in `apps/api/tests/unit/{wa-target,telegram-target,sms-composition}.test.ts`
// against the resolvers' original apps/api home. Story 8.8 (Task 1; D4) moved the resolvers into
// `@twt/domain` so the live notification fan-out in `apps/jobs` can reach them (apps cannot import
// apps), so the behavioural suite moves with them — same gates, same expectations, byte-for-byte the
// same outcomes. Their apps/api wrappers keep thin delegation tests.
//
// What is asserted:
//   · WhatsApp (5.4 AC6) — DUAL gate: the admin toggle AND an ACTIVE, in-window member opt-in. Either
//     gate off ⇒ null, and the later gate is not even consulted.
//   · Telegram (5.5 AC5) — DUAL gate: the admin toggle AND an ACTIVE opt-in (no window). Gate 2 reads
//     the OPERATIONAL state, NEVER a consent-registry read (the load-bearing invariant).
//   · SMS (5.6 AC4) — NO opt-in gate (the registered KYC mobile IS the address); null only when the
//     member has no mobile on file, and no decryption is attempted in that case.
//   · Push (5.2) — returns EVERY active device (multi-device), and one row's decrypt failure drops
//     only that row (the Promise.allSettled isolation) rather than sinking the member's other devices.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getWaConfig = vi.fn();
const getTelegramConfig = vi.fn();
vi.mock('../../src/channel-config/index.js', () => ({ getWaConfig, getTelegramConfig }));

const waIsOptInActive = vi.fn();
const getMemberMobileCiphertext = vi.fn();
vi.mock('../../src/wa-opt-in/index.js', () => ({
  isOptInActive: waIsOptInActive,
  getMemberMobileCiphertext,
}));

const tgIsOptInActive = vi.fn();
const getChatIdForMember = vi.fn();
vi.mock('../../src/telegram-opt-in/index.js', () => ({
  isOptInActive: tgIsOptInActive,
  getChatIdForMember,
}));

const listActiveTokens = vi.fn();
vi.mock('../../src/device-token/index.js', () => ({ listActiveTokens }));

const decryptMobile = vi.fn();
const decryptDeviceToken = vi.fn();
vi.mock('../../src/encryption/member-fields.js', () => ({ decryptMobile, decryptDeviceToken }));

const { resolvePushTargets, resolveSmsTarget, resolveTelegramTarget, resolveWaTarget } = await import(
  '../../src/notifications/delivery.js'
);
const { ids } = await import('../../src/index.js');

const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const MEMBER = ids.memberId('22222222-2222-2222-2222-222222222222');
const DB = {} as never;
const ENC = {} as never;

describe('resolveWaTarget — dual gate (Story 5.4 AC6)', () => {
  beforeEach(() => {
    getWaConfig.mockReset();
    waIsOptInActive.mockReset();
    getMemberMobileCiphertext.mockReset();
    decryptMobile.mockReset();
  });

  it('both gates pass → resolves a whatsapp target', async () => {
    getWaConfig.mockResolvedValue({ enabled: true, displayPhoneNumber: '+91 98765 43210' });
    waIsOptInActive.mockResolvedValue(true);
    getMemberMobileCiphertext.mockResolvedValue('enc:v1:xyz');
    decryptMobile.mockResolvedValue('+919876543210');

    expect(await resolveWaTarget(DB, ENC, PARIWAR, MEMBER)).toEqual({
      channel: 'whatsapp',
      address: '+919876543210',
    });
  });

  it('admin toggle off → null (opt-in gate not even consulted)', async () => {
    getWaConfig.mockResolvedValue({ enabled: false });
    expect(await resolveWaTarget(DB, ENC, PARIWAR, MEMBER)).toBeNull();
    expect(waIsOptInActive).not.toHaveBeenCalled();
  });

  it('no config row → null', async () => {
    getWaConfig.mockResolvedValue(null);
    expect(await resolveWaTarget(DB, ENC, PARIWAR, MEMBER)).toBeNull();
  });

  it('opt-in NOT active → null (even with the admin toggle on)', async () => {
    getWaConfig.mockResolvedValue({ enabled: true });
    waIsOptInActive.mockResolvedValue(false);
    expect(await resolveWaTarget(DB, ENC, PARIWAR, MEMBER)).toBeNull();
    expect(getMemberMobileCiphertext).not.toHaveBeenCalled();
  });

  it('both gates pass but the member has no mobile on file → null', async () => {
    getWaConfig.mockResolvedValue({ enabled: true });
    waIsOptInActive.mockResolvedValue(true);
    getMemberMobileCiphertext.mockResolvedValue(null);
    expect(await resolveWaTarget(DB, ENC, PARIWAR, MEMBER)).toBeNull();
    expect(decryptMobile).not.toHaveBeenCalled();
  });

  it('a mobile decrypt failure resolves to null rather than throwing (isolation, not propagation)', async () => {
    // A corrupt/context-mismatched ciphertext must not sink the caller's OTHER channel resolutions —
    // resolveMemberDeliveryContext gathers all four resolvers via Promise.all, so an uncaught throw
    // here would deny push and Telegram too.
    getWaConfig.mockResolvedValue({ enabled: true });
    waIsOptInActive.mockResolvedValue(true);
    getMemberMobileCiphertext.mockResolvedValue('enc:v1:corrupt');
    decryptMobile.mockRejectedValue(new Error('KMS context mismatch'));

    await expect(resolveWaTarget(DB, ENC, PARIWAR, MEMBER)).resolves.toBeNull();
  });
});

describe('resolveTelegramTarget — dual gate (Story 5.5 AC5)', () => {
  beforeEach(() => {
    getTelegramConfig.mockReset();
    tgIsOptInActive.mockReset();
    getChatIdForMember.mockReset();
  });

  it('both gates pass → resolves a telegram target with the captured chat id', async () => {
    getTelegramConfig.mockResolvedValue({ enabled: true });
    tgIsOptInActive.mockResolvedValue(true);
    getChatIdForMember.mockResolvedValue('chat-42');

    expect(await resolveTelegramTarget(DB, PARIWAR, MEMBER)).toEqual({
      channel: 'telegram',
      address: 'chat-42',
    });
  });

  it('admin toggle off → null (opt-in gate not even consulted)', async () => {
    getTelegramConfig.mockResolvedValue({ enabled: false });
    expect(await resolveTelegramTarget(DB, PARIWAR, MEMBER)).toBeNull();
    expect(tgIsOptInActive).not.toHaveBeenCalled();
  });

  it('no config row → null', async () => {
    getTelegramConfig.mockResolvedValue(null);
    expect(await resolveTelegramTarget(DB, PARIWAR, MEMBER)).toBeNull();
  });

  it('opt-in NOT active → null (even with the admin toggle on)', async () => {
    getTelegramConfig.mockResolvedValue({ enabled: true });
    tgIsOptInActive.mockResolvedValue(false);
    expect(await resolveTelegramTarget(DB, PARIWAR, MEMBER)).toBeNull();
    expect(getChatIdForMember).not.toHaveBeenCalled();
  });

  it('both gates pass but no chat id captured → null', async () => {
    getTelegramConfig.mockResolvedValue({ enabled: true });
    tgIsOptInActive.mockResolvedValue(true);
    getChatIdForMember.mockResolvedValue(null);
    expect(await resolveTelegramTarget(DB, PARIWAR, MEMBER)).toBeNull();
  });
});

describe('resolveSmsTarget — no opt-in gate (Story 5.6 AC4)', () => {
  beforeEach(() => {
    // `getWaConfig` is reset here too: the "no admin toggle consulted" assertion below is only
    // meaningful against a spy the WhatsApp describe above has not already driven.
    getWaConfig.mockReset();
    getMemberMobileCiphertext.mockReset();
    decryptMobile.mockReset();
  });

  it('resolves an sms target from the KYC mobile (no opt-in / no admin toggle consulted)', async () => {
    getMemberMobileCiphertext.mockResolvedValue('enc:v1:xyz');
    decryptMobile.mockResolvedValue('+919876543210');

    expect(await resolveSmsTarget(DB, ENC, PARIWAR, MEMBER)).toEqual({
      channel: 'sms',
      address: '+919876543210',
    });
    expect(getMemberMobileCiphertext).toHaveBeenCalledWith(DB, {
      pariwarId: PARIWAR,
      memberId: MEMBER,
    });
    expect(getWaConfig).not.toHaveBeenCalled();
  });

  it('member with no mobile on file → null (no decryption attempted)', async () => {
    getMemberMobileCiphertext.mockResolvedValue(null);
    expect(await resolveSmsTarget(DB, ENC, PARIWAR, MEMBER)).toBeNull();
    expect(decryptMobile).not.toHaveBeenCalled();
  });

  it('a mobile decrypt failure resolves to null rather than throwing (isolation, not propagation)', async () => {
    getMemberMobileCiphertext.mockResolvedValue('enc:v1:corrupt');
    decryptMobile.mockRejectedValue(new Error('KMS context mismatch'));

    await expect(resolveSmsTarget(DB, ENC, PARIWAR, MEMBER)).resolves.toBeNull();
  });
});

describe('resolvePushTargets — multi-device + per-row decrypt isolation (Story 5.2)', () => {
  beforeEach(() => {
    listActiveTokens.mockReset();
    decryptDeviceToken.mockReset();
  });

  it('returns ONE target per active device, each carrying its platform + ownership tuple', async () => {
    listActiveTokens.mockResolvedValue([
      { tokenCiphertext: 'enc:a', platform: 'android' },
      { tokenCiphertext: 'enc:b', platform: 'ios' },
    ]);
    decryptDeviceToken.mockImplementation((ct: string) => Promise.resolve(`tok-${ct}`));

    const targets = await resolvePushTargets(DB, ENC, PARIWAR, 'member', MEMBER);
    expect(targets).toEqual([
      {
        channel: 'push',
        address: 'tok-enc:a',
        platform: 'android',
        principalType: 'member',
        principalId: MEMBER,
      },
      {
        channel: 'push',
        address: 'tok-enc:b',
        platform: 'ios',
        principalType: 'member',
        principalId: MEMBER,
      },
    ]);
  });

  it('a single row whose decrypt throws is DROPPED — the other devices still resolve', async () => {
    listActiveTokens.mockResolvedValue([
      { tokenCiphertext: 'enc:bad', platform: 'android' },
      { tokenCiphertext: 'enc:good', platform: 'android' },
    ]);
    decryptDeviceToken.mockImplementation((ct: string) =>
      ct === 'enc:bad' ? Promise.reject(new Error('context mismatch')) : Promise.resolve('tok-good'),
    );

    const targets = await resolvePushTargets(DB, ENC, PARIWAR, 'member', MEMBER);
    expect(targets).toHaveLength(1);
    expect(targets[0]!.address).toBe('tok-good');
  });

  it('no active tokens → an empty target list (never a throw)', async () => {
    listActiveTokens.mockResolvedValue([]);
    expect(await resolvePushTargets(DB, ENC, PARIWAR, 'member', MEMBER)).toEqual([]);
  });
});
