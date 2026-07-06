// Telegram Bot provider + client + error classification — Story 5.5 (Task 11; AC1, AC2). DB-FREE unit tests:
// the provider is driven with a FAKE TelegramMessagingHandle (no network); the client is driven with a fake
// `fetch` (no network). NEVER a real Telegram call.

import { describe, expect, it, vi } from 'vitest';

import {
  createFixtureTelegramProvider,
  createTelegramAppCache,
  createTelegramBotProvider,
  createTelegramProvider,
  TelegramSendError,
  classifyTelegramError,
  render,
  type SendTarget,
  type TelegramMessagingHandle,
  type TelegramTextMessage,
} from '../src/index.js';
import type { FetchLike } from '../src/providers/telegram-app.js';
import { announcement } from './fixtures.js';

const TARGET: SendTarget = { channel: 'telegram', address: 'chat-123456' };

/** A fake handle that records the message it was sent + returns a fixed message id (no network). */
function fakeHandle(messageId = '42'): { handle: TelegramMessagingHandle; sent: TelegramTextMessage[] } {
  const sent: TelegramTextMessage[] = [];
  return {
    sent,
    handle: {
      send(message) {
        sent.push(message);
        return Promise.resolve(messageId);
      },
    },
  };
}

/** A fake handle that throws a TelegramSendError with the given code / HTTP status. */
function throwingHandle(telegramCode: number | null, httpStatus: number): TelegramMessagingHandle {
  return {
    send() {
      return Promise.reject(new TelegramSendError('telegram rejected', telegramCode, httpStatus));
    },
  };
}

describe('createTelegramBotProvider — send mapping (AC1)', () => {
  it('maps Telegram acceptance → accepted + the message_id as providerMessageId', async () => {
    const { handle, sent } = fakeHandle('99');
    const provider = createTelegramBotProvider({ messaging: handle });
    const rendered = render(announcement(), 'telegram');

    const result = await provider.send(rendered, TARGET);
    expect(result).toEqual({
      channel: 'telegram',
      provider: 'telegram',
      status: 'accepted',
      providerMessageId: '99',
    });
    // Sent to the chat id target, with the render body as text.
    expect(sent[0]).toEqual({ chatId: 'chat-123456', text: rendered.body });
  });

  it('declares scope per-pariwar + getStatus is an honest unknown (no async receipt)', async () => {
    const { handle } = fakeHandle();
    const provider = createTelegramBotProvider({ messaging: handle });
    expect(provider.scope).toBe('per-pariwar');
    expect(provider.id).toBe('telegram');
    expect(await provider.getStatus('42')).toEqual({ providerMessageId: '42', state: 'unknown' });
  });

  it('NEVER rejects the promise on a Telegram error — resolves to a classified rejected result (AC2)', async () => {
    const provider = createTelegramBotProvider({ messaging: throwingHandle(403, 403) });
    const result = await provider.send(render(announcement(), 'telegram'), TARGET);
    expect(result.status).toBe('rejected');
    expect(result.providerMessageId).toBeNull();
    expect(result.detail).toBe('blocked_by_user:403');
  });
});

describe('classifyTelegramError — honest failure classes (AC2)', () => {
  it.each([
    [403, 403, 'blocked_by_user:403'],
    [400, 400, 'chat_not_found:400'],
    [429, 429, 'rate_limited:429'],
    [401, 401, 'auth:401'],
  ])('Telegram code %i (HTTP %i) → %s', (code, httpStatus, expectedDetail) => {
    const r = classifyTelegramError(new TelegramSendError('x', code, httpStatus));
    expect(`${r.errorClass}:${r.code}`).toBe(expectedDetail);
  });

  it('a 5xx / transport failure with no Telegram code → api_unavailable', () => {
    expect(classifyTelegramError(new TelegramSendError('down', null, 503)).errorClass).toBe('api_unavailable');
    expect(classifyTelegramError(new TelegramSendError('net', null, 0)).errorClass).toBe('api_unavailable');
  });

  it('never throws on a hostile getter (the never-reject invariant)', () => {
    const hostile = {
      get telegramCode(): number {
        throw new Error('boom');
      },
    };
    expect(() => classifyTelegramError(hostile)).not.toThrow();
    expect(classifyTelegramError(hostile).errorClass).toBe('unknown');
  });
});

