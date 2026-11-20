// Story 13.1c, review round 1 (CR32) - the lifecycle helpers of `api/client.ts` over a STUBBED `fetch`. The page tests mock the client
// module, so nothing in them could see what reaches the wire: the route of each act (the End screen's route is `/terminate`), the
// Idempotency-Key header, the `{}` body of Reactivate (Fastify answers 400 to an EMPTY JSON body), the body byte for byte, the log's
// query string, and that a 4xx envelope becomes an `ApiError` carrying the server's code.

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  decideFieldWorkerEndingAppeal,
  getFieldWorkerEndingAppealsOf,
  getFieldWorkerLog,
  listAppealEligibleFieldWorkers,
  listFieldWorkerEndingAppeals,
  lodgeFieldWorkerEndingAppeal,
  moveFieldWorker,
  reactivateFieldWorker,
  suspendFieldWorker,
  terminateFieldWorker,
  undoFieldWorkerEnding,
  withdrawFieldWorkerEndingAppeal,
} from '../src/api/client.js';

const P = '11111111-1111-4111-8111-111111111111';
const W = '00000000-0000-4000-8000-000000000001';
const KEY = 'attempt-key-0001';

afterEach(() => vi.unstubAllGlobals());

const LIFECYCLE = { field_worker_id: W, district: 'Gaya', current_state: 'active', state_reason_code: null, ended_on: null, state_event_version: 4 }; // Story 13.1f (G24)

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
    ['terminate', () => terminateFieldWorker(P, W, { reason_code: 'died', ended_on: '2026-11-06', expected_state_event_version: 4 }, KEY), 'terminate', '{"reason_code":"died","ended_on":"2026-11-06","expected_state_event_version":4}'],
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

// ── Story 13.1f - the undo and the appeal record (code review round 2, chunk D: R2D-17; Task 6.3's "the new client methods") ──
// Every page test replaces these functions with `vi.fn()`, so a wrong path, a mis-keyed query, a dropped `record` or a missing
// Idempotency-Key passed all of them and failed only against the server. Here the REAL functions run over a stubbed `fetch`, against the
// contracts' own response schemas (strict, so a fixture that drifts from the contract fails).

const APPEAL_ID = '22222222-2222-4222-8222-222222222222';
const OLD = '00000000-0000-4000-8000-000000000009';
const APPEAL = {
  appeal_id: APPEAL_ID,
  field_worker_id: W,
  ending_event_version: 4,
  state: 'open',
  heard_by: 'trustee_panel',
  received_on: '2026-11-05',
  received_via: 'phone',
  decided_on: null,
  lodged_by: { user_id: P, display_name: 'Dev Trustee' },
  created_at: '2026-11-05T05:00:00.000Z',
};
const BASE = `/api/v1/p/${P}/field-workers`;

describe('the appeal record - the writes (R2D-17)', () => {
  it.each([
    ['undo', () => undoFieldWorkerEnding(P, W, 4, KEY), `${BASE}/${W}/undo-ending`, '{"expected_ending_version":4}', LIFECYCLE],
    [
      'lodge',
      () => lodgeFieldWorkerEndingAppeal(P, W, { expected_ending_version: 4, received_on: '2026-11-05', received_via: 'phone' }, KEY),
      `${BASE}/${W}/ending-appeals`,
      '{"expected_ending_version":4,"received_on":"2026-11-05","received_via":"phone"}',
      APPEAL,
    ],
    [
      'decide',
      () => decideFieldWorkerEndingAppeal(P, APPEAL_ID, { outcome: 'allowed', decided_on: '2026-11-06' }, KEY),
      `${BASE}/ending-appeals/${APPEAL_ID}/decide`,
      '{"outcome":"allowed","decided_on":"2026-11-06"}',
      { appeal: { ...APPEAL, state: 'allowed', decided_on: '2026-11-06' }, worker: LIFECYCLE },
    ],
    [
      'withdraw',
      () => withdrawFieldWorkerEndingAppeal(P, APPEAL_ID, '2026-11-06', KEY),
      `${BASE}/ending-appeals/${APPEAL_ID}/withdraw`,
      '{"decided_on":"2026-11-06"}',
      { ...APPEAL, state: 'withdrawn', decided_on: '2026-11-06' },
    ],
  ] as const)('%s - POST to its route, the attempt’s Idempotency-Key, the body byte for byte, the response parsed', async (_name, call, url, body, response) => {
    const f = stub(response);
    const out = await call();
    const s = sent(f);
    expect(s.url).toBe(url);
    expect(s.init.method).toBe('POST');
    expect(s.headers['content-type']).toBe('application/json');
    expect(s.headers['Idempotency-Key']).toBe(KEY);
    expect(s.init.body).toBe(body);
    expect(out).toEqual(response);
  });

  it('a refusal becomes an ApiError that carries the server’s status, code and details (what `appealGuidance` reads)', async () => {
    stub({ error: { code: 'field_worker.appeal_not_open', message: 'closed', details: { state: 'refused' } } }, 409);
    const err = await decideFieldWorkerEndingAppeal(P, APPEAL_ID, { outcome: 'refused', decided_on: '2026-11-06' }, KEY).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: 'field_worker.appeal_not_open', details: { state: 'refused' } });
  });
});

