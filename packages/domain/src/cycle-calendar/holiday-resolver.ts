// The PURE, calendar-aware reconciliation-tail resolver — Story 8.9 (Task 2; AC2, AC6).
//
// UX-DR77: "Day 15 mechanical close; reconciliation tail 1-2 days normal, 5-7 days on Bihar holiday
// windows … Per-Pariwar holiday windows configurable" (epics.md:477). This module is the arithmetic
// half of that decision record. It answers ONE question — given when a cycle CLOSED and which holiday
// windows the Pariwar observes, by when should the post-close reconciliation (bank-statement matching)
// be expected to have settled?
//
// ── What this module deliberately does NOT do (the load-bearing fence, AC3) ─────────────────────────
// It does NOT move, read, wrap, or reason about the CONTRIBUTION window. FR-22's `live → closed`
// transition is a HARD, mechanical Day-15 close and stays byte-unchanged; `CYCLE_WINDOW_DAYS` and
// `computeDaysRemaining` live in @twt/contracts and are not imported here (nor could they be — domain
// must not import contracts). The epics AC prose at L3022 that describes extending the contribution
// window is a RATIFIED drafting error (BigDev, 2026-07-24). Everything below is POST-close timing.
//
// ── Purity contract (the 7.5 `selectEffectiveFixedAmountRow` posture) ──────────────────────────────
// PURE, DB-free, clock-free, locale-free, dependency-free. Every function is a total function of its
// arguments; the close instant is always passed EXPLICITLY. That is what makes the tail replay-safe:
// re-deriving a historical cycle's tail from the immutable window rows + the recorded close instant
// yields the identical answer forever. Its seeded frozen vectors (tests/cycle-calendar/) ARE the
// contract Epic 9's matcher-tail scheduler and Epic 11b Story 11b.3's Sahyog-Vivran publish gate build on.
//
// ── Why IST is a fixed ms offset, not Intl / setDate / getDate (D5) ────────────────────────────────
// A holiday window is a run of CALENDAR days in Asia/Kolkata. India observes no DST, so Asia/Kolkata is
// permanently UTC+05:30 and a fixed `+19_800_000` ms shift is EXACT — not an approximation. Deriving
// the calendar day by shifting and then reading the UTC parts is deterministic and dependency-free,
// whereas `getDate`/`setDate` read the PROCESS's local timezone (a server in UTC and a laptop in IST
// would silently disagree about which day a 19:00Z instant falls on) and `Intl.DateTimeFormat` drags in
// an ICU-data dependency whose output has varied across Node builds.

/** Asia/Kolkata's fixed offset from UTC in milliseconds (+05:30). Exact — India observes no DST. */
export const IST_UTC_OFFSET_MS = 5 * 60 * 60 * 1000 + 30 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The normal post-close reconciliation tail, in calendar days (UX-DR77: "1-2 days normal"). The UPPER
 * bound of that band is the default deadline — a deadline is the point by which settling is EXPECTED,
 * so the generous end of the normal range is the honest one.
 */
export const DEFAULT_NORMAL_TAIL_DAYS = 2;

/**
 * The hard ceiling on a holiday-extended tail, in calendar days (UX-DR77: "5-7 days on Bihar holiday
 * windows"). The upper bound of that band. A calendar with an implausibly long window can therefore
 * never defer reconciliation indefinitely — the tail is clamped and `clampedToMaxTail` says so.
 */
export const DEFAULT_MAX_TAIL_DAYS = 7;

/** How far {@link nextNonHolidayDate} will scan before declaring the calendar itself defective. A
 *  Pariwar whose calendar leaves no clear day within a year is a curation error, not a long holiday. */
const MAX_SCAN_DAYS = 366;

/**
 * An IST calendar date in canonical `YYYY-MM-DD` form — the SAME lexical form Postgres' `date` type
 * renders, so a `pariwar_holiday_calendar` row's bounds are usable here with no parsing step. ISO
 * dates sort lexicographically, which is why the range comparisons below are plain string compares.
 */
export type CalendarDateString = string;

/** The decomposed IST calendar parts of an instant. `month` is 1-based (January = 1), matching how a
 *  human reads a date — NOT the 0-based `Date` convention that has caused off-by-one-month bugs. */
export interface IstCalendarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/**
 * One curated holiday window — the minimal shape the resolver reasons over (a
 * `pariwar_holiday_calendar` row provides them all). BOTH BOUNDS INCLUSIVE; a single-day observance has
 * `startDate === endDate`.
 */
export interface HolidayWindow {
  /** The curated display label, e.g. `'Chhath Puja'`. Surfaced as the tail contract's `holiday_label`. */
  readonly label: string;
  readonly startDate: CalendarDateString;
  readonly endDate: CalendarDateString;
}

