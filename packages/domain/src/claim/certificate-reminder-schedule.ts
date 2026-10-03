// The REPLACEMENT-CERTIFICATE reminder SCHEDULE — Story 6.19d (Task 2.1; AC2; `2026-10-03-276` CR4). PURE: ⛔ no DB,
// ⛔ no clock — every caller passes `today`.
//
// ⭐ THE NUMBERS ARE THE PANEL'S: the correction days (`-250` #5, adopted by `-259` cl.1) — IMPORTED from 6.19b's
// `CORRECTION_REMINDER_DAYS`, ⛔ never copied (one source) — then days 120, 150 and 180 (`-260` G6); ⛔ nothing after
// day 180. ⛔ Nothing on day 0 (`-250` #5: day 1 = the day AFTER day 0, at 10:00 IST). A change is a new ruling.
// ⚠ ⛔ NEVER a fourth key in 6.19b's `SCHEDULE_TABLE`, and ⛔ never its 90-day horizon: that table's filter drops every
// day ≥ 90, and its tests pin a three-key table (Trap 10).
// ⭐ The horizon is `runDay > 180` — ⚠ ⛔ never 6.19b's `>=` "expired" shape, which, copied, would never send day 180.
// The catch-up is 6.19b's pure `correctionCatchUp` (generic over day numbers), REUSED — the latest missed slot once,
// `late`; older ones skipped; ⛔ no burst.

import { type CalendarDateString, addCalendarDays } from '../cycle-calendar/holiday-resolver.js';
import { CORRECTION_REMINDER_DAYS, calendarDaysBetween, correctionCatchUp } from './correction-schedule.js';

/** `-260` G6 — after day 90, ONCE a month: days 120, 150 and 180. ⚠ DATA, ⛔ never re-derived. */
export const CERTIFICATE_REMINDER_MONTHLY_DAYS = [120, 150, 180] as const;

/** ⭐ The 25 Panel days of a certificate run — the correction days to 84, then the monthly days. */
export const CERTIFICATE_REMINDER_DAYS: readonly number[] = Object.freeze([
  ...CORRECTION_REMINDER_DAYS,
  ...CERTIFICATE_REMINDER_MONTHLY_DAYS,
]);

/** `-259` cl.1 — *"the reminders stop after 180 days"*. Day 180 itself is sent. */
export const CERTIFICATE_RUN_HORIZON_DAYS = 180;

export interface CertificateSlot {
  /** The run's day number (`day0` = 0). */
  readonly day: number;
  /** The IST calendar date of that day. */
  readonly date: CalendarDateString;
}

/** ⭐ THE SCHEDULE — every Panel day of a run whose day 0 is `day0`, dated. Pure, ordered. */
export function certificateReminderSchedule(day0: CalendarDateString): CertificateSlot[] {
  return CERTIFICATE_REMINDER_DAYS.filter((d) => d > 0 && d <= CERTIFICATE_RUN_HORIZON_DAYS).map((day) => ({
    day,
    date: addCalendarDays(day0, day),
  }));
}

/** The run's day number on `today` (IST dates). */
export function certificateRunDay(day0: CalendarDateString, today: CalendarDateString): number {
  return calendarDaysBetween(day0, today);
}

/** ⭐ CR4 — a run is over once its day is PAST 180 (`> 180`, ⛔ never `>=`: day 180's slot is sent on day 180). */
export function isCertificateRunPastHorizon(runDay: number): boolean {
  return runDay > CERTIFICATE_RUN_HORIZON_DAYS;
}

/**
 * The catch-up over one person's slots of ONE run: `recordedDays` = that run's rows of the person, ANY outcome (⛔ never
 * an epoch view that drops `skipped_superseded` / `attempting` — skipped slots would be planned again). 6.19b's
 * `correctionCatchUp`, over the certificate days.
 */
export function certificateCatchUp(
  recordedDays: ReadonlySet<number>,
  todayRunDay: number,
): ReturnType<typeof correctionCatchUp> {
  return correctionCatchUp(CERTIFICATE_REMINDER_DAYS, recordedDays, todayRunDay);
}
