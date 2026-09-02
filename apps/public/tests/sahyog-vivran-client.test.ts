// The `apps/public` → `apps/api` per-claim Sahyog Vivran client — Story 11b.3 (Task 3/4; AC1, AC6).
//
// ⭐ THE PROPERTY THIS FILE EXISTS FOR: a 404 and an OUTAGE are DIFFERENT STATEMENTS and must never
// collapse. *"There is no such drive"* is a statement about the public record; *"we could not load
// this"* is a statement about THIS REQUEST'S luck. ⚠ Rendering the second on the first's evidence
// reports an ordinary 404 to every crawler and uptime monitor as a server fault; rendering the FIRST
// on the SECOND's evidence tells a family their relative's drive is not on the public record.
// ⛔ That collapse is the defect AC7 exists to prevent one surface over, and the 11b.1 review found it
// TWICE — patched at two triggering inputs before the SHAPE was finally fixed.
//
// ⭐ AND THE FORWARDED ADDRESS: on THIS route the rate limit is the ONLY thing bounding a walk of a
// SEQUENTIAL identifier (controls 2 and 3 are structurally N/A, D11(a)). ⛔ Without the header, every
// internet visitor reaches `apps/api` as the SSR process and that single bound collapses into one
// global bucket.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildForwardedFor, fetchSahyogVivran } from '../src/lib/sahyog-vivran.server.js';

