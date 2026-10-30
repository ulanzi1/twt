// Story 6.27a (PM11, Task 4) — the member peer-request client: the four calls hit the right paths and methods, the
// Idempotency-Key rides a HEADER on both writes, ⛔ no Turnstile header, and a 404 surfaces as a typed ApiError.

import { describe, expect, it } from 'vitest';

import { ApiError, createMemberPeerRequestClient } from '../src/index';

const P = '11111111-1111-4111-8111-111111111111';
const PING = '22222222-2222-4222-8222-222222222222';

function fakeFetch(responses: { status: number; body: unknown }[]) {
  const calls: { url: string; method: string; headers: Record<string, string>; body: unknown }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method ?? 'GET', headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : undefined });
    const r = responses.shift()!;
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { calls, impl };
}

describe('createMemberPeerRequestClient', () => {
  it('list / get / saveAnswer / submit', async () => {
    const detail = { pingId: PING, memberName: 'A', questionnaire: { versionId: 'peer_mesh.v2', pages: [], closingNote: { en: 'e', hi: 'h' }, thankYou: { en: 'e', hi: 'h' } }, answers: [], submitted: false };
    const { calls, impl } = fakeFetch([
      { status: 200, body: { items: [] } },
      { status: 200, body: detail },
      { status: 200, body: { answers: [{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }] } },
      { status: 200, body: { submitted: true } },
    ]);
    const c = createMemberPeerRequestClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok', fetchImpl: impl });
    expect(await c.list(P)).toEqual({ items: [] });
    expect(await c.get(P, PING)).toEqual(detail);
    await c.saveAnswer(P, PING, 'has_died', { codes: ['died'] }, 'k1');
    expect(await c.submit(P, PING, 'k2')).toEqual({ submitted: true });
    expect(calls.map((x) => `${x.method} ${x.url}`)).toEqual([
      `GET https://api.test/api/v1/p/${P}/member/peer-requests?limit=5`,
      `GET https://api.test/api/v1/p/${P}/member/peer-requests/${PING}`,
      `PUT https://api.test/api/v1/p/${P}/member/peer-requests/${PING}/answers/has_died`,
      `POST https://api.test/api/v1/p/${P}/member/peer-requests/${PING}/submit`,
    ]);
    expect(calls[2]!.headers['idempotency-key']).toBe('k1');
    expect(calls[2]!.body).toEqual({ value: { codes: ['died'] } });
    expect(calls[3]!.headers['idempotency-key']).toBe('k2');
    for (const call of calls) expect(call.headers['x-turnstile-token']).toBeUndefined();
  });

  it('⭐ Story 6.33 (R7) — saveAnswer sends the RENDERED questionnaireVersionId when given; ⛔ the field when not', async () => {
    const ok = { status: 200, body: { answers: [] } };
    const { calls, impl } = fakeFetch([ok, ok]);
    const c = createMemberPeerRequestClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok', fetchImpl: impl });
    await c.saveAnswer(P, PING, 'has_died', { codes: ['died'] }, 'k1', 'peer_mesh.v1001');
    await c.saveAnswer(P, PING, 'has_died', { codes: ['died'] }, 'k2');
    expect(calls[0]!.body).toEqual({ value: { codes: ['died'] }, questionnaireVersionId: 'peer_mesh.v1001' });
    expect(calls[1]!.body).toEqual({ value: { codes: ['died'] } });
  });

  it('⭐ Story 6.27c (R14) — byLink: GET …/by-link/<code>, the code path-encoded, ⛔ a Turnstile header; a 404 is typed', async () => {
    const { calls, impl } = fakeFetch([
      { status: 200, body: { pingId: PING } },
      { status: 404, body: { error: { code: 'peer_request.not_found', message: 'Not found', request_id: 'r' } } },
    ]);
    const c = createMemberPeerRequestClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok', fetchImpl: impl });
    expect(await c.byLink(P, 'Ab3dE5gH9kLm')).toEqual({ pingId: PING });
    const err = await c.byLink(P, 'a/b').catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 404, code: 'peer_request.not_found' });
    expect(calls.map((x) => `${x.method} ${x.url}`)).toEqual([
      `GET https://api.test/api/v1/p/${P}/member/peer-requests/by-link/Ab3dE5gH9kLm`,
      `GET https://api.test/api/v1/p/${P}/member/peer-requests/by-link/a%2Fb`,
    ]);
    for (const call of calls) expect(call.headers['x-turnstile-token']).toBeUndefined();
  });

  it('a 404 is a typed ApiError carrying the code', async () => {
    const { impl } = fakeFetch([{ status: 404, body: { error: { code: 'peer_request.not_found', message: 'Not found', request_id: 'r' } } }]);
    const c = createMemberPeerRequestClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok', fetchImpl: impl });
    const err = await c.get(P, PING).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404, code: 'peer_request.not_found' });
  });
});