describe('createTelegramProvider — real-vs-fixture selection (AC1)', () => {
  it('null/undefined deps → the log-only fixture (scope global, accepted)', async () => {
    for (const tg of [null, undefined]) {
      const provider = createTelegramProvider(tg);
      expect(provider.scope).toBe('global');
      const result = await provider.send(render(announcement(), 'telegram'), TARGET);
      expect(result.status).toBe('accepted');
      expect(result.providerMessageId).toBe('fixture-telegram');
    }
  });

  it('real deps → the per-pariwar real provider', () => {
    const { handle } = fakeHandle();
    const provider = createTelegramProvider({ messaging: handle });
    expect(provider.scope).toBe('per-pariwar');
  });

  it('the fixture logs (no chat id) via the injected sink', async () => {
    const lines: string[] = [];
    const provider = createFixtureTelegramProvider({ log: (l) => lines.push(l) });
    await provider.send(render(announcement(), 'telegram'), TARGET);
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain('chat-123456');
  });
});

describe('createTelegramAppCache — thin fetch client (AC1, AC2)', () => {
  const config = { botToken: '123456:ABC-DEF' };
  const message: TelegramTextMessage = { chatId: 'chat-99', text: 'Rule amended. Something changed' };

  it('POSTs the sendMessage body to the bot URL + returns the message_id', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, result: { message_id: 777 } }),
    });
    const cache = createTelegramAppCache(fetchImpl);
    const handle = cache.messagingFor('pariwar-a', config);
    const messageId = await handle.send(message);

    expect(messageId).toBe('777');
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`https://api.telegram.org/bot${encodeURIComponent('123456:ABC-DEF')}/sendMessage`);
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.chat_id).toBe('chat-99');
    expect(body.text).toBe('Rule amended. Something changed');
  });

  it('caches the client per pariwar_id (does NOT rebuild per send)', () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, result: { message_id: 1 } }),
    });
    const cache = createTelegramAppCache(fetchImpl);
    const h1 = cache.messagingFor('pariwar-a', config);
    const h2 = cache.messagingFor('pariwar-a', config);
    expect(h1).toBe(h2);
  });

  it('throws a TelegramSendError carrying the code on a non-2xx (so the provider classifies it)', async () => {
    const fetchImpl: FetchLike = () =>
      Promise.resolve({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ ok: false, error_code: 403, description: 'bot was blocked by the user' }),
      });
    const handle = createTelegramAppCache(fetchImpl).messagingFor('pariwar-a', config);
    await expect(handle.send(message)).rejects.toMatchObject({ telegramCode: 403, httpStatus: 403 });
  });

  it('throws a TelegramSendError on a 2xx-but-ok:false body (Telegram signals failure in-band)', async () => {
    const fetchImpl: FetchLike = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: false, error_code: 400, description: 'chat not found' }),
      });
    const handle = createTelegramAppCache(fetchImpl).messagingFor('pariwar-a', config);
    await expect(handle.send(message)).rejects.toMatchObject({ telegramCode: 400, httpStatus: 200 });
  });

  it('throws a TelegramSendError (code null, status 0) on a network/transport failure', async () => {
    const fetchImpl: FetchLike = () => Promise.reject(new Error('ECONNRESET'));
    const handle = createTelegramAppCache(fetchImpl).messagingFor('pariwar-a', config);
    await expect(handle.send(message)).rejects.toMatchObject({ telegramCode: null, httpStatus: 0 });
  });

  it('validates config BEFORE building the client — a blank token fails clear', () => {
    const cache = createTelegramAppCache(() => Promise.reject(new Error('should not be called')));
    expect(() => cache.messagingFor('pariwar-a', { botToken: '' })).toThrow(/bot token/);
  });
});