describe('the appeal record - the reads (R2D-17)', () => {
  const LIST = { items: [{ ...APPEAL, name: 'Ramesh Kumar', district: 'Patna' }], next_cursor: null };
  const ELIGIBLE = { items: [{ field_worker_id: W, display_name: 'Sita Devi', district: 'Gaya', ended_on: '2026-11-01', reason_code: 'inactive', ending_event_version: 2, heard_by: 'pariwar_admin' }], next_cursor: null };

  it('the appeal list: no query string by default; `state`, `district` and `cursor` by those names, encoded; a GET that is never cached', async () => {
    const f = stub(LIST);
    await listFieldWorkerEndingAppeals(P);
    expect(sent(f).url).toBe(`${BASE}/ending-appeals`);
    expect(sent(f).init.cache).toBe('no-store');
    expect(sent(f).init.method ?? 'GET').toBe('GET');
    const g = stub(LIST);
    await listFieldWorkerEndingAppeals(P, { state: 'open', district: 'Patna', cursor: 'a b+c' });
    expect(sent(g).url).toBe(`${BASE}/ending-appeals?state=open&district=Patna&cursor=a+b%2Bc`);
  });

  it('the eligible list: `district` and `cursor` by those names, on its own path, never cached', async () => {
    const f = stub(ELIGIBLE);
    await listAppealEligibleFieldWorkers(P);
    expect(sent(f).url).toBe(`${BASE}/ending-appeals/eligible`);
    expect(sent(f).init.cache).toBe('no-store');
    const g = stub(ELIGIBLE);
    await listAppealEligibleFieldWorkers(P, { district: 'Gaya', cursor: 'next' });
    expect(sent(g).url).toBe(`${BASE}/ending-appeals/eligible?district=Gaya&cursor=next`);
  });

  it('one worker’s appeals: the worker’s own route, the id encoded, never cached', async () => {
    const f = stub({ items: [APPEAL] });
    await getFieldWorkerEndingAppealsOf(P, W);
    expect(sent(f).url).toBe(`${BASE}/${W}/ending-appeals`);
    expect(sent(f).init.cache).toBe('no-store');
    const g = stub({ items: [] });
    await getFieldWorkerEndingAppealsOf(P, 'a/b');
    expect(sent(g).url).toBe(`${BASE}/a%2Fb/ending-appeals`);
  });

  it('the log: `record` (an earlier record) by that name, alone and with `after`', async () => {
    const f = stub({ items: [], next_after: null });
    await getFieldWorkerLog(P, W, { record: OLD });
    expect(sent(f).url).toBe(`${BASE}/${W}/log?record=${OLD}`);
    const g = stub({ items: [], next_after: null });
    await getFieldWorkerLog(P, W, { after: 42, record: OLD });
    expect(sent(g).url).toBe(`${BASE}/${W}/log?after=42&record=${OLD}`);
  });
});
