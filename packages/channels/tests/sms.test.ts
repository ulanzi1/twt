// SMS provider + MSG91 client + error classification + DLT template registry — Story 5.6 (Task 7; AC1, AC2), the
// client rebuilt for MSG91 by Story 6.37 (AC1–AC4; MG3, MG6–MG9, MG12).
// DB-FREE unit tests: the provider is driven with a FAKE SmsMessagingHandle (no network); the client is driven with a
// fake `fetch` (no network). NEVER a real gateway call (I7, T1).

import { schema } from '@twt/domain';
import { describe, expect, it, vi } from 'vitest';

import {
  createFixtureSmsProvider,
  createSmsAppClient,
  createSmsDltProvider,
  createSmsProvider,
  classifySmsError,
  parseSmsGatewayOrigin,
  render,
  resolveDltTemplate,
  SMS_DLT_TEMPLATE_REGISTRY,
  SMS_GATEWAY_TIMEOUT_MS,
  SmsSendError,
  type SmsFetchLike,
  type SmsFetchResponse,
  type SmsGatewayMessage,
  type SmsMessagingHandle,
  type SendTarget,
} from '../src/index.js';
import { resolveSmsProviderDeps } from '../src/composition/provider-composition.js';
import { announcement, claimStatusChange } from './fixtures.js';

const TARGET: SendTarget = { channel: 'sms', address: '+919999999999' };
/** A MSG91 template id (24 hex — MG4). */
const TEMPLATE_ID = '64b0c0ffee0123456789abcd';
const VALUES = [{ name: 'otp', value: '048213' }] as const;

/** A fake handle that records the message it was sent + returns a fixed gateway id (no network). */
function fakeHandle(id = 'gw-msg-1'): { handle: SmsMessagingHandle; sent: SmsGatewayMessage[] } {
  const sent: SmsGatewayMessage[] = [];
  return {
    sent,
    handle: {
      send(message) {
        sent.push(message);
        return Promise.resolve(id);
      },
    },
  };
}

/** A fake handle that throws an SmsSendError with the given gateway code / HTTP status. */
function throwingHandle(gatewayCode: string | null, httpStatus: number): SmsMessagingHandle {
  return {
    send() {
      return Promise.reject(new SmsSendError('gateway rejected', gatewayCode, httpStatus));
    },
  };
}

/** The 0166 gateway-arm grammar — imported, ⛔ copied (AC3). */
const DETAIL = new RegExp(schema.PEER_MESH_REQUEST_DETAIL_PATTERN);

describe('createSmsDltProvider — send mapping (AC1; 6.37 MG3 / MG12)', () => {
  it('maps gateway acceptance → accepted + the gateway id; sends the bound values, the template id and the body', async () => {
    const { handle, sent } = fakeHandle('gw-msg-ABC');
    const provider = createSmsDltProvider({ messaging: handle, dltTemplateId: TEMPLATE_ID, values: VALUES });
    const rendered = render(claimStatusChange(), 'sms');

    const result = await provider.send(rendered, TARGET);
    expect(result).toEqual({
      channel: 'sms',
      provider: 'sms-dlt',
      status: 'accepted',
      providerMessageId: 'gw-msg-ABC',
    });
    expect(sent[0]).toEqual({ to: '+919999999999', templateId: TEMPLATE_ID, values: VALUES, body: rendered.body });
  });

  it('⭐ MG12 — a provider built WITHOUT named values (the dark alert path) refuses `no_named_values` and ⛔ calls the gateway', async () => {
    for (const values of [undefined, []]) {
      const send = vi.fn<SmsMessagingHandle['send']>();
      const provider = createSmsDltProvider({ messaging: { send }, dltTemplateId: TEMPLATE_ID, ...(values ? { values } : {}) });
      const result = await provider.send(render(claimStatusChange(), 'sms'), TARGET);
      expect(result).toEqual({
        channel: 'sms',
        provider: 'sms-dlt',
        status: 'rejected',
        providerMessageId: null,
        detail: 'dlt_template_not_approved:no_named_values',
      });
      expect(send).not.toHaveBeenCalled();
    }
  });

  it('declares scope global (DLT is platform-level) + getStatus is an honest unknown (delivery reports are row 6-37b)', async () => {
    const { handle } = fakeHandle();
    const provider = createSmsDltProvider({ messaging: handle, dltTemplateId: TEMPLATE_ID, values: VALUES });
    expect(provider.scope).toBe('global');
    expect(provider.id).toBe('sms-dlt');
    expect(provider.channel).toBe('sms');
    expect(await provider.getStatus('gw-x')).toEqual({ providerMessageId: 'gw-x', state: 'unknown' });
  });

  // SYNTHETIC codes — a synchronous `code` on a Flow send is ⛔ documented (F9 / F15).
  it.each([
    ['400', 400, 'dlt_template_not_approved:400'],
    ['202', 400, 'invalid_number:202'],
    ['201', 401, 'auth:201'],
    [null, 0, 'api_unavailable:unknown'],
    [null, 503, 'api_unavailable:http_503'],
    [null, 429, 'rate_limited:http_429'],
  ])('NEVER rejects the promise — %s / HTTP %i → a rejected result with detail %s', async (code, status, expectedDetail) => {
    const provider = createSmsDltProvider({ messaging: throwingHandle(code, status), dltTemplateId: TEMPLATE_ID, values: VALUES });
    const result = await provider.send(render(claimStatusChange(), 'sms'), TARGET);
    expect(result.status).toBe('rejected');
    expect(result.providerMessageId).toBeNull();
    expect(result.detail).toBe(expectedDetail);
  });
});

