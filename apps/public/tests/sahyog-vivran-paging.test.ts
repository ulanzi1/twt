// Story 11b.3b (Task 3, AC4) — the Sahyog Vivran page's query and paging-link rules.
//
// ⭐ Added 2026-09-18 (fourth review pass). Four of these rules were fixes from the second and
// adversarial passes and were recorded as "proven by MUTATION" with ⛔ no committed test, because they
// lived inline in the `.astro` frontmatter. ⇒ they now live in `lib/sahyog-vivran-paging.ts`, and
// every leg below fails if its rule is reverted.

import { describe, expect, it } from 'vitest';

import { PUBLIC_PAGE_HORIZON, parsePageParams } from '../src/lib/pagination.js';
import {
  cleanSahyogVivranParams,
  sahyogVivranForwardLimit,
  sahyogVivranPagingTargets,
} from '../src/lib/sahyog-vivran-paging.js';

// ⭐ Composes the three steps EXACTLY as the page does (the page calls `parsePageParams` itself —
// the `pii-scrape` FR-91 binding requires it in the page's own source).
const q = (qs: string) => {
  const allowedParams = cleanSahyogVivranParams(new URLSearchParams(qs));
  const paging = parsePageParams(allowedParams);
  return { allowedParams, paging, forwardLimit: sahyogVivranForwardLimit(allowedParams, paging) };
};

describe('cleanSahyogVivranParams + sahyogVivranForwardLimit', () => {
  it('⭐ an UNKNOWN param is IGNORED — ⛔ never a refusal (a shared link carries `fbclid`)', () => {
    const r = q('fbclid=abc&utm_source=wa&page=2');
    expect(r.paging.ok).toBe(true);
    expect([...r.allowedParams.keys()]).toEqual(['page']);
  });

  it('⛔ `sort` / `order` / `filter` never reach the parser or the links (11b.1 AC5)', () => {
    const r = q('sort=amount&order=desc&filter=x&lang=hi');
    expect(r.paging.ok).toBe(true);
    expect([...r.allowedParams.keys()]).toEqual(['lang']);
  });

  it('⭐ an EMPTY `page` / `limit` is ABSENT — ⛔ not a refusal', () => {
    const r = q('limit=&page=');
    expect(r.paging.ok).toBe(true);
    expect(r.allowedParams.has('limit')).toBe(false);
    expect(r.allowedParams.has('page')).toBe(false);
  });

  it('⭐ a genuinely REFUSED `limit` still refuses (the page 404s on it)', () => {
    expect(q('limit=all').paging.ok).toBe(false);
  });

  it('⭐⭐ `limit` is FORWARDED ONLY when the visitor supplied it — ⛔ never the parser default', () => {
    expect(q('').forwardLimit).toBeUndefined();
    expect(q('page=2').forwardLimit).toBeUndefined();
    expect(q('limit=10').forwardLimit).toBe(10);
  });
});

describe('sahyogVivranPagingTargets', () => {
  it('⭐ ordinary walk — first, middle, last', () => {
    expect(sahyogVivranPagingTargets({ page: 1, limit: 10, total: 25 })).toEqual({ previous: null, next: 2 });
    expect(sahyogVivranPagingTargets({ page: 2, limit: 10, total: 25 })).toEqual({ previous: 1, next: 3 });
    expect(sahyogVivranPagingTargets({ page: 3, limit: 10, total: 25 })).toEqual({ previous: 2, next: null });
  });

  it('⭐⭐ "Next" is CLAMPED BY THE HORIZON — ⛔ never a link to a page the next request refuses', () => {
    const atHorizon = { page: PUBLIC_PAGE_HORIZON, limit: 1, total: PUBLIC_PAGE_HORIZON * 10 };
    expect(sahyogVivranPagingTargets(atHorizon).next).toBeNull();
  });

  it('⭐ PAST THE END, "Previous" goes to the LAST REAL page — ⛔ not `page - 1`', () => {
    expect(sahyogVivranPagingTargets({ page: 150, limit: 2, total: 10 })).toEqual({
      previous: 5,
      next: null,
    });
    expect(sahyogVivranPagingTargets({ page: 4, limit: 10, total: 0 })).toEqual({
      previous: 1,
      next: null,
    });
  });

  it('⭐ an outage (limit 0) renders no links', () => {
    expect(sahyogVivranPagingTargets({ page: 1, limit: 0, total: 0 })).toEqual({ previous: null, next: null });
  });
});
