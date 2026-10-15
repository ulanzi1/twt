// Story 6.36b (Task 4) — the member people-who-know-me client: every call hits its path and method with the member bearer,
// the Idempotency-Key rides a HEADER on every write (⛔ matching), and a refusal surfaces as a typed ApiError carrying
// the server's code.

import { describe, expect, it } from 'vitest';

import { ApiError, createMemberKnownPeopleClient } from '../src/index';

const LINK = '33333333-3333-4333-8333-333333333333';
const AT = '2026-10-14T10:00:00.000Z';

function fakeFetch(responses: { status: number; body: unknown }[]) {
  const calls: { url: string; method: string; headers: Record<string, string>; body: unknown }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method ?? 'GET', headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : undefined });
    const r = responses.shift()!;
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { calls, impl };
}

describe('createMemberKnownPeopleClient', () => {
  it('the seven calls — paths, methods, the bearer, the Idempotency-Key on every write', async () => {
    const link = { linkId: LINK, label: 'asked', name: null, askedAt: AT };
    const { calls, impl } = fakeFetch([
      { status: 200, body: { matched: [0, 2] } },
      { status: 201, body: { link } },
      { status: 200, body: { items: [link], freeSlots: 2 } },
      { status: 200, body: { linkId: LINK, state: 'removed' } },
      { status: 200, body: { items: [] } },
      { status: 200, body: { linkId: LINK, state: 'accepted' } },
      { status: 200, body: { linkId: LINK, state: 'withdrawn' } },
    ]);
    const c = createMemberKnownPeopleClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok', fetchImpl: impl });
    expect(await c.contactMatches(['+919876543210', 'x', '+919876543211'])).toEqual({ matched: [0, 2] });
    expect(await c.ask('9876543210', 'contacts', 'k-ask')).toEqual({ link });
    expect((await c.list()).freeSlots).toBe(2);
    await c.remove(LINK, 'k-remove');
    await c.requests();
    await c.answer(LINK, 'accept', 'k-answer');
    await c.withdraw(LINK, 'k-withdraw');
    expect(calls.map((x) => `${x.method} ${x.url}`)).toEqual([
      'POST https://api.test/api/v1/member/known-people/contact-matches',
      'POST https://api.test/api/v1/member/known-people',
      'GET https://api.test/api/v1/member/known-people?limit=50',
      `POST https://api.test/api/v1/member/known-people/${LINK}/remove`,
      'GET https://api.test/api/v1/member/known-people/requests?limit=50',
      `POST https://api.test/api/v1/member/known-people/requests/${LINK}/answer`,
      `POST https://api.test/api/v1/member/known-people/requests/${LINK}/withdraw`,
    ]);
    for (const call of calls) expect(call.headers['authorization']).toBe('Bearer tok');
    expect(calls.map((x) => x.headers['idempotency-key'])).toEqual([undefined, 'k-ask', undefined, 'k-remove', undefined, 'k-answer', 'k-withdraw']);
    expect(calls[0]!.body).toEqual({ numbers: ['+919876543210', 'x', '+919876543211'] });
    expect(calls[5]!.body).toEqual({ answer: 'accept' });
  });

  it('a refusal surfaces as ApiError with the server code', async () => {
    const { impl } = fakeFetch([{ status: 409, body: { error: { code: 'known_people.limit_reached', message: 'x', request_id: 'r' } } }]);
    const c = createMemberKnownPeopleClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok', fetchImpl: impl });
    const err = await c.ask('9876543210', 'typed', 'k').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('known_people.limit_reached');
    expect((err as ApiError).status).toBe(409);
  });
});
