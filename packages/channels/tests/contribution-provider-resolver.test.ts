// The contribution-loop registry assembly — AI-8-3 (Task 3). DB-FREE unit tests of
// `createContributionProviderResolver`: the four-channel composition, the §9a-i FIVE-STATE outage/fixture
// matrix held ACROSS the assembled registry, and the D3 process-lifetime memoization.
//
// The load-bearing distinction (§9a-i): "not configured" (absent row / disabled / blank NAME / no template /
// gateway unconfigured) ⇒ the log-only FIXTURE per channel; a DB outage (the scoped read throws) or a
// Secret-Manager outage (a secret/config resolver throws) ⇒ the resolver REJECTS (the pg-boss job fails →
// retries), never a silent fixture fallback. Collapsing these two is how honest delivery reporting rots.

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

const { createContributionProviderResolver } = await import('../src/composition/provider-composition.js');
const { ids } = await import('@twt/domain');
import type { Db } from '@twt/domain';
import type { ContributionProviderResolverDeps } from '../src/composition/provider-composition.js';
import type { FirebaseAppCache } from '../src/providers/firebase-app.js';
import type { SmsAppClient } from '../src/providers/sms-app.js';
import type { TelegramAppCache } from '../src/providers/telegram-app.js';
import type { WhatsappAppCache } from '../src/providers/whatsapp-app.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
// An SMS-eligible category with an approved WA template mocked in — used for the "all real" path.
const CATEGORY = 'deadline_reminder';

