// FR-91 forced pagination on apps/public — Story 11a.2 (Task 4; AC2, AC9).
//
// ⚠ These tests are the ONLY thing standing between a public list route and an
// unbounded read. Story 1.14's guard walks the committed OpenAPI surface and
// `apps/public` emits none — verified, ⛔ not assumed. So every control below is a
// real control, not a restatement of protection that exists elsewhere.
import { PUBLIC_SURFACE_PAGE_SIZE_CAP } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import {
  PUBLIC_PAGE_SIZE_DEFAULT,
  PUBLIC_PAGE_SIZE_MAX,
  pageHref,
  parsePageParams,
} from '../src/lib/pagination.js';

const q = (search: string) => new URLSearchParams(search);

describe('AC2 — the cap is a named constant cross-referenced to FR-91', () => {
  it('IS the public-surface cap imported from @twt/contracts — not a re-declared literal', () => {
    // ⛔ If this ever diverges, there are two "FR-91 caps" and the smaller one is a
    // fiction. A test against a hardcoded `50` on both sides would not catch that
    // divergence — this asserts identity against the SAME imported binding instead.
    expect(PUBLIC_PAGE_SIZE_MAX).toBe(PUBLIC_SURFACE_PAGE_SIZE_CAP);
    expect(PUBLIC_PAGE_SIZE_MAX).toBe(50);
    expect(PUBLIC_PAGE_SIZE_DEFAULT).toBeLessThanOrEqual(PUBLIC_PAGE_SIZE_MAX);
  });
});

describe('AC2 — accepted requests', () => {
  it('no params → page 1 at the default size', () => {
    const r = parsePageParams(q(''));
    expect(r).toEqual({ ok: true, page: 1, limit: PUBLIC_PAGE_SIZE_DEFAULT, offset: 0 });
  });

  it('an in-range page + limit is accepted and offset is DERIVED', () => {
    const r = parsePageParams(q('page=3&limit=10'));
    expect(r.ok).toBe(true);
    expect(r).toMatchObject({ page: 3, limit: 10, offset: 20 });
  });

  it('a limit exactly AT the cap is accepted — the boundary is inclusive', () => {
    expect(parsePageParams(q(`limit=${PUBLIC_PAGE_SIZE_MAX}`))).toMatchObject({
      ok: true,
      limit: PUBLIC_PAGE_SIZE_MAX,
    });
  });
});

describe('AC2/AC9 — NEGATIVE CONTROLS, one planted violation per rejection route', () => {
  it('NEGATIVE CONTROL — `?page=all` is REFUSED (FR-91, named explicitly)', () => {
    const r = parsePageParams(q('page=all'));
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ param: 'page', reason: 'unbounded_requested' });
  });

  it('NEGATIVE CONTROL — `?limit=all` is REFUSED (independently planted from ?page=all)', () => {
    const r = parsePageParams(q('limit=all'));
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ param: 'limit', reason: 'unbounded_requested' });
  });

  it('NEGATIVE CONTROL — a limit ABOVE the cap is REFUSED, ⛔ not clamped', () => {
    const r = parsePageParams(q(`limit=${PUBLIC_PAGE_SIZE_MAX + 1}`));
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ param: 'limit', reason: 'limit_above_cap' });
    // ⛔ The point of the control: no accepted result leaks out carrying a quietly
    // reduced limit. A clamp would make this object `{ok:true, limit:50}`.
    expect(r).not.toHaveProperty('limit');
  });

  it('NEGATIVE CONTROL — a NEGATIVE page is REFUSED as not-a-positive-integer', () => {
    expect(parsePageParams(q('page=-1'))).toMatchObject({
      ok: false,
      param: 'page',
      reason: 'page_not_a_positive_integer',
    });
  });

  it('NEGATIVE CONTROL — page 0 is REFUSED (pages are 1-based)', () => {
    expect(parsePageParams(q('page=0'))).toMatchObject({
      ok: false,
      reason: 'page_not_a_positive_integer',
    });
  });

  it('NEGATIVE CONTROL — a NON-INTEGER page is REFUSED', () => {
    for (const bad of ['1.5', '1e3', '0x10', 'two', '', ' ', '+1', '1abc', '١']) {
      const r = parsePageParams(q(`page=${encodeURIComponent(bad)}`));
      expect(r.ok, `page=${bad} must be refused`).toBe(false);
    }
  });

  it('⛔ case and whitespace do not smuggle an unbounded request past the check', () => {
    for (const probe of ['ALL', ' all ', 'All', 'UNLIMITED', '*']) {
      expect(parsePageParams(q(`limit=${encodeURIComponent(probe)}`)).ok, probe).toBe(false);
    }
  });

  it('⛔ a present-but-invalid param is never treated as ABSENT', () => {
    // The coercion this module exists to refuse: falling back to the default on a
    // malformed value would answer `?limit=99999` with a normal-looking page.
    expect(parsePageParams(q('limit=99999')).ok).toBe(false);
    expect(parsePageParams(q('page=all&limit=10')).ok).toBe(false);
  });
});

describe('AC10 — pagination links are real, lossless GET hrefs', () => {
  it('preserves other params — ⛔ notably `lang`, the server-roundtrip toggle', () => {
    expect(pageHref('/members', q('lang=hi'), 2)).toBe('/members?lang=hi&page=2');
  });

  it('page 1 drops the param rather than emitting `?page=1`', () => {
    // One canonical URL per page: `?page=1` and no param must not be two URLs for
    // the same content (it would split crawl budget and cache entries).
    expect(pageHref('/members', q('lang=hi&page=4'), 1)).toBe('/members?lang=hi');
    expect(pageHref('/members', q(''), 1)).toBe('/members');
  });

  it('replaces an existing page param rather than appending a second one', () => {
    expect(pageHref('/members', q('page=2'), 5)).toBe('/members?page=5');
  });
});
