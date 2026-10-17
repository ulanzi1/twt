// Member step-up OTP delivery wiring — Story 5.9 (Task 5); MSG91 + the boot pre-flight by Story 6.37 (AC8, AC11; MG4,
// MG5, MG10, MG17). DB-FREE unit test of the env-gated builder:
//   · dev/CI  ⇒ the reveal/log stub (no credential required; the flow completes without SMS).
//   · prod    ⇒ the real MSG91 adapter, but FAIL STARTUP when the authkey / an OTP template id resolves blank or is ⛔
//               MSG91's 24 hex, or when the boot pre-flight proves the SEND key / template refused (MG17 (a)); every
//               other pre-flight non-pass STARTS with an error log; at runtime the re-check is advisory.
// ⭐ Every MSG91 call goes to an injected ROUTING fake `fetch` (I7) — ⛔ a network call; a global-fetch RECORDER proves it.

import { OTP_DLT_TEMPLATE_REGISTRY, toGatewayTemplate, type SmsFetchLike, type SmsFetchResponse } from '@twt/channels';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildMemberStepUpDelivery } from '../../src/deps.js';
import type { ApiConfig } from '../../src/config.js';
import type { EncryptionDeps } from '../../src/context.js';

const enc = {} as EncryptionDeps;
const db = {} as never;

/** One distinct MSG91 id per config key — the NAME → value proof (T14). */
const IDS: Readonly<Record<string, string>> = {
  'sms.dlt.template_id.otp_login': '64b0c0ffee0123456789a015',
  'sms.dlt.template_id.otp_step_up': '64b0c0ffee0123456789a016',
};
const ids = async (key: string): Promise<string> => IDS[key] ?? '';

function cfg(over: Partial<ApiConfig['sms']> & { nodeEnv?: string } = {}): ApiConfig {
  const { nodeEnv = 'production', ...sms } = over;
  return {
    nodeEnv,
    sms: {
      apiOrigin: 'https://control.msg91.com',
      apiKeySecretName: 'sms-key',
      apiKeyEnvFallback: 'SMS_GATEWAY_API_KEY',
      preflightKeyEnvFallback: 'SMS_GATEWAY_PREFLIGHT_KEY',
      ...sms,
    },
  } as ApiConfig;
}

/** Set env vars for the duration of `fn`, restoring whatever was there before (never a bare delete). */
async function withEnv(vars: Record<string, string>, fn: () => Promise<void>): Promise<void> {
  const prior: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) prior[key] = process.env[key];
  Object.assign(process.env, vars);
  try {
    await fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (prior[key] === undefined) delete process.env[key];
      else process.env[key] = prior[key];
    }
  }
}

const respond = (status: number, body: unknown): SmsFetchResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
});

/** A MSG91 template version whose text is the registry's gateway form (a PASS) — overridable. */
function versionFor(templateId: string, over: Record<string, unknown> = {}) {
  const template = templateId === IDS['sms.dlt.template_id.otp_login'] ? OTP_DLT_TEMPLATE_REGISTRY.login : OTP_DLT_TEMPLATE_REGISTRY.step_up;
  return {
    template_data: toGatewayTemplate(template.contentTemplate, template.slots),
    DLT_ID: '1107161234567890123',
    sender_id: 'TWTOTP',
    status: '1',
    active_status: '1',
    sms_type: 'NORMAL',
    dlt_verified: '10',
    ...over,
  };
}

/**
 * A routing fake for MSG91: the template read answers `templates(id)` (a PASS by default); a Flow send answers success.
 * Counts every call by path.
 */
function msg91(templates: (templateId: string) => Promise<SmsFetchResponse> = (id) => Promise.resolve(respond(200, { status: 'success', data: [versionFor(id)] }))) {
  const calls = { read: 0, flow: 0, bodies: [] as unknown[] };
  const fetchImpl = vi.fn<SmsFetchLike>((url, init) => {
    const body = JSON.parse(init.body) as { template_id: string };
    if (url.endsWith('/api/v5/sms/getTemplateVersions')) {
      calls.read += 1;
      return templates(body.template_id);
    }
    calls.flow += 1;
    calls.bodies.push(body);
    return Promise.resolve(respond(200, { type: 'success', message: '5e1e93cad6fc054d8e759a5b' }));
  });
  return { fetchImpl, calls };
}

