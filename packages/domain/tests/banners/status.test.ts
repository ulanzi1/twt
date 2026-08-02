// nextBannerStatus legality — Story 10.9 (AC1, AC9). Pure, DB-free; every legal + illegal arm.

import { describe, expect, it } from 'vitest';

import {
  BANNER_ACTIONS,
  type BannerAction,
  isLegalBannerTransition,
  nextBannerStatus,
} from '../../src/banners/status.js';
import { BANNER_STATUSES, type BannerStatus } from '../../src/schema/banners.js';

// The complete legal map — the single source of truth the test asserts against.
const LEGAL: ReadonlyArray<[BannerStatus, BannerAction, BannerStatus]> = [
  ['draft', 'publish', 'published'],
  ['draft', 'retract', 'retracted'],
  ['published', 'retract', 'retracted'],
];

describe('nextBannerStatus', () => {
  it('maps every LEGAL (status, action) arm to its next status', () => {
    for (const [status, action, next] of LEGAL) {
      expect(nextBannerStatus(status, action)).toBe(next);
      expect(isLegalBannerTransition(status, action)).toBe(true);
    }
  });

  it('returns null for every ILLEGAL (status, action) arm (fail-closed)', () => {
    const legalKeys = new Set(LEGAL.map(([s, a]) => `${s}:${a}`));
    const illegal: string[] = [];
    for (const status of BANNER_STATUSES) {
      for (const action of BANNER_ACTIONS) {
        if (legalKeys.has(`${status}:${action}`)) continue;
        illegal.push(`${status}:${action}`);
        expect(nextBannerStatus(status, action)).toBeNull();
        expect(isLegalBannerTransition(status, action)).toBe(false);
      }
    }
    // 3 statuses × 2 actions = 6 arms; 3 are legal, so exactly 3 must be illegal. Pins that the
    // matrix is exhaustively walked rather than silently empty.
    expect(illegal).toHaveLength(BANNER_STATUSES.length * BANNER_ACTIONS.length - LEGAL.length);
  });

  it('treats `retracted` as TERMINAL — no action escapes it', () => {
    for (const action of BANNER_ACTIONS) {
      expect(nextBannerStatus('retracted', action)).toBeNull();
    }
  });

  it('rejects re-publishing an already-published banner (no idempotent double-publish)', () => {
    expect(nextBannerStatus('published', 'publish')).toBeNull();
  });

  it('allows retracting a DRAFT (the discard path), not only a published banner', () => {
    expect(nextBannerStatus('draft', 'retract')).toBe('retracted');
  });
});
