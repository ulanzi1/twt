// `addTwelveMonths` PURE unit — Story 10.10 review patch (AC7 leap-day fix).
//
// `Date.setUTCMonth` does not clamp the day-of-month, so naively shifting a Feb-29 termination
// forward 12 months can overflow into March of the (non-leap) target year. This pins the
// leap-safe clamp: the rejoin lock lands on the last valid day of the target month instead.

import { describe, expect, it } from 'vitest';

import { addTwelveMonths } from '../../src/modules/member-moderation/handlers.js';

describe('addTwelveMonths — leap-safe 12-month rejoin lock (AC7)', () => {
  it('a leap-day (Feb 29) termination clamps to Feb 28 in a non-leap target year', () => {
    const from = new Date('2028-02-29T10:00:00.000Z');
    expect(addTwelveMonths(from).toISOString()).toBe('2029-02-28T10:00:00.000Z');
  });

  it('an ordinary month-end (e.g. Jan 31) rolls forward normally with no clamp needed', () => {
    const from = new Date('2026-01-31T00:00:00.000Z');
    expect(addTwelveMonths(from).toISOString()).toBe('2027-01-31T00:00:00.000Z');
  });

  it('a non-month-end date is unaffected by the clamp', () => {
    const from = new Date('2026-08-03T12:34:56.000Z');
    expect(addTwelveMonths(from).toISOString()).toBe('2027-08-03T12:34:56.000Z');
  });
});