/**
 * MG7 — the code table. ⚠ Every row is a SYNTHETIC fixture: MSG91 documents these as "API failed" reasons
 * (https://msg91.com/help/api/what-are-the-reason-for-error-codes-received-under-the-api-failed), and a synchronous `code`
 * on a Flow send is ⛔ documented (F9) — the table is the defensive mapping for when one arrives.
 */
const MG7: ReadonlyArray<readonly [string, string]> = [
  ...['201', '204', '207', '208', '209', '210', '301', '302', '303', '418', '421', '602'].map((c) => [c, 'auth'] as const),
  ...['203', '211', '310', '400', '401', '402', '403', '603'].map((c) => [c, 'dlt_template_not_approved'] as const),
  ...['101', '202', '604'].map((c) => [c, 'invalid_number'] as const),
  ...['306', '506', '601'].map((c) => [c, 'api_unavailable'] as const),
  ...['311', '407', '999'].map((c) => [c, 'unknown'] as const),
];

describe('classifySmsError — MSG91\'s code table (6.37 AC3, MG7)', () => {
  it.each(MG7)('code %s → %s, detail `<class>:<code>` in the 0166 grammar', (code, errorClass) => {
    const r = classifySmsError(new SmsSendError('x', code, 200));
    expect(r).toEqual({ errorClass, code });
    expect(`${r.errorClass}:${r.code}`).toMatch(DETAIL);
  });

  it('⚠ 311 (the first SMS IS delivered) is a may-have-sent `unknown`, ⛔ an acceptance and ⛔ a transient (T12)', () => {
    expect(classifySmsError(new SmsSendError('x', '311', 200)).errorClass).toBe('unknown');
  });

  it('an unlisted code is ⛔ guessed from the HTTP status', () => {
    expect(classifySmsError(new SmsSendError('x', '777', 503))).toEqual({ errorClass: 'unknown', code: '777' });
  });

  it('status-driven fallbacks when MSG91 gave ⛔ code', () => {
    expect(classifySmsError(new SmsSendError('a', null, 401))).toEqual({ errorClass: 'auth', code: 'http_401' });
    expect(classifySmsError(new SmsSendError('a', null, 403)).errorClass).toBe('auth');
    expect(classifySmsError(new SmsSendError('a', null, 429))).toEqual({ errorClass: 'rate_limited', code: 'http_429' });
    expect(classifySmsError(new SmsSendError('down', null, 503))).toEqual({ errorClass: 'api_unavailable', code: 'http_503' });
    expect(classifySmsError(new SmsSendError('net', null, 0)).errorClass).toBe('api_unavailable');
  });

  it('⭐ I6 — a code carrying a 10-digit run, a space or 65 characters is scrubbed to `unknown` (sanitizeSmsGatewayCode)', () => {
    for (const code of ['9198765432', 'a b', 'x'.repeat(65)]) {
      const r = classifySmsError(new SmsSendError('x', code, 200));
      expect(r).toEqual({ errorClass: 'unknown', code: 'unknown' });
      expect(`${r.errorClass}:${r.code}`).toMatch(DETAIL);
    }
  });

  it('a local refusal is classified as the client decided it', () => {
    const err = new SmsSendError('x', null, -1, { errorClass: 'invalid_number', code: 'format' });
    expect(classifySmsError(err)).toEqual({ errorClass: 'invalid_number', code: 'format' });
  });

  it('never throws on a hostile getter (the never-reject invariant)', () => {
    const hostile = {
      get gatewayCode(): string {
        throw new Error('boom');
      },
    };
    expect(() => classifySmsError(hostile)).not.toThrow();
    expect(classifySmsError(hostile).errorClass).toBe('unknown');
  });
});

