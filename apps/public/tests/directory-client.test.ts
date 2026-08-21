// The `apps/public` → `apps/api` directory client — Story 11a.3 (Task 5; AC1, AC6, AC10).
//
// Two properties, and the first is the one that matters:
//   · ⭐ TRAP 2 — the visitor's address is FORWARDED, appended to any inbound chain. ⛔ Without it
//     every internet visitor reaches `apps/api` as the SSR process and the whole anti-enumeration
//     ceiling collapses into one global bucket.
//   · the client ⛔ NEVER THROWS and ⛔ never retries — a slow upstream must render the outage
//     state, not 500 the public page and not multiply load on the thing already struggling.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildForwardedFor, fetchMemberDirectory } from '../src/lib/directory.server.js';

const OK_BODY = {
  items: [{ name: 'Rajesh Kumar Sharma', district: 'Lucknow', status: 'active' }],
  page: 1,
  limit: 25,
  total: 1,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Install a fetch stub, returning the captured requests. */
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

describe('⭐ TRAP 2 — buildForwardedFor', () => {
  it('sends the visitor address this process observed', () => {
    expect(buildForwardedFor('203.0.113.10')).toBe('203.0.113.10');
    expect(buildForwardedFor('  203.0.113.10  ')).toBe('203.0.113.10');
  });

  it('⛔ RETURNS null — NEVER an empty string — when no address was observed', () => {
    // ⛔ THE REGRESSION GUARD. An empty `X-Forwarded-For` reads to `proxy-addr` as "no chain", so
    // `request.ip` falls back to the socket address — the SSR process — collapsing every such
    // visitor into ONE bucket. That is the exact failure this module exists to prevent, arriving
    // silently. `null` forces the caller to OMIT the header instead.
    expect(buildForwardedFor(null)).toBeNull();
    expect(buildForwardedFor(undefined)).toBeNull();
    expect(buildForwardedFor('')).toBeNull();
    expect(buildForwardedFor('   ')).toBeNull();
  });

  it('⭐ DIFFERENT VISITORS PRODUCE DIFFERENT VALUES — the property the ceiling depends on', () => {
    // ⛔ If this ever returned a constant, `apps/api`'s rate limit would key every visitor on earth
    // into one bucket while every other test in both apps continued to pass.
    expect(buildForwardedFor('203.0.113.10')).not.toBe(buildForwardedFor('198.51.100.20'));
  });
});

describe('⭐⛔ THE KEY IS NOT CALLER-CHOSEN — `2026-08-21-145` cl.2', () => {
  // ── WHAT THESE REPLACE, AND WHY ────────────────────────────────────────────────────────────
  // This block previously asserted that `buildForwardedFor` APPENDED the visitor address to the
  // inbound chain ("⛔ never replaces it"), on the reasoning that dropping upstream hops discards
  // information and is not what the standard means. Both true — and together a security hole:
  // `apps/api` runs `trustProxy: true`, under which `request.ip` is the LEFTMOST chain entry, and
  // on a public SSR request the inbound chain is whatever the BROWSER sent. ⇒ appending put an
  // ATTACKER-CHOSEN value in the position the rate limit and every abuse counter key on, and one
  // rotated header gave every request a fresh bucket.
  // ⚠ The old tests could not see it: they only ever asserted the STRING that came out, never
  // which end of it `apps/api` would read.

  it('⛔ an inbound X-Forwarded-For CANNOT influence the value sent onward', () => {
    const hostile = '10.0.0.1, 10.0.0.2, 127.0.0.1';
    // Whatever a caller sends, the value is decided solely by the observed address.
    expect(buildForwardedFor('203.0.113.10')).toBe('203.0.113.10');
    expect(buildForwardedFor('203.0.113.10')).not.toContain(hostile);
    // ⛔ And the function cannot even be TOLD about a chain any more — the parameter is gone.
    expect(buildForwardedFor.length).toBe(1);
  });

  it('⛔ a rotating attacker header does NOT produce rotating keys', () => {
    // The scraper's lever was: vary the header, get a fresh bucket every request. With the chain
    // discarded, every request from one visitor yields the SAME value however the header varies.
    const keys = new Set(
      ['10.0.0.1', '10.0.0.2', '10.0.0.3'].map(() => buildForwardedFor('203.0.113.10')),
    );
    expect(keys.size).toBe(1);
  });
});

describe('fetchMemberDirectory — the request it actually sends', () => {
  it('⭐ SENDS the forwarded address on the wire', async () => {
    const { calls } = stubFetch(() => json(OK_BODY));
    await fetchMemberDirectory({ page: 2, limit: 10, forwardedFor: '203.0.113.10' });

    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers['x-forwarded-for']).toBe('203.0.113.10');
  });

  it('sends the bounded page + limit, and nothing else', async () => {
    const { calls } = stubFetch(() => json(OK_BODY));
    await fetchMemberDirectory({ page: 2, limit: 10, forwardedFor: '203.0.113.10' });

    const url = calls[0]!.url;
    expect(url.pathname).toMatch(/\/public-pages\/member-directory$/);
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('limit')).toBe('10');
    // ⛔ NO export parameter, ever.
    expect([...url.searchParams.keys()].sort()).toEqual(['limit', 'page']);
  });

  it('parses a well-formed response', async () => {
    stubFetch(() => json(OK_BODY));
    const res = await fetchMemberDirectory({ page: 1, limit: 25, forwardedFor: '1.2.3.4' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.items[0]?.name).toBe('Rajesh Kumar Sharma');
  });
});

describe('⛔ the client never throws, and never retries', () => {
  it('a non-2xx becomes an OUTAGE result, ⛔ not an exception', async () => {
    stubFetch(() => json({ error: 'nope' }, 500));
    const res = await fetchMemberDirectory({ page: 1, limit: 25, forwardedFor: '1.2.3.4' });
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('a network failure becomes an OUTAGE result', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('ECONNREFUSED')));
    const res = await fetchMemberDirectory({ page: 1, limit: 25, forwardedFor: '1.2.3.4' });
    expect(res).toEqual({ ok: false, reason: 'unreachable' });
  });

  it('⛔ a WRONG-SHAPED body is an outage, ⛔ not a render of garbage', async () => {
    // A proxy error page or an HTML 502 arriving with a JSON content-type must not reach the render.
    stubFetch(() => json({ items: 'not-an-array', page: 1, limit: 25, total: 0 }));
    const res = await fetchMemberDirectory({ page: 1, limit: 25, forwardedFor: '1.2.3.4' });
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('⛔ a row with an UNEXPECTED status value is rejected', async () => {
    stubFetch(() =>
      json({ items: [{ name: 'X', district: null, status: 'suspended' }], page: 1, limit: 25, total: 1 }),
    );
    const res = await fetchMemberDirectory({ page: 1, limit: 25, forwardedFor: '1.2.3.4' });
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('⭐ makes EXACTLY ONE request — ⛔ a retry storm on a public page is self-inflicted outage', async () => {
    const { calls } = stubFetch(() => json({ error: 'boom' }, 503));
    await fetchMemberDirectory({ page: 1, limit: 25, forwardedFor: '1.2.3.4' });
    expect(calls).toHaveLength(1);
  });
});
