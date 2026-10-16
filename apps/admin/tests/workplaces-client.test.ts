// Story 6.36c — code review round 2 (HIGH): the three bodyless admin POSTs (delist / relist, close-request, end-campaign)
// send a JSON body. `apiFetch` always sends `content-type: application/json`, and Fastify's JSON parser refuses an EMPTY
// body with that header (`FST_ERR_CTP_EMPTY_JSON_BODY`, a 400) before any hook runs. The page tests mock the client
// module, so they could ⛔ see it: this drives the REAL helpers over a stubbed `fetch` and asserts what reaches the wire.
// Also (code review round 2): every 6.36c WRITE carries an abort signal (`WORKPLACE_WRITE_TIMEOUT_MS`) — a write that never
// settled locked every write control of the Pariwar until a reload.

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addAdminWorkplace,
  closeWorkplaceRequest,
  endKnownPeopleCampaign,
  renameAdminWorkplace,
  setAdminWorkplaceListed,
  startKnownPeopleCampaign,
  suggestWorkplaceForRequest,
  WORKPLACE_WRITE_TIMEOUT_MS,
} from '../src/api/client.js';

const P = '44444444-4444-4444-8444-444444444444';
const OFFICE = '55555555-5555-4555-8555-555555555555';
const REQ = '77777777-7777-4777-8777-777777777777';
const CAMPAIGN = '88888888-8888-4888-8888-888888888888';

afterEach(() => vi.unstubAllGlobals());

function stubJson(body: unknown): ReturnType<typeof vi.fn> {
  const f = vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', f);
  return f;
}

/** The one call's init — its method, its content-type and its body as sent. */
function sent(f: ReturnType<typeof vi.fn>): { url: string; method: string | undefined; contentType: string | undefined; body: unknown; signal: AbortSignal | null | undefined } {
  expect(f).toHaveBeenCalledTimes(1);
  const [url, init] = f.mock.calls[0] as [string, RequestInit];
  return { url, method: init.method, contentType: (init.headers as Record<string, string>)['content-type'], body: init.body, signal: init.signal };
}

describe('the bodyless workplace POSTs send `{}` (code review round 2, HIGH)', () => {
  it.each(['delist', 'relist'] as const)('setAdminWorkplaceListed(%s) — POST with a JSON `{}` body', async (action) => {
    const f = stubJson({
      workplace: { workplaceId: OFFICE, kind: 'office', name: 'DEO OFFICE', district: 'Patna', villageName: null, blockCode: null, udiseSchoolCode: null, source: 'staff', status: action === 'delist' ? 'delisted' : 'listed' },
    });
    await setAdminWorkplaceListed(P, OFFICE, action);
    const s = sent(f);
    expect(s.url).toBe(`/api/v1/p/${P}/admin/workplaces/${OFFICE}/${action}`);
    expect(s.method).toBe('POST');
    expect(s.contentType).toBe('application/json');
    expect(s.body).toBe('{}');
  });

  it('closeWorkplaceRequest — POST with a JSON `{}` body', async () => {
    const f = stubJson({ requestId: REQ, state: 'closed' });
    await closeWorkplaceRequest(P, REQ);
    const s = sent(f);
    expect(s.url).toBe(`/api/v1/p/${P}/admin/workplace-requests/${REQ}/close`);
    expect(s.method).toBe('POST');
    expect(s.contentType).toBe('application/json');
    expect(s.body).toBe('{}');
  });

  it('endKnownPeopleCampaign — POST with a JSON `{}` body', async () => {
    const f = stubJson({ campaign: { campaignId: CAMPAIGN, startsOn: '2026-10-16', endsOn: '2026-10-20', status: 'ended', endedAt: '2026-10-16T08:00:00.000000Z', createdAt: '2026-10-16T00:00:00.000000Z' } });
    await endKnownPeopleCampaign(P, CAMPAIGN);
    const s = sent(f);
    expect(s.url).toBe(`/api/v1/p/${P}/admin/known-people-campaigns/${CAMPAIGN}/end`);
    expect(s.method).toBe('POST');
    expect(s.contentType).toBe('application/json');
    expect(s.body).toBe('{}');
  });
});

describe('every 6.36c write is bounded by an abort signal (code review round 2)', () => {
  const WORKPLACE = { workplaceId: OFFICE, kind: 'office', name: 'DEO OFFICE', district: 'Patna', villageName: null, blockCode: null, udiseSchoolCode: null, source: 'staff', status: 'listed' };
  const CAMPAIGN_WIRE = { campaignId: CAMPAIGN, startsOn: '2026-10-16', endsOn: '2026-10-20', status: 'live', endedAt: null, createdAt: '2026-10-16T00:00:00.000000Z' };
  const cases: [string, unknown, () => Promise<unknown>][] = [
    ['addAdminWorkplace', { workplace: WORKPLACE }, () => addAdminWorkplace(P, { kind: 'office', name: 'X', district: 'Patna' })],
    ['renameAdminWorkplace', { workplace: WORKPLACE }, () => renameAdminWorkplace(P, OFFICE, 'X')],
    ['setAdminWorkplaceListed', { workplace: WORKPLACE }, () => setAdminWorkplaceListed(P, OFFICE, 'delist')],
    ['suggestWorkplaceForRequest', { requestId: REQ, state: 'suggested' }, () => suggestWorkplaceForRequest(P, REQ, OFFICE)],
    ['closeWorkplaceRequest', { requestId: REQ, state: 'closed' }, () => closeWorkplaceRequest(P, REQ)],
    ['startKnownPeopleCampaign', { campaign: CAMPAIGN_WIRE }, () => startKnownPeopleCampaign(P, { startsOn: '2026-10-21', endsOn: '2026-10-25' })],
    ['endKnownPeopleCampaign', { campaign: CAMPAIGN_WIRE }, () => endKnownPeopleCampaign(P, CAMPAIGN)],
  ];
  it.each(cases)('%s sends an (un-aborted) AbortSignal', async (_name, body, call) => {
    const f = stubJson(body);
    await call();
    const s = sent(f);
    expect(s.signal).toBeInstanceOf(AbortSignal);
    expect(s.signal?.aborted).toBe(false);
  });

  it('the bound is ~30 s', () => {
    expect(WORKPLACE_WRITE_TIMEOUT_MS).toBe(30_000);
  });
});
