// WhatsApp Business provider + client + error classification + status mapping — Story 5.3 (Task 7; AC1,
// AC2, AC5, AC6). DB-FREE unit tests: the provider is driven with a FAKE WhatsappMessagingHandle (no
// network); the client is driven with a fake `fetch` (no network). NEVER a real Meta call.

import { describe, expect, it, vi } from 'vitest';

import {
  createFixtureWhatsappProvider,
  createWhatsappAppCache,
  createWhatsappBusinessProvider,
  createWhatsappProvider,
  WhatsappSendError,
  classifyWhatsappError,
  mapMetaStatus,
  render,
  type FetchLike,
  type SendTarget,
  type WhatsappMessagingHandle,
  type WhatsappTemplateMessage,
} from '../src/index.js';
import { announcement } from './fixtures.js';

const TARGET: SendTarget = { channel: 'whatsapp', address: '+919999999999' };
const TEMPLATE = { name: 'ann_utility_v1', languageCode: 'en' };

/** A fake handle that records the message it was sent + returns a fixed wamid (no network). */
function fakeHandle(wamid = 'wamid.HBgL'): { handle: WhatsappMessagingHandle; sent: WhatsappTemplateMessage[] } {
  const sent: WhatsappTemplateMessage[] = [];
  return {
    sent,
    handle: {
      send(message) {
        sent.push(message);
        return Promise.resolve(wamid);
      },
    },
  };
}

/** A fake handle that throws a WhatsappSendError with the given Meta code / HTTP status. */
function throwingHandle(metaCode: number | null, httpStatus: number): WhatsappMessagingHandle {
  return {
    send() {
      return Promise.reject(new WhatsappSendError('meta rejected', metaCode, httpStatus));
    },
  };
}

describe('createWhatsappBusinessProvider — send mapping (AC1)', () => {
  it('maps Meta acceptance → accepted + the wamid as providerMessageId', async () => {
    const { handle, sent } = fakeHandle('wamid.ABC123');
    const provider = createWhatsappBusinessProvider({ messaging: handle, template: TEMPLATE });
    const rendered = render(announcement(), 'whatsapp');

    const result = await provider.send(rendered, TARGET);
    expect(result).toEqual({
      channel: 'whatsapp',
      provider: 'whatsapp-business',
      status: 'accepted',
      providerMessageId: 'wamid.ABC123',
    });
    // Built the template message: msisdn WITHOUT '+', the resolved template, the render body as {{1}}.
    expect(sent[0]).toEqual({
      to: '919999999999',
      templateName: 'ann_utility_v1',
      languageCode: 'en',
      bodyParam: rendered.body,
    });
  });

  it('declares scope per-pariwar + getStatus is an honest unknown (Meta has no synchronous receipt)', async () => {
    const { handle } = fakeHandle();
    const provider = createWhatsappBusinessProvider({ messaging: handle, template: TEMPLATE });
    expect(provider.scope).toBe('per-pariwar');
    expect(provider.id).toBe('whatsapp-business');
    expect(await provider.getStatus('wamid.X')).toEqual({ providerMessageId: 'wamid.X', state: 'unknown' });
  });

  it('NEVER rejects the promise on a Meta error — resolves to a classified rejected result (AC6)', async () => {
    const provider = createWhatsappBusinessProvider({ messaging: throwingHandle(132001, 400), template: TEMPLATE });
    const result = await provider.send(render(announcement(), 'whatsapp'), TARGET);
    expect(result.status).toBe('rejected');
    expect(result.providerMessageId).toBeNull();
    expect(result.detail).toBe('template_not_approved:132001');
  });
});

describe('classifyWhatsappError — honest failure classes (AC6)', () => {
  it.each([
    [132001, 400, 'template_not_approved:132001'],
    [190, 401, 'auth:190'],
    [131047, 400, 'window_expired:131047'],
    [131026, 400, 'recipient_blocked:131026'],
    [131008, 400, 'invalid_recipient:131008'],
    [130429, 429, 'api_unavailable:130429'],
  ])('Meta code %i (HTTP %i) → %s', (metaCode, httpStatus, expectedDetail) => {
    const { errorClass, code } = classifyWhatsappError(new WhatsappSendError('x', metaCode, httpStatus));
    expect(`${errorClass}:${code}`).toBe(expectedDetail);
  });

  it('a 5xx / transport failure with no Meta code → api_unavailable', () => {
    expect(classifyWhatsappError(new WhatsappSendError('down', null, 503)).errorClass).toBe('api_unavailable');
    expect(classifyWhatsappError(new WhatsappSendError('net', null, 0)).errorClass).toBe('api_unavailable');
  });

  it('never throws on a hostile getter (the never-reject invariant)', () => {
    const hostile = {
      get metaCode(): number {
        throw new Error('boom');
      },
    };
    expect(() => classifyWhatsappError(hostile)).not.toThrow();
    expect(classifyWhatsappError(hostile).errorClass).toBe('unknown');
  });
});