const FULL_WA_CONFIG = {
  pariwarId: ids.pariwarId(PARIWAR),
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

const FULL_TG_CONFIG = {
  pariwarId: ids.pariwarId(PARIWAR),
  enabled: true,
  botUsername: 'twt_bot',
  botTokenSecretName: 'twt-tg-token',
  webhookSecretTokenSecretName: 'twt-tg-webhook',
  updatedByActor: null,
};

const firebaseAppCache: FirebaseAppCache = {
  messagingFor: () => ({ send: () => Promise.resolve('fcm-msg') }),
  close: () => Promise.resolve(),
};
const whatsappAppCache: WhatsappAppCache = {
  messagingFor: () => ({ send: () => Promise.resolve('wamid') }),
};
const telegramAppCache: TelegramAppCache = {
  messagingFor: () => ({ send: () => Promise.resolve('42') }),
};
const configuredSms: SmsAppClient = {
  isConfigured: () => true,
  messaging: () => ({ send: () => Promise.resolve('gw') }),
};
const unconfiguredSms: SmsAppClient = { isConfigured: () => false, messaging: () => { throw new Error('nope'); } };

/** A fake per-Pariwar scope — just calls the reader with a throwaway Db (the domain reads are mocked). */
const okScope = <T>(_pariwarId: string, fn: (db: Db) => Promise<T>): Promise<T> => fn({} as Db);

/** Build resolver deps with sane fully-provisioned defaults; override per test. */
function deps(over: Partial<ContributionProviderResolverDeps> = {}): ContributionProviderResolverDeps {
  return {
    withScope: okScope,
    firebaseAppCache,
    whatsappAppCache,
    telegramAppCache,
    smsAppClient: configuredSms,
    resolveSecret: vi.fn(async (name: string) => (name === 'fb-sa' ? '{"project_id":"p"}' : `val:${name}`)),
    resolveConfig: vi.fn(async () => 'DLT_REAL_ID'),
    firebaseServiceAccountSecretName: 'fb-sa',
    ...over,
  };
}

describe('createContributionProviderResolver — the four-channel assembly (AI-8-3 Task 3)', () => {
  beforeEach(() => {
    getWaConfig.mockReset();
    getTelegramConfig.mockReset();
    resolveApprovedTemplate.mockReset();
  });

  it('fully provisioned → all four channels REAL', async () => {
    getWaConfig.mockResolvedValue(FULL_WA_CONFIG);
    resolveApprovedTemplate.mockResolvedValue({ templateName: 'ann_v1', languageCode: 'en' });
    getTelegramConfig.mockResolvedValue(FULL_TG_CONFIG);
    const d = deps();

    const registry = await createContributionProviderResolver(d)({ pariwarId: PARIWAR, category: CATEGORY });

    expect(registry.push.every((p) => p.scope === 'per-pariwar')).toBe(true); // real fcm+apns
    expect(registry.whatsapp[0]!.scope).toBe('per-pariwar'); // real Meta
    expect(registry.telegram[0]!.scope).toBe('per-pariwar'); // real bot
    // SMS real vs fixture share scope/id — the tell is that resolveConfig was consulted (real path).
    expect(d.resolveConfig).toHaveBeenCalledWith('sms.dlt.template_id.deadline_reminder');
    expect(registry.sms[0]!.id).toBe('sms-dlt');
  });

  it('partial provisioning → a MIXED registry (real push + fixture WA)', async () => {
    getWaConfig.mockResolvedValue(null); // WA not provisioned
    resolveApprovedTemplate.mockResolvedValue(null);
    getTelegramConfig.mockResolvedValue(null); // Telegram not provisioned
    const d = deps({ smsAppClient: unconfiguredSms }); // SMS not provisioned

    const registry = await createContributionProviderResolver(d)({ pariwarId: PARIWAR, category: CATEGORY });

    expect(registry.push.every((p) => p.scope === 'per-pariwar')).toBe(true); // real push (SA present)
    expect(registry.whatsapp[0]!.scope).toBe('global'); // fixture WA
    expect(registry.telegram[0]!.scope).toBe('global'); // fixture Telegram
    expect(d.resolveConfig).not.toHaveBeenCalled(); // unconfigured gateway ⇒ never consulted
  });

  // ── §9a-i — the FIVE-STATE outage/fixture matrix ─────────────────────────────────────────────────────────

  describe('state 1-3 — "not configured" ⇒ the log-only FIXTURE (opt-in-real)', () => {
    it('config ABSENT (no WA/TG row, gateway unconfigured, no SA) → every channel fixture', async () => {
      getWaConfig.mockResolvedValue(null);
      getTelegramConfig.mockResolvedValue(null);
      const d = deps({ smsAppClient: unconfiguredSms, firebaseServiceAccountSecretName: undefined });

      const registry = await createContributionProviderResolver(d)({ pariwarId: PARIWAR, category: CATEGORY });

      expect(registry.push.every((p) => p.scope === 'global')).toBe(true); // fixture push
      expect(registry.whatsapp[0]!.scope).toBe('global');
      expect(registry.telegram[0]!.scope).toBe('global');
      // No SA name ⇒ the SA secret is never even resolved.
      expect(d.resolveSecret).not.toHaveBeenCalledWith('fb-sa');
    });

    it('config DISABLED (enabled=false) → WA + Telegram fixture', async () => {
      getWaConfig.mockResolvedValue({ ...FULL_WA_CONFIG, enabled: false });
      resolveApprovedTemplate.mockResolvedValue({ templateName: 'ann_v1', languageCode: 'en' });
      getTelegramConfig.mockResolvedValue({ ...FULL_TG_CONFIG, enabled: false });

      const registry = await createContributionProviderResolver(deps())({ pariwarId: PARIWAR, category: CATEGORY });
      expect(registry.whatsapp[0]!.scope).toBe('global');
      expect(registry.telegram[0]!.scope).toBe('global');
    });

    it('secret MISSING BY DESIGN (blank credential NAME) → WA fixture, token never resolved', async () => {
      getWaConfig.mockResolvedValue({ ...FULL_WA_CONFIG, accessTokenSecretName: '   ' });
      resolveApprovedTemplate.mockResolvedValue({ templateName: 'ann_v1', languageCode: 'en' });
      getTelegramConfig.mockResolvedValue(null);
      const d = deps();

      const registry = await createContributionProviderResolver(d)({ pariwarId: PARIWAR, category: CATEGORY });
      expect(registry.whatsapp[0]!.scope).toBe('global');
      expect(d.resolveSecret).not.toHaveBeenCalledWith('twt-wa-token');
    });
  });

  describe('state 4-5 — infra OUTAGE ⇒ the resolver REJECTS (fail job → retry), never a fixture', () => {
    it('Secret-Manager outage (resolveSecret throws) → REJECTS, no fixture fallback', async () => {
      getWaConfig.mockResolvedValue(FULL_WA_CONFIG);
      resolveApprovedTemplate.mockResolvedValue({ templateName: 'ann_v1', languageCode: 'en' });
      getTelegramConfig.mockResolvedValue(FULL_TG_CONFIG);
      const d = deps({ resolveSecret: vi.fn().mockRejectedValue(new Error('secret-manager outage')) });

      await expect(
        createContributionProviderResolver(d)({ pariwarId: PARIWAR, category: CATEGORY }),
      ).rejects.toThrow(/outage/);
    });

    it('Secret-Manager outage in resolveConfig (SMS DLT id) → REJECTS', async () => {
      getWaConfig.mockResolvedValue(null);
      getTelegramConfig.mockResolvedValue(null);
      const d = deps({
        firebaseServiceAccountSecretName: undefined, // push fixture so the SMS path is reached
        resolveConfig: vi.fn().mockRejectedValue(new Error('config-store outage')),
      });

      await expect(
        createContributionProviderResolver(d)({ pariwarId: PARIWAR, category: CATEGORY }),
      ).rejects.toThrow(/outage/);
    });

    it('Database outage (the scoped read throws) → REJECTS, no fixture fallback', async () => {
      const d = deps({
        firebaseServiceAccountSecretName: undefined, // isolate the failure to the scoped WA/TG read
        smsAppClient: unconfiguredSms,
        withScope: () => Promise.reject(new Error('db connection outage')),
      });

      await expect(
        createContributionProviderResolver(d)({ pariwarId: PARIWAR, category: CATEGORY }),
      ).rejects.toThrow(/outage/);
    });

    it('a rejected outage is NOT memoized — a later call retries cleanly', async () => {
      getWaConfig.mockResolvedValue(FULL_WA_CONFIG);
      resolveApprovedTemplate.mockResolvedValue({ templateName: 'ann_v1', languageCode: 'en' });
      getTelegramConfig.mockResolvedValue(FULL_TG_CONFIG);
      // First call: the scoped read throws; second call: it succeeds.
      let scopeCalls = 0;
      const withScope = <T>(_p: string, fn: (db: Db) => Promise<T>): Promise<T> => {
        scopeCalls += 1;
        if (scopeCalls === 1) return Promise.reject(new Error('transient db outage')) as Promise<T>;
        return fn({} as Db);
      };
      const resolver = createContributionProviderResolver(deps({ withScope }));

      await expect(resolver({ pariwarId: PARIWAR, category: CATEGORY })).rejects.toThrow(/outage/);
      const registry = await resolver({ pariwarId: PARIWAR, category: CATEGORY });
      expect(registry.whatsapp[0]!.scope).toBe('per-pariwar'); // recovered, not a cached rejection
      expect(scopeCalls).toBe(2);
    });
  });

  // ── D3 — process-lifetime memoization per (pariwarId, category) ────────────────────────────────────────────

  it('memoizes per (pariwarId, category): a second call on the SAME resolver re-reads NOTHING', async () => {
    getWaConfig.mockResolvedValue(FULL_WA_CONFIG);
    resolveApprovedTemplate.mockResolvedValue({ templateName: 'ann_v1', languageCode: 'en' });
    getTelegramConfig.mockResolvedValue(FULL_TG_CONFIG);
    let scopeCalls = 0;
    const withScope = <T>(_p: string, fn: (db: Db) => Promise<T>): Promise<T> => {
      scopeCalls += 1;
      return fn({} as Db);
    };
    const d = deps({ withScope });
    const resolver = createContributionProviderResolver(d);

    const first = await resolver({ pariwarId: PARIWAR, category: CATEGORY });
    // A SECOND call simulating a later cycle on the same long-lived worker — must hit the memo, not the DB.
    const second = await resolver({ pariwarId: PARIWAR, category: CATEGORY });

    expect(second).toBe(first); // the very same frozen registry object
    expect(scopeCalls).toBe(1); // config read once, not once per member/cycle
    expect(getWaConfig).toHaveBeenCalledTimes(1);
    expect(d.resolveSecret).toHaveBeenCalledTimes(3); // fb-sa + wa token + tg token, ONCE total
    expect(d.resolveConfig).toHaveBeenCalledTimes(1);
  });

  it('a DIFFERENT (pariwarId, category) is a distinct memo entry (re-reads)', async () => {
    getWaConfig.mockResolvedValue(FULL_WA_CONFIG);
    resolveApprovedTemplate.mockResolvedValue({ templateName: 'ann_v1', languageCode: 'en' });
    getTelegramConfig.mockResolvedValue(FULL_TG_CONFIG);
    let scopeCalls = 0;
    const withScope = <T>(_p: string, fn: (db: Db) => Promise<T>): Promise<T> => {
      scopeCalls += 1;
      return fn({} as Db);
    };
    const resolver = createContributionProviderResolver(deps({ withScope }));

    await resolver({ pariwarId: PARIWAR, category: CATEGORY });
    await resolver({ pariwarId: PARIWAR, category: 'contribution_confirmed' });
    expect(scopeCalls).toBe(2);
  });
});