describe('createSmsProvider — real-vs-fixture selection (AC1)', () => {
  it('null/undefined deps → the log-only fixture (scope global, accepted)', async () => {
    for (const sms of [null, undefined]) {
      const provider = createSmsProvider(sms);
      expect(provider.scope).toBe('global');
      const result = await provider.send(render(claimStatusChange(), 'sms'), TARGET);
      expect(result.status).toBe('accepted');
      expect(result.providerMessageId).toBe('fixture-sms');
    }
  });

  it('real deps → the real sms-dlt provider', () => {
    const { handle } = fakeHandle();
    const provider = createSmsProvider({ messaging: handle, dltTemplateId: TEMPLATE_ID, values: VALUES });
    expect(provider.id).toBe('sms-dlt');
    expect(provider.scope).toBe('global');
  });

  it('the fixture logs (no E.164) via the injected sink', async () => {
    const lines: string[] = [];
    const provider = createFixtureSmsProvider({ log: (l) => lines.push(l) });
    await provider.send(render(claimStatusChange(), 'sms'), TARGET);
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain('919999999999');
  });
});

// ── The MSG91 Flow client (6.37 AC1–AC4) ─────────────────────────────────────────────────────────────────

const config = { apiOrigin: 'https://control.msg91.com', authkey: 'msg91-authkey-secret' };
const message: SmsGatewayMessage = {
  to: '+919876543210',
  templateId: TEMPLATE_ID,
  values: VALUES,
  body: '048213 is your TWT login code. Valid 5 min. Do not share.',
};

