// deriveBannerDisplayState — Story 10.9 (AC2, AC9). Pure, DB-free.
//
// The boundary conventions are the point of this file: `valid_from` INCLUSIVE, `valid_until`
// EXCLUSIVE. Every boundary instant is pinned EXPLICITLY (before / exactly-at-from / mid / exactly-
// at-until / after) so a future off-by-one flips a test rather than a member's screen.

import { describe, expect, it } from 'vitest';

import {
  type BannerDisplayInput,
  deriveBannerDisplayState,
  isBannerInWindow,
} from '../src/banners/display-state.js';

const FROM = new Date('2026-08-01T00:00:00.000Z');
const UNTIL = new Date('2026-08-08T00:00:00.000Z');

const row = (status: BannerDisplayInput['status']): BannerDisplayInput => ({
  status,
  validFrom: FROM,
  validUntil: UNTIL,
});

const at = (iso: string): Date => new Date(iso);

describe('deriveBannerDisplayState — a PUBLISHED banner across every window boundary', () => {
  const published = row('published');

  it('is `scheduled` strictly BEFORE valid_from', () => {
    expect(deriveBannerDisplayState(published, at('2026-07-31T23:59:59.999Z'))).toBe('scheduled');
  });

  it('is `live` EXACTLY AT valid_from (inclusive lower bound)', () => {
    expect(deriveBannerDisplayState(published, FROM)).toBe('live');
  });

  it('is `live` mid-window', () => {
    expect(deriveBannerDisplayState(published, at('2026-08-04T12:00:00.000Z'))).toBe('live');
  });

  it('is `live` one millisecond before valid_until', () => {
    expect(deriveBannerDisplayState(published, at('2026-08-07T23:59:59.999Z'))).toBe('live');
  });

  it('is `expired` EXACTLY AT valid_until (exclusive upper bound)', () => {
    expect(deriveBannerDisplayState(published, UNTIL)).toBe('expired');
  });

  it('is `expired` after valid_until — with NOTHING having run to make it so', () => {
    expect(deriveBannerDisplayState(published, at('2026-09-01T00:00:00.000Z'))).toBe('expired');
  });
});

describe('deriveBannerDisplayState — the authored statuses ignore the window', () => {
  it('a draft is `draft` inside its own window (a draft is never member-visible)', () => {
    expect(deriveBannerDisplayState(row('draft'), at('2026-08-04T12:00:00.000Z'))).toBe('draft');
  });

  it('a draft is `draft` before and after its window too', () => {
    expect(deriveBannerDisplayState(row('draft'), at('2026-07-01T00:00:00.000Z'))).toBe('draft');
    expect(deriveBannerDisplayState(row('draft'), at('2026-09-01T00:00:00.000Z'))).toBe('draft');
  });

  it('a retracted banner is `retracted` even mid-window (retraction is terminal)', () => {
    expect(deriveBannerDisplayState(row('retracted'), at('2026-08-04T12:00:00.000Z'))).toBe('retracted');
  });
});

describe('isBannerInWindow', () => {
  it('is true exactly when the derived state is `live`', () => {
    const published = row('published');
    expect(isBannerInWindow(published, FROM)).toBe(true);
    expect(isBannerInWindow(published, UNTIL)).toBe(false);
    expect(isBannerInWindow(row('draft'), at('2026-08-04T12:00:00.000Z'))).toBe(false);
    expect(isBannerInWindow(row('retracted'), at('2026-08-04T12:00:00.000Z'))).toBe(false);
  });

  it('never calls the wall clock — the same row + `now` always answers identically', () => {
    const published = row('published');
    const nowAt = at('2026-08-04T12:00:00.000Z');
    const answers = new Set(Array.from({ length: 50 }, () => isBannerInWindow(published, nowAt)));
    expect([...answers]).toEqual([true]);
  });
});
