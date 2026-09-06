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
    // ⭐ The RESPONSE still carries the canonical identifier — RETAINED and RENDERED (11b.10 AC1,
    // `2026-09-03-184` cl.2). What changed is the ADDRESS, which is the `driveToken` REQUEST
    // parameter below. ⛔ Do not conflate the two.
    poolCanonicalIdentifier: 'P-2026-09-003',
    // ⚠ Story 11b.12 — the ruled public token; it read `'archive'` before D1(b).
    driveStatus: 'verified',
    closedAt: '2026-09-01T18:45:00.000Z',
    district: 'Lucknow',
    confirmedContributionCount: 137,
    fundingOutcome: 'fully_funded',
    appealReversal: null,
    // ⭐ Story 11b.3a seeded ONE FULL and ONE MASKED account, because the two arms of a
    // `z.discriminatedUnion('masked', …)` validated differently. ⭐⛔ **STORY 11b.11 COLLAPSED THE
    // WIRE** (`2026-09-04-190` cl.1-2 + `2026-09-04-191` cl.1, D1(b)) ⇒ there is ⛔ one shape, and
    // TWO accounts are kept only so the multi-account path stays exercised.
    nomineeBankAccounts: [
      { accountRank: 1, accountHolderName: 'A Holder' },
      { accountRank: 2, accountHolderName: 'B Holder' },
    ],
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
      driveToken: 'P-2026-09-003',
      forwardedFor: '203.0.113.10',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url.pathname).toMatch(/\/public-pages\/sahyog-vivran\/P-2026-09-003$/);
    expect([...calls[0]!.url.searchParams.keys()]).toEqual([]);
  });

  it('⭐ PATH-ENCODES the identifier — it arrives from a URL segment a visitor controls', async () => {
    // ⚠ An unencoded `/` or `?` would re-shape the upstream request into a different route entirely.
    const { calls } = stubFetch(() => json(OK_BODY));
    await fetchSahyogVivran({ driveToken: 'P-2026/09?x=1', forwardedFor: null });
    expect(calls[0]!.url.pathname).toContain('P-2026%2F09%3Fx%3D1');
    expect([...calls[0]!.url.searchParams.keys()]).toEqual([]);
  });

  it('⭐ forwards the visitor address, and OMITS the header when there is none', async () => {
    const { calls } = stubFetch(() => json(OK_BODY));
    await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: '203.0.113.10' });
    expect((calls[0]!.init.headers as Record<string, string>)['x-forwarded-for']).toBe('203.0.113.10');

    await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null });
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
    const res = await fetchSahyogVivran({ driveToken: 'P-X', forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'not_found' });
  });

  it('any OTHER 4xx → `rejected` — still not an outage, and the page still 404s', async () => {
    // ⚠ A malformed identifier is refused at the schema boundary. The caller renders the SAME 404,
    // because a distinguishable *"malformed"* answer is an enumeration signal on a sequential id.
    stubFetch(() => new Response(null, { status: 400 }));
    const res = await fetchSahyogVivran({ driveToken: 'x'.repeat(200), forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'rejected' });
  });

  it('5xx → `bad_response` — a genuine OUTAGE, ⛔ never "no such drive"', async () => {
    stubFetch(() => new Response(null, { status: 503 }));
    const res = await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('a thrown transport error → `unreachable`, and the client ⛔ NEVER THROWS', async () => {
    stubFetch(() => {
      throw new Error('ECONNREFUSED');
    });
    await expect(
      fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null }),
    ).resolves.toEqual({ ok: false, reason: 'unreachable' });
  });

  it('⛔ ONE ATTEMPT, NO RETRY — a retry storm turns a slow API into a self-inflicted outage', async () => {
    const { calls } = stubFetch(() => new Response(null, { status: 500 }));
    await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null });
    expect(calls).toHaveLength(1);
  });
});

