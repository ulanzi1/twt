// SMS-DLT provider + client + error classification + DLT template registry — Story 5.6 (Task 7; AC1, AC2).
// DB-FREE unit tests: the provider is driven with a FAKE SmsMessagingHandle (no network); the client is
// driven with a fake `fetch` (no network). NEVER a real gateway call.

import { describe, expect, it, vi } from 'vitest';

import {
  createFixtureSmsProvider,
  createSmsAppClient,
  createSmsDltProvider,
  createSmsProvider,
  classifySmsError,
  render,
  resolveDltTemplate,
  SMS_DLT_TEMPLATE_REGISTRY,
  SmsSendError,
  type SmsFetchLike,
  type SmsGatewayMessage,
  type SmsMessagingHandle,
  type SendTarget,
} from '../src/index.js';
import { announcement, claimStatusChange } from './fixtures.js';

const TARGET: SendTarget = { channel: 'sms', address: '+919999999999' };
const DLT_TEMPLATE_ID = 'DLT_123456789';

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

describe('createSmsDltProvider — send mapping (AC1)', () => {
  it('maps gateway acceptance → accepted + the gateway id as providerMessageId', async () => {
    const { handle, sent } = fakeHandle('gw-msg-ABC');
    const provider = createSmsDltProvider({ messaging: handle, dltTemplateId: DLT_TEMPLATE_ID });
    const rendered = render(claimStatusChange(), 'sms');

    const result = await provider.send(rendered, TARGET);
    expect(result).toEqual({
      channel: 'sms',
      provider: 'sms-dlt',
      status: 'accepted',
      providerMessageId: 'gw-msg-ABC',
    });
    // Built the gateway message: E.164 as-is, the resolved DLT template id, the render body as the variable.
    expect(sent[0]).toEqual({
      to: '+919999999999',
      dltTemplateId: DLT_TEMPLATE_ID,
      body: rendered.body,
    });
  });

  it('declares scope global (DLT is platform-level) + getStatus is an honest unknown (no synchronous DLR)', async () => {
    const { handle } = fakeHandle();
    const provider = createSmsDltProvider({ messaging: handle, dltTemplateId: DLT_TEMPLATE_ID });
    expect(provider.scope).toBe('global');
    expect(provider.id).toBe('sms-dlt');
    expect(provider.channel).toBe('sms');
    expect(await provider.getStatus('gw-x')).toEqual({ providerMessageId: 'gw-x', state: 'unknown' });
  });

  it('NEVER rejects the promise on a gateway error — resolves to a classified rejected result (AC1)', async () => {
    const provider = createSmsDltProvider({
      messaging: throwingHandle('DLT_TEMPLATE_NOT_APPROVED', 400),
      dltTemplateId: DLT_TEMPLATE_ID,
    });
    const result = await provider.send(render(claimStatusChange(), 'sms'), TARGET);
    expect(result.status).toBe('rejected');
    expect(result.providerMessageId).toBeNull();
    expect(result.detail).toBe('dlt_template_not_approved:DLT_TEMPLATE_NOT_APPROVED');
  });

  it.each([
    ['INVALID_NUMBER', 400, 'invalid_number:INVALID_NUMBER'],
    ['CARRIER_REJECT', 400, 'carrier_reject:CARRIER_REJECT'],
    ['RATE_LIMIT', 429, 'rate_limited:RATE_LIMIT'],
    [null, 0, 'api_unavailable:unknown'],
    [null, 503, 'api_unavailable:http_503'],
  ])('rejects (not throws) on %s / HTTP %i → detail %s', async (code, status, expectedDetail) => {
    const provider = createSmsDltProvider({
      messaging: throwingHandle(code, status),
      dltTemplateId: DLT_TEMPLATE_ID,
    });
    const result = await provider.send(render(claimStatusChange(), 'sms'), TARGET);
    expect(result.status).toBe('rejected');
    expect(result.detail).toBe(expectedDetail);
  });
});

