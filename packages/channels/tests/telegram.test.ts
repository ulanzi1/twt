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

// Story 5.14 (Task 3; FS7 (a), `2026-10-29-418` item 6) — the client gains a request TIMEOUT (a `signal` on the fetch seam, default
// 9 000 ms — MSG91's value; the cache-level bound applies to the per-member mirror too: its hung call now ends `rejected` /
// `api_unavailable` instead of hanging) and `retryAfter` on its error (Telegram's `parameters.retry_after` — the channel poster's 429
// re-send). ⛔ A new error class: a timeout is the existing transport path (code null, status 0 ⇒ `api_unavailable`).
describe('createTelegramAppCache — the request timeout and retry_after (Story 5.14, FS7)', () => {
  const config = { botToken: '123456:ABC-DEF' };
  const message: TelegramTextMessage = { chatId: '@twt_bihar_notices', text: 'Pool A is now open.' };

  it('every send carries a signal from the timeout seam, bounded at 9 000 ms by default', async () => {
    const timeoutSignal = vi.fn((ms: number) => AbortSignal.timeout(ms));
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, result: { message_id: 5 } }) });
    await createTelegramAppCache(fetchImpl, { timeoutSignal }).messagingFor('pariwar-a', config).send(message);
    expect(timeoutSignal).toHaveBeenCalledWith(9_000);
    expect(fetchImpl.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
  });

  it('a configured timeoutMs is used; an invalid one fails at construction (⛔ a param error at send time)', async () => {
    const timeoutSignal = vi.fn((ms: number) => AbortSignal.timeout(ms));
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, result: { message_id: 5 } }) });
    await createTelegramAppCache(fetchImpl, { timeoutMs: 1_500, timeoutSignal }).messagingFor('pariwar-a', config).send(message);
    expect(timeoutSignal).toHaveBeenCalledWith(1_500);
    for (const timeoutMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648]) {
      expect(() => createTelegramAppCache(fetchImpl, { timeoutMs }), String(timeoutMs)).toThrow(/timeoutMs/);
    }
  });

  it('⭐ a HUNG server ends in a TelegramSendError (code null, status 0 — the existing api_unavailable class) once the signal aborts', async () => {
    const controller = new AbortController();
    // The fake honours the signal the way undici's fetch does: it rejects when the signal aborts, and never resolves otherwise.
    const fetchImpl: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'TimeoutError')));
      });
    const send = createTelegramAppCache(fetchImpl, { timeoutSignal: () => controller.signal }).messagingFor('pariwar-a', config).send(message);
    controller.abort();
    const err = await send.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TelegramSendError);
    expect(err).toMatchObject({ telegramCode: null, httpStatus: 0, retryAfter: null });
    expect(classifyTelegramError(err).errorClass).toBe('api_unavailable');
  });

  it('⭐ a 429 carries Telegram\'s retry_after (seconds); other errors carry null', async () => {
    const tooMany: FetchLike = () =>
      Promise.resolve({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ ok: false, error_code: 429, description: 'Too Many Requests: retry after 7', parameters: { retry_after: 7 } }),
      });
    await expect(createTelegramAppCache(tooMany).messagingFor('p', config).send(message)).rejects.toMatchObject({ telegramCode: 429, httpStatus: 429, retryAfter: 7 });
    const notFound: FetchLike = () =>
      Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ ok: false, error_code: 400, description: 'Bad Request: chat not found' }) });
    await expect(createTelegramAppCache(notFound).messagingFor('p', config).send(message)).rejects.toMatchObject({ telegramCode: 400, retryAfter: null });
    // a hostile / malformed retry_after is null (⛔ a NaN delay)
    for (const parameters of [{ retry_after: 'soon' }, { retry_after: -3 }, { retry_after: 1.5 }, null, 'x']) {
      const odd: FetchLike = () => Promise.resolve({ ok: false, status: 429, json: () => Promise.resolve({ ok: false, error_code: 429, parameters }) });
      await expect(createTelegramAppCache(odd).messagingFor('p', config).send(message)).rejects.toMatchObject({ retryAfter: null });
    }
  });

  it('a 2xx with no message_id still throws (it MAY have posted — the caller records unknown)', async () => {
    const noId: FetchLike = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, result: {} }) });
    await expect(createTelegramAppCache(noId).messagingFor('p', config).send(message)).rejects.toMatchObject({ telegramCode: null, httpStatus: 200, retryAfter: null });
  });
});


describe('Story 5.14 review — strict Telegram acceptance and timeout validation', () => {
  it.each([undefined, false, 'true', 1])('requires explicit boolean ok:true, got %s', async (ok) => {
    const fetchImpl: FetchLike = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ...(ok === undefined ? {} : { ok }), result: { message_id: 42 } }) });
    await expect(createTelegramAppCache(fetchImpl).messagingFor('p', { botToken: '123:abc' }).send({ chatId: '@test_chat', text: 'x' })).rejects.toMatchObject({ httpStatus: 200 });
  });
  it('rejects fractional timeouts at construction, before any send', () => {
    expect(() => createTelegramAppCache(undefined, { timeoutMs: 1.5 })).toThrow(/timeoutMs is invalid/);
  });
});
