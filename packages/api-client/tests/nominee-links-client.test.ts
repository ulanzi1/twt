// Story 6.36e (Task 3; AC2, AC4) — the member nominee-links client: every call hits its path and method with the member
// bearer, the Idempotency-Key rides a HEADER on the answer (⛔ the reads), a refusal surfaces as a typed ApiError carrying the
// server's code; and the contact-matches `purpose` (NE3) is sent ONLY when given — the 6.36b body is unchanged.

import { describe, expect, it } from 'vitest';

import { ApiError, createMemberAuthClient, createMemberKnownPeopleClient, createMemberNomineeLinksClient } from '../src/index';

const LINK = '44444444-4444-4444-8444-444444444444';
const AT = '2026-10-24T10:00:00.000Z';

function fakeFetch(responses: { status: number; body: unknown }[]) {
  const calls: { url: string; method: string; headers: Record<string, string>; body: unknown }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method ?? 'GET', headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : undefined });
    const r = responses.shift()!;
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { calls, impl };
}

describe('createMemberNomineeLinksClient', () => {
  it('the three calls — paths, methods, the bearer, the Idempotency-Key on the answer only', async () => {
    const { calls, impl } = fakeFetch([
      { status: 200, body: { ranks: [{ rank: 1, versionNo: 2, relationship: 'spouse' }], links: [{ rank: 1, linkId: LINK, label: 'confirmed', name: 'Asha Devi' }] } },
      { status: 200, body: { items: [{ linkId: LINK, answer: null, name: 'Ravi Kumar', askedAt: AT }], nextCursor: 'c-2', hasMore: true } },
      { status: 200, body: { items: [], nextCursor: null, hasMore: false } },
      { status: 200, body: { linkId: LINK, answer: 'confirmed' } },
    ]);
    const c = createMemberNomineeLinksClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok', fetchImpl: impl });
    const read = await c.links();
    expect(read.links[0]!.label).toBe('confirmed');
    expect(read.ranks).toEqual([{ rank: 1, versionNo: 2, relationship: 'spouse' }]);
    expect((await c.requests()).nextCursor).toBe('c-2');
    await c.requests({ cursor: 'c-2/+=' });
    expect(await c.answer(LINK, 'yes', 'k-answer')).toEqual({ linkId: LINK, answer: 'confirmed' });
    expect(calls.map((x) => `${x.method} ${x.url}`)).toEqual([
      'GET https://api.test/api/v1/member/life-events/nominee-links',
      'GET https://api.test/api/v1/member/nominee-links/requests?limit=50',
      'GET https://api.test/api/v1/member/nominee-links/requests?limit=50&cursor=c-2%2F%2B%3D',
      `POST https://api.test/api/v1/member/nominee-links/requests/${LINK}/answer`,
    ]);
    for (const call of calls) expect(call.headers['authorization']).toBe('Bearer tok');
    expect(calls.map((x) => x.headers['idempotency-key'])).toEqual([undefined, undefined, undefined, 'k-answer']);
    expect(calls[3]!.body).toEqual({ answer: 'yes' });
  });

  it('the links read is STRICT-parsed — a pre-6.36f body without `ranks` is refused (TR10)', async () => {
    const { impl } = fakeFetch([{ status: 200, body: { links: [] } }]);
    const c = createMemberNomineeLinksClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok', fetchImpl: impl });
    await expect(c.links()).rejects.toBeDefined();
  });

  it('the marks-only save (6.36f MK1) — POST …/life-events/nominees/marks with the bearer, the body as given, the status parsed', async () => {
    const { calls, impl } = fakeFetch([{ status: 200, body: { nominees: [{ rank: 1, relationship: 'spouse', splitPct: 100, mobilePresent: true, addressPresent: false }], locked: false } }]);
    const auth = createMemberAuthClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok', fetchImpl: impl });
    const body = { marks: [{ rank: 1 as const, versionNo: 2, memberLink: { kind: 'keep' as const, linkId: LINK } }] };
    expect((await auth.lifeEventsUpdateNomineeMarks(body)).nominees).toHaveLength(1);
    expect(calls.map((x) => `${x.method} ${x.url}`)).toEqual(['POST https://api.test/api/v1/member/life-events/nominees/marks']);
    expect(calls[0]!.headers['authorization']).toBe('Bearer tok');
    expect(calls[0]!.body).toEqual(body);
  });

  it('a refusal surfaces as ApiError with the server code', async () => {
    const { impl } = fakeFetch([{ status: 409, body: { error: { code: 'nominee_link.request_closed', message: 'x', request_id: 'r' } } }]);
    const c = createMemberNomineeLinksClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok', fetchImpl: impl });
    const err = await c.answer(LINK, 'not_me', 'k').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('nominee_link.request_closed');
    expect((err as ApiError).status).toBe(409);
  });

  it('contact matching sends `purpose` ONLY when given (NE3) — the 6.36b body is unchanged', async () => {
    const { calls, impl } = fakeFetch([
      { status: 200, body: { matched: [] } },
      { status: 200, body: { matched: [0] } },
    ]);
    const c = createMemberKnownPeopleClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok', fetchImpl: impl });
    await c.contactMatches(['+919876543210']);
    await c.contactMatches(['+919876543210'], 'nominee_link');
    expect(calls.map((x) => x.body)).toEqual([{ numbers: ['+919876543210'] }, { numbers: ['+919876543210'], purpose: 'nominee_link' }]);
  });
});
