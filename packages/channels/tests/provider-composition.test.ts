// Per-channel provider composition — AI-8-3 (Tasks 1 + 2). DB-FREE unit tests: the @twt/domain config reads
// (getWaConfig / getTelegramConfig / resolveApprovedTemplate) are mocked; the app caches + secret resolvers are
// fakes. This is where the RELOCATED logic (from apps/api Stories 5.3/5.5/5.6) is now tested — the apps/api
// composition tests still run against the re-export, but the canonical selection assertions live here.
//
// Asserts, per channel, the honesty discipline: a fully-provisioned (Pariwar, category) → the REAL provider
// (token/credential resolved LAST); any explicit not-provisioned gate → the log-only FIXTURE (secret never
// resolved); and an infra OUTAGE in the secret/config resolver PROPAGATES (never silently degrades to fixture).

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getWaConfig = vi.fn();
const getTelegramConfig = vi.fn();
const resolveApprovedTemplate = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    channelConfig: { ...actual.channelConfig, getWaConfig, getTelegramConfig, resolveApprovedTemplate },
  };
});

const {
  resolveWhatsappProvider,
  resolveTelegramProvider,
  resolveTelegramProviderDeps,
  resolveSmsProvider,
  resolveSmsProviderDeps,
  resolvePushProviders,
} = await import('../src/composition/provider-composition.js');
const { ids } = await import('@twt/domain');
import type { TelegramAppCache, WhatsappAppCache, WhatsappTemplateMessage } from '../src/index.js';
import type { FirebaseAppCache, PushMessagingHandle } from '../src/providers/firebase-app.js';

const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const DB = {} as never; // never touched — the domain reads are mocked

// ── WhatsApp ─────────────────────────────────────────────────────────────────────────────────────────────

function fakeWaCache(): { cache: WhatsappAppCache; built: unknown[]; sent: WhatsappTemplateMessage[] } {
  const built: unknown[] = [];
  const sent: WhatsappTemplateMessage[] = [];
  return {
    built,
    sent,
    cache: {
      messagingFor(_pariwarId, config) {
        built.push(config);
        return { send: (m) => { sent.push(m); return Promise.resolve('wamid.X'); } };
      },
    },
  };
}