/** A response with the given status and JSON body. */
function respond(status: number, body: unknown): SmsFetchResponse {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

/** A fake fetch answering one fixed response. */
function answering(status: number, body: unknown) {
  return vi.fn<SmsFetchLike>().mockResolvedValue(respond(status, body));
}

describe('createSmsAppClient — the MSG91 Flow request (6.37 AC1; MG9, MG10, F10)', () => {
  // The success shape: https://docs.msg91.com/sms/module.json (Flow v5).
  const SUCCESS = { message: '5e1e93cad6fc054d8e759a5b', type: 'success' };

  it('⭐ POSTs <origin>/api/v5/flow with the authkey header and ONLY template_id / short_url "0" / one recipient', async () => {
    const fetchImpl = answering(200, SUCCESS);
    const id = await createSmsAppClient(config, fetchImpl).messaging().send(message);
    expect(id).toBe('5e1e93cad6fc054d8e759a5b');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://control.msg91.com/api/v5/flow');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      authkey: 'msg91-authkey-secret',
      'content-type': 'application/json',
      accept: 'application/json',
    });
    expect(init.headers).not.toHaveProperty('Authorization');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body)).toEqual({
      template_id: TEMPLATE_ID,
      short_url: '0',
      recipients: [{ mobiles: '919876543210', otp: '048213' }],
    });
    // ⛔ the finished text, ⛔ sender, ⛔ realTimeResponse, ⛔ CRQID.
    expect(init.body).not.toContain('login code');
  });

  it('sends every named value of a multi-slot template, in the recipient object', async () => {
    const fetchImpl = answering(200, SUCCESS);
    await createSmsAppClient(config, fetchImpl)
      .messaging()
      .send({
        ...message,
        values: [
          { name: 'reference', value: 'AB12CD34' },
          { name: 'helpline', value: '1800123456' },
        ],
      });
    expect(JSON.parse(fetchImpl.mock.calls[0]![1].body).recipients).toEqual([
      { mobiles: '919876543210', reference: 'AB12CD34', helpline: '1800123456' },
    ]);
  });

  it('a trailing slash on the origin is trimmed; a path is refused at config time (MG10)', async () => {
    const fetchImpl = answering(200, SUCCESS);
    await createSmsAppClient({ ...config, apiOrigin: 'https://control.msg91.com/' }, fetchImpl).messaging().send(message);
    expect(fetchImpl.mock.calls[0]![0]).toBe('https://control.msg91.com/api/v5/flow');

    expect(parseSmsGatewayOrigin('https://control.msg91.com')).toBe('https://control.msg91.com');
    expect(parseSmsGatewayOrigin(' https://control.msg91.com/ ')).toBe('https://control.msg91.com');
    for (const bad of ['https://control.msg91.com/send', 'https://sms-gateway.invalid/send', 'control.msg91.com', '', 'https://x.y/?a=1']) {
      expect(() => parseSmsGatewayOrigin(bad), bad).toThrow(/bare origin/);
    }
    const client = createSmsAppClient({ ...config, apiOrigin: 'https://control.msg91.com/send' }, fetchImpl);
    expect(() => client.messaging()).toThrow(/bare origin/);
  });

  it('caches the single global handle (does NOT rebuild per send)', () => {
    const client = createSmsAppClient(config, answering(200, SUCCESS));
    expect(client.messaging()).toBe(client.messaging());
  });

  it('validates config BEFORE building — a blank credential fails clear; isConfigured never touches the network', () => {
    const fetchImpl = vi.fn<SmsFetchLike>();
    expect(() => createSmsAppClient({ ...config, authkey: '' }, fetchImpl).messaging()).toThrow(/authkey/);
    expect(() => createSmsAppClient({ ...config, apiOrigin: ' ' }, fetchImpl).messaging()).toThrow(/apiOrigin/);
    expect(createSmsAppClient(config, fetchImpl).isConfigured()).toBe(true);
    expect(createSmsAppClient({ ...config, apiOrigin: '' }, fetchImpl).isConfigured()).toBe(false);
    expect(createSmsAppClient({ ...config, authkey: '   ' }, fetchImpl).isConfigured()).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('⭐ the bound is created SYNCHRONOUSLY at send entry from the injected factory, 9 s (MG9)', () => {
    const timeoutSignal = vi.fn<(ms: number) => AbortSignal>(() => new AbortController().signal);
    const fetchImpl = vi.fn<SmsFetchLike>(() => new Promise<SmsFetchResponse>(() => undefined));
    void createSmsAppClient(config, fetchImpl, { timeoutSignal }).messaging().send(message);
    // ⛔ awaited: the factory has already been called.
    expect(timeoutSignal).toHaveBeenCalledWith(SMS_GATEWAY_TIMEOUT_MS);
    expect(SMS_GATEWAY_TIMEOUT_MS).toBe(9_000);
  });
});

/** Run one send and return the classified detail (or 'accepted:<id>'). */
async function outcome(fetchImpl: SmsFetchLike, m: SmsGatewayMessage = message, timeoutSignal?: (ms: number) => AbortSignal) {
  try {
    const id = await createSmsAppClient(config, fetchImpl, timeoutSignal ? { timeoutSignal } : {}).messaging().send(m);
    return `accepted:${id}`;
  } catch (err) {
    expect(err).toBeInstanceOf(SmsSendError);
    const { errorClass, code } = classifySmsError(err);
    const detail = `${errorClass}:${code}`;
    expect(detail).toMatch(DETAIL);
    return detail;
  }
}

describe('createSmsAppClient — acceptance needs `type` (6.37 AC2; MG6, I3)', () => {
  it('`success` + a request id ⇒ accepted with that id', async () => {
    expect(await outcome(answering(200, { type: 'success', message: '5e1e93cad6fc054d8e759a5b' }))).toBe(
      'accepted:5e1e93cad6fc054d8e759a5b',
    );
  });

  it.each([
    ['⛔ type', { message: '5e1e93cad6fc054d8e759a5b' }, 'unknown:no_type'],
    ['an empty body', null, 'unknown:no_type'],
    ['a blank id', { type: 'success', message: '' }, 'unknown:no_request_id'],
    ['a non-string id', { type: 'success', message: 12345 }, 'unknown:no_request_id'],
    ['a 65-character id', { type: 'success', message: 'a'.repeat(65) }, 'unknown:no_request_id'],
    ['a non-alphanumeric id', { type: 'success', message: '5e1e93ca-d6fc' }, 'unknown:no_request_id'],
    ['`type:"error"` without a code', { type: 'error', message: 'something' }, 'unknown:msg91_error'],
  ])('HTTP 200 with %s ⇒ rejected %s — ⛔ a fabricated id', async (_label, body, expected) => {
    expect(await outcome(answering(200, body))).toBe(expected);
  });

  it('a `success` on a non-2xx is ⛔ an acceptance', async () => {
    expect(await outcome(answering(500, { type: 'success', message: '5e1e93cad6fc054d8e759a5b' }))).toBe('api_unavailable:http_500');
  });
});