const lines = () => {
  const error: string[] = [];
  const info: string[] = [];
  return { error, info, log: { error: (l: string) => error.push(l), info: (l: string) => info.push(l) } };
};

const login = { code: '048213', actorId: 'a', actionContext: 'member.login', intent: 'login', resolvedMobile: '+919876543210' } as const;

describe('buildMemberStepUpDelivery (Story 5.9, Task 5; Story 6.37 AC8)', () => {
  // ⭐ AC11 / I7 — a RECORDER on the global fetch: ⛔ a test here may reach it (a throwing stub would be swallowed — a
  // transport failure STARTS the api — so it proves nothing).
  const globalCalls: unknown[] = [];
  beforeEach(() => {
    globalCalls.length = 0;
    vi.stubGlobal('fetch', (...a: unknown[]) => {
      globalCalls.push(a);
      return Promise.resolve(respond(200, {}));
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    expect(globalCalls).toEqual([]);
  });

  it('dev/CI ⇒ the reveal/log stub (no credential required)', async () => {
    const port = await buildMemberStepUpDelivery(cfg({ nodeEnv: 'development' }), enc, db, async () => '');
    expect(await port.deliver({ ...login, resolvedMobile: '+910000000000', code: '000000' })).toEqual({ channel: 'log', status: 'stub' });
  });

  it('prod with a blank authkey ⇒ FAIL STARTUP (throws, no silent fallback)', async () => {
    const { fetchImpl, calls } = msg91();
    await expect(
      buildMemberStepUpDelivery(cfg({ apiKeySecretName: undefined }), enc, db, ids, { fetchImpl }),
    ).rejects.toThrow(/production SMS OTP delivery requires the MSG91 authkey/);
    expect(calls.read).toBe(0);
  });

  it('prod with a blank OTP template id ⇒ FAIL STARTUP', async () => {
    await withEnv({ SMS_GATEWAY_API_KEY: 'live-key' }, async () => {
      const { fetchImpl } = msg91();
      await expect(buildMemberStepUpDelivery(cfg(), enc, db, async () => '', { fetchImpl })).rejects.toThrow(
        /production SMS OTP delivery requires/,
      );
    });
  });

  it.each(['TRAI::sms.dlt.template_id.otp_login', '1107161234567890123', '64b0c0ffee0123456789a01'])(
    '⭐ MG4 — prod with an OTP template id that is ⛔ MSG91\'s 24 hex (%s) ⇒ FAIL STARTUP, ⛔ a pre-flight call',
    async (bad) => {
      await withEnv({ SMS_GATEWAY_API_KEY: 'live-key' }, async () => {
        const { fetchImpl, calls } = msg91();
        await expect(
          buildMemberStepUpDelivery(cfg(), enc, db, async (k) => (k.endsWith('otp_login') ? bad : (IDS[k] ?? '')), { fetchImpl }),
        ).rejects.toThrow(/not a MSG91 template id/);
        expect(calls.read).toBe(0);
      });
    },
  );

  it.each([
    ['HTTP 401 ⇒ auth', () => Promise.resolve(respond(401, { status: 'fail', hasError: true, errors: 'Unauthorized', code: '401' })), 'auth'],
    [
      'HTTP 200 status:"error" ⇒ auth_or_not_found',
      () => Promise.resolve(respond(200, { status: 'error', hasError: true, errors: 'Template content type could not be fetched' })),
      'auth_or_not_found',
    ],
  ] as const)('⭐ MG5 / MG17 (a) — the boot pre-flight: %s from the SEND key ⇒ REFUSES TO START', async (_l, answer, reason) => {
    await withEnv({ SMS_GATEWAY_API_KEY: 'live-key' }, async () => {
      const { fetchImpl } = msg91(answer);
      await expect(buildMemberStepUpDelivery(cfg(), enc, db, ids, { fetchImpl, log: lines().log })).rejects.toThrow(
        new RegExp(`MSG91 refused the authkey or the template sms\\.dlt\\.template_id\\.otp_login \\(${reason}\\)`),
      );
    });
  });

  it.each([
    ['content_mismatch', (id: string) => Promise.resolve(respond(200, { status: 'success', data: [versionFor(id, { template_data: 'another text ##otp##' })] }))],
    ['dlt_id_missing', (id: string) => Promise.resolve(respond(200, { status: 'success', data: [versionFor(id, { DLT_ID: '' })] }))],
    ['transient', () => Promise.reject(new Error('ECONNRESET'))],
    ['transient', () => Promise.resolve(respond(503, {}))],
    // Review F2 — an unexplained template-read status (a proxy's 404, a 405, an undocumented 403) is ⛔ a proven refusal.
    ['transient', () => Promise.resolve(respond(404, {}))],
    ['transient', () => Promise.resolve(respond(405, {}))],
    ['transient', () => Promise.resolve(respond(403, {}))],
  ] as const)('⭐ MG5 — a %s at boot ⇒ STARTS with an error log (alarm-only — S1); the code is still sent', async (reason, answer) => {
    await withEnv({ SMS_GATEWAY_API_KEY: 'live-key' }, async () => {
      const { fetchImpl, calls } = msg91(answer);
      const l = lines();
      const port = await buildMemberStepUpDelivery(cfg(), enc, db, ids, { fetchImpl, log: l.log });
      expect(l.error.filter((e) => e.includes(`(${reason})`) && e.includes('STARTING anyway'))).toHaveLength(2);
      expect(JSON.stringify(l)).not.toMatch(/64b0c0ffee0123456789a01[56]|live-key/);
      expect(await port.deliver(login)).toMatchObject({ channel: 'sms', status: 'accepted', gatewayMessageId: '5e1e93cad6fc054d8e759a5b' });
      expect(calls.flow).toBe(1);
    });
  });

  it('MG5 — `sms_type_needs_unicode` cannot arise for the OTPs (GSM-7 texts); a UNICODE template is a PASS with the note (⛔ a log line)', async () => {
    await withEnv({ SMS_GATEWAY_API_KEY: 'live-key' }, async () => {
      const { fetchImpl } = msg91((id) => Promise.resolve(respond(200, { status: 'success', data: [versionFor(id, { sms_type: 'UNICODE' })] })));
      const l = lines();
      await buildMemberStepUpDelivery(cfg(), enc, db, ids, { fetchImpl, log: l.log });
      expect(l.error).toEqual([]);
      expect(l.info.some((i) => i.includes('sms_type_unicode_for_gsm7'))).toBe(true);
    });
  });

  it('⭐ a PASS ⇒ starts clean, ⛔ a sender id or a send URL required (MG10); the code goes out as the named value `otp` via Flow', async () => {
    await withEnv({ SMS_GATEWAY_API_KEY: 'live-key' }, async () => {
      const { fetchImpl, calls } = msg91();
      const l = lines();
      const port = await buildMemberStepUpDelivery(cfg(), enc, db, ids, { fetchImpl, log: l.log });
      expect(l.error).toEqual([]);
      expect(calls.read).toBe(2);
      await port.deliver(login);
      expect(calls.bodies).toEqual([
        { template_id: '64b0c0ffee0123456789a015', short_url: '0', recipients: [{ mobiles: '919876543210', otp: '048213' }] },
      ]);
      // the claim handover's step-up TEXT (`template: 'step_up'`) resolves the step-up key's id
      await port.deliver({ ...login, template: 'step_up' });
      expect((calls.bodies[1] as { template_id: string }).template_id).toBe('64b0c0ffee0123456789a016');
    });
  });

  it('⭐ MG5 — at RUNTIME the memo is advisory: an expired entry\'s re-check runs OFF the request path — `deliver` resolves without awaiting it, and a fault there is LOGGED while the code is still sent', async () => {
    await withEnv({ SMS_GATEWAY_API_KEY: 'live-key' }, async () => {
      let now = 1_000_000;
      let phase: 'boot' | 'hang' | 'fault' = 'boot';
      let releaseHang: () => void = () => undefined;
      const { fetchImpl, calls } = msg91((id) => {
        if (phase === 'boot') return Promise.resolve(respond(200, { status: 'success', data: [versionFor(id)] }));
        if (phase === 'hang') return new Promise<SmsFetchResponse>((resolve) => (releaseHang = () => resolve(respond(401, {}))));
        return Promise.resolve(respond(200, { status: 'success', data: [versionFor(id, { template_data: 'x' })] }));
      });
      const l = lines();
      const port = await buildMemberStepUpDelivery(cfg(), enc, db, ids, { fetchImpl, clock: () => now, log: l.log });
      now += 60 * 60 * 1000; // the boot PASS expired
      phase = 'hang';
      // the re-check never answers — deliver must still resolve (⛔ awaited)
      expect(await port.deliver(login)).toMatchObject({ status: 'accepted' });
      expect(calls.read).toBe(3);
      releaseHang(); // it finally answers 401 — reported, ⛔ a refusal of the next code
      await new Promise((r) => setTimeout(r, 0));
      expect(l.error.some((e) => e.includes('sms.dlt.template_id.otp_login did not pass a runtime re-check (auth)'))).toBe(true);
      phase = 'fault';
      now += 10 * 60 * 1000; // past the 5-minute fault TTL
      expect(await port.deliver(login)).toMatchObject({ status: 'accepted' });
      await new Promise((r) => setTimeout(r, 0));
      expect(l.error.some((e) => e.includes('(content_mismatch)') && e.includes('the code was still sent'))).toBe(true);
      expect(calls.flow).toBe(2);
    });
  });

  it('⭐ MG17 (b) — a read key set: its refusal at boot ⇒ STARTS with an error log (it proves nothing about the send key)', async () => {
    await withEnv({ SMS_GATEWAY_API_KEY: 'live-key', SMS_GATEWAY_PREFLIGHT_KEY: 'read-key' }, async () => {
      const headers: string[] = [];
      const { fetchImpl } = msg91(() => Promise.resolve(respond(401, {})));
      const recording: SmsFetchLike = (url, init) => {
        headers.push(`${url.endsWith('/flow') ? 'flow' : 'read'}:${init.headers['authkey'] ?? ''}`);
        return fetchImpl(url, init);
      };
      const l = lines();
      const port = await buildMemberStepUpDelivery(cfg({ preflightKeySecretName: 'sms-read-key' }), enc, db, ids, { fetchImpl: recording, log: l.log });
      expect(l.error.filter((e) => e.includes('(auth)') && e.includes('STARTING anyway'))).toHaveLength(2);
      await port.deliver(login);
      expect(headers).toEqual(['read:read-key', 'read:read-key', 'flow:live-key']);
    });
  });

  it('MG17 (b) — a read-key NAME set but resolving blank ⇒ FAIL STARTUP', async () => {
    await withEnv({ SMS_GATEWAY_API_KEY: 'live-key', SMS_GATEWAY_PREFLIGHT_KEY: '' }, async () => {
      const { fetchImpl } = msg91();
      await expect(
        buildMemberStepUpDelivery(cfg({ preflightKeySecretName: 'sms-read-key' }), enc, db, ids, { fetchImpl }),
      // `resolveSecretValue` refuses a blank value itself; the builder's own check is the backstop.
      ).rejects.toThrow(/sms-read-key|SMS_GATEWAY_PREFLIGHT_KEY_SECRET_NAME is set but resolved to an empty value/);
    });
  });
});