/**
 * The resolved reconciliation tail for one cycle close — the shape Epic 9's matcher-tail scheduler and
 * Epic 11b Story 11b.3's Sahyog-Vivran publish gate consume. Maps 1:1 onto the `@twt/contracts`
 * `ReconciliationTailWindow` seam (`close_at` / `tail_deadline_at` / `extended_by_holiday` /
 * `holiday_label`); the extra fields here are the derivation's working detail, useful to a scheduler
 * and to tests, and are NOT part of the cross-package contract.
 */
export interface ReconciliationTail {
  /** The close instant exactly as supplied (the cycle's `live → closed` moment). */
  readonly closeAt: Date;
  /** The IST calendar date `closeAt` falls on. */
  readonly closeDate: CalendarDateString;
  /** The IST calendar date the tail runs through (INCLUSIVE). */
  readonly tailDeadlineDate: CalendarDateString;
  /**
   * The instant the tail ENDS — IST midnight OPENING the day after {@link tailDeadlineDate}, i.e. an
   * EXCLUSIVE bound. A consumer asks `now < tailDeadlineAt` ("still reconciling"). Exclusive-end
   * mirrors `pool_fixed_amount_schedule.effective_until` and removes the classic
   * end-of-day-minus-one-millisecond off-by-one.
   */
  readonly tailDeadlineAt: Date;
  /** Whole calendar days from {@link closeDate} to {@link tailDeadlineDate}. */
  readonly tailDays: number;
  /** `true` when a holiday window was encountered inside the tail (whether or not the tail's final
   *  length exceeds `normalTailDays` — see `reconciliationTailDeadline` for why this is checked via
   *  `firstHolidayHit`, not by comparing day counts). */
  readonly extendedByHoliday: boolean;
  /** The FIRST holiday window encountered while walking the tail — the observance the member-facing
   *  copy names. `null` when no holiday was encountered. */
  readonly holidayLabel: string | null;
  /** `true` when the extension hit `maxTailDays` and was cut short there. When this is `true` the
   *  deadline may still land inside a holiday window: the POLICY BOUND wins over clearing the window,
   *  deliberately — an unbounded tail would leave a family's Sahyog Vivran unpublished indefinitely. */
  readonly clampedToMaxTail: boolean;
}

/** Tuning knobs. Both default to the UX-DR77 bands; a Pariwar/season may tune them as DATA (D3) — this
 *  module never hardcodes a tail length at a call site. */
export interface ReconciliationTailOptions {
  readonly normalTailDays?: number;
  readonly maxTailDays?: number;
}

// ── Calendar-date primitives (UTC-anchored; never the process timezone) ─────────────────────────────

const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a `YYYY-MM-DD` to its UTC-midnight epoch ms, rejecting malformed shape, out-of-range
 *  month/day (`2026-13-45` — `Date.parse` returns `NaN`), AND day-of-month overflow for a
 *  specific month (`2026-02-30`, `2026-04-31`) — `Date.parse` silently ROLLS these over to the
 *  next month (e.g. `2026-02-30` → `2026-03-02`) instead of returning `NaN`, so the shape/NaN
 *  checks alone would let an impossible date through as a *different, wrong* real date. Guarded
 *  by reformatting the parsed instant's UTC calendar parts and rejecting on mismatch. */
function calendarDateToUtcMs(date: CalendarDateString): number {
  if (!CALENDAR_DATE_RE.test(date)) {
    throw new Error(`[cycle-calendar] expected a YYYY-MM-DD calendar date, got: ${JSON.stringify(date)}`);
  }
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(ms)) {
    throw new Error(`[cycle-calendar] not a real YYYY-MM-DD calendar date: ${JSON.stringify(date)}`);
  }
  const parsed = new Date(ms);
  const roundTripped = `${String(parsed.getUTCFullYear()).padStart(4, '0')}-${pad2(parsed.getUTCMonth() + 1)}-${pad2(parsed.getUTCDate())}`;
  if (roundTripped !== date) {
    throw new Error(
      `[cycle-calendar] not a real YYYY-MM-DD calendar date: ${JSON.stringify(date)} ` +
        `(rolled over to ${roundTripped})`,
    );
  }
  return ms;
}

const pad2 = (n: number): string => (n < 10 ? `0${String(n)}` : String(n));

