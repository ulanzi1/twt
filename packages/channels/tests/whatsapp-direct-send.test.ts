// The DIRECT WhatsApp path's client additions + its outcome classifier — Story 6.31 (Task 3; AC6, AC7; WR8, WR10). DB-free;
// a fake `fetch` (⛔ network). The existing `{ bodyParam }` shape and its tests are UNCHANGED (whatsapp-business.test.ts).
//   · WR8 — `{ bodyParams }` (1–3 non-empty values) emits one text parameter per value, in order; zero / four / an empty value
//     throws `WhatsappTemplateParamError` BEFORE `fetch` (a zero-call recorder); `timeoutMs` aborts a hung fetch ⇒ a
//     `WhatsappSendError` with `httpStatus` 0 and `transport: 'timeout'`; a plain network failure ⇒ `transport: 'network'`;
//     ⛔ `signal` is passed when ⛔ `timeoutMs` (the dispatch path's request is byte-identical).
//   · WR10 — `classifyDirectWaSendFailure`: one leg per rule and per named code, IN ORDER (rule 4 before rule 3's status test).
//   · Decision 2026-10-19-366 — a fetch whose connection never opened (`cause.code` in `WHATSAPP_PRE_CONNECT_CODES`) ⇒
//     `transport: 'connect'` ⇒ `transient` (`api_unavailable:000`); a reset stays `may_have_sent`. Round 2 P8 — an invalid
//     `timeoutMs` or a non-list `bodyParams` is a param error BEFORE fetch; every `http_` token fits the stored grammar.

import { describe, expect, it } from 'vitest';

import {
  classifyDirectWaSendFailure,
  createWhatsappAppCache,
  WhatsappSendError,
  WhatsappTemplateParamError,
  WHATSAPP_PRE_CONNECT_CODES,
  type FetchInit,
  type FetchLike,
  type WhatsappTemplateMessage,
} from '../src/index.js';

const CONFIG = { phoneNumberId: '123456', accessToken: 'sys-user-token', graphApiVersion: 'v21.0' };
const BASE = { to: '919999999999', templateName: 'peer_mesh_reminder_en_v1', languageCode: 'en' };

/** A fetch that records every call and answers 200 + a wamid. */
function recorder(): { fetchImpl: FetchLike; calls: { url: string; init: FetchInit }[] } {
  const calls: { url: string; init: FetchInit }[] = [];
  const fetchImpl: FetchLike = (url, init) => {
    calls.push({ url, init });
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ messages: [{ id: 'wamid.OK' }] }) });
  };
  return { fetchImpl, calls };
}

function bodyOf(init: FetchInit): { template: { components: { type: string; parameters: { type: string; text: string }[] }[] } } {
  return JSON.parse(init.body) as never;
}

