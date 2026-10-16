// Story 6.36c (Task 6.1) — the two new member calls: the home prompts (GET, the bearer, an AbortSignal) and the answer to
// a suggested workplace (POST, the Idempotency-Key HEADER, ONE discriminated response); a refusal is a typed ApiError.

import { describe, expect, it } from 'vitest';

import { ApiError, createMemberAuthClient, createMemberKnownPeopleClient } from '../src/index';

const REQ = '33333333-3333-4333-8333-333333333333';
const PROMPTS = {
  noWorkplace: false,
  hasWorkplace: true,
  suggestedWorkplace: null,
  transferReview: false,
  replaceNeeded: false,
  canNamePeople: true,
  campaign: null,
};
const SUMMARY = {
  nominees: { declared: false, count: 0 },
  address: { recorded: false },
  posting: { recorded: true, is_retirement: false },
  medical: { disclosed: false, disclosure_count: 0 },
};

function fakeFetch(responses: { status: number; body: unknown }[]) {
  const calls: { url: string; method: string; headers: Record<string, string>; body: unknown; signal: AbortSignal | null | undefined }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method ?? 'GET', headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : undefined, signal: init.signal });
    const r = responses.shift()!;
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { calls, impl };
}

describe('Story 6.36c — the member calls', () => {
  it('prompts(): GET …/known-people/prompts with the bearer and the signal', async () => {
    const { calls, impl } = fakeFetch([{ status: 200, body: PROMPTS }]);
    const c = createMemberKnownPeopleClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok', fetchImpl: impl });
    const controller = new AbortController();
    expect(await c.prompts({ signal: controller.signal })).toEqual(PROMPTS);
    expect(`${calls[0]!.method} ${calls[0]!.url}`).toBe('GET https://api.test/api/v1/member/known-people/prompts');
    expect(calls[0]!.headers['authorization']).toBe('Bearer tok');
    expect(calls[0]!.signal).toBe(controller.signal);
  });

  it('answerWorkplaceSuggestion(): POST with the Idempotency-Key header; "yes" carries the summary, "no" nothing more; a 409 is an ApiError', async () => {
    const { calls, impl } = fakeFetch([
      { status: 200, body: { answer: 'yes', summary: SUMMARY } },
      { status: 200, body: { answer: 'no' } },
      { status: 409, body: { error: { code: 'workplace.suggestion_stale', message: 'x' } } },
    ]);
    const c = createMemberAuthClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok', fetchImpl: impl });
    expect(await c.answerWorkplaceSuggestion(REQ, 'yes', 'k-1')).toEqual({ answer: 'yes', summary: SUMMARY });
    expect(await c.answerWorkplaceSuggestion(REQ, 'no', 'k-2')).toEqual({ answer: 'no' });
    const err = await c.answerWorkplaceSuggestion(REQ, 'yes', 'k-3').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('workplace.suggestion_stale');
    expect(calls.map((x) => `${x.method} ${x.url}`)).toEqual(Array(3).fill(`POST https://api.test/api/v1/member/life-events/workplace-requests/${REQ}/answer`));
    expect(calls.map((x) => x.headers['idempotency-key'])).toEqual(['k-1', 'k-2', 'k-3']);
    expect(calls.map((x) => x.body)).toEqual([{ answer: 'yes' }, { answer: 'no' }, { answer: 'yes' }]);
  });
});