/** Render IST calendar parts as the canonical `YYYY-MM-DD` string (zero-padded). */
export function formatCalendarDate(parts: IstCalendarDate): CalendarDateString {
  return `${String(parts.year).padStart(4, '0')}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/**
 * The IST calendar parts of an instant — shift by the fixed +05:30 offset, then read the UTC parts.
 * PURE and process-timezone-independent (see the header note on why not `getDate`/`Intl`).
 */
export function istCalendarDate(instant: Date): IstCalendarDate {
  const t = instant.getTime();
  if (!Number.isFinite(t)) {
    throw new Error('[cycle-calendar] istCalendarDate requires a valid instant (got an Invalid Date)');
  }
  const shifted = new Date(t + IST_UTC_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** The IST calendar date of an instant, as `YYYY-MM-DD`. The composition every caller actually wants. */
export function istDateOf(instant: Date): CalendarDateString {
  return formatCalendarDate(istCalendarDate(instant));
}

/**
 * `date` advanced by `days` whole calendar days. UTC-anchored fixed-ms arithmetic, so it is leap-year
 * and month-length correct and carries no DST hazard (the same discipline as the contribution window's
 * `committedAt + N * MS_PER_DAY` — never `setDate`).
 */
export function addCalendarDays(date: CalendarDateString, days: number): CalendarDateString {
  if (!Number.isInteger(days)) {
    throw new Error(`[cycle-calendar] addCalendarDays requires an integer day count, got ${String(days)}`);
  }
  const shifted = new Date(calendarDateToUtcMs(date) + days * DAY_MS);
  return formatCalendarDate({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

/** The instant that IS IST midnight opening `date` — i.e. the exclusive end of the previous IST day. */
function istMidnightAt(date: CalendarDateString): Date {
  return new Date(calendarDateToUtcMs(date) - IST_UTC_OFFSET_MS);
}

// ── Window membership ───────────────────────────────────────────────────────────────────────────────

/** Validate a curated window. Malformed or inverted rows are a CURATION/caller defect — fail loud
 *  rather than silently treating a broken window as "no holiday" and mis-scheduling a family's tail.
 *  (The DB has the twin guard: `pariwar_holiday_calendar_window_ordered`, migration 0082.) */
function assertWindow(window: HolidayWindow): void {
  const start = calendarDateToUtcMs(window.startDate);
  const end = calendarDateToUtcMs(window.endDate);
  if (end < start) {
    throw new Error(
      `[cycle-calendar] inverted holiday window ${JSON.stringify(window.label)}: ` +
        `${window.endDate} ends before ${window.startDate} starts`,
    );
  }
}

/** Normalize the `date` argument the public predicates accept — a calendar date, or an instant resolved
 *  in IST first (the ergonomic form: a scheduler holds instants, the registry holds calendar dates). */
function toCalendarDate(date: CalendarDateString | Date): CalendarDateString {
  return date instanceof Date ? istDateOf(date) : date;
}

/**
 * The holiday window containing `date`, or `null`. Both bounds INCLUSIVE. Deterministic over
 * OVERLAPPING windows: the earliest `startDate` wins, ties broken by `label` — so the answer never
 * depends on row order out of the database (the replay-identity property the tail relies on).
 */
export function holidayWindowFor(
  date: CalendarDateString | Date,
  windows: readonly HolidayWindow[],
): HolidayWindow | null {
  const d = toCalendarDate(date);
  calendarDateToUtcMs(d);
  let best: HolidayWindow | null = null;
  for (const window of windows) {
    assertWindow(window);
    // ISO `YYYY-MM-DD` sorts lexicographically, so plain string compares ARE date compares.
    if (d < window.startDate || d > window.endDate) continue;
    if (
      best === null ||
      window.startDate < best.startDate ||
      (window.startDate === best.startDate && window.label < best.label)
    ) {
      best = window;
    }
  }
  return best;
}

/** Does `date` fall inside any curated window? An EMPTY calendar is never a holiday — the fail-safe
 *  direction: an unreadable/unpopulated calendar declines to extend a tail, it never invents one. */
export function isHolidayDate(
  date: CalendarDateString | Date,
  windows: readonly HolidayWindow[],
): boolean {
  return holidayWindowFor(date, windows) !== null;
}

/**
 * The first date on or after `date` that is NOT inside a holiday window — deliberately NOT a strict
 * "next" (a clear `date` returns itself), because every caller means "when can work resume from here".
 * Clears BACK-TO-BACK windows in one call.
 *
 * @throws when no clear day exists within {@link MAX_SCAN_DAYS} — a calendar that swallows a whole year
 *         is a curation defect, and an unbounded scan would hang the caller instead of naming it.
 */
export function nextNonHolidayDate(
  date: CalendarDateString | Date,
  windows: readonly HolidayWindow[],
): CalendarDateString {
  let cursor = toCalendarDate(date);
  for (let scanned = 0; scanned <= MAX_SCAN_DAYS; scanned += 1) {
    if (!isHolidayDate(cursor, windows)) return cursor;
    cursor = addCalendarDays(cursor, 1);
  }
  throw new Error(
    `[cycle-calendar] no non-holiday day found within ${String(MAX_SCAN_DAYS)} days of ` +
      `${toCalendarDate(date)} — the Pariwar's holiday calendar is mis-curated`,
  );
}