const FULL_WA_CONFIG = {
  pariwarId: PARIWAR,
  enabled: true,
  displayPhoneNumber: '+91 98765 43210',
  phoneNumberId: '1234567890',
  wabaId: 'waba',
  accessTokenSecretName: 'twt-wa-token',
  graphApiVersion: 'v21.0',
  appSecretSecretName: 'twt-wa-app-secret',
  webhookVerifyTokenSecretName: 'twt-wa-verify-token',
  updatedByActor: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('resolveWhatsappProvider — real-vs-fixture composition (relocated from apps/api Story 5.3)', () => {
  beforeEach(() => {
    getWaConfig.mockReset();
    resolveApprovedTemplate.mockReset();
  });

  it('fully provisioned → the REAL per-pariwar provider (token resolved, client built with the template)', async () => {
    getWaConfig.mockResolvedValue(FULL_WA_CONFIG);
    resolveApprovedTemplate.mockResolvedValue({ templateName: 'ann_v1', languageCode: 'en' });
    const { cache, built } = fakeWaCache();
    const resolveSecret = vi.fn().mockResolvedValue('resolved-token-value');

    const provider = await resolveWhatsappProvider({ db: DB, appCache: cache, resolveSecret }, PARIWAR, 'alert_published');

    expect(provider.scope).toBe('per-pariwar');
    expect(resolveSecret).toHaveBeenCalledWith('twt-wa-token');
    expect(built[0]).toEqual({ phoneNumberId: '1234567890', accessToken: 'resolved-token-value', graphApiVersion: 'v21.0' });
  });

  it.each([
    ['no config row', null, { templateName: 'ann_v1', languageCode: 'en' }],
    ['toggle off', { ...FULL_WA_CONFIG, enabled: false }, { templateName: 'ann_v1', languageCode: 'en' }],
    ['blank credential NAME', { ...FULL_WA_CONFIG, accessTokenSecretName: null }, { templateName: 'ann_v1', languageCode: 'en' }],
    ['no phone_number_id', { ...FULL_WA_CONFIG, phoneNumberId: null }, { templateName: 'ann_v1', languageCode: 'en' }],
    ['no approved template', FULL_WA_CONFIG, null],
  ])('%s → the log-only FIXTURE (scope global), token never resolved', async (_label, config, template) => {
    getWaConfig.mockResolvedValue(config);
    resolveApprovedTemplate.mockResolvedValue(template);
    const { cache, built } = fakeWaCache();
    const resolveSecret = vi.fn();

    const provider = await resolveWhatsappProvider({ db: DB, appCache: cache, resolveSecret }, PARIWAR, 'alert_published');

    expect(provider.scope).toBe('global'); // fixture
    expect(resolveSecret).not.toHaveBeenCalled();
    expect(built).toHaveLength(0);
  });

  it('a Secret-Manager OUTAGE in resolveSecret PROPAGATES — never silently degrades to the fixture', async () => {
    getWaConfig.mockResolvedValue(FULL_WA_CONFIG);
    resolveApprovedTemplate.mockResolvedValue({ templateName: 'ann_v1', languageCode: 'en' });
    const { cache } = fakeWaCache();
    const resolveSecret = vi.fn().mockRejectedValue(new Error('secret-manager outage'));
    await expect(
      resolveWhatsappProvider({ db: DB, appCache: cache, resolveSecret }, PARIWAR, 'alert_published'),
    ).rejects.toThrow(/outage/);
  });
});

// ── Telegram (authored NEW — no telegram-composition.test.ts existed to relocate; only telegram-target.test.ts,
//    a different function) ────────────────────────────────────────────────────────────────────────────────────

function fakeTelegramCache(): { cache: TelegramAppCache; built: unknown[] } {
  const built: unknown[] = [];
  return {
    built,
    cache: {
      messagingFor(_pariwarId, config) {
        built.push(config);
        return { send: () => Promise.resolve('42') };
      },
    },
  };
}

const FULL_TG_CONFIG = {
  pariwarId: PARIWAR,
  enabled: true,
  botUsername: 'twt_bot',
  botTokenSecretName: 'twt-tg-token',
  webhookSecretTokenSecretName: 'twt-tg-webhook',
  updatedByActor: null,
};

describe('resolveTelegramProvider — real-vs-fixture composition (NEW; Story 5.5 logic relocated)', () => {
  beforeEach(() => {
    getTelegramConfig.mockReset();
  });

  it('fully provisioned → the REAL per-pariwar provider (bot token resolved, client built)', async () => {
    getTelegramConfig.mockResolvedValue(FULL_TG_CONFIG);
    const { cache, built } = fakeTelegramCache();
    const resolveSecret = vi.fn().mockResolvedValue('resolved-bot-token');

    const deps = await resolveTelegramProviderDeps({ db: DB, appCache: cache, resolveSecret }, PARIWAR);
    expect(deps).not.toBeNull();
    expect(resolveSecret).toHaveBeenCalledWith('twt-tg-token');
    expect(built[0]).toEqual({ botToken: 'resolved-bot-token' });

    const provider = await resolveTelegramProvider({ db: DB, appCache: cache, resolveSecret }, PARIWAR);
    expect(provider.scope).toBe('per-pariwar');
  });

  it.each([
    ['no config row', null],
    ['toggle off', { ...FULL_TG_CONFIG, enabled: false }],
    ['blank bot-token NAME', { ...FULL_TG_CONFIG, botTokenSecretName: '   ' }],
  ])('%s → the log-only FIXTURE (scope global), token never resolved', async (_label, config) => {
    getTelegramConfig.mockResolvedValue(config);
    const { cache, built } = fakeTelegramCache();
    const resolveSecret = vi.fn();

    const provider = await resolveTelegramProvider({ db: DB, appCache: cache, resolveSecret }, PARIWAR);
    expect(provider.scope).toBe('global'); // fixture
    expect(resolveSecret).not.toHaveBeenCalled();
    expect(built).toHaveLength(0);
  });

  it('a Secret-Manager OUTAGE in resolveSecret PROPAGATES — never silently degrades to the fixture', async () => {
    getTelegramConfig.mockResolvedValue(FULL_TG_CONFIG);
    const { cache } = fakeTelegramCache();
    const resolveSecret = vi.fn().mockRejectedValue(new Error('secret-manager outage'));
    await expect(
      resolveTelegramProvider({ db: DB, appCache: cache, resolveSecret }, PARIWAR),
    ).rejects.toThrow(/outage/);
  });
});

// ── SMS (relocated from apps/api Story 5.6 provider-selection half) ─────────────────────────────────────────

const fakeSmsAppClient = { isConfigured: () => true, messaging: () => ({ send: () => Promise.resolve('gw-id') }) };

describe('resolveSmsProvider — real-vs-fixture selection (relocated from apps/api Story 5.6)', () => {
  it('SMS-eligible category + provisioned template id → the REAL sms-dlt provider deps', async () => {
    const resolveConfig = vi.fn().mockResolvedValue('DLT_REAL_ID');
    const deps = { appClient: fakeSmsAppClient, resolveConfig };

    const providerDeps = await resolveSmsProviderDeps(deps, 'claim_status_change');
    expect(providerDeps).not.toBeNull();
    expect(providerDeps!.dltTemplateId).toBe('DLT_REAL_ID');
    expect(resolveConfig).toHaveBeenCalledWith('sms.dlt.template_id.claim_status_change');

    const provider = await resolveSmsProvider(deps, 'claim_status_change');
    expect(provider.id).toBe('sms-dlt');
  });

  it('a NON-eligible category → null deps → the fixture (resolveConfig never consulted)', async () => {
    const resolveConfig = vi.fn();
    const deps = { appClient: fakeSmsAppClient, resolveConfig };
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
      const deps = { appClient: fakeSmsAppClient, resolveConfig: vi.fn().mockResolvedValue(value) };
      expect(await resolveSmsProviderDeps(deps, 'deadline_reminder')).toBeNull();
    }
  });

  it('a Secret-Manager OUTAGE in resolveConfig PROPAGATES — never silently degrades to the fixture', async () => {
    const resolveConfig = vi.fn().mockRejectedValue(new Error('secret-manager outage'));
    const deps = { appClient: fakeSmsAppClient, resolveConfig };
    await expect(resolveSmsProviderDeps(deps, 'deadline_reminder')).rejects.toThrow(/outage/);
  });

  it('global gateway credential NOT configured → the fixture (mirrors WA; not a throw)', async () => {
    const resolveConfig = vi.fn();
    const unconfigured = { isConfigured: () => false, messaging: vi.fn() };
    const deps = { appClient: unconfigured, resolveConfig };
    expect(await resolveSmsProviderDeps(deps, 'deadline_reminder')).toBeNull();
    expect(resolveConfig).not.toHaveBeenCalled();
    expect(unconfigured.messaging).not.toHaveBeenCalled();
  });
});

