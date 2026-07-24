// `pariwar_holiday_calendar` table — Story 8.9 substrate (Task 1; AC1).
//
// The trustee-curated, per-Pariwar registry of locally-significant holiday WINDOWS.
// It is the DATA half of UX-DR77: the pure resolver in `../cycle-calendar/` reads
// these rows and computes the calendar-aware RECONCILIATION TAIL deadline (the
// post-close matching window), so a match delayed by Chhath Puja / Holi / Diwali is
// honored as lived reality rather than read as a failure.
//
// ── What this registry does NOT do ───────────────────────────────────────────
// It does NOT move the contribution close. FR-22's `live → closed` transition is a
// HARD Day-15 mechanical close and Story 8.9 leaves it byte-unchanged (the epics
// AC prose at L3022 saying otherwise is a RATIFIED drafting error — BigDev,
// 2026-07-24). Calendar-awareness governs the TAIL and its member-facing framing.
//
// ── Region-NEUTRAL by design (D2) ────────────────────────────────────────────
// Named `pariwar_holiday_calendar`, NOT `bihar_holiday_calendar`: the calendar is
// owned by a Pariwar, not a geography. Bihar is the launch SEED dataset; the UX
// spec (L1003) makes the principle Pariwar-local — "Rail Parivar's calendar … will
// differ; Bank Parivar's … will differ". Deliberate deviation from the epics wording.
//
// ── Effective-dated by YEAR, not by instant-window ───────────────────────────
// Unlike `pool_fixed_amount_schedule` (whose effective_from/effective_until instants
// resolve ONE row in force at a moment), a holiday calendar is a SET of windows per
// year: `effective_year` scopes the set, and the resolver reasons over all of a
// year's windows at once. Re-curation REPLACES a year's set (hence the DELETE grant
// in migration 0082) — the rows are replaceable curated data, not an append-only
// attestation record.
//
// ── Dates are IST CALENDAR dates, not instants ───────────────────────────────
// `date` columns (mode 'string' → 'YYYY-MM-DD'), both bounds INCLUSIVE. A holiday
// window is a run of calendar days in Asia/Kolkata; storing instants would invite a
// timezone-shifted comparison. The resolver derives an instant's IST calendar date
// via a fixed +05:30 ms offset (India has no DST, so it is exact) and compares
// calendar-date to calendar-date. A single-day holiday has start === end.
//
// ── Tenant isolation ─────────────────────────────────────────────────────────
// TENANT-ISOLATED read + write (mirrors pool_fixed_amount_schedule / pools): NOT
// cross-readable. RLS in policies/pariwar-holiday-calendar-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields
// camelCase.

import { sql } from 'drizzle-orm';
import { check, date, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId } from '../ids/index.js';

export const pariwarHolidayCalendar = pgTable(
  'pariwar_holiday_calendar',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default.
    id: uuid('id').defaultRandom().primaryKey(),

    // Tenant key + RLS predicate column. Branded `PariwarId`. unFK'd (the pre-Epic-3
    // posture — mirrors pools.pariwar_id / pool_fixed_amount_schedule.pariwar_id).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The holiday's curated display label (e.g. 'Chhath Puja'). Carried through to the
    // tail-window contract's `holiday_label` so a consumer can name WHICH observance
    // extended the tail. NOT an enum: a Pariwar's calendar is open-ended curated data,
    // and a fixed enum would have to be migrated for every new tenant's local calendar.
    holidayLabel: text('holiday_label').notNull(),

    // The IST calendar-date window, BOTH BOUNDS INCLUSIVE. 'YYYY-MM-DD' strings (drizzle
    // mode 'string') — deliberately NOT `mode: 'date'`, which would hand back a JS Date
    // parsed at the process's local midnight and reintroduce exactly the timezone drift
    // the calendar-date model exists to avoid.
    windowStartDate: date('window_start_date', { mode: 'string' }).notNull(),
    windowEndDate: date('window_end_date', { mode: 'string' }).notNull(),

    // The Gregorian year this window set belongs to — the annual re-curation scope key.
    // Denormalized from window_start_date on purpose: a trustee replaces "2027's
    // calendar" as a unit, and a year-spanning window (a New Year observance) must still
    // belong to exactly ONE curation set.
    effectiveYear: integer('effective_year').notNull(),

    // The trustee/actor who curated this row (the pool_fixed_amount_schedule
    // created_by_actor precedent — an actor id snapshot, not FK'd pre-Epic-3).
    createdByActor: text('created_by_actor').notNull(),

    // DB-authoritative write time (architecture §1.11). Default now().
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // The Story 1.10 audit line id for this curation. NULLABLE + unFK'd, mirroring
    // pool_fixed_amount_schedule.audit_id: reserved for a future admin curation route
    // that adopts the pre-commit write-audit-first-then-thread-its-id pattern.
    auditId: uuid('audit_id'),
  },
  (t) => [
    // A window may be a single day (start === end) but never inverted.
    check('pariwar_holiday_calendar_window_ordered', sql`${t.windowEndDate} >= ${t.windowStartDate}`),
    // Sanity floor + ceiling on the curation year (mirrors the 0075 positive-value CHECK posture).
    // The ceiling is a generous rolling sanity bound, not a real limit — it exists only to catch a
    // fat-fingered year (e.g. 9999), not to constrain legitimate future curation.
    check('pariwar_holiday_calendar_effective_year_min', sql`${t.effectiveYear} >= 2000`),
    check('pariwar_holiday_calendar_effective_year_max', sql`${t.effectiveYear} <= 2100`),

    // The annual-curation read path: "every window this Pariwar observes in year Y".
    index('pariwar_holiday_calendar_pariwar_year_idx').on(t.pariwarId, t.effectiveYear),
    // The tail-resolution read path: windows ordered by when they start, per tenant.
    index('pariwar_holiday_calendar_pariwar_start_idx').on(t.pariwarId, t.windowStartDate),
  ],
);

// NOTE: deliberately NO unique index on (pariwar_id, effective_year, holiday_label).
// Some observances legitimately recur as SEVERAL disjoint windows in one year (two Eids;
// a split regional observance), and a uniqueness constraint would force a curator to
// invent distinguishing labels. Overlapping/duplicate windows are harmless to the
// resolver — membership is a union, and `isHolidayDate` is idempotent over overlaps.

/** Inferred row types for the accessor read/write paths (pool_fixed_amount_schedule precedent). */
export type PariwarHolidayCalendarRow = typeof pariwarHolidayCalendar.$inferSelect;
export type PariwarHolidayCalendarInsert = typeof pariwarHolidayCalendar.$inferInsert;
