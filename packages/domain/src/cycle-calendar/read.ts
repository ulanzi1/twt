// `pariwar_holiday_calendar` accessors — Story 8.9 (Task 1/Task 2; AC1).
//
// The thin DB shell around the PURE resolver in ./holiday-resolver.ts: it fetches a Pariwar's curated
// windows and hands them to the resolver as plain immutable rows. All the timing SEMANTICS live in the
// pure module (replay identity); nothing here decides anything about a deadline.
//
// ── Transaction contract (the 7.5 pool/fixed-amount.ts precedent) ───────────────────────────────────
// These accessors run their statements DIRECTLY on the passed `db` and do NOT open their own
// transaction. RLS scope (`SET LOCAL app.pariwar_id`) is transaction-scoped, so any scoped caller is
// already inside one (`withPariwarScope` on the route/worker path; the per-test harness in tests).
// Atomicity for the annual re-curation (delete-then-insert) therefore comes from the CALLER's tx.
//
// ── Fail-safe read posture ──────────────────────────────────────────────────────────────────────────
// An unset/foreign scope yields 0 rows under RLS (Story 1.6's closed-failure construct). The resolver
// treats an empty calendar as "no holidays" → the NORMAL tail. That direction is deliberate: an
// unreadable calendar must never EXTEND a family's reconciliation deadline, only decline to.

import { and, asc, eq, inArray } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import {
  type PariwarHolidayCalendarRow,
  pariwarHolidayCalendar,
} from '../schema/pariwar_holiday_calendar.js';
import { type HolidayWindow, istCalendarDate } from './holiday-resolver.js';

/** Project a stored row onto the pure resolver's minimal window shape. */
export function toHolidayWindow(row: PariwarHolidayCalendarRow): HolidayWindow {
  return { label: row.holidayLabel, startDate: row.windowStartDate, endDate: row.windowEndDate };
}

/** Page cap for a calendar read. A year of curated observances is on the order of a dozen windows;
 *  200 is a generous ceiling that still bounds the read (the domain-accessor-invariants gate requires
 *  every `.limit()` be clamped or literal). */
const HOLIDAY_WINDOW_PAGE_CAP = 200;

export interface ListHolidayWindowsOptions {
  /** Restrict to one curation year. Omit to read every year the Pariwar has curated. */
  readonly effectiveYear?: number;
  /** Restrict to several curation years (e.g. a tail that crosses New Year). Takes precedence over
   *  `effectiveYear` when both are supplied. */
  readonly effectiveYears?: readonly number[];
  readonly limit?: number;
}

/**
 * The Pariwar's curated holiday windows, ordered `window_start_date ASC, holiday_label ASC` (a stable,
 * replay-friendly order — though the resolver is order-independent by construction, so the ordering is
 * for human/debug legibility, not correctness). RLS-scoped by the caller.
 */
export async function listHolidayWindows(
  db: Db,
  pariwarId: PariwarId,
  opts: ListHolidayWindowsOptions = {},
): Promise<HolidayWindow[]> {
  const years =
    opts.effectiveYears !== undefined
      ? [...opts.effectiveYears]
      : opts.effectiveYear !== undefined
        ? [opts.effectiveYear]
        : null;

  // An explicitly EMPTY year filter means "no years selected" → no rows. Passing it through to
  // `inArray` would emit `IN ()`, which Postgres rejects; short-circuiting is both correct and cheaper.
  if (years !== null && years.length === 0) return [];

  const rows = await db
    .select()
    .from(pariwarHolidayCalendar)
    .where(
      years === null
        ? eq(pariwarHolidayCalendar.pariwarId, pariwarId)
        : and(
            eq(pariwarHolidayCalendar.pariwarId, pariwarId),
            inArray(pariwarHolidayCalendar.effectiveYear, years),
          ),
    )
    .orderBy(asc(pariwarHolidayCalendar.windowStartDate), asc(pariwarHolidayCalendar.holidayLabel))
    .limit(clampLimit(opts.limit, { default: HOLIDAY_WINDOW_PAGE_CAP, cap: HOLIDAY_WINDOW_PAGE_CAP }));

  return rows.map(toHolidayWindow);
}

