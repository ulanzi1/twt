// Calendar-correct date math — Story 4.6 (Task 2; the AI-3-1 discipline).
//
// PURE + DETERMINISTIC (no clock, no randomness, no mutable state) — the producer's tenure
// derivation + the retirement date projection depend on this, and the whole payload must hash
// byte-identically across the 100×-thread replay (AC2). Calendar-correct via JS `setFullYear`/
// `setDate` (leap-safe), NOT fixed-ms: `renewal-read.ts:19` + `renewal-scheduler.ts:71` establish
// this exact discipline (`setDate`, NEVER `N × 86_400_000` — fixed-ms is a day short across a leap
// day for ~25% of cohorts; the same failure mode for fixed-ms YEARS across leap boundaries).
//
// All functions operate on UTC (the DB-authoritative instant is UTC; `getMemberStateAt` +
// `getVyawasthaShulkStatus` thread UTC `Date`s). Using the UTC accessors keeps the anniversary
// arithmetic independent of the host timezone (determinism across CI machines).

/** Whole days in milliseconds — the divisor for the `ceil`-clamped remaining-days figures. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Add `years` calendar years to `date`, leap-safe. A Feb-29 anchor + N years lands on Feb-28 in a
 * common year (JS `setUTCFullYear` normalizes Feb-29 → Mar-1; we clamp back to Feb-28 to keep the
 * anniversary within February, matching the "an anniversary never skips a month" intuition the
 * renewal scheduler's `setDate` arithmetic preserves). Non-mutating.
 */
export function addCalendarYears(date: Date, years: number): Date {
  const result = new Date(date.getTime());
  const targetYear = result.getUTCFullYear() + years;
  const month = result.getUTCMonth();
  const day = result.getUTCDate();
  result.setUTCFullYear(targetYear, month, day);
  // Feb-29 → Mar-1 overflow guard: if the month rolled forward, clamp to the last day of the
  // intended month (Feb-28) so the anniversary stays in the anchor's month.
  if (result.getUTCMonth() !== month) {
    result.setUTCDate(0); // day 0 of the next month = last day of the intended month
  }
  return result;
}

/**
 * Count WHOLE calendar years elapsed from `from` to `to` (>= 0; 0 when `to` precedes `from`). A full
 * year is counted only once the anniversary is reached (`floor`), leap-safe — 5 years is exactly 5
 * anniversaries, never `elapsed_ms / (365 × 86_400_000)` (which drifts a day per leap year). This is
 * the tenure count the R12 grant ladder reads as `member.valid_membership_years` (integer).
 */
export function calendarYearsBetween(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  // If we have not yet reached the month/day anniversary in the final year, subtract one.
  const anniversaryThisYear = addCalendarYears(from, years);
  if (anniversaryThisYear.getTime() > to.getTime()) years -= 1;
  return Math.max(0, years);
}

/** `ceil`-clamped whole days from `from` to `to` (never negative — clamped >= 0). Mirror renewal-read. */
export function ceilDaysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / MS_PER_DAY));
}

/** Add `days` calendar days, leap-safe (`setUTCDate`, NOT fixed-ms). Non-mutating. */
export function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
