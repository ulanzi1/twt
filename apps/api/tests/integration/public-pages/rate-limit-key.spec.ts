// ⭐ TRAP 2 — THE RATE-LIMIT KEY IS THE VISITOR'S ADDRESS, NOT THE SSR PROXY'S.
// Story 11a.3 (Task 3; AC6.3, AC10). Hermetic — no DB (the rate-limit hook runs at `onRequest`,
// before any handler, so the ceiling trips without touching Postgres).
//
// ── ⛔ WHY THIS SPEC EXISTS, AND WHY IT IS NOT OPTIONAL ─────────────────────────────────────────
// `2026-08-20-143` cl.9. The directory read lives on `apps/api`, and `apps/public` calls it
// SERVER-SIDE. So every internet visitor arrives at `apps/api` from ONE address — the SSR process's
// — unless the visitor's own address is forwarded. `perSessionKey` falls through to `request.ip`
// for an unauthenticated caller, so without forwarding **all directory traffic on earth would share
// a single rate-limit bucket**: a ceiling that either blocks every visitor at once or protects
// nobody, and an abuse audit line that names the proxy every time.
//
// ⚠ A RATE LIMIT KEYED ON A CONSTANT PASSES EVERY OTHER TEST IN THE SUITE. It returns 429 at the
// right count, emits the right audit line, and looks entirely correct — the ONLY observable
// difference is whether two different visitors share a bucket. That is what this file asserts, and
// it is the single thing standing between the shipped ceiling and one global bucket.
//
// ⚠ The mechanism under test is INHERITED, not written by this story: `limits.search` keys on
// `perSessionKey` → `request.ip`, and `trustProxy: true` (`server.ts:88`) makes `request.ip` read
// the `X-Forwarded-For` chain. ⛔ That is precisely why it is verified rather than assumed — no line
// of this story's code would have to change for it to silently stop being true.

import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { createTestApp, teardown, type TestApp } from '../_setup.js';

const PARIWAR = '5c1f0a10-0000-4000-8000-0000000000d1';
const ROUTE = `/api/v1/p/${PARIWAR}/public-pages/member-directory`;
const FROZEN = new Date('2026-06-15T12:00:00.000Z');

describe('Directory rate-limit KEY (Trap 2, hermetic — no DB)', () => {
  let apps: TestApp[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((t) => teardown(t)));
    apps = [];
  });

  async function appWithCeiling(max: string): Promise<TestApp> {
    const t = await createTestApp({ env: { SEARCH_RATE_MAX: max }, clock: () => FROZEN });
    apps.push(t);
    return t;
  }

  /** One request, presenting `ip` as the forwarded visitor address. */
  async function get(t: TestApp, ip: string): Promise<number> {
    const res = await t.app.inject({
      method: 'GET',
      url: ROUTE,
      headers: { 'x-forwarded-for': ip },
    });
    return res.statusCode;
  }

  it('⭐ TWO DIFFERENT FORWARDED ADDRESSES LAND IN DIFFERENT BUCKETS', async () => {
    const t = await appWithCeiling('2');

    // Visitor A burns the whole ceiling.
    expect(await get(t, '203.0.113.10')).not.toBe(429);
    expect(await get(t, '203.0.113.10')).not.toBe(429);
    expect(await get(t, '203.0.113.10')).toBe(429);

    // ⭐ THE ASSERTION THE WHOLE FILE IS FOR: visitor B is UNAFFECTED. If the key were the SSR
    // proxy's address — or any other constant — this would already be 429, and every other test in
    // the suite would still pass.
    expect(await get(t, '198.51.100.20')).not.toBe(429);
    expect(await get(t, '198.51.100.20')).not.toBe(429);
    // …and B has its own independent ceiling, which it then trips on its own schedule.
    expect(await get(t, '198.51.100.20')).toBe(429);

    // A is still throttled — B's traffic did not reset A's bucket either.
    expect(await get(t, '203.0.113.10')).toBe(429);
  });

  it('the ceiling is REAL: an exceeded key emits a rate_limit.exceeded audit line', async () => {
    const t = await appWithCeiling('1');

    expect(await get(t, '203.0.113.30')).not.toBe(429);
    expect(await get(t, '203.0.113.30')).toBe(429);

    // ⚠ Inherited from the GLOBAL `onExceeded` emitter via `mergeParams` — verified on THIS route,
    // ⛔ not assumed from the plugin's own tests.
    const lines = t.auditSink.ofType('rate_limit.exceeded');
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines.some((l) => String(l.context?.['routeUrl'] ?? '').includes('public-pages'))).toBe(
      true,
    );
    // ⛔ An unauthenticated visitor has NO actor — there is no account here to name or to suspend.
    expect(lines[0]?.actorId).toBeNull();
  });

  it('⚠ the named SEARCH tier is what bounds this route — ⛔ not the looser read tier', async () => {
    // If the route were wired to `limits.read`, tightening SEARCH_RATE_MAX would have NO effect and
    // the third request below would succeed. This is the cheapest possible proof that the route
    // carries the tier its allowlist entry claims it carries.
    const t = await appWithCeiling('2');
    expect(await get(t, '203.0.113.40')).not.toBe(429);
    expect(await get(t, '203.0.113.40')).not.toBe(429);
    expect(await get(t, '203.0.113.40')).toBe(429);
  });

  // ═════════════════════════════════════════════════════════════════════════════════════════════
  // ⛔⛔ STORY 11b.10, TRAP 5 (AC5) — THE TIER IS ⛔ NOT THIS STORY'S TO TOUCH
  // ═════════════════════════════════════════════════════════════════════════════════════════════
  it('⛔ ALL THREE public-pages routes still carry `limits.search` — UNCHANGED, both directions', () => {
    // ⭐ WHY THIS IS ASSERTED BY A STORY THAT DELIBERATELY CHANGED NOTHING HERE: the Panel directed
    // option **(c)** — make the address unguessable — and ⛔ NOT option (b), which was the
    // rate-limit change (`2026-09-03-184` cl.5). 11b.3a's **AC2** rules that tightening this tier as
    // an authoring act is exactly what may not happen, and ⚠ that rule did ⛔ NOT expire when the
    // routing note was answered.
    // ⛔⛔ AND THE PULL IS REAL IN **BOTH** DIRECTIONS, which is why the assertion is a count and not
    // a comment: once the address is a 128-bit token, LOOSENING the tier looks obviously safe ("there
    // is nothing left to enumerate"), and TIGHTENING it looks obviously prudent ("it fronts Tier-1
    // data"). ⭐ Either is a DECISION (`2026-09-02-183` cl.5), ⛔ never an edit.
    const routes = readFileSync(
      new URL('../../../src/modules/public-pages/routes.ts', import.meta.url),
      'utf8',
    )
      // Strip comments — this file's header DISCUSSES the tier at length, and an un-stripped count
      // would be satisfied by the prose rather than by the registrations.
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const registrations = routes.match(/config: \{ rateLimit: limits\.search \}/g) ?? [];
    expect(registrations).toHaveLength(3);
    // ⛔ And ⛔ no other tier, ⛔ no inline ceiling, ⛔ no hand-rolled keyGenerator on this module.
    expect(routes).not.toContain('limits.read');
    expect(routes).not.toContain('keyGenerator');
    expect(routes).not.toMatch(/rateLimit: \{/);
  });
});
