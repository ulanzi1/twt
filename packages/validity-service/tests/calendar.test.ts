// Calendar-correct date math — pure unit tests (Story 4.6, Task 6; the AI-3-1 leap-safe discipline).
//
// Proves the tenure/projection math is calendar-correct (anniversary-based), NOT fixed-ms — the same
// failure mode renewal-read.ts guards against, extended to YEARS. Determinism-critical: these feed the
// producer + the retirement projection, whose output must hash byte-identically across the 100×-thread
// replay (AC2).

import { describe, expect, it } from 'vitest';

import {
  addCalendarDays,
  addCalendarYears,
  calendarYearsBetween,
  ceilDaysBetween,
} from '../src/calendar.js';

describe('calendarYearsBetween — whole anniversary years', () => {
  it('counts a full year only once the anniversary is reached (floor)', () => {
    const join = new Date('2020-06-01T00:00:00Z');
    expect(calendarYearsBetween(join, new Date('2021-05-31T23:59:59Z'))).toBe(0); // day before
    expect(calendarYearsBetween(join, new Date('2021-06-01T00:00:00Z'))).toBe(1); // exact anniversary
    expect(calendarYearsBetween(join, new Date('2025-06-01T00:00:00Z'))).toBe(5);
    expect(calendarYearsBetween(join, new Date('2025-05-31T00:00:00Z'))).toBe(4); // not yet 5
  });

  it('is leap-safe: 4 years across a leap day is exactly 4 (never a day short like fixed-ms)', () => {
    // 2020 is a leap year; a naive `elapsed_ms / (365 × 86_400_000)` under-counts across it.
    const join = new Date('2019-03-01T00:00:00Z');
    expect(calendarYearsBetween(join, new Date('2023-03-01T00:00:00Z'))).toBe(4);
  });

  it('a Feb-29 anchor: the anniversary lands on Feb-28 in common years', () => {
    const join = new Date('2020-02-29T00:00:00Z');
    expect(calendarYearsBetween(join, new Date('2021-02-28T00:00:00Z'))).toBe(1);
    expect(calendarYearsBetween(join, new Date('2021-02-27T00:00:00Z'))).toBe(0);
    expect(calendarYearsBetween(join, new Date('2024-02-29T00:00:00Z'))).toBe(4);
  });

  it('returns 0 when `to` precedes or equals `from` (never negative)', () => {
    const join = new Date('2020-06-01T00:00:00Z');
    expect(calendarYearsBetween(join, new Date('2019-01-01T00:00:00Z'))).toBe(0);
    expect(calendarYearsBetween(join, join)).toBe(0);
  });
});

describe('addCalendarYears — leap-safe anniversary projection', () => {
  it('adds whole years preserving month/day', () => {
    expect(addCalendarYears(new Date('2025-06-01T00:00:00Z'), 1).toISOString()).toBe(
      '2026-06-01T00:00:00.000Z',
    );
  });

  it('clamps a Feb-29 anchor to Feb-28 in a common target year (never rolls to Mar-1)', () => {
    expect(addCalendarYears(new Date('2020-02-29T00:00:00Z'), 1).toISOString()).toBe(
      '2021-02-28T00:00:00.000Z',
    );
    // A leap target year keeps Feb-29.
    expect(addCalendarYears(new Date('2020-02-29T00:00:00Z'), 4).toISOString()).toBe(
      '2024-02-29T00:00:00.000Z',
    );
  });
});

describe('addCalendarDays + ceilDaysBetween', () => {
  it('adds calendar days leap-safe (across a leap Feb)', () => {
    expect(addCalendarDays(new Date('2024-02-28T00:00:00Z'), 1).toISOString()).toBe(
      '2024-02-29T00:00:00.000Z',
    );
  });

  it('ceil-clamps whole days, never negative', () => {
    expect(ceilDaysBetween(new Date('2025-01-01T00:00:00Z'), new Date('2025-01-02T00:00:00Z'))).toBe(1);
    // half a day rounds up to 1 (the calm-time framing 3.7 established).
    expect(ceilDaysBetween(new Date('2025-01-01T00:00:00Z'), new Date('2025-01-01T12:00:00Z'))).toBe(1);
    expect(ceilDaysBetween(new Date('2025-01-02T00:00:00Z'), new Date('2025-01-01T00:00:00Z'))).toBe(0);
  });
});