describe('WR8 — three values on the wire', () => {
  it('`{ bodyParams: [a, b, c] }` builds ONE body component with three text parameters, in order', async () => {
    const { fetchImpl, calls } = recorder();
    const handle = createWhatsappAppCache(fetchImpl).messagingFor('pariwar-a', CONFIG);
    const message: WhatsappTemplateMessage = { ...BASE, bodyParams: ['Ram Kumar', 'https://app.example/p/ABCDEFGHIJKL', '1800123456'] };
    expect(await handle.send(message)).toBe('wamid.OK');
    expect(calls).toHaveLength(1);
    expect(bodyOf(calls[0]!.init).template.components).toEqual([
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Ram Kumar' },
          { type: 'text', text: 'https://app.example/p/ABCDEFGHIJKL' },
          { type: 'text', text: '1800123456' },
        ],
      },
    ]);
  });

  it('one or two values are fine (row 6-37d sends two)', async () => {
    const { fetchImpl, calls } = recorder();
    const handle = createWhatsappAppCache(fetchImpl).messagingFor('pariwar-a', CONFIG);
    await handle.send({ ...BASE, bodyParams: ['one'] });
    await handle.send({ ...BASE, bodyParams: ['one', 'two'] });
    expect(calls.map((c) => bodyOf(c.init).template.components[0]!.parameters.length)).toEqual([1, 2]);
  });

  it('zero values, four values, or an empty / blank value throws `WhatsappTemplateParamError` BEFORE fetch (⛔ a call)', async () => {
    const { fetchImpl, calls } = recorder();
    const handle = createWhatsappAppCache(fetchImpl).messagingFor('pariwar-a', CONFIG);
    for (const bodyParams of [[], ['a', 'b', 'c', 'd'], ['a', ''], ['   ', 'b', 'c']]) {
      await expect(handle.send({ ...BASE, bodyParams })).rejects.toBeInstanceOf(WhatsappTemplateParamError);
    }
    expect(calls).toHaveLength(0);
    const err = await handle.send({ ...BASE, bodyParams: [] }).catch((e: unknown) => e);
    expect(err).not.toBeInstanceOf(WhatsappSendError);
    // ⛔ a value echoed in the message (a value is a name, a link, a number)
    const named = await handle.send({ ...BASE, bodyParams: ['Ram Kumar', ''] }).catch((e: unknown) => e as Error);
    expect((named as Error).message).not.toContain('Ram Kumar');
  });

  it('the single `{ bodyParam }` passes through unchanged and ⛔ `signal` is sent without `timeoutMs`', async () => {
    const { fetchImpl, calls } = recorder();
    const handle = createWhatsappAppCache(fetchImpl).messagingFor('pariwar-a', CONFIG);
    await handle.send({ ...BASE, bodyParam: '' });
    expect(bodyOf(calls[0]!.init).template.components[0]!.parameters).toEqual([{ type: 'text', text: '' }]);
    expect(Object.keys(calls[0]!.init).sort()).toEqual(['body', 'headers', 'method']);
  });

  it('`timeoutMs` aborts a hung fetch ⇒ a `WhatsappSendError` with httpStatus 0 and transport "timeout"', async () => {
    let seen: AbortSignal | undefined;
    const hung: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        seen = init.signal;
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const handle = createWhatsappAppCache(hung).messagingFor('pariwar-a', CONFIG);
    const err = await handle.send({ ...BASE, bodyParams: ['a'] }, { timeoutMs: 20 }).catch((e: unknown) => e);
    expect(seen).toBeInstanceOf(AbortSignal);
    expect(err).toBeInstanceOf(WhatsappSendError);
    expect(err).toMatchObject({ metaCode: null, httpStatus: 0, transport: 'timeout' });
    expect(classifyDirectWaSendFailure(err)).toEqual({ kind: 'may_have_sent', token: 'timeout' });
  });

  it('a network failure (with or without `timeoutMs`) ⇒ httpStatus 0 and transport "network"', async () => {
    const reset: FetchLike = () => Promise.reject(new Error('ECONNRESET'));
    const handle = createWhatsappAppCache(reset).messagingFor('pariwar-a', CONFIG);
    await expect(handle.send({ ...BASE, bodyParams: ['a'] }, { timeoutMs: 5000 })).rejects.toMatchObject({ httpStatus: 0, transport: 'network' });
    await expect(handle.send({ ...BASE, bodyParam: 'x' })).rejects.toMatchObject({ metaCode: null, httpStatus: 0, transport: 'network' });
  });

  it('`-366` — a connection that never opened (each pre-connect cause code) ⇒ transport "connect" ⇒ transient; a reset ⇒ "network"', async () => {
    const failWith = (code: string): FetchLike => () => Promise.reject(Object.assign(new Error('fetch failed'), { cause: { code } }));
    expect([...WHATSAPP_PRE_CONNECT_CODES].sort()).toEqual(['EAI_AGAIN', 'ECONNREFUSED', 'ENOTFOUND', 'UND_ERR_CONNECT_TIMEOUT']);
    for (const code of WHATSAPP_PRE_CONNECT_CODES) {
      const err = await createWhatsappAppCache(failWith(code)).messagingFor('pariwar-a', CONFIG).send({ ...BASE, bodyParams: ['a'] }, { timeoutMs: 5000 }).catch((e: unknown) => e);
      expect(err, code).toMatchObject({ metaCode: null, httpStatus: 0, transport: 'connect' });
      expect(classifyDirectWaSendFailure(err), code).toEqual({ kind: 'transient', token: 'api_unavailable:000' });
    }
    for (const code of ['ECONNRESET', 'UND_ERR_SOCKET', 'EPIPE']) {
      const err = await createWhatsappAppCache(failWith(code)).messagingFor('pariwar-a', CONFIG).send({ ...BASE, bodyParams: ['a'] }).catch((e: unknown) => e);
      expect(err, code).toMatchObject({ httpStatus: 0, transport: 'network' });
      expect(classifyDirectWaSendFailure(err), code).toEqual({ kind: 'may_have_sent', token: 'network' });
    }
    // A hostile `cause` getter ⇒ ⛔ throw out of the client: a plain network failure.
    const hostile: FetchLike = () => Promise.reject(Object.defineProperty(new Error('x'), 'cause', { get: () => { throw new Error('getter'); } }));
    await expect(createWhatsappAppCache(hostile).messagingFor('pariwar-a', CONFIG).send({ ...BASE, bodyParam: 'x' })).rejects.toMatchObject({ transport: 'network' });
  });

  it('P8 — an invalid `timeoutMs` (−1, 0, NaN, ∞) or a non-list `bodyParams` is a param error BEFORE fetch (⛔ "may have sent")', async () => {
    const { fetchImpl, calls } = recorder();
    const handle = createWhatsappAppCache(fetchImpl).messagingFor('pariwar-a', CONFIG);
    for (const timeoutMs of [-1, 0, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648, Number.MAX_SAFE_INTEGER + 2]) {
      const err = await handle.send({ ...BASE, bodyParams: ['a'] }, { timeoutMs }).catch((e: unknown) => e);
      expect(err, String(timeoutMs)).toBeInstanceOf(WhatsappTemplateParamError);
      expect(classifyDirectWaSendFailure(err)).toEqual({ kind: 'unknown_scope', token: 'param_invalid' });
    }
    for (const bodyParams of [null, 'Ram Kumar', { 0: 'a', length: 1 }]) {
      const err = await handle.send({ ...BASE, bodyParams } as unknown as WhatsappTemplateMessage).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(WhatsappTemplateParamError);
      expect((err as Error).message).not.toContain('Ram Kumar');
    }
    expect(calls).toHaveLength(0);
    await handle.send({ ...BASE, bodyParams: ['a'] }, { timeoutMs: 1 }).catch(() => undefined);
    expect(calls).toHaveLength(1);
  });

  it('a 2xx without a wamid still rejects with its status (the body-read path is unchanged)', async () => {
    const empty: FetchLike = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    const handle = createWhatsappAppCache(empty).messagingFor('pariwar-a', CONFIG);
    const err = await handle.send({ ...BASE, bodyParams: ['a'] }, { timeoutMs: 5000 }).catch((e: unknown) => e);
    expect(err).toMatchObject({ httpStatus: 200 });
    expect((err as WhatsappSendError).transport).toBeUndefined();
    expect(classifyDirectWaSendFailure(err)).toEqual({ kind: 'may_have_sent', token: 'no_wamid' });
  });
});