describe('classifySmsError — honest failure classes (AC1)', () => {
  it.each([
    ['INVALID_NUMBER', 400, 'invalid_number:INVALID_NUMBER'],
    ['DLT_TEMPLATE_NOT_APPROVED', 400, 'dlt_template_not_approved:DLT_TEMPLATE_NOT_APPROVED'],
    ['CONTENT_TEMPLATE_MISMATCH', 400, 'dlt_template_not_approved:CONTENT_TEMPLATE_MISMATCH'],
    ['CARRIER_REJECT', 400, 'carrier_reject:CARRIER_REJECT'],
    ['RATE_LIMIT', 429, 'rate_limited:RATE_LIMIT'],
    ['AUTH_FAILED', 401, 'auth:AUTH_FAILED'],
  ])('gateway code %s (HTTP %i) → %s', (code, httpStatus, expectedDetail) => {
    const { errorClass, code: token } = classifySmsError(new SmsSendError('x', code as string, httpStatus));
    expect(`${errorClass}:${token}`).toBe(expectedDetail);
  });

  it('status-driven fallbacks when the gateway gave no recognized code', () => {
    expect(classifySmsError(new SmsSendError('a', null, 401)).errorClass).toBe('auth');
    expect(classifySmsError(new SmsSendError('a', null, 429)).errorClass).toBe('rate_limited');
    expect(classifySmsError(new SmsSendError('down', null, 503)).errorClass).toBe('api_unavailable');
    expect(classifySmsError(new SmsSendError('net', null, 0)).errorClass).toBe('api_unavailable');
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
    const provider = createSmsProvider({ messaging: handle, dltTemplateId: DLT_TEMPLATE_ID });
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

describe('createSmsAppClient — thin fetch gateway client (AC1, AC2)', () => {
  const config = { apiUrl: 'https://sms-gw.example/send', apiKey: 'gw-secret', senderId: 'TWTPLT' };
  const message: SmsGatewayMessage = { to: '+919999999999', dltTemplateId: DLT_TEMPLATE_ID, body: 'Claim: approved' };

  it('POSTs the DLT body with the sender + template id + Bearer key, returns the gateway messageId', async () => {
    const fetchImpl = vi.fn<SmsFetchLike>().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ messageId: 'GW-FROM-GATEWAY' }),
    });
    const client = createSmsAppClient(config, fetchImpl);
    const id = await client.messaging().send(message);

    expect(id).toBe('GW-FROM-GATEWAY');
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://sms-gw.example/send');
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('Bearer gw-secret');
    const body = JSON.parse(init.body);
    expect(body.sender).toBe('TWTPLT');
    expect(body.to).toBe('+919999999999');
    expect(body.template_id).toBe(DLT_TEMPLATE_ID);
    expect(body.message).toBe('Claim: approved');
  });

  it('caches the single global handle (does NOT rebuild per send)', () => {
    const fetchImpl = vi.fn<SmsFetchLike>().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ messageId: 'g' }),
    });
    const client = createSmsAppClient(config, fetchImpl);
    expect(client.messaging()).toBe(client.messaging());
  });

  it('throws an SmsSendError carrying the gateway code on a non-2xx (so the provider classifies it)', async () => {
    const fetchImpl: SmsFetchLike = () =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { code: 'DLT_TEMPLATE_NOT_APPROVED', message: 'no match' } }),
      });
    const handle = createSmsAppClient(config, fetchImpl).messaging();
    await expect(handle.send(message)).rejects.toMatchObject({
      gatewayCode: 'DLT_TEMPLATE_NOT_APPROVED',
      httpStatus: 400,
    });
  });

  it('throws an SmsSendError (code null, status 0) on a network/transport failure', async () => {
    const fetchImpl: SmsFetchLike = () => Promise.reject(new Error('ECONNRESET'));
    const handle = createSmsAppClient(config, fetchImpl).messaging();
    await expect(handle.send(message)).rejects.toMatchObject({ gatewayCode: null, httpStatus: 0 });
  });

  it('treats a 2xx with no messageId as a failure (never fabricates an acceptance)', async () => {
    const fetchImpl: SmsFetchLike = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    const handle = createSmsAppClient(config, fetchImpl).messaging();
    await expect(handle.send(message)).rejects.toBeInstanceOf(SmsSendError);
  });

  it('validates config BEFORE building — a blank credential fails clear, not as an opaque gateway 400', () => {
    const client = createSmsAppClient({ ...config, apiKey: '' }, () => Promise.reject(new Error('unused')));
    expect(() => client.messaging()).toThrow(/apiKey/);
    const client2 = createSmsAppClient({ ...config, senderId: '' }, () => Promise.reject(new Error('unused')));
    expect(() => client2.messaging()).toThrow(/senderId/);
  });

  it('isConfigured() reports blank credential fields without throwing — the composition seam\'s not-configured guard', () => {
    const fetchImpl: SmsFetchLike = () => Promise.reject(new Error('unused'));
    expect(createSmsAppClient(config, fetchImpl).isConfigured()).toBe(true);
    expect(createSmsAppClient({ ...config, apiUrl: '' }, fetchImpl).isConfigured()).toBe(false);
    expect(createSmsAppClient({ ...config, apiKey: '   ' }, fetchImpl).isConfigured()).toBe(false);
    expect(createSmsAppClient({ ...config, senderId: '' }, fetchImpl).isConfigured()).toBe(false);
  });
});

describe('DLT template registry — SMS-eligibility (AC2)', () => {
  it('resolves a template for exactly the 5 confirmed per-member transactional categories', () => {
    for (const category of [
      'deadline_reminder',
      'contribution_confirmed',
      'contribution_mismatch',
      'claim_status_change',
      'helpdesk_reply',
    ] as const) {
      const template = resolveDltTemplate(category);
      expect(template, category).not.toBeNull();
      expect(template!.dltTemplateIdConfigKey).toContain(category);
      expect(template!.version).toBeGreaterThanOrEqual(1);
    }
    expect(Object.keys(SMS_DLT_TEMPLATE_REGISTRY)).toHaveLength(5);
  });

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