describe('createSmsAppClient — the error shapes (6.37 AC3; MG6 / MG7)', () => {
  it.each(MG7)('SYNTHETIC — `type:"error"` with code %s (as a STRING and as a NUMBER) ⇒ %s:<code>', async (code, errorClass) => {
    expect(await outcome(answering(200, { type: 'error', code, message: 'x' }))).toBe(`${errorClass}:${code}`);
    expect(await outcome(answering(200, { type: 'error', code: Number(code), message: 'x' }))).toBe(`${errorClass}:${code}`);
  });

  // The two synchronous messages MSG91 documents — SendOTP samples (https://docs.msg91.com/otp/module.json).
  it('"Auth Key missing" (HTTP 401) ⇒ auth:authkey_missing', async () => {
    expect(await outcome(answering(401, { message: 'Auth Key missing', type: 'error' }))).toBe('auth:authkey_missing');
  });

  it('"The provided flow ID or template ID is invalid." (HTTP 200) ⇒ dlt_template_not_approved:template_invalid', async () => {
    expect(await outcome(answering(200, { message: 'The provided flow ID or template ID is invalid.', type: 'error' }))).toBe(
      'dlt_template_not_approved:template_invalid',
    );
  });

  it.each([
    [401, 'auth:http_401'],
    [403, 'auth:http_403'],
    [429, 'rate_limited:http_429'],
    [503, 'api_unavailable:http_503'],
  ])('HTTP %i with ⛔ code ⇒ %s', async (status, expected) => {
    expect(await outcome(answering(status, {}))).toBe(expected);
  });

  it('a non-JSON non-2xx still classifies by status', async () => {
    const fetchImpl = vi.fn<SmsFetchLike>().mockResolvedValue({ ok: false, status: 502, json: () => Promise.reject(new Error('html')) });
    expect(await outcome(fetchImpl)).toBe('api_unavailable:http_502');
  });

  it('a network throw ⇒ api_unavailable; the error message carries ⛔ the transport\'s text', async () => {
    const fetchImpl = vi.fn<SmsFetchLike>().mockRejectedValue(new Error('ECONNRESET to 919876543210'));
    expect(await outcome(fetchImpl)).toBe('api_unavailable:unknown');
    const err = await createSmsAppClient(config, fetchImpl).messaging().send(message).catch((e: unknown) => e);
    expect((err as Error).message).not.toContain('919876543210');
  });

  it('⭐ an abort of the client\'s own bound ⇒ api_unavailable:timeout', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn<SmsFetchLike>((_url, init) => {
      controller.abort();
      return Promise.reject(init.signal.reason ?? new Error('aborted'));
    });
    expect(await outcome(fetchImpl, message, () => controller.signal)).toBe('api_unavailable:timeout');
  });

  it('a code carrying a 10-digit run ⇒ <class>:unknown (sanitizeSmsGatewayCode)', async () => {
    expect(await outcome(answering(200, { type: 'error', code: '9876543210', message: 'x' }))).toBe('unknown:unknown');
  });
});

