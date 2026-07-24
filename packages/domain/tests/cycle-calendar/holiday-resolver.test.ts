// Pure holiday resolver — Story 8.9 (Task 2; AC2). DB-free unit tests.
//
// BOUNDARY BEHAVIOR IS THE CONTRACT (the 7.5 `selectEffectiveFixedAmountRow` posture): the resolver is
// a pure function of immutable window rows + an explicit instant, so its seeded frozen vectors ARE the
// specification Epic 9's matcher-tail scheduler and Epic 11b's Sahyog-Vivran publish gate will build on.
// No clock, no DB, no locale — every case below fixes the instant explicitly.
//
// The load-bearing properties under test:
//   · (a) IST calendar-date derivation via the fixed +05:30 offset — including an instant whose UTC
//        calendar day DIFFERS from its IST calendar day (the drift `setDate`/`getDate` would introduce).
//   · (b) the tail counts NON-HOLIDAY days: a holiday inside the tail consumes no reconciliation day.
//   · (c) the extension is BOUNDED by maxTailDays — a pathological calendar cannot defer a tail forever.
//   · (d) an EMPTY / unreadable calendar fails SAFE to the normal tail (never extends).
//   · (e) FR-22 fence: nothing here reads or moves the 15-day contribution window (see
//        tests/../contracts revert-sanity; this module has no access to it by construction).

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MAX_TAIL_DAYS,
  DEFAULT_NORMAL_TAIL_DAYS,
  type HolidayWindow,
  IST_UTC_OFFSET_MS,
  addCalendarDays,
  holidayWindowFor,
  isHolidayDate,
  istCalendarDate,
  istDateOf,
  nextNonHolidayDate,
  reconciliationTailDeadline,
} from '../../src/cycle-calendar/index.js';

// ─── Frozen seed vectors — the Bihar launch calendar shape (2026) ─────────────────────────────────

const DIWALI: HolidayWindow = { label: 'Diwali', startDate: '2026-11-08', endDate: '2026-11-09' };
const CHHATH: HolidayWindow = { label: 'Chhath Puja', startDate: '2026-11-13', endDate: '2026-11-16' };
const REPUBLIC_DAY: HolidayWindow = {
  label: 'Republic Day',
  startDate: '2026-01-26',
  endDate: '2026-01-26',
};
const BIHAR_NOV: readonly HolidayWindow[] = [DIWALI, CHHATH];

/** The instant that IS IST midnight opening `date` (the exclusive end of the PRIOR IST day). */
function istMidnight(date: string): Date {
  return new Date(Date.parse(`${date}T00:00:00Z`) - IST_UTC_OFFSET_MS);
}

// ─── (a) IST calendar-date derivation ─────────────────────────────────────────────────────────────

