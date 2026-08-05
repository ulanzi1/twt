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

/**
 * Add `months` calendar months to `date`, leap-safe and month-END-safe. A Jan-31 anchor + 1 month
 * lands on Feb-29 (leap) / Feb-28 (common) — clamped to the last day of the target month rather than
 * overflowing into March, exactly as {@link addCalendarYears} clamps a Feb-29 anniversary. Non-mutating.
 */
export function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  // Move to day 1 FIRST so the month shift can never overflow (Jan-31 + 1mo would otherwise become
  // Mar-2/Mar-3 before we ever get to clamp it) — the classic month-arithmetic off-by-one.
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDayOfTargetMonth));
  return result;
}

/**
 * Count WHOLE calendar months elapsed from `from` to `to` (>= 0; 0 when `to` precedes `from`) — the
 * AI-3-1 calendar-correct month primitive.
 *
 * ⚠ NOT the derivation of `contribution.months_since_last`, despite the name matching. That fact was
 * ratified on 2026-08-05 as an OPPORTUNITY count (missed assigned-and-closed cycles since the last
 * live confirmation), NOT elapsed wall-clock months — "contribution discipline must always be
 * evaluated against contribution opportunities, never against elapsed time alone", because a quiet
 * Pariwar offers no opportunity and a wall-clock reading would trip R7(F) for its entire membership.
 * See `producer.ts`'s `ContributionFacts.monthsSinceLast`. This helper has NO production caller on the
 * R7 path today; it remains exported as the calendar primitive (and is unit-pinned for month-end and
 * leap boundaries) for any future fact that genuinely IS elapsed-time-shaped.
 *
 * ⚠ NEVER `elapsed_ms / (30 × 86_400_000)` or any fixed-ms span. A "month" is not a fixed duration:
 * fixed-ms arithmetic drifts by up to 3 days per quarter. Calendar-correct derivation is the
 * PRODUCER's job; the engine stays date-math-free and reads pre-derived integers
 * (`r7-ladder.ts:57-58` unchanged).
 *
 * Month-boundary behaviour, pinned by unit tests: 2024-01-31 → 2024-02-29 is **1** month (not 0, not
 * 2), and a Feb-29 anchor evaluated on Feb-28 of a common year is exactly 12 months (no off-by-one).
 */
export function calendarMonthsBetween(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;
  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  // If the day-of-month anniversary has not been reached in the final month, that month is not whole.
  if (addCalendarMonths(from, months).getTime() > to.getTime()) months -= 1;
  return Math.max(0, months);
}

/** Add `days` calendar days, leap-safe (`setUTCDate`, NOT fixed-ms). Non-mutating. */
export function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
