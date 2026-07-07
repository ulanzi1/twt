// SMS composition seam — DB-free unit test (Story 5.6, Task 6/7; AC1, AC2, AC4).
//
// Asserts:
//   · resolveSmsTarget resolves an `sms` SendTarget from the member's KYC mobile with NO opt-in gate (SMS is
//     transactional) — null only when the member has no mobile on file. The domain read + mobile decryption
//     are mocked.
//   · resolveSmsProvider selects the REAL provider only when the global gateway credential IS configured AND
//     the category is SMS-eligible AND the DLT template id is provisioned; else the fixture (mirrors WA's
//     own-config blank check exactly — "not configured" ⇒ fixture). An infra outage in resolveConfig
//     PROPAGATES (never silently degrades to the fixture) — that is the separate "configured but failing"
//     case.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMemberMobileCiphertext = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    waOptIn: { ...actual.waOptIn, getMemberMobileCiphertext },
  };
});

const decryptMobile = vi.fn();
vi.mock('../../src/modules/auth/shared/mobile-index.js', () => ({ decryptMobile }));

const { resolveSmsTarget, resolveSmsProvider, resolveSmsProviderDeps } = await import(
  '../../src/modules/channel-config/composition.js'
);
const { ids } = await import('@twt/domain');

const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const MEMBER = ids.memberId('22222222-2222-2222-2222-222222222222');
const TARGET_DEPS = { db: {} as never, encryption: {} as never };

/** A fake global SMS gateway client — its messaging handle is never actually driven in these tests. */
const fakeAppClient = { isConfigured: () => true, messaging: () => ({ send: () => Promise.resolve('gw-id') }) };

describe('resolveSmsTarget — no opt-in gate (AC4)', () => {
  beforeEach(() => {
    getMemberMobileCiphertext.mockReset();
    decryptMobile.mockReset();
  });

  it('resolves an sms SendTarget from the KYC mobile (no opt-in / no admin toggle consulted)', async () => {
    getMemberMobileCiphertext.mockResolvedValue('enc:v1:xyz');
    decryptMobile.mockResolvedValue('+919876543210');

    const target = await resolveSmsTarget(TARGET_DEPS, PARIWAR, MEMBER);
    expect(target).toEqual({ channel: 'sms', address: '+919876543210' });
    expect(getMemberMobileCiphertext).toHaveBeenCalledWith(TARGET_DEPS.db, { pariwarId: PARIWAR, memberId: MEMBER });
  });

  it('member with no mobile on file → null (no decryption attempted)', async () => {
    getMemberMobileCiphertext.mockResolvedValue(null);
    expect(await resolveSmsTarget(TARGET_DEPS, PARIWAR, MEMBER)).toBeNull();
    expect(decryptMobile).not.toHaveBeenCalled();
  });
});

describe('resolveSmsProvider — real-vs-fixture selection (AC1, AC2)', () => {
  it('SMS-eligible category + provisioned template id → the REAL sms-dlt provider', async () => {
    const resolveConfig = vi.fn().mockResolvedValue('DLT_REAL_ID');
    const deps = { appClient: fakeAppClient, resolveConfig };

    const providerDeps = await resolveSmsProviderDeps(deps, 'claim_status_change');
    expect(providerDeps).not.toBeNull();
    expect(providerDeps!.dltTemplateId).toBe('DLT_REAL_ID');
    expect(resolveConfig).toHaveBeenCalledWith('sms.dlt.template_id.claim_status_change');

    const provider = await resolveSmsProvider(deps, 'claim_status_change');
    expect(provider.id).toBe('sms-dlt');
    expect(provider.scope).toBe('global');
  });

  it('a NON-eligible category (broadcast) → null deps → the fixture (resolveConfig never consulted)', async () => {
    const resolveConfig = vi.fn();
    const deps = { appClient: fakeAppClient, resolveConfig };

    expect(await resolveSmsProviderDeps(deps, 'alert_published')).toBeNull();
    expect(resolveConfig).not.toHaveBeenCalled();

    const provider = await resolveSmsProvider(deps, 'alert_published');
    const result = await provider.send({ channel: 'sms', title: null, body: 'x', deepLink: null }, {
      channel: 'sms',
      address: '+910000000000',
    });
    expect(result.providerMessageId).toBe('fixture-sms');
  });

  it('eligible category but template id NOT provisioned (null/blank) → the fixture', async () => {
    for (const value of [null, '', '   ']) {
      const deps = { appClient: fakeAppClient, resolveConfig: vi.fn().mockResolvedValue(value) };
      expect(await resolveSmsProviderDeps(deps, 'helpdesk_reply')).toBeNull();
    }
  });

  it('an infra outage in resolveConfig PROPAGATES — never silently degrades to the fixture', async () => {
    const resolveConfig = vi.fn().mockRejectedValue(new Error('secret-manager outage'));
    const deps = { appClient: fakeAppClient, resolveConfig };
    await expect(resolveSmsProviderDeps(deps, 'deadline_reminder')).rejects.toThrow(/outage/);
    await expect(resolveSmsProvider(deps, 'deadline_reminder')).rejects.toThrow(/outage/);
  });

  it('global gateway credential NOT configured → the fixture (mirrors WA\'s own-config blank check; not a throw)', async () => {
    const resolveConfig = vi.fn();
    const messaging = vi.fn();
    const unconfiguredAppClient = { isConfigured: () => false, messaging };
    const deps = { appClient: unconfiguredAppClient, resolveConfig };

    expect(await resolveSmsProviderDeps(deps, 'deadline_reminder')).toBeNull();
    expect(resolveConfig).not.toHaveBeenCalled();
    expect(messaging).not.toHaveBeenCalled();

    const provider = await resolveSmsProvider(deps, 'deadline_reminder');
    const result = await provider.send({ channel: 'sms', title: null, body: 'x', deepLink: null }, {
      channel: 'sms',
      address: '+910000000000',
    });
    expect(result.providerMessageId).toBe('fixture-sms');
  });
});
