// Story 13.1c, review round 1 (CR32) - the lifecycle helpers of `api/client.ts` over a STUBBED `fetch`. The page tests mock the client
// module, so nothing in them could see what reaches the wire: the route of each act (the End screen's route is `/terminate`), the
// Idempotency-Key header, the `{}` body of Reactivate (Fastify answers 400 to an EMPTY JSON body), the body byte for byte, the log's
// query string, and that a 4xx envelope becomes an `ApiError` carrying the server's code.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, getFieldWorkerLog, moveFieldWorker, reactivateFieldWorker, suspendFieldWorker, terminateFieldWorker } from '../src/api/client.js';

const P = '11111111-1111-4111-8111-111111111111';
const W = '00000000-0000-4000-8000-000000000001';
const KEY = 'attempt-key-0001';

afterEach(() => vi.unstubAllGlobals());

const LIFECYCLE = { field_worker_id: W, district: 'Gaya', current_state: 'active', state_reason_code: null, ended_on: null };

function stub(body: unknown, status = 200): ReturnType<typeof vi.fn> {
  const f = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', f);
  return f;
}

function sent(f: ReturnType<typeof vi.fn>): { url: string; init: RequestInit; headers: Record<string, string> } {
  expect(f).toHaveBeenCalledTimes(1);
  const [url, init] = f.mock.calls[0] as [string, RequestInit];
  return { url, init, headers: init.headers as Record<string, string> };
}

describe('the lifecycle writes', () => {
  it.each([
    ['move', () => moveFieldWorker(P, W, { from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned' }, KEY), 'move', '{"from_district":"Patna","to_district":"Gaya","reason_code":"reassigned"}'],
    ['suspend', () => suspendFieldWorker(P, W, { reason_code: 'under_review' }, KEY), 'suspend', '{"reason_code":"under_review"}'],
    ['reactivate', () => reactivateFieldWorker(P, W, KEY), 'reactivate', '{}'],
    ['terminate', () => terminateFieldWorker(P, W, { reason_code: 'died', ended_on: '2026-11-06' }, KEY), 'terminate', '{"reason_code":"died","ended_on":"2026-11-06"}'],
  ] as const)('%s - POST to the act’s route, the attempt’s Idempotency-Key, the body as given', async (_name, call, route, body) => {
    const f = stub(LIFECYCLE);
    const out = await call();
    const s = sent(f);
    expect(s.url).toBe(`/api/v1/p/${P}/field-workers/${W}/${route}`);
    expect(s.init.method).toBe('POST');
    expect(s.headers['content-type']).toBe('application/json');
    expect(s.headers['Idempotency-Key']).toBe(KEY);
    expect(s.init.body).toBe(body); // Reactivate sends `{}` - never an empty body
    expect(out).toEqual(LIFECYCLE);
  });

  it('a refusal becomes an ApiError that carries the server’s status and code (what `actGuidance` reads)', async () => {
    stub({ error: { code: 'field_worker.authorization_stale', message: 'moved' } }, 409);
    const err = await suspendFieldWorker(P, W, { reason_code: 'under_review' }, KEY).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: 'field_worker.authorization_stale' });
  });
});

describe('the log read', () => {
  const PAGE = { items: [], next_after: null };

  it('the first page has no query string; the next passes `after`; it is a GET that is never cached', async () => {
    const f = stub(PAGE);
    await getFieldWorkerLog(P, W);
    expect(sent(f).url).toBe(`/api/v1/p/${P}/field-workers/${W}/log`);
    expect(sent(f).init.cache).toBe('no-store');
    expect(sent(f).init.method ?? 'GET').toBe('GET');
    const g = stub(PAGE);
    await getFieldWorkerLog(P, W, { after: 42 });
    expect(sent(g).url).toBe(`/api/v1/p/${P}/field-workers/${W}/log?after=42`);
  });
});