// ── Push (AI-8-3 Task 2 — the missing seam; D1 GLOBAL Firebase SA) ──────────────────────────────────────────

function fakePushCache(): { cache: FirebaseAppCache; built: Array<{ pariwarId: string; sa: string }> } {
  const built: Array<{ pariwarId: string; sa: string }> = [];
  const handle: PushMessagingHandle = { send: () => Promise.resolve('fcm-msg') };
  return {
    built,
    cache: {
      messagingFor(pariwarId, serviceAccountJson) {
        built.push({ pariwarId, sa: serviceAccountJson });
        return handle;
      },
      close: () => Promise.resolve(),
    },
  };
}

describe('resolvePushProviders — real-vs-fixture selection (AI-8-3 Task 2; the push trap §4)', () => {
  it('global SA secret resolves → the REAL fcm+apns providers (scope per-pariwar), messaging built once', async () => {
    const { cache, built } = fakePushCache();
    const resolveGlobalServiceAccount = vi.fn().mockResolvedValue('{"project_id":"p"}');

    const providers = await resolvePushProviders({ appCache: cache, resolveGlobalServiceAccount }, PARIWAR);

    expect(providers.map((p) => p.id).sort()).toEqual(['apns', 'fcm']);
    expect(providers.every((p) => p.scope === 'per-pariwar')).toBe(true);
    expect(built).toEqual([{ pariwarId: PARIWAR, sa: '{"project_id":"p"}' }]);
  });

  it.each([
    ['absent secret (null)', null],
    ['blank secret', '   '],
  ])('%s → the log-only FIXTURE push (scope global), cache never touched', async (_label, value) => {
    const { cache, built } = fakePushCache();
    const resolveGlobalServiceAccount = vi.fn().mockResolvedValue(value);

    const providers = await resolvePushProviders({ appCache: cache, resolveGlobalServiceAccount }, PARIWAR);

    expect(providers.map((p) => p.id).sort()).toEqual(['apns', 'fcm']);
    expect(providers.every((p) => p.scope === 'global')).toBe(true); // fixtures
    expect(built).toHaveLength(0);
  });

  it('a Secret-Manager OUTAGE in resolveGlobalServiceAccount PROPAGATES — never silently degrades to fixture', async () => {
    const { cache } = fakePushCache();
    const resolveGlobalServiceAccount = vi.fn().mockRejectedValue(new Error('secret-manager outage'));
    await expect(
      resolvePushProviders({ appCache: cache, resolveGlobalServiceAccount }, PARIWAR),
    ).rejects.toThrow(/outage/);
  });
});