describe('createSmsAppClient — local refusals, ⛔ request (6.37 AC4; MG4, MG8)', () => {
  it('the number: `+91…` → `91…`', async () => {
    const fetchImpl = answering(200, { type: 'success', message: 'abc' });
    await createSmsAppClient(config, fetchImpl).messaging().send(message);
    expect(JSON.parse(fetchImpl.mock.calls[0]![1].body).recipients[0].mobiles).toBe('919876543210');
  });

  it.each(['9876543210', '919876543210', '+91 98765 43210', '+915876543210', '+1415555012', ''])(
    'a `to` normalizeMobile rejects or rewrites (%s) ⇒ invalid_number:format and fetch ⛔ called',
    async (to) => {
      const fetchImpl = vi.fn<SmsFetchLike>();
      expect(await outcome(fetchImpl, { ...message, to })).toBe('invalid_number:format');
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it.each(['TPL-1', '1107161234567890123', '64b0c0ffee0123456789abc', '64b0c0ffee0123456789abcdz', ''])(
    'a template id that is ⛔ 24 hex (%s) ⇒ dlt_template_not_approved:template_id_malformed, ⛔ request',
    async (templateId) => {
      const fetchImpl = vi.fn<SmsFetchLike>();
      expect(await outcome(fetchImpl, { ...message, templateId })).toBe('dlt_template_not_approved:template_id_malformed');
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it('⛔ named values ⇒ no_named_values; a value named `mobiles` or a repeated name ⇒ values_mismatch — ⛔ request', async () => {
    const fetchImpl = vi.fn<SmsFetchLike>();
    expect(await outcome(fetchImpl, { ...message, values: [] })).toBe('dlt_template_not_approved:no_named_values');
    expect(await outcome(fetchImpl, { ...message, values: [{ name: 'mobiles', value: '919999999999' }] })).toBe(
      'dlt_template_not_approved:values_mismatch',
    );
    expect(
      await outcome(fetchImpl, {
        ...message,
        values: [
          { name: 'otp', value: '1' },
          { name: 'otp', value: '2' },
        ],
      }),
    ).toBe('dlt_template_not_approved:values_mismatch');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

const V1_CATEGORIES = [
  'deadline_reminder',
  'contribution_confirmed',
  'contribution_mismatch',
  'claim_status_change',
  'helpdesk_reply',
] as const;

describe('DLT template registry — SMS-eligibility (AC2)', () => {
  // ⭐ Story 6.34 (TV6 / AC5): the 5.6 set stays LISTED (size 5, each key) but every entry is DARK — its whole body was
  // one variable (⛔ registrable under TRAI's 18 Nov 2025 Direction) ⇒ `resolveDltTemplate` ⇒ `null` ⇒ the fixture.
  it('lists exactly the 5 confirmed per-member transactional categories — each DARK: null text, a reason, ⛔ slots, resolved to null', () => {
    for (const category of V1_CATEGORIES) {
      const entry = SMS_DLT_TEMPLATE_REGISTRY[category];
      expect(entry, category).toEqual({
        dltTemplateIdConfigKey: `sms.dlt.template_id.${category}`,
        contentTemplate: null,
        unregistrableReason: 'whole_body_variable',
        slots: [],
        version: 1,
      });
      expect(resolveDltTemplate(category), category).toBeNull();
    }
    expect(Object.keys(SMS_DLT_TEMPLATE_REGISTRY)).toHaveLength(5);
  });

  it.each(V1_CATEGORIES)(
    '⭐ AC5 — %s with its id PROVISIONED still composes ⛔ real provider: null deps AND resolveConfig ⛔ called (`-322` C8)',
    async (category) => {
      // ⚠ The fixture and the real provider share `id: 'sms-dlt'` — the observable proof is that the template id was
      // never even read, and the deps are null.
      const resolveConfig = vi.fn().mockResolvedValue('DLT_PROVISIONED_ID');
      const appClient = { isConfigured: () => true, messaging: vi.fn() };
      expect(await resolveSmsProviderDeps({ appClient, resolveConfig }, category)).toBeNull();
      expect(resolveConfig).not.toHaveBeenCalled();
      expect(appClient.messaging).not.toHaveBeenCalled();
    },
  );

  it('returns null for NON-eligible categories (OTP + the 3 broadcasts) ⇒ not SMS-eligible', () => {
    for (const category of ['step_up_otp', 'alert_published', 'module_new', 'niyamavali_amended'] as const) {
      expect(resolveDltTemplate(category), category).toBeNull();
    }
  });

  it('stores a config-key NAME pointer, never a hardcoded TRAI template id (AI-4-3(c))', () => {
    for (const template of Object.values(SMS_DLT_TEMPLATE_REGISTRY)) {
      // A NAME pointer (dotted config key), not a bare id — the composition resolves it at send time.
      expect(template!.dltTemplateIdConfigKey).toMatch(/^sms\.dlt\.template_id\./);
    }
  });

  it('is announcement-agnostic — an unknown category string resolves to null (no throw)', () => {
    expect(resolveDltTemplate('not_a_category')).toBeNull();
    // Sanity: an announcement fixture's category is a broadcast → not SMS-eligible.
    expect(resolveDltTemplate(announcement().alert_category)).toBeNull();
  });
});
