// Frozen-vector unit tests for the staff-takeover-by-day-N derivation (Story 9.1, Task 3 / AC3).
//
// DB-free + deterministic — `now` is injected, so every vector is pinned. Covers the load-bearing cases
// the AC names: the boundary (EXACTLY N days ⇒ eligible), the null-`lastEngagedAt` fall-through to
// `poolOpenAt`, below/above threshold, replay-determinism, clock-skew clamp, and config guarding.

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_STAFF_TAKEOVER_THRESHOLD_DAYS,
  computeStaffTakeover,
} from '../../src/nominee-console/takeover.js';

/** A fixed pool-open instant — every vector is relative to this (deterministic). */
const POOL_OPEN = new Date('2026-07-01T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
/** `now` = pool-open + `days` (+ optional ms nudge for boundary probing). */
const nowAfterDays = (days: number, nudgeMs = 0): Date =>
  new Date(POOL_OPEN.getTime() + days * DAY_MS + nudgeMs);

describe('DEFAULT_STAFF_TAKEOVER_THRESHOLD_DAYS', () => {
  it('is 7 (the configurable default, not a magic literal scattered in call sites)', () => {
    expect(DEFAULT_STAFF_TAKEOVER_THRESHOLD_DAYS).toBe(7);
  });
});

describe('computeStaffTakeover — null lastEngagedAt falls through to poolOpenAt (AC3)', () => {
  it('effectiveLastEngagedAt is poolOpenAt when lastEngagedAt is null', () => {
    const v = computeStaffTakeover({
      lastEngagedAt: null,
      poolOpenAt: POOL_OPEN,
      thresholdDays: DEFAULT_STAFF_TAKEOVER_THRESHOLD_DAYS,
      now: nowAfterDays(3),
    });
    expect(v.effectiveLastEngagedAt).toEqual(POOL_OPEN);
    expect(v.daysSinceEngagement).toBe(3);
    expect(v.takeoverEligible).toBe(false);
  });

  it('a never-engaged nominee IS flagged N days after pool open (the correct behaviour)', () => {
    const v = computeStaffTakeover({
      lastEngagedAt: null,
      poolOpenAt: POOL_OPEN,
      thresholdDays: 7,
      now: nowAfterDays(7),
    });
    expect(v.takeoverEligible).toBe(true);
    expect(v.daysSinceEngagement).toBe(7);
  });
});

describe('computeStaffTakeover — the boundary (exactly N days ⇒ eligible, inclusive)', () => {
  it('is NOT eligible one millisecond BEFORE the threshold', () => {
    const v = computeStaffTakeover({
      lastEngagedAt: null,
      poolOpenAt: POOL_OPEN,
      thresholdDays: 7,
      now: nowAfterDays(7, -1),
    });
    expect(v.takeoverEligible).toBe(false);
    // Floor of (7 days − 1ms) is still 6 whole days.
    expect(v.daysSinceEngagement).toBe(6);
  });

  it('IS eligible at EXACTLY the threshold instant', () => {
    const v = computeStaffTakeover({
      lastEngagedAt: null,
      poolOpenAt: POOL_OPEN,
      thresholdDays: 7,
      now: nowAfterDays(7),
    });
    expect(v.takeoverEligible).toBe(true);
    expect(v.daysSinceEngagement).toBe(7);
  });

  it('IS eligible one millisecond AFTER the threshold', () => {
    const v = computeStaffTakeover({
      lastEngagedAt: null,
      poolOpenAt: POOL_OPEN,
      thresholdDays: 7,
      now: nowAfterDays(7, 1),
    });
    expect(v.takeoverEligible).toBe(true);
  });
});

describe('computeStaffTakeover — below / above threshold', () => {
  it('below threshold ⇒ not eligible', () => {
    for (const d of [0, 1, 3, 6]) {
      const v = computeStaffTakeover({
        lastEngagedAt: null,
        poolOpenAt: POOL_OPEN,
        thresholdDays: 7,
        now: nowAfterDays(d),
      });
      expect(v.takeoverEligible, `day ${d}`).toBe(false);
    }
  });

  it('well above threshold ⇒ eligible with the right day count', () => {
    const v = computeStaffTakeover({
      lastEngagedAt: null,
      poolOpenAt: POOL_OPEN,
      thresholdDays: 7,
      now: nowAfterDays(14),
    });
    expect(v.takeoverEligible).toBe(true);
    expect(v.daysSinceEngagement).toBe(14);
  });

  it('a real lastEngagedAt pushes the clock forward (Story 9.3 writer, consumed with no change)', () => {
    // Pool opened 20 days ago but the nominee engaged 2 days ago ⇒ NOT eligible (clock is the engagement).
    const engagedAt = nowAfterDays(18); // 18 days after pool open
    const v = computeStaffTakeover({
      lastEngagedAt: engagedAt,
      poolOpenAt: POOL_OPEN,
      thresholdDays: 7,
      now: nowAfterDays(20),
    });
    expect(v.effectiveLastEngagedAt).toEqual(engagedAt);
    expect(v.daysSinceEngagement).toBe(2);
    expect(v.takeoverEligible).toBe(false);
  });
});

describe('computeStaffTakeover — a configurable threshold (not a literal)', () => {
  it('a threshold of 3 flips eligibility three days earlier', () => {
    const at3 = computeStaffTakeover({
      lastEngagedAt: null,
      poolOpenAt: POOL_OPEN,
      thresholdDays: 3,
      now: nowAfterDays(3),
    });
    expect(at3.takeoverEligible).toBe(true);
    const at2 = computeStaffTakeover({
      lastEngagedAt: null,
      poolOpenAt: POOL_OPEN,
      thresholdDays: 3,
      now: nowAfterDays(2),
    });
    expect(at2.takeoverEligible).toBe(false);
  });

  it('a threshold of 0 flags immediately at pool open', () => {
    const v = computeStaffTakeover({
      lastEngagedAt: null,
      poolOpenAt: POOL_OPEN,
      thresholdDays: 0,
      now: POOL_OPEN,
    });
    expect(v.takeoverEligible).toBe(true);
  });
});

describe('computeStaffTakeover — clock-skew clamp (never negative, never eligible)', () => {
  it('a future effective clock clamps daysSinceEngagement to 0 and stays ineligible', () => {
    const v = computeStaffTakeover({
      lastEngagedAt: null,
      poolOpenAt: nowAfterDays(5), // pool "opens" 5 days after now (skew)
      thresholdDays: 7,
      now: POOL_OPEN,
    });
    expect(v.daysSinceEngagement).toBe(0);
    expect(v.takeoverEligible).toBe(false);
  });
});

describe('computeStaffTakeover — replay-determinism (pure, injected now)', () => {
  it('returns an identical verdict for identical inputs across repeated calls', () => {
    const input = {
      lastEngagedAt: null,
      poolOpenAt: POOL_OPEN,
      thresholdDays: 7,
      now: nowAfterDays(9),
    } as const;
    const a = computeStaffTakeover({ ...input });
    const b = computeStaffTakeover({ ...input });
    expect(a).toEqual(b);
    expect(a).toEqual({
      takeoverEligible: true,
      daysSinceEngagement: 9,
      effectiveLastEngagedAt: POOL_OPEN,
    });
  });
});

describe('computeStaffTakeover — config guarding (fail loud, never flag-everyone)', () => {
  it('throws on a negative threshold', () => {
    expect(() =>
      computeStaffTakeover({
        lastEngagedAt: null,
        poolOpenAt: POOL_OPEN,
        thresholdDays: -1,
        now: nowAfterDays(1),
      }),
    ).toThrow(/thresholdDays/);
  });

  it('throws on a non-finite threshold (NaN misconfiguration)', () => {
    expect(() =>
      computeStaffTakeover({
        lastEngagedAt: null,
        poolOpenAt: POOL_OPEN,
        thresholdDays: Number.NaN,
        now: nowAfterDays(1),
      }),
    ).toThrow(/thresholdDays/);
  });

  it('throws on an Invalid Date poolOpenAt (Review fix — never silently produce NaN daysSinceEngagement)', () => {
    expect(() =>
      computeStaffTakeover({
        lastEngagedAt: null,
        poolOpenAt: new Date('not-a-date'),
        thresholdDays: 7,
        now: nowAfterDays(1),
      }),
    ).toThrow(/poolOpenAt/);
  });

  it('throws on an Invalid Date now', () => {
    expect(() =>
      computeStaffTakeover({
        lastEngagedAt: null,
        poolOpenAt: POOL_OPEN,
        thresholdDays: 7,
        now: new Date('not-a-date'),
      }),
    ).toThrow(/now/);
  });

  it('throws on an Invalid Date lastEngagedAt', () => {
    expect(() =>
      computeStaffTakeover({
        lastEngagedAt: new Date('not-a-date'),
        poolOpenAt: POOL_OPEN,
        thresholdDays: 7,
        now: nowAfterDays(1),
      }),
    ).toThrow(/lastEngagedAt/);
  });
});