const OK_BODY = {
  drive: {
    poolLetterCode: 'C',
    poolCanonicalIdentifier: 'P-2026-09-003',
    driveStatus: 'archive',
    closedAt: '2026-09-01T18:45:00.000Z',
    district: 'Lucknow',
    confirmedContributionCount: 137,
    fundingOutcome: 'fully_funded',
    appealReversal: null,
  },
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function stubFetch(impl: (url: URL, init: RequestInit) => Promise<Response> | Response): {
  calls: Array<{ url: URL; init: RequestInit }>;
} {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  vi.stubGlobal('fetch', async (url: URL, init: RequestInit) => {
    calls.push({ url, init });
    return impl(url, init);
  });
  return { calls };
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('fetchSahyogVivran — the request', () => {
  it('calls the single-item route and sends NO query parameters at all', async () => {
    // ⭐ The API's query schema is EMPTY and `.strict()`, so any parameter is a 400 — that emptiness
    // is precisely WHY controls 2 and 3 are structurally N/A. Sending one would still be a bug HERE.
    const { calls } = stubFetch(() => json(OK_BODY));
    await fetchSahyogVivran({
      poolCanonicalIdentifier: 'P-2026-09-003',
      forwardedFor: '203.0.113.10',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url.pathname).toMatch(/\/public-pages\/sahyog-vivran\/P-2026-09-003$/);
    expect([...calls[0]!.url.searchParams.keys()]).toEqual([]);
  });

  it('⭐ PATH-ENCODES the identifier — it arrives from a URL segment a visitor controls', async () => {
    // ⚠ An unencoded `/` or `?` would re-shape the upstream request into a different route entirely.
    const { calls } = stubFetch(() => json(OK_BODY));
    await fetchSahyogVivran({ poolCanonicalIdentifier: 'P-2026/09?x=1', forwardedFor: null });
    expect(calls[0]!.url.pathname).toContain('P-2026%2F09%3Fx%3D1');
    expect([...calls[0]!.url.searchParams.keys()]).toEqual([]);
  });

  it('⭐ forwards the visitor address, and OMITS the header when there is none', async () => {
    const { calls } = stubFetch(() => json(OK_BODY));
    await fetchSahyogVivran({ poolCanonicalIdentifier: 'P-1', forwardedFor: '203.0.113.10' });
    expect((calls[0]!.init.headers as Record<string, string>)['x-forwarded-for']).toBe('203.0.113.10');

    await fetchSahyogVivran({ poolCanonicalIdentifier: 'P-1', forwardedFor: null });
    // ⛔ OMITTED, ⛔ never empty: an empty `X-Forwarded-For` reads to `proxy-addr` as "no chain", so
    // `request.ip` falls back to the SSR socket and every such visitor lands in ONE bucket.
    expect('x-forwarded-for' in (calls[1]!.init.headers as Record<string, string>)).toBe(false);
  });

  it('buildForwardedFor is the REUSED helper, not a second copy', () => {
    expect(buildForwardedFor('  203.0.113.10 ')).toBe('203.0.113.10');
    expect(buildForwardedFor(undefined)).toBeNull();
  });
});

describe('⭐⭐ fetchSahyogVivran — a 404 is NOT an outage, and an outage is NOT a 404', () => {
  it('404 → `not_found` — the ordinary answer, ⛔ never an outage reason', async () => {
    stubFetch(() => new Response(null, { status: 404 }));
    const res = await fetchSahyogVivran({ poolCanonicalIdentifier: 'P-X', forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'not_found' });
  });

  it('any OTHER 4xx → `rejected` — still not an outage, and the page still 404s', async () => {
    // ⚠ A malformed identifier is refused at the schema boundary. The caller renders the SAME 404,
    // because a distinguishable *"malformed"* answer is an enumeration signal on a sequential id.
    stubFetch(() => new Response(null, { status: 400 }));
    const res = await fetchSahyogVivran({ poolCanonicalIdentifier: 'x'.repeat(200), forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'rejected' });
  });

  it('5xx → `bad_response` — a genuine OUTAGE, ⛔ never "no such drive"', async () => {
    stubFetch(() => new Response(null, { status: 503 }));
    const res = await fetchSahyogVivran({ poolCanonicalIdentifier: 'P-1', forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('a thrown transport error → `unreachable`, and the client ⛔ NEVER THROWS', async () => {
    stubFetch(() => {
      throw new Error('ECONNREFUSED');
    });
    await expect(
      fetchSahyogVivran({ poolCanonicalIdentifier: 'P-1', forwardedFor: null }),
    ).resolves.toEqual({ ok: false, reason: 'unreachable' });
  });

  it('⛔ ONE ATTEMPT, NO RETRY — a retry storm turns a slow API into a self-inflicted outage', async () => {
    const { calls } = stubFetch(() => new Response(null, { status: 500 }));
    await fetchSahyogVivran({ poolCanonicalIdentifier: 'P-1', forwardedFor: null });
    expect(calls).toHaveLength(1);
  });
});

describe('⭐ fetchSahyogVivran — every bounded field is validated against its LITERAL set', () => {
  // ⚠ ⛔ NOT `typeof === 'string'` — the 11b.1 review finding, twice over. The render module switches
  // on these values with `default:` branches that THROW, so a bare type check lets an unknown token
  // through and defeats this module's own "⛔ NEVER THROWS" guarantee one function later.

  it('accepts a well-formed body', async () => {
    stubFetch(() => json(OK_BODY));
    const res = await fetchSahyogVivran({ poolCanonicalIdentifier: 'P-1', forwardedFor: null });
    expect(res.ok).toBe(true);
  });

  it('⛔ REJECTS an unknown driveStatus token', async () => {
    stubFetch(() => json({ drive: { ...OK_BODY.drive, driveStatus: 'settled' } }));
    const res = await fetchSahyogVivran({ poolCanonicalIdentifier: 'P-1', forwardedFor: null });
    // ⚠ `settled` is the INTERNAL lifecycle word, and it must never cross the public boundary
    // (`2026-08-21-144` cl.8 — the `lock-in` leak `/members` had). Refusing it here is the second
    // place that boundary holds.
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('⛔ REJECTS an unknown fundingOutcome token', async () => {
    stubFetch(() => json({ drive: { ...OK_BODY.drive, fundingOutcome: 'over_funded' } }));
    const res = await fetchSahyogVivran({ poolCanonicalIdentifier: 'P-1', forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('⭐ ACCEPTS a null fundingOutcome — it is VALID and load-bearing', async () => {
    // `null` means the drive is still collecting, or that ⛔ no expectation was ever set. Treating it
    // as a bad response would turn every live drive into an outage.
    stubFetch(() => json({ drive: { ...OK_BODY.drive, fundingOutcome: null } }));
    const res = await fetchSahyogVivran({ poolCanonicalIdentifier: 'P-1', forwardedFor: null });
    expect(res.ok).toBe(true);
  });

  it('⛔ REJECTS an out-of-range appeal stage and an unknown disposition tag', async () => {
    stubFetch(() =>
      json({
        drive: {
          ...OK_BODY.drive,
          appealReversal: { reversedAtStage: 7, dispositionCategory: 'procedural_correction', reversedAt: 'x' },
        },
      }),
    );
    expect(await fetchSahyogVivran({ poolCanonicalIdentifier: 'P-1', forwardedFor: null })).toEqual({
      ok: false,
      reason: 'bad_response',
    });

    stubFetch(() =>
      json({
        drive: {
          ...OK_BODY.drive,
          appealReversal: { reversedAtStage: 2, dispositionCategory: 'because I said so', reversedAt: 'x' },
        },
      }),
    );
    // ⛔⛔ THE ONE THAT MATTERS MOST: an unbounded string in the disposition slot is how FREE TEXT
    // would reach a public page through a field the ruling declared bounded and NON-PII.
    expect(await fetchSahyogVivran({ poolCanonicalIdentifier: 'P-1', forwardedFor: null })).toEqual({
      ok: false,
      reason: 'bad_response',
    });
  });

  it('⛔ REJECTS an EMPTY-STRING district — `null` is valid, `""` is not', async () => {
    // ⚠ `''` would survive as a "present" district and render a visually BLANK cell where the design
    // says "Not recorded" (the 11a.3 finding).
    stubFetch(() => json({ drive: { ...OK_BODY.drive, district: '' } }));
    const res = await fetchSahyogVivran({ poolCanonicalIdentifier: 'P-1', forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('⛔ REJECTS a collection-shaped body — this route is single-item', async () => {
    stubFetch(() => json({ items: [OK_BODY.drive], page: 1, limit: 25, total: 1 }));
    const res = await fetchSahyogVivran({ poolCanonicalIdentifier: 'P-1', forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('⛔ REJECTS an HTML proxy error page served with a 200', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>502</html>', { status: 200 }));
    const res = await fetchSahyogVivran({ poolCanonicalIdentifier: 'P-1', forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });
});
