// Story 6.39, Task 2.1 / AC2 (DL2) — the fee-date / death-date comparison at the INDIAN calendar-day boundaries.
//
// The certificate carries a local DATE, ⛔ a time; the receipt's `paid_at` is a UTC instant. The fee date is the IST
// calendar date of that instant (`-235` Y's day boundary is an Indian calendar day). IST = UTC+05:30, so the day turns
// at 18:30:00Z.

import { describe, expect, it } from 'vitest';

import { compareFeeDateWithDeathDate } from '../../src/claim/fee-death-date.js';

const DEATH = '2026-03-10';

describe('compareFeeDateWithDeathDate (Story 6.39 DL2)', () => {
  it.each([
    // The day BEFORE the death, in India: 9 March ends at 2026-03-09T18:29:59.999Z.
    ['2026-03-08T18:30:00.000Z', 'before_death', '9 March 00:00 IST'],
    ['2026-03-09T18:29:59.000Z', 'before_death', '9 March 23:59:59 IST — the last second before the day of death'],
    // The day OF the death: 2026-03-09T18:30:00Z … 2026-03-10T18:29:59Z.
    ['2026-03-09T18:30:00.000Z', 'same_day', '10 March 00:00 IST — the first instant of the day of death'],
    ['2026-03-10T00:00:00.000Z', 'same_day', '10 March 05:30 IST'],
    ['2026-03-10T18:29:59.000Z', 'same_day', '10 March 23:59:59 IST — the last second of the day of death'],
    // The day AFTER.
    ['2026-03-10T18:30:00.000Z', 'after_death', '11 March 00:00 IST — the first instant after the day of death'],
    ['2026-03-11T18:29:59.000Z', 'after_death', '11 March 23:59:59 IST'],
    ['2027-01-01T00:00:00.000Z', 'after_death', 'months later'],
    ['2020-01-01T00:00:00.000Z', 'before_death', 'years earlier'],
  ] as const)('paidAt %s ⇒ %s (%s)', (paidAt, expected, _when) => {
    expect(compareFeeDateWithDeathDate(new Date(paidAt), DEATH)).toBe(expected);
  });

  it('⚠ a UTC reading would be WRONG at both edges: 18:30Z on the 9th is the 10th in India; 18:30Z on the 10th is the 11th', () => {
    // The UTC calendar date of each instant is the day BEFORE its IST date — the two legs a UTC compare gets wrong.
    expect(compareFeeDateWithDeathDate(new Date('2026-03-09T23:00:00.000Z'), DEATH)).toBe('same_day'); // UTC says the 9th
    expect(compareFeeDateWithDeathDate(new Date('2026-03-10T23:00:00.000Z'), DEATH)).toBe('after_death'); // UTC says the 10th
  });

  it('handles a year boundary and a leap day', () => {
    expect(compareFeeDateWithDeathDate(new Date('2025-12-31T18:30:00.000Z'), '2026-01-01')).toBe('same_day');
    expect(compareFeeDateWithDeathDate(new Date('2025-12-31T18:29:59.000Z'), '2026-01-01')).toBe('before_death');
    expect(compareFeeDateWithDeathDate(new Date('2028-02-29T12:00:00.000Z'), '2028-02-29')).toBe('same_day');
    expect(compareFeeDateWithDeathDate(new Date('2028-02-29T18:30:00.000Z'), '2028-02-29')).toBe('after_death');
  });

  it.each(['', '2026-3-10', '10-03-2026', '2026-02-30', '2026-13-01', '2026-03-10T00:00:00Z', ' 2026-03-10', '[anonymized]', 'unreadable'])(
    '⛔ a malformed death date throws (%j) — the handler must turn an unreadable date into a typed 409 BEFORE calling',
    (bad) => {
      expect(() => compareFeeDateWithDeathDate(new Date('2026-03-10T00:00:00.000Z'), bad)).toThrow(/death date/i);
    },
  );

  it('⛔ an invalid paidAt throws rather than comparing "Invalid Date"', () => {
    expect(() => compareFeeDateWithDeathDate(new Date(Number.NaN), DEATH)).toThrow(/paid/i);
  });
});