describe('istCalendarDate — fixed +05:30 offset, no local-TZ read (AC2)', () => {
  it('the offset constant is exactly +5h30m in ms (India has no DST)', () => {
    expect(IST_UTC_OFFSET_MS).toBe(5 * 60 * 60 * 1000 + 30 * 60 * 1000);
  });

  it('derives the IST calendar parts of a mid-day instant', () => {
    expect(istCalendarDate(new Date('2026-11-13T06:00:00Z'))).toEqual({
      year: 2026,
      month: 11,
      day: 13,
    });
  });

  it('an instant whose UTC day is 12 Nov is 13 Nov in IST (the boundary that breaks getDate/setDate)', () => {
    const instant = new Date('2026-11-12T19:00:00Z'); // 00:30 IST on 13 Nov
    expect(instant.getUTCDate()).toBe(12);
    expect(istDateOf(instant)).toBe('2026-11-13');
  });

  it('an instant one ms before IST midnight still belongs to the PRIOR IST day', () => {
    const instant = new Date(istMidnight('2026-11-13').getTime() - 1);
    expect(istDateOf(instant)).toBe('2026-11-12');
    expect(istDateOf(istMidnight('2026-11-13'))).toBe('2026-11-13');
  });

  it('zero-pads month and day', () => {
    expect(istDateOf(new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-05');
  });

  it('rejects a non-finite instant rather than emitting NaN-NaN-NaN', () => {
    expect(() => istDateOf(new Date('not-a-date'))).toThrow(/instant/i);
  });
});

describe('addCalendarDays — UTC-anchored, leap-safe, never local-TZ', () => {
  it('crosses a month boundary', () => {
    expect(addCalendarDays('2026-11-30', 1)).toBe('2026-12-01');
  });
  it('crosses a year boundary', () => {
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('handles a leap day', () => {
    expect(addCalendarDays('2028-02-28', 1)).toBe('2028-02-29');
  });
  it('adds zero as identity', () => {
    expect(addCalendarDays('2026-11-13', 0)).toBe('2026-11-13');
  });
  it('rejects a malformed calendar date', () => {
    expect(() => addCalendarDays('13-11-2026', 1)).toThrow(/YYYY-MM-DD/);
  });
});

// ─── isHolidayDate / holidayWindowFor — INCLUSIVE bounds ──────────────────────────────────────────

describe('isHolidayDate — both window bounds INCLUSIVE (AC1/AC2)', () => {
  it.each([
    ['the day before the window', '2026-11-12', false],
    ['the first day (inclusive start)', '2026-11-13', true],
    ['a middle day', '2026-11-15', true],
    ['the last day (inclusive end)', '2026-11-16', true],
    ['the day after the window', '2026-11-17', false],
  ])('%s → %s', (_label, date, expected) => {
    expect(isHolidayDate(date, [CHHATH])).toBe(expected);
  });

  it('a single-day window matches exactly that day', () => {
    expect(isHolidayDate('2026-01-26', [REPUBLIC_DAY])).toBe(true);
    expect(isHolidayDate('2026-01-25', [REPUBLIC_DAY])).toBe(false);
    expect(isHolidayDate('2026-01-27', [REPUBLIC_DAY])).toBe(false);
  });

  it('accepts an instant directly and resolves it in IST first', () => {
    // 19:00Z on 12 Nov is already 13 Nov in IST → inside the Chhath window.
    expect(isHolidayDate(new Date('2026-11-12T19:00:00Z'), [CHHATH])).toBe(true);
    expect(isHolidayDate(new Date('2026-11-12T17:00:00Z'), [CHHATH])).toBe(false);
  });

  it('an EMPTY calendar is never a holiday (the fail-safe direction)', () => {
    expect(isHolidayDate('2026-11-15', [])).toBe(false);
  });

  it('holidayWindowFor names the matching window, and returns null outside every window', () => {
    expect(holidayWindowFor('2026-11-15', BIHAR_NOV)?.label).toBe('Chhath Puja');
    expect(holidayWindowFor('2026-11-08', BIHAR_NOV)?.label).toBe('Diwali');
    expect(holidayWindowFor('2026-11-11', BIHAR_NOV)).toBeNull();
  });

  it('resolves OVERLAPPING windows deterministically — earliest start wins, label breaks the tie', () => {
    const a: HolidayWindow = { label: 'Zeta', startDate: '2026-11-13', endDate: '2026-11-16' };
    const b: HolidayWindow = { label: 'Alpha', startDate: '2026-11-13', endDate: '2026-11-14' };
    const early: HolidayWindow = { label: 'Mid', startDate: '2026-11-12', endDate: '2026-11-14' };
    expect(holidayWindowFor('2026-11-13', [a, b])?.label).toBe('Alpha');
    expect(holidayWindowFor('2026-11-13', [b, a])?.label).toBe('Alpha');
    expect(holidayWindowFor('2026-11-13', [a, b, early])?.label).toBe('Mid');
  });
});

describe('nextNonHolidayDate', () => {
  it('returns the SAME date when it is not a holiday (it is not a strict "next")', () => {
    expect(nextNonHolidayDate('2026-11-11', BIHAR_NOV)).toBe('2026-11-11');
  });
  it('skips to the first clear day after a window', () => {
    expect(nextNonHolidayDate('2026-11-13', BIHAR_NOV)).toBe('2026-11-17');
  });
  it('skips ACROSS back-to-back windows in one call', () => {
    const w1: HolidayWindow = { label: 'W1', startDate: '2026-11-08', endDate: '2026-11-09' };
    const w2: HolidayWindow = { label: 'W2', startDate: '2026-11-10', endDate: '2026-11-11' };
    expect(nextNonHolidayDate('2026-11-08', [w1, w2])).toBe('2026-11-12');
  });
  it('an empty calendar is the identity', () => {
    expect(nextNonHolidayDate('2026-11-15', [])).toBe('2026-11-15');
  });
  it('throws rather than looping forever on a calendar with no clear day within a year', () => {
    const forever: HolidayWindow = { label: 'Forever', startDate: '2026-01-01', endDate: '2027-12-31' };
    expect(() => nextNonHolidayDate('2026-06-01', [forever])).toThrow(/no non-holiday day/i);
  });
});

// ─── reconciliationTailDeadline — the substrate Epic 9 / Epic 11b consume ─────────────────────────

describe('reconciliationTailDeadline — the NORMAL tail (no holiday interaction)', () => {
  it('defaults are the UX-DR77 bounds: 1-2 days normal, 5-7 days when a holiday intervenes', () => {
    expect(DEFAULT_NORMAL_TAIL_DAYS).toBe(2);
    expect(DEFAULT_MAX_TAIL_DAYS).toBe(7);
  });

  it('a close clear of every window gets exactly normalTailDays', () => {
    const close = new Date('2026-06-10T06:00:00Z'); // IST 2026-06-10
    const tail = reconciliationTailDeadline(close, BIHAR_NOV);
    expect(tail.tailDeadlineDate).toBe('2026-06-12');
    expect(tail.extendedByHoliday).toBe(false);
    expect(tail.holidayLabel).toBeNull();
    expect(tail.closeAt).toEqual(close);
  });

  it('tailDeadlineAt is the EXCLUSIVE end of the IST deadline day (IST midnight opening the next day)', () => {
    const tail = reconciliationTailDeadline(new Date('2026-06-10T06:00:00Z'), []);
    expect(tail.tailDeadlineAt).toEqual(istMidnight('2026-06-13'));
    expect(tail.tailDeadlineAt.toISOString()).toBe('2026-06-12T18:30:00.000Z');
  });

  it('an EMPTY calendar fails SAFE to the normal tail (AC2 — never extends)', () => {
    const tail = reconciliationTailDeadline(new Date('2026-11-13T06:00:00Z'), []);
    expect(tail.tailDeadlineDate).toBe('2026-11-15');
    expect(tail.extendedByHoliday).toBe(false);
    expect(tail.holidayLabel).toBeNull();
  });

  it('resolves the close instant in IST, not UTC (the day-boundary case)', () => {
    // 19:00Z on 12 Nov is 13 Nov IST → the tail counts from 13 Nov, not 12 Nov.
    const tail = reconciliationTailDeadline(new Date('2026-11-12T19:00:00Z'), []);
    expect(tail.closeDate).toBe('2026-11-13');
    expect(tail.tailDeadlineDate).toBe('2026-11-15');
  });
});

describe('reconciliationTailDeadline — HOLIDAY-EXTENDED tails (UX-DR77)', () => {
  it('a close INSIDE Chhath extends to the UX-DR77 5-day shape and names the window', () => {
    // Close 13 Nov (inside Chhath 13-16). 14/15/16 are holidays → the two reconciliation days are
    // 17 and 18 Nov. Deadline = close + 5 days, inside the 5-7 day band epics.md:477 describes.
    const tail = reconciliationTailDeadline(new Date('2026-11-13T06:00:00Z'), BIHAR_NOV);
    expect(tail.closeDate).toBe('2026-11-13');
    expect(tail.tailDeadlineDate).toBe('2026-11-18');
    expect(tail.extendedByHoliday).toBe(true);
    expect(tail.holidayLabel).toBe('Chhath Puja');
    expect(tail.tailDays).toBe(5);
  });

  it('a window that STRADDLES the tail extends it even though the close is clear', () => {
    // Close 11 Nov (clear). 12 Nov is reconciliation day 1; 13-16 Nov are Chhath; 17 Nov is day 2.
    const tail = reconciliationTailDeadline(new Date('2026-11-11T06:00:00Z'), BIHAR_NOV);
    expect(tail.tailDeadlineDate).toBe('2026-11-17');
    expect(tail.extendedByHoliday).toBe(true);
    expect(tail.holidayLabel).toBe('Chhath Puja');
  });

  it('BACK-TO-BACK windows are cleared in one pass; the FIRST window met is the named reason', () => {
    const w1: HolidayWindow = { label: 'Diwali', startDate: '2026-11-08', endDate: '2026-11-09' };
    const w2: HolidayWindow = { label: 'Govardhan', startDate: '2026-11-10', endDate: '2026-11-11' };
    // Close 7 Nov: 8-11 Nov all holidays → reconciliation days are 12 and 13 Nov.
    const tail = reconciliationTailDeadline(new Date('2026-11-07T06:00:00Z'), [w1, w2]);
    expect(tail.tailDeadlineDate).toBe('2026-11-13');
    expect(tail.extendedByHoliday).toBe(true);
    expect(tail.holidayLabel).toBe('Diwali');
    expect(tail.tailDays).toBe(6);
  });

  it('a holiday AFTER the tail has already closed does not extend anything', () => {
    // Close 5 Nov, tail days 6 + 7 Nov — both clear. Diwali (8 Nov) is beyond the tail.
    const tail = reconciliationTailDeadline(new Date('2026-11-05T06:00:00Z'), BIHAR_NOV);
    expect(tail.tailDeadlineDate).toBe('2026-11-07');
    expect(tail.extendedByHoliday).toBe(false);
    expect(tail.holidayLabel).toBeNull();
  });

  it('CLAMPS at maxTailDays — a pathological calendar cannot defer the tail forever (AC2)', () => {
    const month: HolidayWindow = { label: 'Long', startDate: '2026-11-01', endDate: '2026-11-30' };
    const tail = reconciliationTailDeadline(new Date('2026-11-05T06:00:00Z'), [month]);
    expect(tail.tailDeadlineDate).toBe('2026-11-12'); // close + DEFAULT_MAX_TAIL_DAYS
    expect(tail.tailDays).toBe(DEFAULT_MAX_TAIL_DAYS);
    expect(tail.extendedByHoliday).toBe(true);
    expect(tail.holidayLabel).toBe('Long');
    expect(tail.clampedToMaxTail).toBe(true);
  });

  it('honors caller-supplied bounds — the tuning is DATA/params, never magic numbers (D3)', () => {
    const tail = reconciliationTailDeadline(new Date('2026-11-13T06:00:00Z'), BIHAR_NOV, {
      normalTailDays: 1,
      maxTailDays: 5,
    });
    // Close 13 Nov; 14-16 holidays; one reconciliation day = 17 Nov (close + 4, within max 5).
    expect(tail.tailDeadlineDate).toBe('2026-11-17');
    expect(tail.tailDays).toBe(4);
    expect(tail.clampedToMaxTail).toBe(false);
  });
});

describe('reconciliationTailDeadline — input validation (fail loud, never silently mis-schedule)', () => {
  it('rejects a non-finite close instant', () => {
    expect(() => reconciliationTailDeadline(new Date('nope'), [])).toThrow(/instant/i);
  });
  it('rejects normalTailDays below 1', () => {
    expect(() => reconciliationTailDeadline(new Date('2026-06-10T06:00:00Z'), [], { normalTailDays: 0 })).toThrow(
      /normalTailDays/,
    );
  });
  it('rejects a non-integer bound', () => {
    expect(() =>
      reconciliationTailDeadline(new Date('2026-06-10T06:00:00Z'), [], { normalTailDays: 1.5 }),
    ).toThrow(/normalTailDays/);
  });
  it('rejects maxTailDays below normalTailDays', () => {
    expect(() =>
      reconciliationTailDeadline(new Date('2026-06-10T06:00:00Z'), [], { normalTailDays: 3, maxTailDays: 2 }),
    ).toThrow(/maxTailDays/);
  });
  it('rejects a malformed window date', () => {
    const bad = { label: 'Bad', startDate: '2026-13-45', endDate: '2026-13-46' } as HolidayWindow;
    expect(() => reconciliationTailDeadline(new Date('2026-06-10T06:00:00Z'), [bad])).toThrow(/YYYY-MM-DD/);
  });
  it('rejects an INVERTED window (end before start) — the DB CHECK has a code twin', () => {
    const bad: HolidayWindow = { label: 'Inverted', startDate: '2026-11-16', endDate: '2026-11-13' };
    expect(() => reconciliationTailDeadline(new Date('2026-06-10T06:00:00Z'), [bad])).toThrow(/inverted/i);
  });
});

// ─── Determinism / replay ─────────────────────────────────────────────────────────────────────────

describe('replay identity — a pure function of the rows + the instant (AC2)', () => {
  it('the same inputs yield a byte-identical result on repeat evaluation', () => {
    const close = new Date('2026-11-13T06:00:00Z');
    const a = reconciliationTailDeadline(close, BIHAR_NOV);
    const b = reconciliationTailDeadline(close, [...BIHAR_NOV].reverse());
    expect(b).toEqual(a);
  });

  it('window ORDER in the row set never changes the outcome', () => {
    const close = new Date('2026-11-07T06:00:00Z');
    const forward = reconciliationTailDeadline(close, [DIWALI, CHHATH]);
    const reversed = reconciliationTailDeadline(close, [CHHATH, DIWALI]);
    expect(reversed).toEqual(forward);
  });
});

// ─── Review finding: maxTailDays === normalTailDays must still report the holiday it hit ──────────
//
// `extendedByHoliday` used to be derived from `offset > normalTailDays` — a day-count comparison
// that goes wrong at exactly this boundary: when there is no headroom between the two bounds, a
// holiday can consume a tail day while `offset` still caps out at `normalTailDays`, so the old
// comparison silently reported `false`/`null` even though a holiday genuinely shortened the tail.
// Fixed by deriving both fields from whether a holiday window was actually encountered.
describe('reconciliationTailDeadline — the maxTailDays === normalTailDays boundary (review fix)', () => {
  it('still reports extendedByHoliday + the holiday label when there is zero headroom to extend into', () => {
    const tail = reconciliationTailDeadline(new Date('2026-11-13T06:00:00Z'), BIHAR_NOV, {
      normalTailDays: 2,
      maxTailDays: 2,
    });
    // Close 13 Nov; 14 Nov is inside Chhath (consumes no work day); the loop clamps at offset=2.
    expect(tail.tailDays).toBe(2);
    expect(tail.clampedToMaxTail).toBe(true);
    expect(tail.extendedByHoliday).toBe(true);
    expect(tail.holidayLabel).toBe('Chhath Puja');
  });

  it('reports no extension at the same boundary when no holiday is ever hit', () => {
    const tail = reconciliationTailDeadline(new Date('2026-06-10T06:00:00Z'), [], {
      normalTailDays: 2,
      maxTailDays: 2,
    });
    expect(tail.extendedByHoliday).toBe(false);
    expect(tail.holidayLabel).toBeNull();
  });
});

// ─── Review finding: the two holiday-walk primitives must agree ───────────────────────────────────
//
// `nextNonHolidayDate` and `reconciliationTailDeadline` each independently walk forward over holiday
// windows — nothing composed one on the other, so nothing proved they agree. This builds an
// independent reference tail deadline OUT OF `nextNonHolidayDate` + `addCalendarDays` (skip each
// holiday block, count one work day per landed clear day) and asserts it matches the production
// function's output. A future change that lets the two walks diverge would fail this.
function referenceTailDeadline(
  closeDate: string,
  windows: readonly HolidayWindow[],
  normalTailDays: number,
  maxTailDays: number,
): { tailDeadlineDate: string; tailDays: number } {
  let cursor = closeDate;
  let workDays = 0;
  let elapsed = 0;
  while (workDays < normalTailDays && elapsed < maxTailDays) {
    const next = addCalendarDays(cursor, 1);
    const cleared = nextNonHolidayDate(next, windows);
    const daysSkipped = (Date.parse(`${cleared}T00:00:00Z`) - Date.parse(`${next}T00:00:00Z`)) / 86_400_000;
    if (elapsed + daysSkipped + 1 > maxTailDays) {
      // The clear day this skip would land on falls beyond the ceiling — clamp to the ceiling day.
      cursor = addCalendarDays(cursor, maxTailDays - elapsed);
      elapsed = maxTailDays;
      break;
    }
    elapsed += daysSkipped + 1;
    cursor = cleared;
    workDays += 1;
  }
  return { tailDeadlineDate: cursor, tailDays: elapsed };
}

describe('nextNonHolidayDate composes to the same tail deadline reconciliationTailDeadline computes', () => {
  it.each([
    ['a close clear of every window', '2026-06-10T06:00:00Z', [] as HolidayWindow[]],
    ['a close inside Chhath', '2026-11-13T06:00:00Z', BIHAR_NOV],
    ['a close whose tail straddles a window', '2026-11-11T06:00:00Z', BIHAR_NOV],
    ['a close ahead of back-to-back windows', '2026-11-07T06:00:00Z', [DIWALI, CHHATH]],
    ['a close clamped by a pathological month-long window', '2026-11-05T06:00:00Z', [
      { label: 'Long', startDate: '2026-11-01', endDate: '2026-11-30' },
    ]],
  ])('%s', (_label, closeIso, windows) => {
    const close = new Date(closeIso);
    const tail = reconciliationTailDeadline(close, windows);
    const reference = referenceTailDeadline(tail.closeDate, windows, DEFAULT_NORMAL_TAIL_DAYS, DEFAULT_MAX_TAIL_DAYS);
    expect(reference.tailDeadlineDate).toBe(tail.tailDeadlineDate);
    expect(reference.tailDays).toBe(tail.tailDays);
  });
});

// ─── Review finding: reject day-of-month overflow that Date.parse silently rolls over ─────────────
describe('calendarDateToUtcMs (via addCalendarDays/reconciliationTailDeadline) — rollover guard', () => {
  it('rejects Feb 30 rather than silently rolling to Mar 2', () => {
    const bad = { label: 'Bad', startDate: '2026-02-30', endDate: '2026-02-30' } as HolidayWindow;
    expect(() => reconciliationTailDeadline(new Date('2026-01-01T06:00:00Z'), [bad])).toThrow(/not a real/i);
  });

  it('rejects Apr 31 rather than silently rolling to May 1', () => {
    const bad = { label: 'Bad', startDate: '2026-04-31', endDate: '2026-04-31' } as HolidayWindow;
    expect(() => reconciliationTailDeadline(new Date('2026-01-01T06:00:00Z'), [bad])).toThrow(/not a real/i);
  });

  it('accepts Feb 29 on an actual leap year', () => {
    const leap: HolidayWindow = { label: 'Leap', startDate: '2028-02-29', endDate: '2028-02-29' };
    expect(isHolidayDate('2028-02-29', [leap])).toBe(true);
  });

  it('rejects Feb 29 on a non-leap year', () => {
    const bad = { label: 'Bad', startDate: '2026-02-29', endDate: '2026-02-29' } as HolidayWindow;
    expect(() => reconciliationTailDeadline(new Date('2026-01-01T06:00:00Z'), [bad])).toThrow(/not a real/i);
  });
});
