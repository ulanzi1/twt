// pariwar_holiday_calendar — live-DB integration (Story 8.9, Task 6; AC1/AC2/AC6).
//
// The DB shell of the per-Pariwar holiday registry against real Postgres, inside the per-test
// BEGIN/ROLLBACK envelope. The pure tail arithmetic is proven DB-free in
// tests/cycle-calendar/holiday-resolver.test.ts; what can ONLY be proven here is:
//   · (a) TENANT ISOLATION — a second Pariwar cannot read the first's curated calendar (the RLS
//        policies from migration 0082 actually bite under the twt_app role).
//   · (b) FAIL-CLOSED → FAIL-SAFE — an unscoped read returns zero rows, which the resolver reads as an
//        empty calendar and answers with the NORMAL tail. An unreadable calendar must never EXTEND a
//        family's deadline; this asserts the whole chain, not just the empty read.
//   · (c) the date round-trip — a Postgres `date` comes back as the canonical 'YYYY-MM-DD' string the
//        pure resolver compares lexicographically. A driver handing back a Date (or a locale-formatted
//        string) would break every window comparison silently.
//   · (d) the annual re-curation mechanics — year-scoped REPLACE, and an idempotent seed that refuses
//        to overwrite a trustee's existing curation.
//   · (e) the END-TO-END path AC6 asks for: registry read → resolver → the tail result, over the
//        shipped Bihar seed dataset.
//
// Heeds [[project_live_db_test_gotchas]]: never regenerates migration 0082, never DROP SCHEMA, seeds
// under superuser (RLS bypassed) then reads back under app scope, asserts MEMBERSHIP not raw counts.

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  BIHAR_LAUNCH_HOLIDAY_WINDOWS,
  BIHAR_LAUNCH_HOLIDAY_YEAR,
  type HolidayWindow,
  listHolidayWindows,
  listHolidayWindowsForTail,
  reconciliationTailDeadline,
  replaceHolidayCalendarYear,
  seedHolidayCalendarYear,
} from '../../../src/cycle-calendar/index.js';
import type { Db } from '../../../src/db.js';
import type { PariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

const CHHATH: HolidayWindow = { label: 'Chhath Puja', startDate: '2026-11-13', endDate: '2026-11-16' };
const DIWALI: HolidayWindow = { label: 'Diwali', startDate: '2026-11-08', endDate: '2026-11-09' };
/** A window in the FOLLOWING curation year — the year-spanning tail case. */
const NEW_YEAR: HolidayWindow = { label: 'New Year', startDate: '2027-01-01', endDate: '2027-01-02' };

/** Seed rows as SUPERUSER (before app scope is entered), so both tenants' rows land regardless of the
 *  withCheck policy — the _helpers.ts seeding model. */
async function seedWindows(
  tx: Db,
  pariwarId: PariwarId,
  windows: readonly HolidayWindow[],
  effectiveYear: number,
): Promise<void> {
  await tx.insert(schema.pariwarHolidayCalendar).values(
    windows.map((w) => ({
      pariwarId,
      holidayLabel: w.label,
      windowStartDate: w.startDate,
      windowEndDate: w.endDate,
      effectiveYear,
      createdByActor: 'system:test-seed',
    })),
  );
}

const labelsOf = (windows: readonly HolidayWindow[]): string[] => windows.map((w) => w.label);

describe.skipIf(!hasDatabase)('pariwar_holiday_calendar (live DB)', () => {
  setupLiveDb();

  it('(a) tenant isolation — Pariwar A reads its own windows and NEVER Pariwar B’s', async () => {
    const { client, tx } = getTx();
    await seedWindows(tx, PARIWAR_A, [CHHATH, DIWALI], 2026);
    await seedWindows(tx, PARIWAR_B, [{ label: 'Onam', startDate: '2026-09-01', endDate: '2026-09-02' }], 2026);
    await enterAppScope(client, PARIWAR_A);

    const windows = await listHolidayWindows(tx, PARIWAR_A, { effectiveYear: 2026 });
    // Membership, not counts — other suites' committed rows must never make this brittle.
    expect(labelsOf(windows)).toEqual(expect.arrayContaining(['Chhath Puja', 'Diwali']));
    expect(labelsOf(windows)).not.toContain('Onam');
  });

  it('(a2) a Pariwar cannot reach ACROSS the tenant boundary even by asking for the other id', async () => {
    const { client, tx } = getTx();
    await seedWindows(tx, PARIWAR_B, [CHHATH], 2026);
    await enterAppScope(client, PARIWAR_A);

    // The RLS predicate is on the SESSION scope, not the query argument — asking for B's id under A's
    // scope yields nothing rather than leaking.
    const leaked = await listHolidayWindows(tx, PARIWAR_B, { effectiveYear: 2026 });
    expect(leaked).toEqual([]);
  });

  it('(b) an UNSCOPED read fails closed → the resolver answers with the NORMAL tail, never an extension', async () => {
    const { client, tx } = getTx();
    await seedWindows(tx, PARIWAR_A, [CHHATH], 2026);
    await enterAppRoleNoScope(client);

    const windows = await listHolidayWindows(tx, PARIWAR_A, { effectiveYear: 2026 });
    expect(windows).toEqual([]);

    // The load-bearing half: an unreadable calendar declines to extend. A close INSIDE Chhath gets the
    // plain 2-day tail because the windows were never readable — the fail-SAFE direction.
    const tail = reconciliationTailDeadline(new Date('2026-11-13T06:00:00Z'), windows);
    expect(tail.extendedByHoliday).toBe(false);
    expect(tail.tailDeadlineDate).toBe('2026-11-15');
  });

  it('(c) `date` columns round-trip as canonical YYYY-MM-DD strings the pure resolver can compare', async () => {
    const { client, tx } = getTx();
    await seedWindows(tx, PARIWAR_A, [CHHATH], 2026);
    await enterAppScope(client, PARIWAR_A);

    const [window] = await listHolidayWindows(tx, PARIWAR_A, { effectiveYear: 2026 });
    expect(window).toBeDefined();
    expect(window!.startDate).toBe('2026-11-13');
    expect(window!.endDate).toBe('2026-11-16');
    expect(typeof window!.startDate).toBe('string');
  });

  it('(c2) reads BOTH the close year and the next — a tail crossing New Year still sees January', async () => {
    const { client, tx } = getTx();
    await seedWindows(tx, PARIWAR_A, [CHHATH], 2026);
    await seedWindows(tx, PARIWAR_A, [NEW_YEAR], 2027);
    await enterAppScope(client, PARIWAR_A);

    const windows = await listHolidayWindowsForTail(tx, PARIWAR_A, new Date('2026-12-30T06:00:00Z'));
    expect(labelsOf(windows)).toEqual(expect.arrayContaining(['Chhath Puja', 'New Year']));

    // Close 30 Dec: 31 Dec is reconciliation day 1; 1-2 Jan are the New Year window; 3 Jan is day 2.
    const tail = reconciliationTailDeadline(new Date('2026-12-30T06:00:00Z'), windows);
    expect(tail.tailDeadlineDate).toBe('2027-01-03');
    expect(tail.extendedByHoliday).toBe(true);
    expect(tail.holidayLabel).toBe('New Year');
  });

  it('(d) the annual re-curation REPLACES one year and leaves the other years intact', async () => {
    const { client, tx } = getTx();
    await seedWindows(tx, PARIWAR_A, [CHHATH, DIWALI], 2026);
    await seedWindows(tx, PARIWAR_A, [NEW_YEAR], 2027);
    await enterAppScope(client, PARIWAR_A);

    await replaceHolidayCalendarYear(tx, {
      pariwarId: PARIWAR_A,
      effectiveYear: 2026,
      windows: [{ label: 'Chhath Puja', startDate: '2026-11-14', endDate: '2026-11-17' }],
      actorId: 'trustee-actor-1',
    });

    const curated = await listHolidayWindows(tx, PARIWAR_A, { effectiveYear: 2026 });
    expect(labelsOf(curated)).toEqual(['Chhath Puja']);
    expect(curated[0]!.endDate).toBe('2026-11-17');
    // 2027's curation is untouched — replay of a 2027 tail must still resolve.
    expect(labelsOf(await listHolidayWindows(tx, PARIWAR_A, { effectiveYear: 2027 }))).toEqual(['New Year']);
  });

  it('(d2) the seed is idempotent — it never overwrites an existing curation', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const first = await seedHolidayCalendarYear(tx, {
      pariwarId: PARIWAR_A,
      effectiveYear: BIHAR_LAUNCH_HOLIDAY_YEAR,
      windows: BIHAR_LAUNCH_HOLIDAY_WINDOWS,
      actorId: 'system:launch-seed',
    });
    expect(first).toBe(true);

    // A trustee corrects the calendar by hand …
    await replaceHolidayCalendarYear(tx, {
      pariwarId: PARIWAR_A,
      effectiveYear: BIHAR_LAUNCH_HOLIDAY_YEAR,
      windows: [{ label: 'Chhath Puja', startDate: '2026-11-14', endDate: '2026-11-18' }],
      actorId: 'trustee-actor-1',
    });

    // … and re-running the seed leaves that correction alone.
    const second = await seedHolidayCalendarYear(tx, {
      pariwarId: PARIWAR_A,
      effectiveYear: BIHAR_LAUNCH_HOLIDAY_YEAR,
      windows: BIHAR_LAUNCH_HOLIDAY_WINDOWS,
      actorId: 'system:launch-seed',
    });
    expect(second).toBe(false);
    const after = await listHolidayWindows(tx, PARIWAR_A, { effectiveYear: BIHAR_LAUNCH_HOLIDAY_YEAR });
    expect(labelsOf(after)).toEqual(['Chhath Puja']);
    expect(after[0]!.endDate).toBe('2026-11-18');
  });

  it('(d3) the DB rejects an INVERTED window — the CHECK is the twin of the resolver’s assertion', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);

    // drizzle wraps the driver error in a generic "Failed query:" message, so the Postgres detail —
    // the constraint that actually bit — lives on `err.cause` (the same place the 23505 code is read
    // elsewhere in this repo). Asserting on the wrapper message alone would pass for ANY insert
    // failure, including an RLS rejection, and prove nothing about the CHECK.
    const err = await tx
      .insert(schema.pariwarHolidayCalendar)
      .values({
        pariwarId: PARIWAR_A,
        holidayLabel: 'Inverted',
        windowStartDate: '2026-11-16',
        windowEndDate: '2026-11-13',
        effectiveYear: 2026,
        createdByActor: 'system:test-seed',
      })
      .then(
        () => null,
        (e: unknown) => e,
      );
    expect(err).not.toBeNull();
    const cause = (err as { cause?: { code?: string; constraint?: string } }).cause;
    expect(cause?.code).toBe('23514'); // check_violation
    expect(cause?.constraint).toBe('pariwar_holiday_calendar_window_ordered');
  });

  it('(e) END-TO-END — registry read → resolver → the UX-DR77 tail, over the shipped Bihar seed', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await seedHolidayCalendarYear(tx, {
      pariwarId: PARIWAR_A,
      effectiveYear: BIHAR_LAUNCH_HOLIDAY_YEAR,
      windows: BIHAR_LAUNCH_HOLIDAY_WINDOWS,
      actorId: 'system:launch-seed',
    });

    const windows = await listHolidayWindowsForTail(tx, PARIWAR_A, new Date('2026-11-13T06:00:00Z'));
    const tail = reconciliationTailDeadline(new Date('2026-11-13T06:00:00Z'), windows);

    // A cycle closing on the first day of Chhath: the tail clears the observance and lands 5 days out —
    // squarely inside UX-DR77's "5-7 days on Bihar holiday windows" band, derived from the DATA.
    expect(tail.closeDate).toBe('2026-11-13');
    expect(tail.tailDeadlineDate).toBe('2026-11-18');
    expect(tail.extendedByHoliday).toBe(true);
    expect(tail.holidayLabel).toBe('Chhath Puja');
    expect(tail.tailDays).toBeGreaterThanOrEqual(5);
    expect(tail.tailDays).toBeLessThanOrEqual(7);

    // …while a cycle closing clear of every window keeps the plain 2-day tail.
    const clear = reconciliationTailDeadline(
      new Date('2026-06-10T06:00:00Z'),
      await listHolidayWindowsForTail(tx, PARIWAR_A, new Date('2026-06-10T06:00:00Z')),
    );
    expect(clear.extendedByHoliday).toBe(false);
    expect(clear.tailDeadlineDate).toBe('2026-06-12');
  });

  it('(f) the six seeded launch windows are all present and well-formed', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await seedHolidayCalendarYear(tx, {
      pariwarId: PARIWAR_A,
      effectiveYear: BIHAR_LAUNCH_HOLIDAY_YEAR,
      windows: BIHAR_LAUNCH_HOLIDAY_WINDOWS,
      actorId: 'system:launch-seed',
    });

    const rows = await tx
      .select()
      .from(schema.pariwarHolidayCalendar)
      .where(
        and(
          eq(schema.pariwarHolidayCalendar.pariwarId, PARIWAR_A),
          eq(schema.pariwarHolidayCalendar.effectiveYear, BIHAR_LAUNCH_HOLIDAY_YEAR),
        ),
      );
    expect(rows.map((r) => r.holidayLabel)).toEqual(
      expect.arrayContaining(['Chhath Puja', 'Holi', 'Diwali', 'Eid', 'Republic Day', 'Independence Day']),
    );
    for (const row of rows) {
      expect(row.windowEndDate >= row.windowStartDate).toBe(true);
      expect(row.createdByActor).toBe('system:launch-seed');
    }
  });
});