/**
 * The windows relevant to a reconciliation tail starting at `closeInstant` — the close's IST year AND
 * the following one.
 *
 * Reading BOTH years is load-bearing, not defensive: a cycle closing in late December has a tail that
 * runs into January, and January's observances live in the NEXT curation year's row set. Reading only
 * the close's year would silently drop them and hand the family a tail that ignores New Year — exactly
 * the "mechanical clock over lived calendar" failure UX-DR77 exists to prevent.
 */
export async function listHolidayWindowsForTail(
  db: Db,
  pariwarId: PariwarId,
  closeInstant: Date,
): Promise<HolidayWindow[]> {
  const { year } = istCalendarDate(closeInstant);
  return listHolidayWindows(db, pariwarId, { effectiveYears: [year, year + 1] });
}

export interface CurateHolidayCalendarInput {
  readonly pariwarId: PariwarId;
  /** The curation year being (re)written — the replacement scope. */
  readonly effectiveYear: number;
  /** The complete window set for that year. An empty array is legitimate: it records "this Pariwar
   *  observes no special windows this year", which the resolver reads as the normal tail. */
  readonly windows: readonly HolidayWindow[];
  /** The trustee/actor performing the curation (snapshotted in `created_by_actor`). */
  readonly actorId: string;
  readonly auditId?: string | null;
}

/**
 * REPLACE one curation year's window set (the annual trustee re-curation, AC1) — delete the year's
 * existing rows, insert the supplied set. Runs on the CALLER's transaction, so the replacement is
 * atomic: a Pariwar is never observed with a half-written calendar.
 *
 * Year-scoped delete (never a whole-table wipe) so re-curating 2027 cannot destroy 2026's historical
 * rows — those are what a replayed 2026 tail must still resolve against.
 */
export async function replaceHolidayCalendarYear(
  db: Db,
  input: CurateHolidayCalendarInput,
): Promise<PariwarHolidayCalendarRow[]> {
  await db
    .delete(pariwarHolidayCalendar)
    .where(
      and(
        eq(pariwarHolidayCalendar.pariwarId, input.pariwarId),
        eq(pariwarHolidayCalendar.effectiveYear, input.effectiveYear),
      ),
    );

  if (input.windows.length === 0) return [];

  return db
    .insert(pariwarHolidayCalendar)
    .values(
      input.windows.map((w) => ({
        pariwarId: input.pariwarId,
        holidayLabel: w.label,
        windowStartDate: w.startDate,
        windowEndDate: w.endDate,
        effectiveYear: input.effectiveYear,
        createdByActor: input.actorId,
        auditId: input.auditId ?? null,
      })),
    )
    .returning();
}

/**
 * Seed a curation year IDEMPOTENTLY — writes the supplied windows only when the Pariwar has NO rows for
 * that year yet, and otherwise leaves the curated set completely alone (the `seedGenesisFixedAmount`
 * posture). This is what makes a seed safe to re-run against a live tenant: a trustee's hand-curated
 * corrections must never be silently reverted to the shipped defaults.
 *
 * @returns `true` when rows were written, `false` when an existing curation was left untouched.
 */
export async function seedHolidayCalendarYear(
  db: Db,
  input: CurateHolidayCalendarInput,
): Promise<boolean> {
  const existing = await db
    .select({ id: pariwarHolidayCalendar.id })
    .from(pariwarHolidayCalendar)
    .where(
      and(
        eq(pariwarHolidayCalendar.pariwarId, input.pariwarId),
        eq(pariwarHolidayCalendar.effectiveYear, input.effectiveYear),
      ),
    )
    .limit(1);
  if (existing.length > 0) return false;

  await replaceHolidayCalendarYear(db, input);
  return true;
}
