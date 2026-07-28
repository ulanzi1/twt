// Helpdesk SLA due-date computation — DB-free unit tests (Story 10.1, Task 7).
//
// Covers the calendar-aware business-day resolver (`businessDaysDeadline`, added to the cycle-calendar
// module) + the `computeTicketSlaDueDates` composition: 24h first-response clock offset + N-business-day
// (non-holiday) resolution, holiday extension, and the pathological-calendar throw.

import { describe, expect, it } from 'vitest';

import { businessDaysDeadline, type HolidayWindow } from '../../src/cycle-calendar/holiday-resolver.js';
import { computeTicketSlaDueDates } from '../../src/helpdesk/routing.js';

// A fixed IST-midday instant (2026-08-03 ~11:30 IST) so the IST calendar date is unambiguous.
const CREATED_AT = new Date('2026-08-03T06:00:00.000Z');

describe('businessDaysDeadline — no holidays', () => {
  it('5 business days with an empty calendar = 5 calendar days forward (no extension)', () => {
    const d = businessDaysDeadline(CREATED_AT, 5, []);
    expect(d.startDate).toBe('2026-08-03');
    expect(d.dueDate).toBe('2026-08-08');
    expect(d.calendarDaysSpanned).toBe(5);
    expect(d.extendedByHoliday).toBe(false);
    expect(d.holidayLabel).toBeNull();
  });

  it('10 business days (the niyamavali-question budget) = 10 calendar days forward with an empty calendar', () => {
    const d = businessDaysDeadline(CREATED_AT, 10, []);
    expect(d.dueDate).toBe('2026-08-13');
    expect(d.calendarDaysSpanned).toBe(10);
    expect(d.extendedByHoliday).toBe(false);
    expect(d.holidayLabel).toBeNull();
  });

  it('does NOT skip weekends — a helpdesk "business day" is a non-holiday CALENDAR day (deliberate substrate decision, cycle-calendar/holiday-resolver.ts: "no separate weekend concept"), not a Mon-Fri working day', () => {
    // 2026-08-03 is a Monday; a 5-business-day budget with an empty calendar spans straight through
    // the following Sat(08-08)/Sun(08-09) — if weekends were skipped, dueDate would land later.
    const d = businessDaysDeadline(CREATED_AT, 5, []);
    expect(new Date(`${d.dueDate}T00:00:00Z`).getUTCDay()).toBe(6); // 2026-08-08 is a Saturday.
    expect(d.calendarDaysSpanned).toBe(5);
  });
});

describe('businessDaysDeadline — holiday extension', () => {
  const windows: HolidayWindow[] = [{ label: 'Chhath Puja', startDate: '2026-08-05', endDate: '2026-08-05' }];

  it('a holiday day inside the window consumes no business day → the deadline slides past it', () => {
    const d = businessDaysDeadline(CREATED_AT, 5, windows);
    // 08-04(work1), 08-05(holiday), 08-06(2), 08-07(3), 08-08(4), 08-09(5) → dueDate 08-09, span 6.
    expect(d.dueDate).toBe('2026-08-09');
    expect(d.calendarDaysSpanned).toBe(6);
    expect(d.extendedByHoliday).toBe(true);
    expect(d.holidayLabel).toBe('Chhath Puja');
  });

  it('two OVERLAPPING windows covering the same scanned date tie-break by earliest startDate, then by label (holidayWindowFor\'s documented determinism — the answer never depends on curation row order)', () => {
    const overlapping: HolidayWindow[] = [
      { label: 'B-later-registered', startDate: '2026-08-05', endDate: '2026-08-06' },
      { label: 'A-earlier-label', startDate: '2026-08-05', endDate: '2026-08-05' },
    ];
    const d = businessDaysDeadline(CREATED_AT, 5, overlapping);
    // Same startDate on both → tie-break by label: 'A-earlier-label' < 'B-later-registered'.
    expect(d.holidayLabel).toBe('A-earlier-label');
  });
});

describe('businessDaysDeadline — guards', () => {
  it('throws on a non-positive budget', () => {
    expect(() => businessDaysDeadline(CREATED_AT, 0, [])).toThrow(/businessDays must be an integer >= 1/);
  });

  it('throws on a negative budget', () => {
    expect(() => businessDaysDeadline(CREATED_AT, -3, [])).toThrow(/businessDays must be an integer >= 1/);
  });

  it('throws on a non-integer budget', () => {
    expect(() => businessDaysDeadline(CREATED_AT, 2.5, [])).toThrow(/businessDays must be an integer >= 1/);
  });

  it('throws on an INVERTED holiday window (endDate before startDate) — a curation defect, not silently treated as "no holiday"', () => {
    const inverted: HolidayWindow[] = [{ label: 'bad-window', startDate: '2026-08-06', endDate: '2026-08-04' }];
    expect(() => businessDaysDeadline(CREATED_AT, 5, inverted)).toThrow(/inverted holiday window/);
  });

  it('throws (rather than hangs) on a calendar so pathological the budget cannot be spent', () => {
    // A window covering the whole scan horizon (cycle-calendar's internal MAX_SCAN_DAYS = 366) → no
    // business day is ever accrued within the scan bound, so this must throw rather than loop forever.
    const swallow: HolidayWindow[] = [{ label: 'endless', startDate: '2026-08-04', endDate: '2027-12-31' }];
    expect(() => businessDaysDeadline(CREATED_AT, 5, swallow)).toThrow(/mis-curated/);
  });
});

describe('computeTicketSlaDueDates', () => {
  it('first-response = created_at + 24h (a plain clock offset); resolution = N business days', () => {
    const sla = computeTicketSlaDueDates(CREATED_AT, { slaFirstResponseHours: 24, slaResolutionBusinessDays: 5 }, []);
    expect(sla.slaFirstResponseDue.getTime()).toBe(CREATED_AT.getTime() + 24 * 60 * 60 * 1000);
    // resolution due is the EXCLUSIVE IST-midnight end after the 5th business day (2026-08-08).
    expect(sla.slaResolutionDue).toEqual(businessDaysDeadline(CREATED_AT, 5, []).dueAt);
    expect(sla.resolutionExtendedByHoliday).toBe(false);
  });

  it('surfaces the holiday extension for member-facing copy', () => {
    const windows: HolidayWindow[] = [{ label: 'Chhath Puja', startDate: '2026-08-05', endDate: '2026-08-05' }];
    const sla = computeTicketSlaDueDates(CREATED_AT, { slaFirstResponseHours: 24, slaResolutionBusinessDays: 5 }, windows);
    expect(sla.resolutionExtendedByHoliday).toBe(true);
    expect(sla.resolutionHolidayLabel).toBe('Chhath Puja');
  });
});
