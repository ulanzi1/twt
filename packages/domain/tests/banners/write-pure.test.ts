// Banner pure write-path helpers — Story 10.9 (AC4, AC6, AC9; Decision 5). DB-free.
//
// Covers the four guards that are pure: the content hash (the Decision 5 revision oracle), the
// all-four-copy-fields requirement, the popup-dismissible invariant, and the window check.

import { describe, expect, it } from 'vitest';

import {
  type BannerCopy,
  assertBannerCopyComplete,
  assertPopupDismissible,
  assertWindowValid,
  bannerContentHash,
  bannerResourceLocator,
  missingBannerCopyFields,
} from '../../src/banners/write.js';
import {
  BannerBilingualRequiredError,
  BannerPopupMustBeDismissibleError,
  BannerWindowInvalidError,
} from '../../src/banners/errors.js';

const copy: BannerCopy = {
  title: 'Maintenance window',
  body: 'The app is unavailable 02:00–03:00 IST.',
  titleHi: 'रखरखाव अवधि',
  bodyHi: 'ऐप 02:00–03:00 IST तक उपलब्ध नहीं रहेगा।',
};

describe('bannerResourceLocator', () => {
  it('binds a sign-off to the BANNER (`banner:<id>`)', () => {
    expect(bannerResourceLocator('11111111-2222-3333-4444-555555555555')).toBe(
      'banner:11111111-2222-3333-4444-555555555555',
    );
  });
});

describe('bannerContentHash — the Decision 5 revision oracle', () => {
  it('is a 64-hex SHA-256 digest', () => {
    expect(bannerContentHash(copy)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is STABLE for identical copy (same hash ⇒ no re-review, no revision bump)', () => {
    expect(bannerContentHash(copy)).toBe(bannerContentHash({ ...copy }));
  });

  it('CHANGES when any one of the four member-visible fields changes', () => {
    const base = bannerContentHash(copy);
    expect(bannerContentHash({ ...copy, title: 'Maintenance window (extended)' })).not.toBe(base);
    expect(bannerContentHash({ ...copy, body: 'Different body.' })).not.toBe(base);
    expect(bannerContentHash({ ...copy, titleHi: 'अलग शीर्षक' })).not.toBe(base);
    expect(bannerContentHash({ ...copy, bodyHi: 'अलग विवरण' })).not.toBe(base);
  });

  it('is UNCHANGED by anything that is not member-visible copy (the window-only edit arm)', () => {
    // The hash is computed over exactly four fields — a caller passing extra properties (an
    // extended window, a flipped display-once, a new severity) must not move it, which is what makes
    // "extend valid_until without re-surfacing the banner" possible.
    const withNoise = { ...copy, validUntil: new Date('2030-01-01'), severity: 'critical', revision: 7 };
    expect(bannerContentHash(withNoise as BannerCopy)).toBe(bannerContentHash(copy));
  });

  it('distinguishes null from an empty string (a blanked field is a real copy change)', () => {
    expect(bannerContentHash({ ...copy, bodyHi: null })).not.toBe(bannerContentHash({ ...copy, bodyHi: '' }));
  });

  it('does not collide across a field SWAP (canonical JSON keys the values by field)', () => {
    const swapped: BannerCopy = { ...copy, title: copy.body, body: copy.title };
    expect(bannerContentHash(swapped)).not.toBe(bannerContentHash(copy));
  });
});

describe('assertBannerCopyComplete — AC6: all four fields required at publish', () => {
  it('accepts complete bilingual copy', () => {
    expect(() => assertBannerCopyComplete('b1', copy)).not.toThrow();
  });

  it.each([
    ['title', { ...copy, title: null }],
    ['body', { ...copy, body: null }],
    ['title_hi', { ...copy, titleHi: null }],
    ['body_hi', { ...copy, bodyHi: null }],
  ])('rejects a missing %s with a 422 naming the field', (field, incomplete) => {
    expect(() => assertBannerCopyComplete('b1', incomplete as BannerCopy)).toThrow(BannerBilingualRequiredError);
    expect(missingBannerCopyFields(incomplete as BannerCopy)).toContain(field);
  });

  it('treats a whitespace-only field as missing (a space is not Hindi copy)', () => {
    expect(missingBannerCopyFields({ ...copy, bodyHi: '   ' })).toEqual(['body_hi']);
  });

  it('names EVERY missing field at once, not just the first', () => {
    const bare: BannerCopy = { title: null, body: null, titleHi: null, bodyHi: null };
    expect(missingBannerCopyFields(bare)).toEqual(['title', 'body', 'title_hi', 'body_hi']);
  });
});

describe('assertPopupDismissible — AC4 "no member trapped"', () => {
  it('REJECTS an undismissable popup with a typed 422', () => {
    expect(() => assertPopupDismissible('b1', 'popup', false)).toThrow(BannerPopupMustBeDismissibleError);
  });

  it('accepts a dismissible popup', () => {
    expect(() => assertPopupDismissible('b1', 'popup', true)).not.toThrow();
  });

  it('PERMITS a non-dismissible BANNER (UX Pattern 9 — a blocking system state)', () => {
    expect(() => assertPopupDismissible('b1', 'banner', false)).not.toThrow();
  });

  it('accepts a dismissible banner', () => {
    expect(() => assertPopupDismissible('b1', 'banner', true)).not.toThrow();
  });
});

describe('assertWindowValid — AC2', () => {
  const from = new Date('2026-08-01T00:00:00.000Z');

  it('accepts a strictly positive window', () => {
    expect(() => assertWindowValid('b1', from, new Date('2026-08-08T00:00:00.000Z'))).not.toThrow();
  });

  it('rejects a ZERO-length window (valid_until === valid_from)', () => {
    expect(() => assertWindowValid('b1', from, from)).toThrow(BannerWindowInvalidError);
  });

  it('rejects an INVERTED window', () => {
    expect(() => assertWindowValid('b1', from, new Date('2026-07-01T00:00:00.000Z'))).toThrow(
      BannerWindowInvalidError,
    );
  });

  it('accepts a one-millisecond window (bounded, not empty)', () => {
    expect(() => assertWindowValid('b1', from, new Date(from.getTime() + 1))).not.toThrow();
  });
});
