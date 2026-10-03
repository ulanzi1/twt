// The correction-reminder SCHEDULE — Story 6.19b (Task 3; AC2; the shared spec's D3, keyed by run KIND since
// `2026-09-29-266` §1; `2026-09-27-260` G4). PURE: ⛔ no DB, ⛔ no clock — every caller passes `today`.
//
// ⭐ THE NUMBERS ARE THE PANEL'S (`2026-09-27-250` #5): days 1–7 daily; 10, 14, 17, 21, 24, 28, 31, 35; then weekly
// 42 … 84. ⛔ Nothing on day 0 (G4 — the first slot is the NEXT morning at 10:00, for a return AND for a switch);
// ⛔ nothing on or after day 90. A change is a new ruling, ⛔ never an edit here.
// ⭐ The `staff` kind also carries its DAY-12 ESCALATION slot (`-258` detail 2 — the District Admin is escalated to
// the Pariwar Admin) — ⛔ not one of the Panel's reminder days, so it is its own slot kind.
// ⭐ The LETTER CHASE is anchored on a person's FOUND-DEAD day, ⛔ not the run's day 0 (D20, `-231` C): the District
// Admin is reminded on found-dead + 7, then daily through + 12, then ESCALATED to the Pariwar Admin on + 13
// (*"thereafter"*). The OVERDUE flag is shown 14 days after posting; the second letter is due 30 days after the
// first's recorded delivery (`-231` D/F).
//
// Dates are IST calendar dates (`YYYY-MM-DD`), through `cycle-calendar`'s helpers — ⛔ never a new IST offset.

import {
  type CalendarDateString,
  addCalendarDays,
  istDateOf,
} from '../cycle-calendar/holiday-resolver.js';
import type { CorrectionRunKind } from '../schema/claim_correction_chase.js';

/** `-250` #5 — the Panel's correction-reminder days. ⚠ DATA, ⛔ never re-derived. */
export const CORRECTION_REMINDER_DAYS = [
  1, 2, 3, 4, 5, 6, 7, 10, 14, 17, 21, 24, 28, 31, 35, 42, 49, 56, 63, 70, 77, 84,
] as const;

/** A run is over at day 90 (`-229`: *"at least 90 days"*) — ⛔ nothing on or after it. */
export const CORRECTION_RUN_HORIZON_DAYS = 90;

/** `-258` detail 2 — a staff run escalates the District Admin to the Pariwar Admin on this day. */
export const STAFF_RUN_ESCALATION_DAY = 12;

/** D20 — the letter chase's offsets from the found-dead day. */
export const LETTER_CHASE_FIRST_OFFSET = 7;
export const LETTER_CHASE_LAST_OFFSET = 12;
export const LETTER_CHASE_ESCALATION_OFFSET = 13;
/** `-230` 3 / `-250` #3 — the overdue flag, days after posting (shown, nothing else). */
export const LETTER_OVERDUE_AFTER_DAYS = 14;
/** `-231` D/F — the second letter is due this many days after the first's recorded delivery. */
export const SECOND_LETTER_DUE_AFTER_DAYS = 30;

/** The daily sweep's cron — 10:00 IST (D3). */
export const CORRECTION_REMINDER_SWEEP_CRON = '0 10 * * *';

export type CorrectionSlotKind = 'reminder' | 'escalation';

export interface CorrectionSlot {
  /** The run's day number (`day0` = 0). */
  readonly day: number;
  /** The IST calendar date of that day. */
  readonly date: CalendarDateString;
  readonly kind: CorrectionSlotKind;
}

/** The schedule DATA's shape: per run kind, its days and their slot kinds. */
export type CorrectionScheduleTable = Readonly<
  Record<CorrectionRunKind, readonly { readonly day: number; readonly kind: CorrectionSlotKind }[]>
>;

/**
 * The schedule DATA, keyed by run kind (`-266` §1). ⚠ `-266` §1's *"6.19d adds its own kind's days here as data"* is
 * SUPERSEDED by `2026-10-03-276` CR1 — 6.19d's days live in `certificate-reminder-schedule.ts`, ⛔ never a key here.
 */