// ── The reconciliation tail ─────────────────────────────────────────────────────────────────────────

/**
 * The calendar-aware reconciliation-tail deadline for a cycle that closed at `closeInstant` (AC2).
 *
 * ── The rule ────────────────────────────────────────────────────────────────────────────────────────
 * The tail is `normalTailDays` days of ACTUAL RECONCILIATION WORK, counted forward from the close.
 * A holiday day inside the tail consumes NO work day — banks and volunteers observing Chhath are not
 * matching statements — so the deadline slides past it. The whole extension is then bounded by
 * `maxTailDays` CALENDAR days from the close.
 *
 * Counting work days (rather than merely "push the deadline out of any window it happens to land in")
 * is what makes the UX-DR77 bands fall out naturally instead of being hardcoded: a close on the first
 * day of a four-day Chhath window yields a 5-day tail, squarely inside the decision record's
 * "5-7 days on Bihar holiday windows".
 *
 * ── What it is NOT ──────────────────────────────────────────────────────────────────────────────────
 * NOT the contribution deadline. The member's window to contribute closed, hard, at Day 15 (FR-22).
 * This is the post-close matching tail, and its member-facing framing exists so a holiday-delayed match
 * reads as "the calendar was honored", never as "you missed".
 *
 * @param windows The Pariwar's curated windows. EMPTY (including an RLS-fail-closed empty read) →
 *                the plain normal tail. An unresolvable calendar must never EXTEND a deadline.
 * @throws on a non-finite instant, non-integer/out-of-order bounds, or a malformed/inverted window —
 *         a mis-scheduled family deadline is worse than a loud failure.
 */
export function reconciliationTailDeadline(
  closeInstant: Date,
  windows: readonly HolidayWindow[],
  options: ReconciliationTailOptions = {},
): ReconciliationTail {
  const normalTailDays = options.normalTailDays ?? DEFAULT_NORMAL_TAIL_DAYS;
  const maxTailDays = options.maxTailDays ?? DEFAULT_MAX_TAIL_DAYS;

  if (!Number.isInteger(normalTailDays) || normalTailDays < 1) {
    throw new Error(
      `[cycle-calendar] normalTailDays must be an integer >= 1, got ${String(normalTailDays)}`,
    );
  }
  if (!Number.isInteger(maxTailDays) || maxTailDays < normalTailDays) {
    throw new Error(
      `[cycle-calendar] maxTailDays must be an integer >= normalTailDays (${String(normalTailDays)}), ` +
        `got ${String(maxTailDays)}`,
    );
  }

  const closeDate = istDateOf(closeInstant);
  for (const window of windows) assertWindow(window);

  // Walk forward day by day, accruing only NON-holiday days, until the tail's work days are spent or
  // the calendar-day ceiling is reached. The ceiling is checked on the cursor (not after the fact) so
  // a pathological calendar terminates the loop rather than being trimmed afterwards.
  let workDaysAccrued = 0;
  let offset = 0;
  let firstHolidayHit: HolidayWindow | null = null;
  let cursor = closeDate;

  while (workDaysAccrued < normalTailDays && offset < maxTailDays) {
    offset += 1;
    cursor = addCalendarDays(cursor, 1);
    const window = holidayWindowFor(cursor, windows);
    if (window === null) {
      workDaysAccrued += 1;
    } else if (firstHolidayHit === null) {
      firstHolidayHit = window;
    }
  }

  const clampedToMaxTail = workDaysAccrued < normalTailDays;
  // Derived from whether a holiday was actually hit, NOT from `offset > normalTailDays`: when a caller
  // tunes `maxTailDays === normalTailDays`, a holiday can consume a tail day while `offset` still caps
  // out at exactly `normalTailDays` — the day-count comparison would silently miss it (the boundary
  // this guards was found in review; see the fixed vector for `maxTailDays === normalTailDays`).
  const extendedByHoliday = firstHolidayHit !== null;

  return {
    closeAt: closeInstant,
    closeDate,
    tailDeadlineDate: cursor,
    // EXCLUSIVE end: IST midnight opening the day AFTER the deadline day.
    tailDeadlineAt: istMidnightAt(addCalendarDays(cursor, 1)),
    tailDays: offset,
    extendedByHoliday,
    holidayLabel: firstHolidayHit?.label ?? null,
    clampedToMaxTail,
  };
}
