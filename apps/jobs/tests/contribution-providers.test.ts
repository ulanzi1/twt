// The contribution-loop provider registry boot-time wiring — AI-8-3 (Task 4). DB-free unit tests of
// `apps/jobs/src/scheduler/contribution-providers.ts`: the actual production glue that turns env vars into
// the `resolveProviders` seam, previously shipped with ZERO test coverage (review finding, AI-8-3).
//
// Runs with NO `DATABASE_URL` and NO network — `@twt/domain`'s `resolveSecretValue`/`withPariwarScope` and
// `@twt/channels`'s client-cache constructors + `createContributionProviderResolver` are all mocked, so this
// exercises ONLY this module's own branching: the env-gated opt-in-real posture, the `resolveSmsDltConfig`
// not-provisioned/outage classifier, and the `withGlobalSecretCache` process-lifetime SA cache.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveSecretValue = vi.fn();
const withPariwarScope = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return { ...actual, resolveSecretValue, withPariwarScope };
});

const createFirebaseAppCache = vi.fn();
const createWhatsappAppCache = vi.fn();
const createTelegramAppCache = vi.fn();
const createSmsAppClient = vi.fn();
const createContributionProviderResolver = vi.fn();

vi.mock('@twt/channels', async (importActual) => {
  const actual = await importActual<typeof import('@twt/channels')>();
  return {
    ...actual,
    createFirebaseAppCache,
    createWhatsappAppCache,
    createTelegramAppCache,
    createSmsAppClient,
    createContributionProviderResolver,
  };
});

const { buildContributionProviderResolver, resolveSmsDltConfig, withGlobalSecretCache } = await import(
  '../src/scheduler/contribution-providers.js'
);

const ENV_KEYS = [
  'SMS_GATEWAY_API_URL',
  'SMS_GATEWAY_API_KEY_SECRET_NAME',
  'SMS_GATEWAY_API_KEY_ENV_FALLBACK',
  'SMS_GATEWAY_SENDER_ID_SECRET_NAME',
  'SMS_GATEWAY_SENDER_ID_ENV_FALLBACK',
  'PUSH_FIREBASE_SA_SECRET_NAME',
] as const;

function clearEnv(): void {
  for (const key of ENV_KEYS) delete process.env[key];
}

describe('resolveSmsDltConfig — the not-provisioned vs outage classifier (review finding, AI-8-3)', () => {
  beforeEach(() => {
    resolveSecretValue.mockReset();
  });

  it('resolves the value on success', async () => {
    resolveSecretValue.mockResolvedValueOnce('DLT123');
    await expect(resolveSmsDltConfig('sms.dlt.template_id.deadline_reminder')).resolves.toBe('DLT123');
  });

  it('a Secret-Manager NOT_FOUND (gRPC code 5) ⇒ null (not provisioned, not an outage)', async () => {
    resolveSecretValue.mockRejectedValueOnce(Object.assign(new Error('Secret not found'), { code: 5 }));
    await expect(resolveSmsDltConfig('sms.dlt.template_id.x')).resolves.toBeNull();
  });

  it('the local-dev "no Secret Manager context and no local fallback set" throw ⇒ null (not provisioned)', async () => {
    resolveSecretValue.mockRejectedValueOnce(
      new Error(
        "[secrets] Secret 'sms.dlt.template_id.x' is unavailable: no Secret Manager context " +
          '(set NODE_ENV=production, GOOGLE_APPLICATION_CREDENTIALS, or DRIZZLE_FORCE_SECRET_MANAGER=1) ' +
          'and no local fallback (SMS_DLT_TEMPLATE_ID_X) set.',
      ),
    );
    await expect(resolveSmsDltConfig('sms.dlt.template_id.x')).resolves.toBeNull();
  });

  it('a genuine outage (gRPC UNAVAILABLE, code 14) PROPAGATES — never a silent null', async () => {
    resolveSecretValue.mockRejectedValueOnce(Object.assign(new Error('Secret Manager unavailable'), { code: 14 }));
    await expect(resolveSmsDltConfig('sms.dlt.template_id.x')).rejects.toThrow('unavailable');
  });

  it('an error with neither a matching code nor a matching message PROPAGATES', async () => {
    resolveSecretValue.mockRejectedValueOnce(new Error('completely unexpected failure'));
    await expect(resolveSmsDltConfig('sms.dlt.template_id.x')).rejects.toThrow('completely unexpected failure');
  });
});