const SCHEDULE_TABLE: CorrectionScheduleTable = {
  family: CORRECTION_REMINDER_DAYS.map((day) => ({ day, kind: 'reminder' as const })),
  direction: CORRECTION_REMINDER_DAYS.map((day) => ({ day, kind: 'reminder' as const })),
  // ⚠ The tie-break (`a.kind === 'reminder' ? -1 : 1`) is UNEXERCISED today: `STAFF_RUN_ESCALATION_DAY` (12) does
  // not collide with any `CORRECTION_REMINDER_DAYS` entry. It starts mattering — untested — the day a reminder
  // day and the escalation day are ever made to coincide; re-verify it then.
  staff: [
    ...CORRECTION_REMINDER_DAYS.map((day) => ({ day, kind: 'reminder' as const })),
    { day: STAFF_RUN_ESCALATION_DAY, kind: 'escalation' as const },
  ].sort((a, b) => a.day - b.day || (a.kind === 'reminder' ? -1 : 1)),
};

/** UTC-anchored millisecond value of an IST calendar date (the date's own midnight, as a UTC instant). */
function dateMs(date: CalendarDateString): number {
  const ms = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) throw new Error(`[correction-schedule] not a calendar date: ${JSON.stringify(date)}`);
  return ms;
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). Pure. */
export function calendarDaysBetween(from: CalendarDateString, to: CalendarDateString): number {
  return Math.round((dateMs(to) - dateMs(from)) / 86_400_000);
}

/**
 * ⭐ THE SCHEDULE — the slots of a run of `kind` whose day 0 is `day0`: every Panel day in (0, 90), plus the staff
 * kind's day-12 escalation. Pure, total, ordered by day. ⛔ Nothing on day 0, ⛔ nothing on or after day 90.
 * `table` is injectable for TESTS only (the Panel's table holds no day 0 and nothing ≥ 90, so the horizon filter is
 * provable only on a table that does) — ⛔ production callers never pass it.
 */
export function correctionReminderSchedule(
  kind: CorrectionRunKind,
  day0: CalendarDateString,
  table: CorrectionScheduleTable = SCHEDULE_TABLE,
): CorrectionSlot[] {
  const rows = table[kind];
  return rows
    .filter((r) => r.day > 0 && r.day < CORRECTION_RUN_HORIZON_DAYS)
    .map((r) => ({ day: r.day, date: addCalendarDays(day0, r.day), kind: r.kind }));
}

/** The run's day number on `today` (IST dates). */
export function correctionRunDay(day0: CalendarDateString, today: CalendarDateString): number {
  return calendarDaysBetween(day0, today);
}

/** `-229` *"at least 90 days"* ⇔ `today >= day0 + 90`. */
export function isCorrectionRunExpired(day0: CalendarDateString, today: CalendarDateString): boolean {
  return correctionRunDay(day0, today) >= CORRECTION_RUN_HORIZON_DAYS;
}

/** `istDateOf` re-exported for the chase's callers, so ⛔ nobody reaches for a second IST offset. */
export { istDateOf };

/**
 * D3's CATCH-UP over one recipient's slots: the due slots (day ≤ today's run day) and which of them already carry a
 * record. Returns the LATEST due slot with ⛔ no record (to send ONCE, flagged `late` unless it is today's), and
 * the OLDER due slots with ⛔ no record (to be written `skipped_superseded` — ⛔ no burst). A latest due slot that
 * already has a record ⇒ nothing to do. Pure.
 */
export function correctionCatchUp(
  dueDays: readonly number[],
  recordedDays: ReadonlySet<number>,
  todayRunDay: number,
): { readonly send: { readonly day: number; readonly late: boolean } | null; readonly skip: readonly number[] } {
  const due = dueDays.filter((d) => d <= todayRunDay).sort((a, b) => a - b);
  if (due.length === 0) return { send: null, skip: [] };
  const latest = due[due.length - 1]!;
  if (recordedDays.has(latest)) return { send: null, skip: [] };
  const lastRecorded = [...recordedDays].filter((d) => d < latest).sort((a, b) => b - a)[0] ?? 0;
  return {
    send: { day: latest, late: latest < todayRunDay },
    // Only the gap since the last record (or the run's start) — a slot BEFORE a recorded one was handled then.
    skip: due.filter((d) => d < latest && d > lastRecorded && !recordedDays.has(d)),
  };
}