const meta = (metaCode: number | null, httpStatus: number): WhatsappSendError => new WhatsappSendError('x', metaCode, httpStatus);

describe('WR10 — classifyDirectWaSendFailure (the ordered rules)', () => {
  it('rule 0 — a param error (nothing was sent) ⇒ unknown_scope / param_invalid', () => {
    expect(classifyDirectWaSendFailure(new WhatsappTemplateParamError('bad'))).toEqual({ kind: 'unknown_scope', token: 'param_invalid' });
  });

  it('rule 3 (`-366`) — transport "connect" (the connection never opened) ⇒ transient api_unavailable:000, ⛔ may_have_sent', () => {
    expect(classifyDirectWaSendFailure(new WhatsappSendError('x', null, 0, 'connect'))).toEqual({ kind: 'transient', token: 'api_unavailable:000' });
  });

  it('rule 1 — a thrown fetch, any non-WhatsappSendError throw, or a 2xx without a wamid ⇒ may_have_sent', () => {
    expect(classifyDirectWaSendFailure(new WhatsappSendError('x', null, 0, 'timeout'))).toEqual({ kind: 'may_have_sent', token: 'timeout' });
    expect(classifyDirectWaSendFailure(new WhatsappSendError('x', null, 0, 'network'))).toEqual({ kind: 'may_have_sent', token: 'network' });
    expect(classifyDirectWaSendFailure(meta(null, 0))).toEqual({ kind: 'may_have_sent', token: 'network' });
    expect(classifyDirectWaSendFailure(new Error('boom'))).toEqual({ kind: 'may_have_sent', token: 'unknown' });
    expect(classifyDirectWaSendFailure('a string')).toEqual({ kind: 'may_have_sent', token: 'unknown' });
    expect(classifyDirectWaSendFailure({ metaCode: 131048, httpStatus: 429 })).toEqual({ kind: 'may_have_sent', token: 'unknown' });
    expect(classifyDirectWaSendFailure(meta(null, 200))).toEqual({ kind: 'may_have_sent', token: 'no_wamid' });
    expect(classifyDirectWaSendFailure(meta(131048, 201))).toEqual({ kind: 'may_have_sent', token: 'no_wamid' });
  });

  it('rule 2 — a 502 or a 504 (a gateway that may have forwarded it) ⇒ may_have_sent:gateway_<status>', () => {
    expect(classifyDirectWaSendFailure(meta(null, 502))).toEqual({ kind: 'may_have_sent', token: 'gateway_502' });
    expect(classifyDirectWaSendFailure(meta(131057, 504))).toEqual({ kind: 'may_have_sent', token: 'gateway_504' });
  });

  it('rule 4 — scope-wide, TESTED BEFORE the status test: a 429 with 131048, a 503 with 131057, a 400 with 131045', () => {
    expect(classifyDirectWaSendFailure(meta(131048, 429))).toEqual({ kind: 'scope', token: 'meta_131048' });
    expect(classifyDirectWaSendFailure(meta(131057, 503))).toEqual({ kind: 'scope', token: 'meta_131057' });
    expect(classifyDirectWaSendFailure(meta(131045, 400))).toEqual({ kind: 'scope', token: 'meta_131045' });
    for (const code of [131031, 131042, 133010, 368]) {
      expect(classifyDirectWaSendFailure(meta(code, 400)), String(code)).toEqual({ kind: 'scope', token: `meta_${String(code)}` });
    }
  });

  it('rule 4 — template_not_approved (132xxx) and auth by class; a 401 and a 403 WHATEVER the code', () => {
    expect(classifyDirectWaSendFailure(meta(132001, 400))).toEqual({ kind: 'scope', token: 'template_not_approved' });
    expect(classifyDirectWaSendFailure(meta(132000, 404))).toEqual({ kind: 'scope', token: 'template_not_approved' });
    expect(classifyDirectWaSendFailure(meta(190, 400))).toEqual({ kind: 'scope', token: 'auth' });
    expect(classifyDirectWaSendFailure(meta(null, 401))).toEqual({ kind: 'scope', token: 'http_401' });
    expect(classifyDirectWaSendFailure(meta(null, 403))).toEqual({ kind: 'scope', token: 'http_403' });
    expect(classifyDirectWaSendFailure(meta(131009, 403))).toEqual({ kind: 'scope', token: 'http_403' });
    expect(classifyDirectWaSendFailure(meta(190, 401))).toEqual({ kind: 'scope', token: 'auth' });
  });

  it('rule 5 — recipient: 131026 and 131021 only', () => {
    expect(classifyDirectWaSendFailure(meta(131026, 400))).toEqual({ kind: 'recipient', token: 'meta_131026' });
    expect(classifyDirectWaSendFailure(meta(131021, 400))).toEqual({ kind: 'recipient', token: 'meta_131021' });
  });

  it('rule 3 — transient: a 429 with or without a code (incl. 4 and 133016); 130429 / 131056 / 80007 on any status; any other 5xx', () => {
    expect(classifyDirectWaSendFailure(meta(null, 429))).toEqual({ kind: 'transient', token: 'rate_limited:none' });
    expect(classifyDirectWaSendFailure(meta(4, 429))).toEqual({ kind: 'transient', token: 'rate_limited:4' });
    expect(classifyDirectWaSendFailure(meta(133016, 429))).toEqual({ kind: 'transient', token: 'rate_limited:133016' });
    expect(classifyDirectWaSendFailure(meta(130429, 429))).toEqual({ kind: 'transient', token: 'rate_limited:130429' });
    expect(classifyDirectWaSendFailure(meta(131056, 400))).toEqual({ kind: 'transient', token: 'rate_limited:131056' });
    expect(classifyDirectWaSendFailure(meta(80007, 400))).toEqual({ kind: 'transient', token: 'rate_limited:80007' });
    expect(classifyDirectWaSendFailure(meta(null, 503))).toEqual({ kind: 'transient', token: 'api_unavailable:503' });
    expect(classifyDirectWaSendFailure(meta(null, 500))).toEqual({ kind: 'transient', token: 'api_unavailable:500' });
  });

  it('rule 6 — unknown scope: 131008 / 131009, code 100, 131047, an unrecognised code, a code-less 400 — parked, ⛔ finished', () => {
    expect(classifyDirectWaSendFailure(meta(131009, 400))).toEqual({ kind: 'unknown_scope', token: 'meta_131009' });
    expect(classifyDirectWaSendFailure(meta(131008, 400))).toEqual({ kind: 'unknown_scope', token: 'meta_131008' });
    expect(classifyDirectWaSendFailure(meta(100, 400))).toEqual({ kind: 'unknown_scope', token: 'meta_100' });
    expect(classifyDirectWaSendFailure(meta(131047, 400))).toEqual({ kind: 'unknown_scope', token: 'meta_131047' });
    expect(classifyDirectWaSendFailure(meta(999999, 400))).toEqual({ kind: 'unknown_scope', token: 'meta_999999' });
    expect(classifyDirectWaSendFailure(meta(null, 400))).toEqual({ kind: 'unknown_scope', token: 'http_400' });
  });

  it('rule 6 (P18) — 131052 (inbound media — cannot arise here; if it does, rule 6) and the window class 131051 / 131053 ⇒ unknown scope', () => {
    for (const code of [131052, 131051, 131053]) {
      expect(classifyDirectWaSendFailure(meta(code, 400)), String(code)).toEqual({ kind: 'unknown_scope', token: `meta_${String(code)}` });
    }
  });

  it('rule 1 (P18) — a negative httpStatus (⛔ HTTP information) ⇒ may_have_sent / unknown', () => {
    expect(classifyDirectWaSendFailure(meta(null, -1))).toEqual({ kind: 'may_have_sent', token: 'unknown' });
    expect(classifyDirectWaSendFailure(meta(131048, -1))).toEqual({ kind: 'may_have_sent', token: 'unknown' });
  });

  it('P8 — an unusable status (NaN, fractional, 7 digits, outside 100–599) never yields an ungrammatical token', () => {
    const grammar = /^(?!.*[0-9]{7})(rate_limited:([0-9]{1,6}|none)|api_unavailable:[0-9]{3}|[a-z0-9_]{1,48})$/;
    for (const status of [Number.NaN, 400.5, 500.5, 1_000_000, 9_999_999, 600, 99]) {
      const out = classifyDirectWaSendFailure(meta(null, status));
      expect(out.token, String(status)).toMatch(grammar);
    }
    expect(classifyDirectWaSendFailure(meta(null, Number.NaN))).toEqual({ kind: 'unknown_scope', token: 'http_other' });
    expect(classifyDirectWaSendFailure(meta(null, 1_000_000))).toEqual({ kind: 'unknown_scope', token: 'http_other' });
    expect(classifyDirectWaSendFailure(meta(null, 500.5))).toEqual({ kind: 'unknown_scope', token: 'http_other' });
  });

  it('a token is ALWAYS `[a-z0-9_]+` with ⛔ a 7-digit run (a code outside 0–999999 is `meta_other`)', () => {
    expect(classifyDirectWaSendFailure(meta(2388299, 400))).toEqual({ kind: 'unknown_scope', token: 'meta_other' });
    expect(classifyDirectWaSendFailure(meta(-5, 400))).toEqual({ kind: 'unknown_scope', token: 'meta_other' });
    expect(classifyDirectWaSendFailure(meta(1.5, 400))).toEqual({ kind: 'unknown_scope', token: 'meta_other' });
    expect(classifyDirectWaSendFailure(meta(2388299, 429))).toEqual({ kind: 'transient', token: 'rate_limited:none' });
  });

  it('never throws on a hostile throw', () => {
    const hostile = new Proxy({}, { get: () => { throw new Error('getter'); }, getPrototypeOf: () => { throw new Error('proto'); } });
    expect(classifyDirectWaSendFailure(hostile)).toEqual({ kind: 'may_have_sent', token: 'unknown' });
  });
});