describe('withGlobalSecretCache — process-lifetime cache for the ONE global name only (review finding, AI-8-3)', () => {
  it('caches the resolved value across calls for the global secret name', async () => {
    const resolve = vi.fn().mockResolvedValue('sa-json');
    const cached = withGlobalSecretCache(resolve, 'fb-sa');

    await cached('fb-sa');
    await cached('fb-sa');
    await cached('fb-sa');

    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('passes through UNCHANGED for any name other than the global secret name (re-resolves every call)', async () => {
    const resolve = vi.fn().mockResolvedValue('per-pariwar-token');
    const cached = withGlobalSecretCache(resolve, 'fb-sa');

    await cached('wa-token-pariwar-1');
    await cached('wa-token-pariwar-2');
    await cached('wa-token-pariwar-1');

    expect(resolve).toHaveBeenCalledTimes(3);
  });

  it('passes through every call when no global secret name is configured', async () => {
    const resolve = vi.fn().mockResolvedValue('v');
    const cached = withGlobalSecretCache(resolve, undefined);

    await cached('anything');
    await cached('anything');

    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('does NOT cache a rejection — a transient outage on the global secret retries cleanly', async () => {
    const resolve = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient outage'))
      .mockResolvedValueOnce('sa-json');
    const cached = withGlobalSecretCache(resolve, 'fb-sa');

    await expect(cached('fb-sa')).rejects.toThrow('transient outage');
    await expect(cached('fb-sa')).resolves.toBe('sa-json');
    expect(resolve).toHaveBeenCalledTimes(2);
  });
});

describe('buildContributionProviderResolver — the boot-time wiring (review finding, AI-8-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearEnv();
    createFirebaseAppCache.mockReturnValue({
      messagingFor: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    });
    createWhatsappAppCache.mockReturnValue({ messagingFor: vi.fn() });
    createTelegramAppCache.mockReturnValue({ messagingFor: vi.fn() });
    createSmsAppClient.mockImplementation((config: { apiUrl: string; apiKey: string; senderId: string }) => ({
      isConfigured: () => Boolean(config.apiUrl.trim() && config.apiKey.trim() && config.senderId.trim()),
      messaging: vi.fn(),
    }));
    createContributionProviderResolver.mockReturnValue(vi.fn());
  });

  const pool = {} as never;

  it('boots with ZERO channel config: SMS client unconfigured, no firebaseServiceAccountSecretName passed', async () => {
    await buildContributionProviderResolver({ pool });

    expect(createSmsAppClient).toHaveBeenCalledWith({ apiUrl: '', apiKey: '', senderId: '' });
    const depsPassed = createContributionProviderResolver.mock.calls[0]![0] as {
      firebaseServiceAccountSecretName?: string;
    };
    expect(depsPassed.firebaseServiceAccountSecretName).toBeUndefined();
    expect(resolveSecretValue).not.toHaveBeenCalled();
  });

  it('passes the Firebase SA secret name through when PUSH_FIREBASE_SA_SECRET_NAME is set', async () => {
    process.env['PUSH_FIREBASE_SA_SECRET_NAME'] = 'fb-sa-name';

    await buildContributionProviderResolver({ pool });

    const depsPassed = createContributionProviderResolver.mock.calls[0]![0] as {
      firebaseServiceAccountSecretName?: string;
    };
    expect(depsPassed.firebaseServiceAccountSecretName).toBe('fb-sa-name');
  });

  it('resolves the SMS gateway secrets ONCE at boot when the NAME env vars are set', async () => {
    process.env['SMS_GATEWAY_API_URL'] = 'https://gw.example';
    process.env['SMS_GATEWAY_API_KEY_SECRET_NAME'] = 'sms-api-key';
    process.env['SMS_GATEWAY_SENDER_ID_SECRET_NAME'] = 'sms-sender-id';
    resolveSecretValue.mockImplementation(async (name: string) => `resolved:${name}`);

    await buildContributionProviderResolver({ pool });

    expect(createSmsAppClient).toHaveBeenCalledWith({
      apiUrl: 'https://gw.example',
      apiKey: 'resolved:sms-api-key',
      senderId: 'resolved:sms-sender-id',
    });
  });

  it('boot FAILS FAST when an SMS secret NAME is set but cannot resolve — never a silent half-configured client', async () => {
    process.env['SMS_GATEWAY_API_URL'] = 'https://gw.example';
    process.env['SMS_GATEWAY_API_KEY_SECRET_NAME'] = 'sms-api-key';
    resolveSecretValue.mockRejectedValueOnce(new Error('secret manager outage'));

    await expect(buildContributionProviderResolver({ pool })).rejects.toThrow('secret manager outage');
  });

  it('withScope delegates to withPariwarScope over the given pool', async () => {
    const scopedPool = { marker: 'pool' } as never;
    withPariwarScope.mockResolvedValue('scoped-result');

    await buildContributionProviderResolver({ pool: scopedPool });

    const depsPassed = createContributionProviderResolver.mock.calls[0]![0] as {
      withScope: <T>(pariwarId: string, fn: (db: unknown) => Promise<T>) => Promise<T>;
    };
    const fn = vi.fn();
    await depsPassed.withScope('pariwar-1', fn);
    expect(withPariwarScope).toHaveBeenCalledWith(scopedPool, 'pariwar-1', fn);
  });

  it('teardown closes the Firebase App cache exactly once', async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    createFirebaseAppCache.mockReturnValue({ messagingFor: vi.fn(), close });

    const wiring = await buildContributionProviderResolver({ pool });
    await wiring.teardown();

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('resolveConfig is wired to resolveSmsDltConfig, NOT the fail-loud resolveSecret (review finding, AI-8-3)', async () => {
    await buildContributionProviderResolver({ pool });

    const depsPassed = createContributionProviderResolver.mock.calls[0]![0] as {
      resolveConfig: unknown;
      resolveSecret: unknown;
    };
    expect(depsPassed.resolveConfig).toBe(resolveSmsDltConfig);
    expect(depsPassed.resolveConfig).not.toBe(depsPassed.resolveSecret);
  });

  it('resolveSecret resolves the global Firebase SA name from a process-lifetime cache (review finding, AI-8-3)', async () => {
    process.env['PUSH_FIREBASE_SA_SECRET_NAME'] = 'fb-sa-name';
    resolveSecretValue.mockImplementation(async (name: string) => `resolved:${name}`);

    await buildContributionProviderResolver({ pool });

    const depsPassed = createContributionProviderResolver.mock.calls[0]![0] as {
      resolveSecret: (name: string) => Promise<string>;
    };
    await depsPassed.resolveSecret('fb-sa-name');
    await depsPassed.resolveSecret('fb-sa-name');
    await depsPassed.resolveSecret('fb-sa-name');

    // resolveSecretValue is called once for the cached global name (a second, separate name still passes through).
    const fbSaCalls = resolveSecretValue.mock.calls.filter((c) => c[0] === 'fb-sa-name');
    expect(fbSaCalls).toHaveLength(1);
  });
});
