// RLS policy declarations for `pariwar_holiday_calendar` — Story 8.9 (Task 1; AC1).
//
// TENANT-ISOLATED read + write — mirrors pool-fixed-amount-schedule-rls.ts, NOT the
// pariwar-passport cross-readable carve-out. A Pariwar's holiday calendar is ITS OWN
// (UX-DR77: "Per-Pariwar holiday windows configurable"; a Rail Parivar must not read a
// Bank Parivar's observances). Story 1.6's closed-failure construct: unset scope → ''
// → nullif → NULL → 0 rows (fail-closed), which the resolver treats as an EMPTY
// calendar → the NORMAL reconciliation tail. That fail-safe is deliberate and benign
// here: an unresolvable calendar must never extend a deadline, only decline to.
//
// SYMMETRIC (for:'all') — the write policy covers the annual re-curation, which is a
// DELETE of the prior year-set followed by an INSERT of the new one (the reason
// migration 0082's GRANT includes DELETE, unlike the 0075 attestation table).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { pariwarHolidayCalendar } from '../schema/pariwar_holiday_calendar.js';
import { appRole } from './_roles.js';

export const pariwarHolidayCalendarTenantIsolationSelect = pgPolicy(
  'pariwar_holiday_calendar_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarHolidayCalendar);

export const pariwarHolidayCalendarTenantIsolationWrite = pgPolicy(
  'pariwar_holiday_calendar_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarHolidayCalendar);
