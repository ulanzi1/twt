// nextPostStatus legality — Story 10.5 (AC2, AC8). Pure, DB-free; every legal + illegal arm.

import { describe, expect, it } from 'vitest';

import {
  NEWS_POST_ACTIONS,
  type NewsPostAction,
  isLegalPostTransition,
  nextPostStatus,
} from '../../src/news-blog/status.js';
import { NEWS_POST_STATUSES, type NewsPostStatus } from '../../src/schema/news_posts.js';

// The complete legal map — the single source of truth the test asserts against.
const LEGAL: ReadonlyArray<[NewsPostStatus, NewsPostAction, NewsPostStatus]> = [
  ['draft', 'submit', 'submitted'],
  ['submitted', 'approve', 'approved'],
  ['approved', 'schedule', 'scheduled'],
  ['approved', 'publish', 'published'],
  ['scheduled', 'publish', 'published'],
];

describe('nextPostStatus', () => {
  it('maps every LEGAL (status, action) arm to its next status', () => {
    for (const [status, action, next] of LEGAL) {
      expect(nextPostStatus(status, action)).toBe(next);
      expect(isLegalPostTransition(status, action)).toBe(true);
    }
  });

  it('returns null for every ILLEGAL (status, action) arm (fail-closed)', () => {
    const legalSet = new Set(LEGAL.map(([s, a]) => `${s}:${a}`));
    for (const status of NEWS_POST_STATUSES) {
      for (const action of NEWS_POST_ACTIONS) {
        if (legalSet.has(`${status}:${action}`)) continue;
        expect(nextPostStatus(status, action)).toBeNull();
        expect(isLegalPostTransition(status, action)).toBe(false);
      }
    }
  });

  it('rejects the specific illegal arms named in AC2', () => {
    expect(nextPostStatus('draft', 'approve')).toBeNull(); // approve a draft
    expect(nextPostStatus('submitted', 'publish')).toBeNull(); // publish a submitted
    expect(nextPostStatus('published', 'publish')).toBeNull(); // re-publish
    expect(nextPostStatus('draft', 'publish')).toBeNull();
    expect(nextPostStatus('submitted', 'schedule')).toBeNull();
  });

  it('a published post is terminal (no legal action)', () => {
    for (const action of NEWS_POST_ACTIONS) {
      expect(nextPostStatus('published', action)).toBeNull();
    }
  });
});