describe('createWhatsappProvider — real-vs-fixture selection (AC2)', () => {
  it('null/undefined deps → the log-only fixture (scope global, accepted)', async () => {
    for (const wa of [null, undefined]) {
      const provider = createWhatsappProvider(wa);
      expect(provider.scope).toBe('global');
      const result = await provider.send(render(announcement(), 'whatsapp'), TARGET);
      expect(result.status).toBe('accepted');
      expect(result.providerMessageId).toBe('fixture-whatsapp');
    }
  });

  it('real deps → the per-pariwar real provider', () => {
    const { handle } = fakeHandle();
    const provider = createWhatsappProvider({ messaging: handle, template: TEMPLATE });
    expect(provider.scope).toBe('per-pariwar');
  });

  it('the fixture logs (no msisdn) via the injected sink', async () => {
    const lines: string[] = [];
    const provider = createFixtureWhatsappProvider({ log: (l) => lines.push(l) });
    await provider.send(render(announcement(), 'whatsapp'), TARGET);
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain('919999999999');
  });
});

describe('createWhatsappAppCache — thin fetch client (AC1, AC2)', () => {
  const config = { phoneNumberId: '123456', accessToken: 'sys-user-token', graphApiVersion: 'v21.0' };
  const message: WhatsappTemplateMessage = {
    to: '919999999999',
    templateName: 'ann_utility_v1',
    languageCode: 'en',
    bodyParam: 'Rule amended. Something changed',
  };

  it('POSTs the Meta template body to the versioned phone-number URL + returns the wamid', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ messages: [{ id: 'wamid.FROM_META' }] }),
    });
    const cache = createWhatsappAppCache(fetchImpl);
    const handle = cache.messagingFor('pariwar-a', config);
    const wamid = await handle.send(message);

    expect(wamid).toBe('wamid.FROM_META');
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://graph.facebook.com/v21.0/123456/messages');
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('Bearer sys-user-token');
    const body = JSON.parse(init.body);
    expect(body.messaging_product).toBe('whatsapp');
    expect(body.type).toBe('template');
    expect(body.template.name).toBe('ann_utility_v1');
    expect(body.template.components[0].parameters[0].text).toBe('Rule amended. Something changed');
  });

  it('caches the client per pariwar_id (does NOT rebuild per send)', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ messages: [{ id: 'w' }] }),
    });
    const cache = createWhatsappAppCache(fetchImpl);
    const h1 = cache.messagingFor('pariwar-a', config);
    const h2 = cache.messagingFor('pariwar-a', config);
    expect(h1).toBe(h2); // same cached client handle
  });

  it('throws a WhatsappSendError carrying the Meta code on a non-2xx (so the provider classifies it)', async () => {
    const fetchImpl: FetchLike = () =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { code: 132001, message: 'template not approved' } }),
      });
    const handle = createWhatsappAppCache(fetchImpl).messagingFor('pariwar-a', config);
    await expect(handle.send(message)).rejects.toMatchObject({ metaCode: 132001, httpStatus: 400 });
  });

  it('throws a WhatsappSendError (metaCode null, status 0) on a network/transport failure', async () => {
    const fetchImpl: FetchLike = () => Promise.reject(new Error('ECONNRESET'));
    const handle = createWhatsappAppCache(fetchImpl).messagingFor('pariwar-a', config);
    await expect(handle.send(message)).rejects.toMatchObject({ metaCode: null, httpStatus: 0 });
  });

  it('validates config BEFORE building the client — a blank token fails clear, not as an opaque Meta 400', () => {
    const cache = createWhatsappAppCache(() => Promise.reject(new Error('should not be called')));
    expect(() => cache.messagingFor('pariwar-a', { ...config, accessToken: '' })).toThrow(/access token/);
    expect(() => cache.messagingFor('pariwar-a', { ...config, phoneNumberId: '' })).toThrow(/phone_number_id/);
  });
});

describe('mapMetaStatus — the pure Meta-status mapping seam (AC5, Q2)', () => {
  it('maps Meta statuses to the honest SendStatus state', () => {
    expect(mapMetaStatus('sent')).toBe('sent');
    expect(mapMetaStatus('delivered')).toBe('delivered');
    expect(mapMetaStatus('read')).toBe('delivered'); // no `read` state; a read message was delivered
    expect(mapMetaStatus('failed')).toBe('failed');
    expect(mapMetaStatus('deleted')).toBe('failed');
    expect(mapMetaStatus('anything-else')).toBe('unknown'); // never fabricate
  });
});