describe('⭐ fetchSahyogVivran — every bounded field is validated against its LITERAL set', () => {
  // ⚠ ⛔ NOT `typeof === 'string'` — the 11b.1 review finding, twice over. The render module switches
  // on these values with `default:` branches that THROW, so a bare type check lets an unknown token
  // through and defeats this module's own "⛔ NEVER THROWS" guarantee one function later.

  it('accepts a well-formed body', async () => {
    stubFetch(() => json(OK_BODY));
    const res = await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null });
    expect(res.ok).toBe(true);
  });

  it('⛔ REJECTS an unknown driveStatus token', async () => {
    stubFetch(() => json({ drive: { ...OK_BODY.drive, driveStatus: 'settled' } }));
    const res = await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null });
    // ⚠ `settled` is an INTERNAL lifecycle word with ⛔ NO public token, and it must never cross the
    // public boundary (`2026-08-21-144` cl.8 — the `lock-in` leak `/members` had). Refusing it here
    // is the second place that boundary holds.
    // ⭐⭐ THIS TEST STAYS GREEN THROUGH STORY 11b.12 AND ⛔ MUST NOT BE "FIXED". D1(b) aligned the
    // wire to the ruled public words **Live · Closed · Verified**, so `live` and `closed` now cross
    // deliberately — ⛔ but `settled` does ⛔ NOT: it maps to `verified`, and `spawned` maps to
    // nothing at all. ⇒ the un-ruled internal words are still refused, which is the whole property.
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('⛔ REJECTS an unknown fundingOutcome token', async () => {
    stubFetch(() => json({ drive: { ...OK_BODY.drive, fundingOutcome: 'over_funded' } }));
    const res = await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('⭐ ACCEPTS a null fundingOutcome — it is VALID and load-bearing', async () => {
    // `null` means the drive is still collecting, or that ⛔ no expectation was ever set. Treating it
    // as a bad response would turn every live drive into an outage.
    stubFetch(() => json({ drive: { ...OK_BODY.drive, fundingOutcome: null } }));
    const res = await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null });
    expect(res.ok).toBe(true);
  });

  it('⭐⭐ REJECTS an account carrying ANY withdrawn key — the AC1 absence check', async () => {
    // ⛔⛔ THE ASSERTION THIS MODULE EXISTS TO MAKE ON THIS STORY.
    // ⭐⛔ **THREE TESTS STOOD HERE UNTIL 11b.11, and they are folded into this one because their
    // subjects are gone, ⛔ not because the discipline relaxed.** They were: (1) a MASKED account
    // carrying `accountNumber` is refused — AC4's *"the full value never crosses the wire once
    // masked"*; (2) a masked account whose `accountHolderName` or `vpa` survived is refused —
    // cl.10(e) is a RETENTION list and a retention list is EXHAUSTIVE; (3) an `accountNumberLast4`
    // that is not exactly four digits is refused — a longer string is THE REDUCTION HAVING SILENTLY
    // NOT HAPPENED, which would render as a plausible "ending in …" phrase.
    // ⇒ `2026-09-04-190` cl.1 and `2026-09-04-191` cl.1 withdrew every one of those values from
    // `public`, and 11b.11 D1(b) collapsed the `masked` discriminator ⇒ there is no masked arm to
    // check and no last-4 to validate.
    // ⭐ **WHAT REPLACES THEM IS STRICTLY STRONGER:** every withdrawn key is refused on EVERY
    // account, in EVERY state — including `accountHolderName`'s old companions AND the `masked` flag
    // itself, because the wire may ⛔ not advertise a control it no longer exercises.
    // ⚠ A `typeof === 'object'` check would let any of these straight through, which is why the
    // validator checks for ABSENCE, ⛔ not merely for what the shape does carry.
    // ⛔⛔ MASKING WAS ⛔ NOT DELETED (`2026-09-04-190` cl.4) — the machinery and its own tests are
    // untouched in `@twt/domain`; it has ⛔ NO PUBLIC CONSUMER.
    const withdrawn: Record<string, unknown> = {
      accountNumber: '50100123456789',
      accountNumberLast4: '6789',
      ifsc: 'BARB0VJVAIS',
      vpa: 'someone@upi',
      bankName: 'Bank of Baroda',
      branch: 'Vaishali',
      masked: false,
    };
    for (const [key, value] of Object.entries(withdrawn)) {
      stubFetch(() =>
        json({
          drive: {
            ...OK_BODY.drive,
            nomineeBankAccounts: [
              { accountRank: 1, accountHolderName: 'A Holder', [key]: value },
            ],
          },
        }),
      );
      const res = await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null });
      expect(res, `\`${key}\` must be refused at the SSR boundary`).toEqual({
        ok: false,
        reason: 'bad_response',
      });
    }
  });

  it('⛔ REJECTS an account that OMITS `accountHolderName` — present, ⛔ not "well-typed if present"', async () => {
    // ⚠ The contract REQUIRES the key; a boundary regression that OMITS it (rather than sending
    // `null`) is the exact "catch it at the page rather than publish it" case this validator exists
    // for, and a well-typed-if-present check waves it straight through (review 2026-09-03).
    stubFetch(() =>
      json({ drive: { ...OK_BODY.drive, nomineeBankAccounts: [{ accountRank: 1 }] } }),
    );
    const res = await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('⭐ ACCEPTS a NULL `accountHolderName` — a soft decrypt failure renders NOTHING', async () => {
    // ⚠ `null` is the ABSENT value on this surface, and the page renders nothing for it — ⛔ no
    // placeholder. Treating it as a bad response would turn one failed envelope into a 503.
    stubFetch(() =>
      json({
        drive: {
          ...OK_BODY.drive,
          nomineeBankAccounts: [{ accountRank: 1, accountHolderName: null }],
        },
      }),
    );
    const res = await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null });
    expect(res.ok).toBe(true);
  });

  it('⭐ ACCEPTS an EMPTY accounts array — bank details were never collected, ⛔ not an outage', async () => {
    // ⚠ 6.8's AC3 absence signal. Treating `[]` as a bad response would turn every drive whose bank
    // details were not collected into a 503 — a statement about the trust that is not true.
    stubFetch(() => json({ drive: { ...OK_BODY.drive, nomineeBankAccounts: [] } }));
    const res = await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null });
    expect(res.ok).toBe(true);
  });

  it('⛔ REJECTS a THIRD account — the substrate admits exactly {1, 2}', async () => {
    const account = { accountRank: 1 as const, accountHolderName: null };
    stubFetch(() =>
      json({
        drive: { ...OK_BODY.drive, nomineeBankAccounts: [account, account, account] },
      }),
    );
    const res = await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
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
    expect(await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null })).toEqual({
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
    expect(await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null })).toEqual({
      ok: false,
      reason: 'bad_response',
    });
  });

  it('⛔ REJECTS an EMPTY-STRING district — `null` is valid, `""` is not', async () => {
    // ⚠ `''` would survive as a "present" district and render a visually BLANK cell where the design
    // says "Not recorded" (the 11a.3 finding).
    stubFetch(() => json({ drive: { ...OK_BODY.drive, district: '' } }));
    const res = await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('⛔ REJECTS a collection-shaped body — this route is single-item', async () => {
    stubFetch(() => json({ items: [OK_BODY.drive], page: 1, limit: 25, total: 1 }));
    const res = await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('⛔ REJECTS an HTML proxy error page served with a 200', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>502</html>', { status: 200 }));
    const res = await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null });
    expect(res).toEqual({ ok: false, reason: 'bad_response' });
  });
});
