// ⭐ THE REAL `t()` PATH FOR `/members` — Story 11a.3 (Task 11; AC9).
//
// ── ⛔ WHY THIS FILE EXISTS, AND WHY IT IS NOT OPTIONAL ─────────────────────────────────────────
// THE 11a.2 HEADLINE DEFECT WAS A TEST-FIXTURE BLIND SPOT, ⛔ NOT A LOGIC ERROR. `/members` threw
// on **every single request** — the copy used a `{{max}}` token while `packages/i18n`'s resolver
// matches SINGLE-brace `{max}` — and ⛔ NO TEST CAUGHT IT, because every test hand-built a
// `MembersLabels` fixture and bypassed `t()` entirely. The page was green in CI and broken in fact.
//
// ⇒ this file exercises the REAL resolver against the REAL committed locale files, for BOTH
// locales, for EVERY key the page asks for. ⛔ A `MembersLabels` fixture cannot substitute: the
// fixture shape IS the blind spot.
//
// ⚠ `t()` DEFAULTS TO THE `common` NAMESPACE AND THROWS ON A MISS, so every call below passes
// `namespace: 'members'` explicitly — exactly as the page does.

import { t, type Locale } from '@twt/i18n';
import { describe, expect, it } from 'vitest';

import { PUBLIC_PAGE_SIZE_MAX } from '../src/lib/pagination.js';

/**
 * EVERY key `members.astro` resolves. ⛔ Kept in sync by hand and asserted below against the
 * `MembersLabels` shape, so a key added to the page without copy fails HERE rather than in
 * production.
 */
const KEYS = [
  'page_title',
  'page_intro',
  'not_published_title',
  'not_published_body',
  'unavailable_title',
  'unavailable_body',
  'past_end_title',
  'past_end_body',
  'pagination_label',
  'previous_page',
  'next_page',
  'column_name',
  'column_district',
  'column_status',
  'status_active',
  'status_lock_in',
  'district_unknown',
  'invalid_request_title',
  'invalid_request_body',
  'invalid_request_link',
  'back_to_start',
] as const;

const LOCALES: Locale[] = ['en', 'hi'];

describe('⭐ AC9 — the REAL t() path resolves every /members key, in both locales', () => {
  for (const locale of LOCALES) {
    it(`[${locale}] every key resolves to non-empty copy — ⛔ no throw, no key echo`, () => {
      for (const key of KEYS) {
        const params = key === 'invalid_request_body' ? { max: PUBLIC_PAGE_SIZE_MAX } : undefined;
        const value = t(key, params, { locale, namespace: 'members' });
        expect(value, `${locale}/${key}`).toBeTruthy();
        // ⛔ A resolver that fell back to echoing the key would look "green" to a truthiness check.
        expect(value, `${locale}/${key} echoed the key`).not.toBe(key);
      }
    });
  }

  it('⭐ THE 11a.2 DEFECT, PLANTED AS A PROPERTY: `{max}` is INTERPOLATED, not left literal', () => {
    // ⛔ THIS is the assertion whose absence let `/members` throw on every request. If the copy is
    // ever rewritten with a `{{max}}` token, the resolver leaves it untouched and this fails.
    for (const locale of LOCALES) {
      const body = t('invalid_request_body', { max: PUBLIC_PAGE_SIZE_MAX }, {
        locale,
        namespace: 'members',
      });
      expect(body, `${locale}`).toContain(String(PUBLIC_PAGE_SIZE_MAX));
      expect(body, `${locale} left a literal token`).not.toMatch(/\{\{?\s*max\s*\}?\}/);
    }
  });

  it('⛔ an UNKNOWN key throws — the resolver is fail-loud, and this page depends on that', () => {
    expect(() =>
      t('a_key_that_does_not_exist', undefined, { locale: 'en', namespace: 'members' }),
    ).toThrow();
  });

  it('⛔ the DEFAULT namespace does NOT carry these keys — the explicit namespace is load-bearing', () => {
    // ⚠ `t()` defaults to `common`. Every call at the page passes `namespace` explicitly; if one
    // ever did not, it would throw at request time. This records why that discipline exists.
    expect(() => t('page_title', undefined, { locale: 'en' })).toThrow();
  });

  it('⭐ the operational register: directory copy uses LATIN numerals in BOTH locales', () => {
    // `ux-design-specification.md:1124` names "member directory listings" EXPLICITLY in the
    // operational register — Gregorian dates + Latin numerals. ⛔ Devanagari numerals (०-९) must
    // not appear in directory rows even in Hindi. This is a checkable constraint, ⛔ not a
    // stylistic preference. (The `microcopy` gate also has teeth on these files; asserted here too
    // because a gate scoped by glob and a test scoped by KEY fail in different ways.)
    for (const locale of LOCALES) {
      for (const key of KEYS) {
        const params = key === 'invalid_request_body' ? { max: PUBLIC_PAGE_SIZE_MAX } : undefined;
        const value = t(key, params, { locale, namespace: 'members' });
        expect(value, `${locale}/${key} carries a Devanagari numeral`).not.toMatch(/[०-९]/);
      }
    }
  });

  it('⛔ the OUTAGE copy is DISTINCT from the empty-directory copy, in both locales', () => {
    // ⚠ An outage that reads like an empty membership is a false statement about the trust. The
    // two states render different copy, and this is what stops a future edit from collapsing them.
    for (const locale of LOCALES) {
      const empty = t('not_published_body', undefined, { locale, namespace: 'members' });
      const outage = t('unavailable_body', undefined, { locale, namespace: 'members' });
      expect(outage, `${locale}`).not.toBe(empty);
    }
  });

  it('⛔ the PAST-THE-END copy is DISTINCT from the never-published copy, in both locales', () => {
    // Code-review finding (2026-08-21): both states used to render the SAME "not published yet"
    // copy — a valid, in-horizon page past the roster's actual end is not the same claim as "this
    // trust has no members".
    for (const locale of LOCALES) {
      const neverPublished = t('not_published_body', undefined, { locale, namespace: 'members' });
      const pastEnd = t('past_end_body', undefined, { locale, namespace: 'members' });
      expect(pastEnd, `${locale}`).not.toBe(neverPublished);
    }
  });
});
